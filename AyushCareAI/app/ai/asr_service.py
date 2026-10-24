"""ASR (Automatic Speech Recognition) service.

Primary: Bhashini Conformer (22 Indian languages, optimized for noisy environments).
Fallback: Groq Whisper (English-centric, fast).
"""

from __future__ import annotations

import base64
from typing import Any, Optional

import structlog

from app.config import Settings
from app.domain.languages import get_bhashini_code

logger = structlog.get_logger(__name__)


class ASRError(Exception):
    """Raised when speech recognition fails."""


class ASRService:
    """Automatic Speech Recognition service with Bhashini + Groq Whisper."""

    def __init__(
        self,
        settings: Settings,
        bhashini_client: Any = None,
    ) -> None:
        self._settings = settings
        self._bhashini_client = bhashini_client
        self._groq_client: Any = None
        self._initialize()

    def _initialize(self) -> None:
        if self._settings.groq_api_key:
            try:
                from groq import AsyncGroq
                self._groq_client = AsyncGroq(api_key=self._settings.groq_api_key)
                logger.info("asr_provider_initialized", provider="groq_whisper")
            except Exception as e:
                logger.warning("asr_groq_init_failed", error=str(e))

    @property
    def is_available(self) -> bool:
        return self._bhashini_client is not None or self._groq_client is not None

    @staticmethod
    def _clean_audio_payload(audio_bytes: bytes, filename: str = "audio.wav") -> tuple[bytes, str]:
        """Detect and clean audio bytes, unwrap multipart if present, and resolve correct filename."""
        data = audio_bytes
        # If multipart boundary text was sent directly, extract binary body
        if data.startswith(b"--"):
            header_end = data.find(b"\r\n\r\n")
            if header_end != -1:
                boundary_end = data.rfind(b"\r\n--")
                if boundary_end > header_end + 4:
                    data = data[header_end + 4:boundary_end]
                else:
                    data = data[header_end + 4:]

        # Detect audio container by magic bytes
        if data.startswith(b"\x1a\x45\xdf\xa3"):
            return data, "audio.webm"
        elif data.startswith(b"RIFF"):
            return data, "audio.wav"
        elif data.startswith(b"OggS"):
            return data, "audio.ogg"
        elif data.startswith(b"ID3") or (len(data) > 2 and data[:2] == b"\xff\xfb"):
            return data, "audio.mp3"
        elif len(data) > 8 and data[4:8] == b"ftyp":
            return data, "audio.m4a"

        # Fallback to filename extension or webm for browser media
        if "." in filename:
            ext = filename.rsplit(".", 1)[-1].lower()
            if ext in ("webm", "wav", "ogg", "mp3", "m4a", "flac"):
                return data, f"audio.{ext}"
        return data, "audio.webm"

    async def transcribe(
        self,
        audio_bytes: bytes,
        language: str = "en",
        *,
        sample_rate_hertz: int = 16000,
        encoding: str = "LINEAR16",
        filename: str = "audio.wav",
    ) -> dict:
        """Transcribe audio to text.

        Priority: Bhashini ASR (primary) → Groq Whisper (fallback).

        Returns:
            dict with keys: 'text', 'confidence', 'language', 'alternatives'
        """
        clean_bytes, resolved_name = self._clean_audio_payload(audio_bytes, filename)

        # Primary: Bhashini ASR
        if self._bhashini_client and self._settings.asr_provider == "bhashini":
            try:
                res = await self._transcribe_bhashini(clean_bytes, language)
                if res.get("text"):
                    return res
            except Exception as e:
                logger.warning("bhashini_asr_error_trying_fallback", error=str(e))

        # Fallback: Groq Whisper
        if self._groq_client:
            try:
                res = await self._transcribe_groq(clean_bytes, language, filename=resolved_name)
                if res.get("text"):
                    return res
            except Exception as e:
                logger.warning("groq_whisper_error", error=str(e))

        return {
            "text": "",
            "confidence": 0.0,
            "language": language,
            "alternatives": [],
        }

    async def _transcribe_bhashini(
        self,
        audio_bytes: bytes,
        language: str = "en",
    ) -> dict:
        """Transcribe audio using Bhashini Conformer ASR."""
        bhashini_lang = get_bhashini_code(language) or language

        # Select model: English-specific or multilingual conformer
        if bhashini_lang == "en":
            service_id = self._settings.bhashini_asr_en_model
        else:
            service_id = self._settings.bhashini_asr_model

        # Encode audio to base64 for Bhashini API
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")

        result = await self._bhashini_client.asr(
            audio_base64=audio_b64,
            source_lang=bhashini_lang,
            service_id=service_id,
        )

        logger.info(
            "bhashini_asr_transcription_complete",
            language=bhashini_lang,
            text_length=len(result.get("text", "")),
            confidence=result.get("confidence", 0.0),
        )

        return {
            "text": result.get("text", "").strip(),
            "confidence": result.get("confidence", 0.85),
            "language": language,
            "alternatives": [],
        }

    async def _transcribe_groq(
        self,
        audio_bytes: bytes,
        language: str = "en",
        *,
        filename: str = "audio.webm",
    ) -> dict:
        """Transcribe audio using Groq Whisper."""
        lang_code = get_bhashini_code(language) or language
        supported_langs = ("en", "hi", "bn", "ta", "te", "mr", "gu", "kn", "ml", "pa")
        selected_lang = lang_code if lang_code in supported_langs else "en"

        file_tuple = (filename, audio_bytes)

        response = await self._groq_client.audio.transcriptions.create(
            file=file_tuple,
            model=self._settings.whisper_model,
            language=selected_lang,
            response_format="verbose_json",
        )

        text = getattr(response, "text", "") or str(response)

        logger.info(
            "groq_whisper_transcription_complete",
            language=selected_lang,
            text_length=len(text),
        )

        return {
            "text": text.strip(),
            "confidence": 0.95,
            "language": language,
            "alternatives": [],
        }

    async def assess_audio_quality(self, audio_bytes: bytes) -> dict:
        """Assess audio quality metrics (RMS, duration estimation).

        Returns:
            dict with keys: 'status', 'rms_level', 'duration_estimate_sec', 'issues'
        """
        issues = []

        if len(audio_bytes) < 200:
            issues.append("Audio too short (< 0.5 second).")

        rms = 0.0
        # RMS sampling is meaningful for PCM/WAV, but not for compressed
        # browser recordings such as WebM/Opus. Never reject those recordings
        # based on a WAV-specific byte offset.
        if audio_bytes[:4] == b"RIFF" and len(audio_bytes) > 44:
            import struct
            samples = []
            data = audio_bytes[44:]
            for i in range(0, min(len(data), 32000), 2):
                if i + 1 < len(data):
                    try:
                        sample = struct.unpack_from("<h", data, i)[0]
                        samples.append(sample)
                    except struct.error:
                        break
            if samples:
                rms = (sum(s * s for s in samples) / len(samples)) ** 0.5
                if rms < 200:
                    issues.append("Audio level too low. Speak closer to the microphone.")
                elif rms > 30000:
                    issues.append("Audio is clipping. Move away from the microphone.")

        duration_estimate = len(audio_bytes) / (16000 * 2)

        return {
            "status": "acceptable" if not issues else "poor",
            "rms_level": round(rms, 1),
            "duration_estimate_sec": round(duration_estimate, 1),
            "issues": issues,
        }
