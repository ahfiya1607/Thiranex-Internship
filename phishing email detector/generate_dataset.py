"""
generate_dataset.py
--------------------
Builds a labeled dataset of phishing vs. legitimate emails for training
the classifier in phishing_detector.py.

No public dataset was supplied, so this script generates a realistic
synthetic corpus using template-based construction with randomized
slot-filling (brand names, urgency phrases, links, sender names, etc.).
This keeps the dataset varied enough for meaningful ML training while
remaining fully self-contained and reproducible (fixed random seed).

Output: email_dataset.csv  (columns: email_text, label)
label is one of: "phishing", "legitimate"
"""

import random
import pandas as pd

random.seed(42)

# ---------------------------------------------------------------------------
# Building blocks for PHISHING emails
# ---------------------------------------------------------------------------

BRANDS = ["PayPal", "Amazon", "Netflix", "Microsoft 365", "Bank of America",
          "Chase Bank", "Apple ID", "LinkedIn", "DHL", "FedEx", "Instagram",
          "Google", "HDFC Bank", "ICICI Bank", "Facebook", "Dropbox"]

PHISH_SUBJECTS = [
    "Urgent: Your {brand} account has been suspended",
    "Action Required: Verify your {brand} account immediately",
    "Congratulations! You have won a {brand} gift card",
    "Payment Failed - Update your {brand} billing information now",
    "Security Alert: Unusual sign-in activity on your {brand} account",
    "Final Notice: {brand} account limited due to suspicious activity",
    "Your package could not be delivered - {brand} action needed",
]

PHISH_LINK_DOMAINS = [
    "secure-{brand_lower}-verify.com", "{brand_lower}-account-update.net",
    "login-{brand_lower}-support.info", "{brand_lower}security-check.xyz",
    "192.168.44.201/verify", "45.33.102.19/login",
    "bit.ly/3xK9zQw", "tinyurl.com/verify-now-2024", "goo.gl/aB3xYz",
    "{brand_lower}.com.verify-secure-login.ru", "account-{brand_lower}.top",
]

PHISH_BODY_TEMPLATES = [
    "Dear Customer,\n\nWe detected unusual activity on your {brand} account. "
    "Your account has been temporarily limited. To restore full access, you "
    "must verify your identity immediately by clicking the link below:\n\n"
    "http://{link}\n\nFailure to verify within 24 hours will result in "
    "permanent suspension of your account. This is your final warning!!!\n\n"
    "Regards,\n{brand} Security Team",

    "URGENT ACTION REQUIRED\n\nDear Valued Customer,\n\nYour {brand} password "
    "will expire today. Click here to update your password now and avoid "
    "losing access: http://{link}\n\nPlease act now, this offer expires soon. "
    "Enter your username and password to confirm your identity.\n\n"
    "{brand} Support",

    "Congratulations!!! You have been selected to receive a $500 {brand} gift "
    "card. Claim your prize now before it expires: http://{link}\n\n"
    "Limited time offer! Click here now and enter your card details to "
    "verify eligibility. Don't miss out on this amazing opportunity!",

    "Dear user,\n\nWe were unable to process your recent payment. Your "
    "{brand} account is now on hold. Please update your billing details "
    "immediately at http://{link} to avoid service interruption. "
    "Verify your account, password and card number to continue.\n\n"
    "Thank you,\nBilling Department",

    "Hello,\n\nThis is an automated security alert from {brand}. We noticed "
    "a login attempt from an unrecognized device. If this wasn't you, your "
    "account may be compromised. Confirm your identity immediately: "
    "http://{link}\n\nAct fast, your account will be suspended in 24 hours "
    "if no action is taken.",

    "ATTENTION: Your {brand} account has been flagged for suspicious "
    "activity. To avoid permanent account closure, verify your information "
    "now: http://{link} - Enter your full name, password and social "
    "security number to confirm your identity. This is time sensitive!",

    "Dear Customer,\n\nYour parcel could not be delivered due to an unpaid "
    "customs fee. Please pay $2.99 to release your package: http://{link}\n\n"
    "Failure to pay within 48 hours will result in the package being "
    "returned. Click here now to avoid delays.",
]

# ---------------------------------------------------------------------------
# Building blocks for LEGITIMATE emails
# ---------------------------------------------------------------------------

LEGIT_SUBJECTS = [
    "Meeting reminder: Project sync at 3 PM tomorrow",
    "Receipt for your recent order",
    "Catching up - coffee next week?",
    "Notes from today's team standup",
    "Reminder: Submit your timesheet by Friday",
    "Welcome to the team!",
    "Your monthly statement is ready",
    "Photos from the weekend trip",
    "Draft agenda for Thursday's review",
    "Your weekly newsletter from {brand}",
]

LEGIT_SENDER_NAMES = ["Priya", "Arjun", "Sarah", "Michael", "Divya", "Karthik",
                       "Emma", "Rahul", "Anjali", "David", "Meera", "James"]

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
TIMES = ["10 AM", "11:30 AM", "2 PM", "3 PM", "4:30 PM"]
MONTHS = ["January", "February", "March", "April", "May", "June", "July",
          "August", "September", "October", "November", "December"]
ROOMS = ["Conference Room A", "the usual conference room", "the 4th floor room",
         "the main meeting room"]

LEGIT_BODY_TEMPLATES = [
    "Hi team,\n\nJust a reminder that we have our project sync scheduled for "
    "{time} on {day} in {room}. Please review the attached agenda "
    "beforehand and come prepared with your status updates.\n\n"
    "Thanks,\n{sender}",

    "Hello,\n\nThanks for your order! Your receipt is attached below. Your "
    "order #{orderid} will be shipped within 3-5 business days. You can "
    "track your shipment at https://{domain}/orders/{orderid} at any time.\n\n"
    "Best,\nCustomer Service",

    "Hi {sender2},\n\nHope you're doing well! Wanted to see if you're free "
    "for coffee sometime next week to catch up. Does {day} around {time} "
    "work for you?\n\nTalk soon,\n{sender}",

    "Hi all,\n\nHere are the notes from today's standup:\n- Backend API "
    "work is on track\n- QA finished testing the login module\n- Next "
    "sprint planning is scheduled for {day}\n\nLet me know if I missed "
    "anything.\n\nCheers,\n{sender}",

    "Dear {sender2},\n\nThis is a friendly reminder to submit your "
    "timesheet for this week by end of day {day}. You can log in to the "
    "HR portal at https://{domain}/hr/timesheet to update your hours.\n\n"
    "Thanks,\nHR Team",

    "Hi {sender2},\n\nWelcome aboard! We're excited to have you join the "
    "team starting {day}. Your manager will send over your onboarding "
    "schedule shortly. Let us know if you have any questions before "
    "your first day.\n\nWarm regards,\n{sender}",

    "Hello,\n\nYour {month} account statement is now available at "
    "https://{domain}/statements. Log in through the official app or "
    "website to view your transaction history and current balance.\n\n"
    "Thank you for banking with us.",

    "Hi {sender2},\n\nAttached are the photos from our trip last weekend. "
    "It was so much fun, we should plan another one soon! Let me know "
    "which ones you'd like printed.\n\nBest,\n{sender}",

    "Hi team,\n\nHere's the draft agenda for {day}'s review meeting:\n"
    "1. Q3 progress recap\n2. Budget discussion\n3. Open questions\n\n"
    "Please add any additional topics you'd like to cover before "
    "{time}.\n\nThanks,\n{sender}",

    "Hello,\n\nThank you for subscribing to our newsletter. This {month} "
    "we cover product updates, upcoming webinars, and community "
    "highlights. You can manage your subscription preferences at "
    "https://{domain}/preferences at any time.\n\nBest,\nThe {brand} Team",
]


# ---------------------------------------------------------------------------
# "Hard" examples: these deliberately blur the line between the two classes
# so the dataset isn't trivially separable on keywords/URLs alone. Real
# phishing detection has to deal with exactly this kind of overlap - legit
# companies do send urgent password-reset and flash-sale emails, and skilled
# phishers write calm, low-keyword messages (business email compromise,
# typosquatted domains) - so a model trained only on "obvious" examples would
# look great in-sample and fail in the real world.
# ---------------------------------------------------------------------------

HARD_LEGIT_SUBJECTS_BODIES = [
    ("Verify your new sign-in",
     "Hi {sender2},\n\nWe noticed a sign-in to your {brand} account from a new "
     "device just now. If this was you, no action is needed. If not, please "
     "reset your password immediately at https://{domain}/security.\n\n"
     "{brand} Account Security"),

    ("Reminder: your subscription renews tomorrow",
     "Hi {sender2},\n\nThis is a friendly reminder that your {brand} "
     "subscription renews tomorrow. Review or update your billing details "
     "at https://{domain}/billing before it renews. No action is needed if "
     "everything looks correct.\n\nThanks,\n{brand} Billing"),

    ("Flash Sale - 24 hours only!",
     "Hi {sender2},\n\nOur biggest sale of the season ends in 24 hours! "
     "Act now and save up to 40% site-wide at https://{domain}/sale before "
     "it's gone. Don't miss out!\n\n{brand} Marketing Team"),

    ("Action needed: confirm your enrollment",
     "Dear {sender2},\n\nPlease verify your enrollment for this semester by "
     "confirming your details at https://{domain}/portal by {day}. This is "
     "required to keep your registration active.\n\nRegistrar's Office"),

    ("Your payment could not be processed",
     "Hi {sender2},\n\nWe were unable to process your last payment. To avoid "
     "any interruption to your account, please update your payment method "
     "at https://{domain}/billing at your earliest convenience.\n\n"
     "{brand} Billing Team"),

    ("Password expiring soon",
     "Hello {sender2},\n\nYour company password will expire in 3 days. "
     "Please update it at https://intranet.{domain}/password before then "
     "to avoid being locked out. Contact the helpdesk if you have "
     "trouble.\n\nIT Department"),
]

HARD_PHISH_SUBJECTS_BODIES = [
    ("Quick favor",
     "Hi {sender2},\n\nAre you at your desk? I need you to handle something "
     "for me discreetly before my next meeting - I can't talk right now. "
     "Let me know as soon as you see this.\n\nThanks,\n{sender}"),

    ("Vendor payment details updated",
     "Hi {sender2},\n\nOur bank recently updated its details for incoming "
     "payments. Could you update the vendor record with the new account "
     "information I've attached and process this week's invoice against "
     "it? Let me know once it's done.\n\nRegards,\n{sender}"),

    ("Invoice attached - please review",
     "Hi {sender2},\n\nPlease review the attached invoice and process "
     "payment by {day}. Let me know if you have any questions about the "
     "amount. You can also view it directly here: http://{link}\n\n"
     "Regards,\nAccounts Team"),

    ("Shared document: Q3 Budget.xlsx",
     "{sender} shared 'Q3_Budget.xlsx' with you.\n\nClick below to view the "
     "document:\n\nhttp://{link}\n\nThis link will expire in 7 days."),

    ("Following up on our call",
     "Hi {sender2},\n\nFollowing up from our call earlier - could you send "
     "over the updated document we discussed? Here's the shared folder "
     "again in case you lost the link: http://{link}\n\nThanks,\n{sender}"),

    ("Re: Outstanding balance",
     "Hi {sender2},\n\nOur records show an outstanding balance on your "
     "account. To keep things on track, please review and settle it at "
     "your earliest convenience: http://{link}\n\nBest,\nAccounts Receivable"),
]


def make_phishing_email(hard: bool = False):
    brand = random.choice(BRANDS)
    if hard:
        idx = random.randrange(len(HARD_PHISH_SUBJECTS_BODIES))
        subj_tmpl, body_tmpl = HARD_PHISH_SUBJECTS_BODIES[idx]
        sender = random.choice(LEGIT_SENDER_NAMES)
        sender2 = random.choice([n for n in LEGIT_SENDER_NAMES if n != sender])
        link_template = random.choice(PHISH_LINK_DOMAINS)
        link = link_template.format(brand_lower=brand.lower().replace(" ", ""))
        body = body_tmpl.format(sender=sender, sender2=sender2,
                                 day=random.choice(DAYS), link=link)
        template_id = f"phish_hard_{idx}"
        return f"Subject: {subj_tmpl}\n\n{body}", template_id

    idx = random.randrange(len(PHISH_SUBJECTS))
    subject = PHISH_SUBJECTS[idx].format(brand=brand)
    link_template = random.choice(PHISH_LINK_DOMAINS)
    link = link_template.format(brand_lower=brand.lower().replace(" ", ""))
    body = PHISH_BODY_TEMPLATES[idx].format(brand=brand, link=link)
    template_id = f"phish_easy_{idx}"
    return f"Subject: {subject}\n\n{body}", template_id


def make_legitimate_email(hard: bool = False):
    brand = random.choice(BRANDS + ["Acme Corp", "TechWave", "Crescent Weekly"])
    domain = brand.lower().replace(" ", "") + ".com"
    sender = random.choice(LEGIT_SENDER_NAMES)
    sender2 = random.choice([n for n in LEGIT_SENDER_NAMES if n != sender])

    if hard:
        idx = random.randrange(len(HARD_LEGIT_SUBJECTS_BODIES))
        subj_tmpl, body_tmpl = HARD_LEGIT_SUBJECTS_BODIES[idx]
        body = body_tmpl.format(brand=brand, sender=sender, sender2=sender2,
                                 day=random.choice(DAYS), domain=domain)
        template_id = f"legit_hard_{idx}"
        return f"Subject: {subj_tmpl}\n\n{body}", template_id

    idx = random.randrange(len(LEGIT_SUBJECTS))
    subject = LEGIT_SUBJECTS[idx].format(brand=brand)
    orderid = random.randint(100000, 999999)
    body = LEGIT_BODY_TEMPLATES[idx].format(
        brand=brand, sender=sender, sender2=sender2, orderid=orderid,
        day=random.choice(DAYS), time=random.choice(TIMES),
        month=random.choice(MONTHS), room=random.choice(ROOMS), domain=domain)
    template_id = f"legit_easy_{idx}"
    return f"Subject: {subject}\n\n{body}", template_id


def build_dataset(n_per_class=250, hard_fraction=0.3):
    """Build the labeled dataset.

    hard_fraction controls what proportion of each class is drawn from the
    "hard" template pools (legit-but-urgent / phishing-but-low-signal). A
    nonzero fraction keeps the classification task realistic - i.e. not
    perfectly separable - so accuracy/confusion-matrix results reflect
    genuine model behavior rather than a trivial keyword lookup.

    Each row also carries a `template_id`. This lets the training script
    split train/test by template (see phishing_detector.py) instead of by
    row, so the same underlying wording never appears in both sets - a
    row-random split would let the model "memorize" a template's fixed
    phrasing rather than actually learning to generalize.
    """
    rows = []
    for _ in range(n_per_class):
        is_hard = random.random() < hard_fraction
        text, tmpl_id = make_phishing_email(hard=is_hard)
        rows.append({"email_text": text, "label": "phishing", "template_id": tmpl_id})
    for _ in range(n_per_class):
        is_hard = random.random() < hard_fraction
        text, tmpl_id = make_legitimate_email(hard=is_hard)
        rows.append({"email_text": text, "label": "legitimate", "template_id": tmpl_id})
    df = pd.DataFrame(rows)
    # shuffle
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)
    # drop exact-duplicate texts if template collisions happened
    df = df.drop_duplicates(subset="email_text").reset_index(drop=True)
    return df


if __name__ == "__main__":
    dataset = build_dataset(n_per_class=350, hard_fraction=0.3)
    dataset.to_csv("email_dataset.csv", index=False)
    print(f"Generated {len(dataset)} emails")
    print(dataset["label"].value_counts())
