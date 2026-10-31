"""Email dispatch with a graceful fallback to the outbox table.

If SMTP is not configured, the email is printed to the console and persisted
in the ``outbox`` table with status ``logged`` so the admin UI can show it.
"""
import os
import smtplib
from email.mime.text import MIMEText

from sqlalchemy.orm import Session

from ..models.academic import Outbox


def _smtp_config():
    host = os.getenv("SMTP_HOST", "")
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER", "")
    password = os.getenv("SMTP_PASSWORD", "")
    sender = os.getenv("SMTP_FROM", user or "noreply@mit.edu")
    use_tls = os.getenv("SMTP_USE_TLS", "true").lower() != "false"
    return host, port, user, password, sender, use_tls


def send_email(db: Session, to_email: str, subject: str, body: str) -> str:
    """Send via SMTP when configured; otherwise log + persist to the outbox.

    Returns one of: 'sent', 'logged', 'failed'. Never raises.
    """
    if not to_email:
        return "failed"

    host, port, user, password, sender, use_tls = _smtp_config()

    if not host:
        print(f"[EMAIL-STUB] To: {to_email} | Subject: {subject}")
        db.add(Outbox(to_email=to_email, subject=subject, body=body, status="logged"))
        db.commit()
        return "logged"

    try:
        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"] = sender
        msg["To"] = to_email
        with smtplib.SMTP(host, port, timeout=10) as server:
            if use_tls:
                server.starttls()
            if user:
                server.login(user, password)
            server.sendmail(sender, [to_email], msg.as_string())
        db.add(Outbox(to_email=to_email, subject=subject, body=body, status="sent"))
        db.commit()
        return "sent"
    except Exception as exc:  # never break the request on email failure
        print(f"[EMAIL-FAILED] To: {to_email} | {exc}")
        try:
            db.add(Outbox(to_email=to_email, subject=subject, body=body, status="failed"))
            db.commit()
        except Exception:
            db.rollback()
        return "failed"
