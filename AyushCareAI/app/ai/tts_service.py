"""TTS (Text-to-Speech) service for reading questions aloud to patients.

Primary: Bhashini IITM TTS (24 Indian languages, government-backed).
Fallback: Microsoft Edge Neural TTS (free, no keys needed).
"""

from __future__ import annotations

import base64
from typing import Any, Optional

import structlog

from app.config import Settings
from app.domain.languages import get_bhashini_code

logger = structlog.get_logger(__name__)


class TTSError(Exception):
    """Raised when text-to-speech synthesis fails."""


# Microsoft Edge Neural Voices for Indian languages (Free, no keys needed)
_EDGE_VOICE_MAP: dict[str, str] = {
    "en": "en-IN-NeerjaNeural",
    "hi": "hi-IN-MadhurNeural",
    "bn": "bn-IN-BashkarNeural",
    "ta": "ta-IN-PallaviNeural",
    "te": "te-IN-MohanNeural",
    "mr": "mr-IN-AarohiNeural",
    "gu": "gu-IN-DhwaniNeural",
    "kn": "kn-IN-GaganNeural",
    "ml": "ml-IN-MidhunNeural",
    "pa": "hi-IN-MadhurNeural",
}


class TTSService:
    """Text-to-Speech service with Bhashini TTS + Edge TTS fallback."""

    def __init__(
        self,
        settings: Settings,
        bhashini_client: Any = None,
    ) -> None:
        self._settings = settings
        self._bhashini_client = bhashini_client

    @property
    def is_available(self) -> bool:
        if self._bhashini_client is not None:
            return True
        try:
            import edge_tts
            return True
        except ImportError:
            return False

    async def synthesize(
        self,
        text: str,
        language: str = "en",
        *,
        speaking_rate: float = 0.9,
        audio_encoding: str = "MP3",
    ) -> dict:
        """Convert text to speech audio.

        Priority: Bhashini IITM TTS (primary) → Edge Neural TTS (fallback).

        Args:
            text: Text to synthesize.
            language: 2-letter language code.
            speaking_rate: Speed of speech (0.25 to 4.0, default 0.9 for clarity).
            audio_encoding: Output format (defaults to "MP3").

        Returns:
            dict with keys: 'audio_base64', 'encoding', 'duration_estimate_sec'
        """
        # Primary: Bhashini TTS
        if self._bhashini_client and self._settings.tts_provider == "bhashini":
            try:
                return await self._synthesize_bhashini(text, language)
            except Exception as e:
                logger.warning("bhashini_tts_failed_trying_edge", error=str(e))

        # Fallback: Edge TTS
        return await self._synthesize_edge(text, language, speaking_rate, audio_encoding)

    async def _synthesize_bhashini(
        self,
        text: str,
        language: str = "en",
        gender: str = "female",
    ) -> dict:
        """Synthesize speech using Bhashini IITM TTS."""
        bhashini_lang = get_bhashini_code(language) or language

        result = await self._bhashini_client.tts(
            text=text,
            target_lang=bhashini_lang,
            gender=gender,
            service_id=self._settings.bhashini_tts_model,
        )

        duration_estimate = (len(text) / 5) / (150 * 0.9) * 60

        logger.info(
            "bhashini_tts_synthesis_complete",
            language=bhashini_lang,
            text_length=len(text),
        )

        return {
            "audio_base64": result.get("audio_base64", ""),
            "encoding": "WAV",
            "duration_estimate_sec": round(duration_estimate, 1),
        }

    async def _synthesize_edge(
        self,
        text: str,
        language: str = "en",
        speaking_rate: float = 0.9,
        audio_encoding: str = "MP3",
    ) -> dict:
        """Synthesize speech using Edge Neural TTS (fallback)."""
        try:
            import edge_tts

            voice = _EDGE_VOICE_MAP.get(language)
            if not voice:
                raise TTSError(f"TTS voice is not configured for language: {language}")
            rate_diff = int((speaking_rate - 1.0) * 100)
            rate_str = f"{rate_diff:+d}%"

            communicate = edge_tts.Communicate(text, voice, rate=rate_str)
            audio_chunks: list[bytes] = []

            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_chunks.append(chunk["data"])

            audio_bytes = b"".join(audio_chunks)
            audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
            duration_estimate = (len(text) / 5) / (150 * speaking_rate) * 60

            logger.info(
                "edge_tts_synthesis_complete",
                voice=voice,
                text_length=len(text),
                audio_bytes=len(audio_bytes),
            )

            return {
                "audio_base64": audio_b64,
                "encoding": audio_encoding,
                "duration_estimate_sec": round(duration_estimate, 1),
            }
        except Exception as e:
            logger.error("edge_tts_failed", error=str(e))
            raise TTSError(f"TTS synthesis failed: {e}") from e
