"""
phishing_detector.py
---------------------
Trains and evaluates a phishing email classifier using Scikit-learn.

Pipeline:
  1. Load the email dataset (auto-generates one via generate_dataset.py
     if email_dataset.csv is not present)
  2. Engineer explicit, security-relevant features from each email:
     URL counts, IP-based links, shortened links, suspicious keyword
     hits, urgency markers (exclamations, ALL-CAPS words), generic
     greetings, dollar-sign mentions, message length, etc.
  3. Combine those engineered features with TF-IDF text vectorization
     of the raw email content
  4. Train and compare several Scikit-learn classifiers
  5. Evaluate the best-performing model: accuracy, confusion matrix,
     classification report (precision / recall / F1)
  6. Save the trained pipeline and demo it on new, unseen example emails

Run with:  python3 phishing_detector.py
"""

import os
import re

import joblib
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.model_selection import train_test_split, GroupShuffleSplit
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import MinMaxScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.naive_bayes import MultinomialNB
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, confusion_matrix, classification_report

from generate_dataset import build_dataset

RANDOM_STATE = 42

# ===========================================================================
# 1. FEATURE ENGINEERING
# ===========================================================================

# Words / phrases commonly used in phishing and social-engineering emails
SUSPICIOUS_KEYWORDS = [
    "urgent", "verify", "suspended", "click here", "act now", "limited time",
    "password", "confirm", "update your", "security alert", "congratulations",
    "winner", "prize", "gift card", "claim", "bank account", "credit card",
    "social security", "login", "immediately", "final notice", "restricted",
    "unusual activity", "expire", "invoice", "payment failed", "customs fee",
    "verify your identity", "act fast", "don't miss out",
]

URL_REGEX = re.compile(
    r"(?:https?://[^\s]+|www\.[^\s]+|"
    r"[a-zA-Z0-9.-]+\.(?:com|net|org|info|xyz|top|ru|co)(?:/[^\s]*)?)",
    re.IGNORECASE,
)
IP_URL_REGEX = re.compile(r"(?:https?://)?\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}")
SHORTENER_DOMAINS = ["bit.ly", "tinyurl.com", "goo.gl", "t.co", "ow.ly", "is.gd"]

NUMERIC_COLS = [
    "num_urls", "num_ip_urls", "has_shortener", "num_suspicious_keywords",
    "num_exclaims", "num_upper_words", "has_generic_greeting", "num_dollar",
    "email_length", "num_special_chars",
]


def extract_manual_features(text: str) -> dict:
    """Compute hand-engineered, security-relevant features for one email."""
    text_lower = text.lower()
    urls = URL_REGEX.findall(text)
    words = re.findall(r"\b[A-Za-z]+\b", text)

    return {
        "num_urls": len(urls),
        "num_ip_urls": len(IP_URL_REGEX.findall(text)),
        "has_shortener": int(any(s in text_lower for s in SHORTENER_DOMAINS)),
        "num_suspicious_keywords": sum(text_lower.count(k) for k in SUSPICIOUS_KEYWORDS),
        "num_exclaims": text.count("!"),
        "num_upper_words": sum(1 for w in words if w.isupper() and len(w) > 1),
        "has_generic_greeting": int(bool(
            re.search(r"dear (customer|user|valued|member)", text_lower))),
        "num_dollar": text.count("$"),
        "email_length": len(text),
        "num_special_chars": len(re.findall(r"[^\w\s]", text)),
    }


def build_feature_frame(df: pd.DataFrame) -> pd.DataFrame:
    """Attach engineered numeric features alongside the raw email text."""
    feats = df["email_text"].apply(extract_manual_features).apply(pd.Series)
    out = pd.concat(
        [df[["email_text"]].reset_index(drop=True), feats.reset_index(drop=True)],
        axis=1,
    )
    return out


# ===========================================================================
# 2. DATA LOADING
# ===========================================================================

def load_data(path="email_dataset.csv") -> pd.DataFrame:
    if not os.path.exists(path) or "template_id" not in pd.read_csv(path, nrows=1).columns:
        print(f"No (up-to-date) dataset found at {path} — generating a synthetic one...")
        df = build_dataset(n_per_class=350, hard_fraction=0.3)
        df.to_csv(path, index=False)
    else:
        df = pd.read_csv(path)
    return df


def template_grouped_split(df: pd.DataFrame, test_size: float = 0.2, random_state: int = 42):
    """Split rows into train/test by `template_id` (per class), so the exact
    wording of a template never appears in both sets.

    A plain random row split would leak near-duplicate phrasing (same
    template, different name/date slots) into both train and test, letting
    the model "memorize" template identity instead of learning generalizable
    signal - which inflates test accuracy to a misleadingly perfect score.
    Splitting by template forces the model to classify wording it has never
    seen before, which is a fairer stand-in for how it would perform on a
    brand-new email.
    """
    train_idx, test_idx = [], []
    for label, group in df.groupby("label"):
        splitter = GroupShuffleSplit(n_splits=1, test_size=test_size,
                                      random_state=random_state)
        tr, te = next(splitter.split(group, groups=group["template_id"]))
        train_idx.extend(group.index[tr].tolist())
        test_idx.extend(group.index[te].tolist())
    return df.loc[train_idx].sample(frac=1, random_state=random_state), \
        df.loc[test_idx].sample(frac=1, random_state=random_state)


# ===========================================================================
# 3. PREPROCESSING + MODELS
# ===========================================================================

def make_preprocessor() -> ColumnTransformer:
    """TF-IDF on the email text + scaled engineered numeric features."""
    return ColumnTransformer(transformers=[
        ("tfidf", TfidfVectorizer(
            max_features=3000, stop_words="english",
            ngram_range=(1, 2), min_df=2), "email_text"),
        ("num", MinMaxScaler(), NUMERIC_COLS),
    ])


CANDIDATE_MODELS = {
    "Multinomial Naive Bayes": MultinomialNB(),
    "Logistic Regression": LogisticRegression(max_iter=1000, random_state=RANDOM_STATE),
    "Random Forest": RandomForestClassifier(n_estimators=300, random_state=RANDOM_STATE),
}


def analyze_top_features(pipe: Pipeline, model_name: str, top_n: int = 12) -> None:
    """Print the features that most strongly drive each classification."""
    preprocess = pipe.named_steps["preprocess"]
    clf = pipe.named_steps["clf"]
    tfidf = preprocess.named_transformers_["tfidf"]
    feature_names = list(tfidf.get_feature_names_out()) + NUMERIC_COLS

    if hasattr(clf, "coef_"):
        coefs = clf.coef_[0]
        top_phish = np.argsort(coefs)[-top_n:][::-1]
        top_safe = np.argsort(coefs)[:top_n]
        print(f"\nTop signals pushing toward PHISHING:")
        for idx in top_phish:
            print(f"  {feature_names[idx]:<28s} weight={coefs[idx]:+.3f}")
        print(f"\nTop signals pushing toward SAFE:")
        for idx in top_safe:
            print(f"  {feature_names[idx]:<28s} weight={coefs[idx]:+.3f}")
    elif hasattr(clf, "feature_importances_"):
        importances = clf.feature_importances_
        top_idx = np.argsort(importances)[-top_n:][::-1]
        print(f"\nTop {top_n} most important features:")
        for idx in top_idx:
            print(f"  {feature_names[idx]:<28s} importance={importances[idx]:.4f}")


# ===========================================================================
# 4. MAIN
# ===========================================================================

def main():
    print("=" * 64)
    print("PHISHING EMAIL DETECTION — Scikit-learn Pipeline")
    print("=" * 64)

    # ---- Load & prepare data ----
    df = load_data()
    n_phish = (df.label == "phishing").sum()
    n_legit = (df.label == "legitimate").sum()
    print(f"\nLoaded {len(df)} emails  ({n_phish} phishing / {n_legit} legitimate)")

    train_df, test_df = template_grouped_split(df, test_size=0.2, random_state=RANDOM_STATE)
    feat_df_train = build_feature_frame(train_df)
    feat_df_test = build_feature_frame(test_df)
    label_map = {"legitimate": 0, "phishing": 1}
    y_train = train_df["label"].map(label_map)
    y_test = test_df["label"].map(label_map)
    X_train, X_test = feat_df_train, feat_df_test

    print(f"Train size: {len(X_train)}  |  Test size: {len(X_test)}"
          f"  (split by template, not by row, so wording in the test set"
          f" was never seen during training)")

    # ---- Train & compare candidate models ----
    print("\n" + "-" * 64)
    print("Model comparison (held-out test accuracy)")
    print("-" * 64)

    results, fitted_pipelines = {}, {}
    for name, clf in CANDIDATE_MODELS.items():
        pipe = Pipeline([("preprocess", make_preprocessor()), ("clf", clf)])
        pipe.fit(X_train, y_train)
        preds = pipe.predict(X_test)
        acc = accuracy_score(y_test, preds)
        results[name] = acc
        fitted_pipelines[name] = pipe
        print(f"  {name:<28s} accuracy = {acc:.4f}")

    best_name = max(results, key=results.get)
    best_pipe = fitted_pipelines[best_name]
    print(f"\n>> Best model: {best_name}  (accuracy = {results[best_name]:.4f})")

    # ---- Full evaluation of the best model ----
    y_pred = best_pipe.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    cm = confusion_matrix(y_test, y_pred)
    report = classification_report(y_test, y_pred, target_names=["Safe", "Phishing"])

    print("\n" + "=" * 64)
    print(f"FINAL MODEL EVALUATION — {best_name}")
    print("=" * 64)
    print(f"\nAccuracy: {acc:.4f}  ({acc * 100:.2f}%)")

    print("\nConfusion Matrix:")
    print("                    Predicted Safe   Predicted Phishing")
    print(f"Actual Safe             {cm[0][0]:<6}            {cm[0][1]:<6}")
    print(f"Actual Phishing         {cm[1][0]:<6}            {cm[1][1]:<6}")

    print("\nClassification Report:")
    print(report)

    analyze_top_features(best_pipe, best_name)

    # ---- Plot confusion matrix ----
    fig, ax = plt.subplots(figsize=(5.5, 4.6))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
                xticklabels=["Safe", "Phishing"],
                yticklabels=["Safe", "Phishing"], ax=ax, cbar=False,
                annot_kws={"size": 14})
    ax.set_xlabel("Predicted label")
    ax.set_ylabel("True label")
    ax.set_title(f"Confusion Matrix — {best_name}\nAccuracy: {acc * 100:.2f}%")
    plt.tight_layout()
    plt.savefig("confusion_matrix.png", dpi=150)
    plt.close(fig)
    print("\nSaved confusion matrix plot -> confusion_matrix.png")

    # ---- Save trained pipeline ----
    joblib.dump(best_pipe, "phishing_model.joblib")
    print("Saved trained pipeline    -> phishing_model.joblib")

    # ---- Demo on brand-new, unseen emails ----
    demo_emails = [
        "Subject: Your account has been suspended\n\nDear Customer, We "
        "noticed suspicious activity on your account. Click here "
        "immediately to verify your identity: http://192.168.1.5/verify "
        "or your account will be permanently closed within 24 hours!!!",

        "Subject: Lunch tomorrow?\n\nHey, are you free for lunch tomorrow "
        "around 1pm? Let me know if the usual place works for you.\n\n"
        "Thanks,\nJordan",

        "Subject: Congratulations! Claim your prize now\n\nYou have won a "
        "$1000 Amazon gift card! Click http://amazon-rewards.xyz/claim now "
        "and enter your card details before this offer expires.",

        "Subject: Q3 budget review notes\n\nHi team, attached are the "
        "notes from this morning's budget review. Please review before "
        "Friday's follow-up meeting.\n\nBest,\nMorgan",
    ]

    demo_df = pd.DataFrame({"email_text": demo_emails})
    demo_feat = build_feature_frame(demo_df)
    demo_preds = best_pipe.predict(demo_feat)
    demo_probs = (best_pipe.predict_proba(demo_feat)
                  if hasattr(best_pipe.named_steps["clf"], "predict_proba") else None)

    print("\n" + "=" * 64)
    print("DEMO — classifying new, unseen emails")
    print("=" * 64)
    for i, email in enumerate(demo_emails):
        label = "Phishing" if demo_preds[i] == 1 else "Safe"
        subject = email.split("\n")[0].replace("Subject: ", "")
        conf = ""
        if demo_probs is not None:
            conf = f"  (confidence: {demo_probs[i][demo_preds[i]] * 100:.1f}%)"
        feats = extract_manual_features(email)
        print(f"\n[{label}]{conf}")
        print(f"  Subject: \"{subject}\"")
        print(f"  -> urls={feats['num_urls']}, "
              f"suspicious_keywords={feats['num_suspicious_keywords']}, "
              f"shortened_link={bool(feats['has_shortener'])}, "
              f"exclamations={feats['num_exclaims']}")

    print("\nDone.")


if __name__ == "__main__":
    main()
