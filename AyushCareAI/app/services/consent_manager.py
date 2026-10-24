"""Consent Manager — Module D consent lifecycle management.

Handles:
- Granular consent scope management (DPDPA 2023 compliant)
- Consent receipt generation with TTL
- Consent withdrawal
- Audit trail for all consent operations
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta
from typing import Optional

import structlog

from app.models.consent import (
    ConsentReceipt,
    ConsentScope,
    ConsentScopeId,
    ConsentStatus,
)

logger = structlog.get_logger(__name__)


# ── Scope Definitions ────────────────────────────────────────────────────

SCOPE_DEFINITIONS: dict[ConsentScopeId, dict] = {
    ConsentScopeId.CLINICAL_INTAKE: {
        "title": "Clinical History Collection",
        "title_hi": "नैदानिक इतिहास संग्रह",
        "purpose": "Allow the system to collect and process your medical history through conversation.",
        "purpose_hi": "बातचीत के माध्यम से आपके चिकित्सा इतिहास को एकत्र और संसाधित करने की अनुमति दें।",
        "required": True,
    },
    ConsentScopeId.DOCUMENT_PROCESSING: {
        "title": "Medical Document Processing",
        "title_hi": "चिकित्सा दस्तावेज़ प्रसंस्करण",
        "purpose": "Allow the system to digitize and extract information from uploaded medical documents.",
        "purpose_hi": "अपलोड किए गए चिकित्सा दस्तावेज़ों को डिजिटाइज़ करने और जानकारी निकालने की अनुमति दें।",
        "required": False,
    },
    ConsentScopeId.HIS_ABDM_SHARING: {
        "title": "HIS / ABDM Data Sharing",
        "title_hi": "HIS / ABDM डेटा साझाकरण",
        "purpose": "Allow sharing of your clinical data with the Hospital Information System and Ayushman Bharat Digital Mission.",
        "purpose_hi": "अपने नैदानिक डेटा को अस्पताल सूचना प्रणाली और आयुष्मान भारत डिजिटल मिशन के साथ साझा करने की अनुमति दें।",
        "required": False,
    },
}

DEFAULT_CONSENT_TTL_MINUTES = 30


class ConsentManager:
    """Manages consent lifecycle for MediKiosk sessions."""

    def get_scope_definitions(self, language: str = "en") -> list[ConsentScope]:
        """Return all consent scopes with their current definitions."""
        scopes = []
        for scope_id, defn in SCOPE_DEFINITIONS.items():
            if language == "hi":
                title = defn.get("title_hi", defn["title"])
                purpose = defn.get("purpose_hi", defn["purpose"])
            else:
                title = defn["title"]
                purpose = defn["purpose"]

            scopes.append(ConsentScope(
                id=scope_id,
                title=title,
                title_local=defn.get("title_hi") if language != "hi" else None,
                purpose=purpose,
                purpose_local=defn.get("purpose_hi") if language != "hi" else None,
                required=defn["required"],
                status=ConsentStatus.DECLINED,  # Default until explicitly granted
            ))
        return scopes

    def create_receipt(
        self,
        session_id: str,
        clinical_intake: bool,
        document_processing: bool = False,
        his_abdm_sharing: bool = False,
        ttl_minutes: int = DEFAULT_CONSENT_TTL_MINUTES,
    ) -> ConsentReceipt:
        """Create an immutable consent receipt.

        Args:
            session_id: Session this consent belongs to.
            clinical_intake: Required consent for clinical history.
            document_processing: Optional consent for document OCR.
            his_abdm_sharing: Optional consent for ABDM sharing.
            ttl_minutes: Consent expiry in minutes.

        Returns:
            ConsentReceipt with all scopes and their statuses.

        Raises:
            ValueError: If required consent (clinical_intake) is not granted.
        """
        if not clinical_intake:
            raise ValueError(
                "Clinical intake consent is required to proceed. "
                "The patient must consent to history collection."
            )

        now = datetime.utcnow()
        scopes = [
            ConsentScope(
                id=ConsentScopeId.CLINICAL_INTAKE,
                title=SCOPE_DEFINITIONS[ConsentScopeId.CLINICAL_INTAKE]["title"],
                purpose=SCOPE_DEFINITIONS[ConsentScopeId.CLINICAL_INTAKE]["purpose"],
                required=True,
                status=ConsentStatus.GRANTED,
            ),
            ConsentScope(
                id=ConsentScopeId.DOCUMENT_PROCESSING,
                title=SCOPE_DEFINITIONS[ConsentScopeId.DOCUMENT_PROCESSING]["title"],
                purpose=SCOPE_DEFINITIONS[ConsentScopeId.DOCUMENT_PROCESSING]["purpose"],
                required=False,
                status=ConsentStatus.GRANTED if document_processing else ConsentStatus.DECLINED,
            ),
            ConsentScope(
                id=ConsentScopeId.HIS_ABDM_SHARING,
                title=SCOPE_DEFINITIONS[ConsentScopeId.HIS_ABDM_SHARING]["title"],
                purpose=SCOPE_DEFINITIONS[ConsentScopeId.HIS_ABDM_SHARING]["purpose"],
                required=False,
                status=ConsentStatus.GRANTED if his_abdm_sharing else ConsentStatus.DECLINED,
            ),
        ]

        receipt = ConsentReceipt(
            id=f"consent_{uuid.uuid4().hex[:12]}",
            session_id=session_id,
            created_at=now,
            expires_at=now + timedelta(minutes=ttl_minutes),
            scopes=scopes,
        )

        logger.info(
            "consent_receipt_created",
            session_id=session_id,
            receipt_id=receipt.id,
            scopes_granted=[
                s.id.value for s in scopes if s.status == ConsentStatus.GRANTED
            ],
            expires_at=receipt.expires_at.isoformat(),
        )

        return receipt

    def withdraw_scope(
        self,
        receipt: ConsentReceipt,
        scope_id: ConsentScopeId,
    ) -> ConsentReceipt:
        """Withdraw consent for a specific scope.

        Args:
            receipt: Current consent receipt.
            scope_id: Scope to withdraw.

        Returns:
            Updated receipt with the scope withdrawn.

        Raises:
            ValueError: If trying to withdraw required consent.
        """
        for scope in receipt.scopes:
            if scope.id == scope_id:
                if scope.required:
                    raise ValueError(
                        f"Cannot withdraw required consent scope '{scope_id.value}'. "
                        "End the session instead."
                    )
                scope.status = ConsentStatus.WITHDRAWN
                logger.info(
                    "consent_withdrawn",
                    session_id=receipt.session_id,
                    scope_id=scope_id.value,
                )
                break

        return receipt

    def is_scope_granted(
        self,
        receipt: ConsentReceipt,
        scope_id: ConsentScopeId,
    ) -> bool:
        """Check if a specific consent scope is currently granted and not expired."""
        if datetime.utcnow() > receipt.expires_at:
            return False
        for scope in receipt.scopes:
            if scope.id == scope_id:
                return scope.status == ConsentStatus.GRANTED
        return False
