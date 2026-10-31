"""Audit logging helper.

Thin wrapper around the ``audit_logs`` table so call sites stay one-liners.
Never raises — auditing must not break the request.
"""
from typing import Optional

from sqlalchemy.orm import Session

from ..models.academic import AuditLog


def log_audit(
    db: Session,
    user_id: Optional[int],
    action: str,
    entity_type: str = "system",
    entity_id: str = "-",
    ip_address: Optional[str] = None,
    details: Optional[str] = None,
) -> None:
    """Record an administrative/security action."""
    try:
        db.add(AuditLog(
            user_id=user_id,
            action=action,
            target_type=entity_type,
            target_id=str(entity_id),
            ip_address=ip_address,
            details=details,
        ))
        db.commit()
    except Exception as exc:
        db.rollback()
        print(f"[AUDIT-FAILED] {action}: {exc}")
