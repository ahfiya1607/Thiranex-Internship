# Phishing Email Detection Model

A Scikit-learn pipeline that classifies emails as **Phishing** or **Safe**
using a combination of TF-IDF text features and hand-engineered,
security-relevant features (URL counts, suspicious keywords, urgency
markers, etc.).

## Files

| File | Purpose |
|---|---|
| `generate_dataset.py` | Builds the labeled training dataset (`email_dataset.csv`) |
| `phishing_detector.py` | Feature engineering, model training, evaluation, demo |
| `email_dataset.csv` | 657 labeled emails (338 safe / 319 phishing) |
| `confusion_matrix.png` | Confusion matrix for the best model |
| `phishing_model.joblib` | The trained, ready-to-reuse pipeline |

## Run it

```bash
pip install scikit-learn pandas numpy matplotlib seaborn joblib
python3 phishing_detector.py
```

This prints model comparison results, accuracy, a confusion matrix
(text + saved PNG), a classification report, the top features driving each
class, and a demo classification of four brand-new example emails.

## How it works

**1. Dataset.** No labeled corpus was supplied, so `generate_dataset.py`
builds one from templates (account-suspension scams, prize scams, billing
emails, meeting reminders, order receipts, etc.) with randomized names,
dates, and domains. About 30% of each class is drawn from a "hard" template
pool deliberately designed to blur the line between classes:
- **Hard-legit**: real companies *do* send urgent, link-containing emails
  (password expiry notices, flash sales, payment-failed reminders) — these
  use urgency language and links from a *legitimate* domain.
- **Hard-phishing**: skilled phishing (business email compromise, invoice
  fraud, fake doc-share links) that avoids obvious red flags like exclamation
  marks or a pile of scare words.

This keeps the task realistic — a model trained only on "obvious" phishing
would look artificially perfect and fail on real-world edge cases.

**2. Feature engineering.** Each email is scored on: URL count, IP-address
URLs, shortened links (bit.ly, tinyurl, etc.), a suspicious-keyword count
("verify", "urgent", "suspended", "gift card", ...), exclamation marks,
ALL-CAPS word count, generic greetings ("Dear Customer"), dollar-sign
mentions, message length, and special-character density. These are combined
with a TF-IDF vectorization (unigrams + bigrams) of the raw email text via a
`ColumnTransformer`.

**3. Models.** Multinomial Naive Bayes, Logistic Regression, and Random
Forest are trained and compared; the best on held-out accuracy is used for
the final evaluation, confusion matrix, and top-feature analysis.

**4. Evaluation split.** Train/test is split **by template**, not by row
(via `GroupShuffleSplit`, grouped on a `template_id` column) — so no exact
phrasing appears in both sets. A naive random row split would let the model
partly memorize a template's fixed wording (since only names/dates vary
between copies), inflating test accuracy to a misleading ~100%.

## Typical result

```
Random Forest — Accuracy: 97.4%

                  Predicted Safe   Predicted Phishing
Actual Safe            87                0
Actual Phishing         4               61
```

Zero false positives, a handful of false negatives — mostly the "hard"
business-email-compromise style phishing that has no URL or classic scare
keywords, which is a realistic limitation of content-based filters (that's
why real-world defenses combine this kind of model with sender
authentication like SPF/DKIM/DMARC, not text analysis alone).

## Using a real dataset instead

The pipeline only needs a CSV with `email_text` and `label` columns
(`label` = `"phishing"` or `"legitimate"`). To use a real corpus (e.g. the
Nazario phishing corpus, SpamAssassin public corpus, or a Kaggle phishing
email dataset):

1. Load your data into a DataFrame with those two column names.
2. Add a `template_id` column — if you don't need template-grouped
   splitting, just set it to the row index (`df["template_id"] = df.index`)
   and it'll fall back to an effectively random split.
3. Save as `email_dataset.csv` and re-run `phishing_detector.py`.

## Classifying a new email

```python
import joblib, pandas as pd
from phishing_detector import build_feature_frame

pipe = joblib.load("phishing_model.joblib")
email = pd.DataFrame({"email_text": ["Subject: ...\n\n..."]})
pred = pipe.predict(build_feature_frame(email))[0]
print("Phishing" if pred == 1 else "Safe")
```
