"""Language detection service using Bhashini.

Supports both text and audio language detection for auto-detecting
patient's spoken/written language at the kiosk.
"""

from __future__ import annotations

from typing import Any

import structlog

from app.config import Settings

logger = structlog.get_logger(__name__)


class LanguageDetectionError(Exception):
    """Raised when language detection fails."""


class LanguageDetectionService:
    """Bhashini-powered text and audio language detection."""

    def __init__(self, bhashini_client: Any, settings: Settings) -> None:
        self._bhashini = bhashini_client
        self._settings = settings

    @property
    def is_available(self) -> bool:
        return self._bhashini is not None

    async def detect_text_language(self, text: str) -> str:
        """Detect the language of a given text.

        Returns:
            ISO 639-1 language code (e.g. 'hi', 'ta', 'en').
        """
        if not text or not text.strip():
            return "en"

        if self._bhashini is None:
            raise LanguageDetectionError("Bhashini client not available.")

        try:
            result = await self._bhashini.detect_language_text(
                text=text,
                service_id=self._settings.bhashini_tld_model,
            )
            detected = result.get("detected_language", "en")

            logger.info(
                "text_language_detected",
                detected_language=detected,
                text_length=len(text),
            )

            return detected

        except Exception as e:
            logger.error("text_language_detection_failed", error=str(e))
            raise LanguageDetectionError(f"Text language detection failed: {e}") from e

    async def detect_audio_language(self, audio_base64: str) -> str:
        """Detect the language of spoken audio.

        Args:
            audio_base64: Base64-encoded audio data.

        Returns:
            ISO 639-1 language code.
        """
        if not audio_base64:
            return "en"

        if self._bhashini is None:
            raise LanguageDetectionError("Bhashini client not available.")

        try:
            result = await self._bhashini.detect_language_audio(
                audio_base64=audio_base64,
                service_id=self._settings.bhashini_ald_model,
            )
            detected = result.get("detected_language", "en")

            logger.info(
                "audio_language_detected",
                detected_language=detected,
            )

            return detected

        except Exception as e:
            logger.error("audio_language_detection_failed", error=str(e))
            raise LanguageDetectionError(f"Audio language detection failed: {e}") from e
