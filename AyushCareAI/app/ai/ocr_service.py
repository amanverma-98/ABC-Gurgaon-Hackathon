"""Unified OCR service with explicit provider selection.

Azure Document Intelligence is the production default. Bhashini OCR,
Groq Vision and Tesseract remain available as explicit providers/fallbacks.
No provider is selected implicitly merely because its client is configured.
"""

from __future__ import annotations

import base64
import re
from io import BytesIO
from typing import Any, Optional

import structlog
from PIL import Image

from app.config import Settings
from app.ai.azure_document_intelligence import AzureDocumentIntelligence

logger = structlog.get_logger(__name__)


class OCRError(Exception):
    """Raised when OCR processing fails."""


class ImageQuality:
    """Result of image quality assessment."""

    def __init__(self, width: int, height: int) -> None:
        self.width = width
        self.height = height
        self.issues: list[str] = []

    @property
    def status(self) -> str:
        return "needs-rescan" if self.issues else "acceptable"

    def to_dict(self) -> dict:
        return {
            "width": self.width,
            "height": self.height,
            "status": self.status,
            "issues": self.issues,
        }


class OCRService:
    """Unified OCR interface using Groq Vision and Tesseract."""

    MIN_WIDTH = 640
    MIN_HEIGHT = 480
    MAX_SIZE_BYTES = 20 * 1024 * 1024  # 20MB

    def __init__(self, settings: Settings, bhashini_client: Optional[Any] = None) -> None:
        self._settings = settings
        self._provider = settings.ocr_provider.strip().lower()
        self.bhashini_client = bhashini_client
        self._azure = AzureDocumentIntelligence(settings)
        self._groq_client: Any = None
        if settings.groq_api_key:
            try:
                from groq import AsyncGroq
                self._groq_client = AsyncGroq(api_key=settings.groq_api_key)
                logger.info("ocr_provider_initialized", provider="groq_vision")
            except Exception as e:
                logger.warning("ocr_groq_init_failed", error=str(e))

    @property
    def is_available(self) -> bool:
        if self._provider == "azure":
            return self._azure.is_configured
        if self._provider == "bhashini":
            return self.bhashini_client is not None
        if self._provider == "groq_vision":
            return self._groq_client is not None
        if self._provider == "tesseract":
            return True
        return False

    def assess_image_quality(self, image_bytes: bytes) -> ImageQuality:
        """Check image dimensions, size, and readability."""
        try:
            img = Image.open(BytesIO(image_bytes))
            quality = ImageQuality(width=img.width, height=img.height)

            if img.width < self.MIN_WIDTH or img.height < self.MIN_HEIGHT:
                quality.issues.append(
                    f"Resolution too low ({img.width}×{img.height}). "
                    f"Minimum: {self.MIN_WIDTH}×{self.MIN_HEIGHT}."
                )

            if len(image_bytes) > self.MAX_SIZE_BYTES:
                quality.issues.append(
                    f"File too large ({len(image_bytes) / 1024 / 1024:.1f}MB). "
                    f"Maximum: {self.MAX_SIZE_BYTES / 1024 / 1024:.0f}MB."
                )

            if img.mode in ("L", "RGB", "RGBA"):
                grayscale = img.convert("L")
                pixels = list(grayscale.getdata())
                avg_brightness = sum(pixels) / len(pixels)
                if avg_brightness < 40:
                    quality.issues.append("Image appears too dark. Improve lighting.")
                elif avg_brightness > 240:
                    quality.issues.append("Image appears overexposed/washed out.")

                min_val, max_val = min(pixels), max(pixels)
                if (max_val - min_val) < 50:
                    quality.issues.append("Low contrast. Ensure text is clearly visible.")

            return quality
        except Exception as e:
            quality = ImageQuality(width=0, height=0)
            quality.issues.append(f"Cannot read image: {e}")
            return quality

    async def extract_text(
        self,
        image_bytes: bytes,
        language_hints: Optional[list[str]] = None,
        *,
        filename: str = "document",
        content_type: Optional[str] = None,
    ) -> dict:
        """Extract text using the explicitly configured OCR provider."""
        provider = self._provider

        if provider == "azure":
            try:
                return await self._extract_azure(
                    image_bytes, filename=filename, content_type=content_type
                )
            except Exception as e:
                logger.error("azure_document_intelligence_failed", error=str(e))
                raise OCRError(f"Azure Document Intelligence OCR failed: {e}") from e

        if provider == "bhashini":
            if not self.bhashini_client:
                raise OCRError("OCR_PROVIDER=bhashini but Bhashini is not configured.")
            lang = language_hints[0] if language_hints else "hi"
            return await self._extract_bhashini(image_bytes, lang)

        if provider == "groq_vision":
            return await self._extract_groq_vision(image_bytes, language_hints)

        if provider == "tesseract":
            return await self._extract_tesseract(image_bytes, language_hints)

        raise OCRError(
            f"Unsupported OCR_PROVIDER={provider!r}. "
            "Use azure, bhashini, groq_vision, or tesseract."
        )

    async def _extract_azure(
        self,
        image_bytes: bytes,
        *,
        filename: str,
        content_type: Optional[str],
    ) -> dict:
        if not content_type:
            lower = filename.lower()
            if lower.endswith(".pdf"):
                content_type = "application/pdf"
            elif lower.endswith(".png"):
                content_type = "image/png"
            elif lower.endswith((".jpg", ".jpeg")):
                content_type = "image/jpeg"
            elif lower.endswith(".tif") or lower.endswith(".tiff"):
                content_type = "image/tiff"
            else:
                content_type = "application/octet-stream"

        return await self._azure.analyze(
            image_bytes,
            content_type=content_type,
        )

    async def _extract_bhashini(
        self,
        image_bytes: bytes,
        source_lang: str = "hi",
    ) -> dict:
        """Extract text using Bhashini OCR API."""
        encoded_image = base64.b64encode(image_bytes).decode("ascii")
        res = await self.bhashini_client.ocr(image_base64=encoded_image, source_lang=source_lang)
        text = res.get("text", "")
        logger.info(
            "ocr_extraction_complete",
            provider="bhashini",
            text_length=len(text),
        )
        return {
            "text": text,
            "confidence": res.get("confidence", 0.85),
            "language": source_lang,
            "pages": 1,
        }

    async def _extract_groq_vision(
        self,
        image_bytes: bytes,
        language_hints: Optional[list[str]] = None,
    ) -> dict:
        """Extract text using Groq's multimodal chat completions API."""
        if not self._groq_client:
            raise OCRError("Groq API key not configured.")

        image = Image.open(BytesIO(image_bytes))
        image_format = (image.format or "JPEG").lower()
        if image_format == "jpg":
            image_format = "jpeg"
        encoded_image = base64.b64encode(image_bytes).decode("ascii")

        # Clamp max_tokens to 800 to avoid Groq on-demand tier OTPM (Output Tokens Per Minute) 1000 limit
        safe_max_tokens = min(int(self._settings.groq_max_tokens or 800), 800)

        response = await self._groq_client.chat.completions.create(
            model=self._settings.groq_vision_model,
            temperature=0,
            max_tokens=safe_max_tokens,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a medical document transcription assistant. "
                        "Transcribe all visible text accurately and verbatim. "
                        "Return only the transcription without commentary."
                    ),
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                "Transcribe prescriptions, medicines, dosages, "
                                "lab tests, values, reference ranges, dates, "
                                "and doctor notes. Preserve the original layout "
                                "as much as possible."
                            ),
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": (
                                    f"data:image/{image_format};base64,{encoded_image}"
                                ),
                            },
                        },
                    ],
                },
            ],
        )
        text = response.choices[0].message.content or ""
        text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()

        logger.info(
            "ocr_extraction_complete",
            provider="groq_vision",
            model=self._settings.groq_vision_model,
            text_length=len(text),
        )

        return {
            "text": text.strip(),
            "confidence": 0.9,
            "language": language_hints[0] if language_hints else "en",
            "pages": 1,
        }

    async def _extract_tesseract(
        self,
        image_bytes: bytes,
        language_hints: Optional[list[str]] = None,
    ) -> dict:
        """Extract text using Tesseract OCR (local fallback)."""
        import asyncio

        try:
            import pytesseract
        except ImportError:
            raise OCRError("Tesseract not installed. Install pytesseract.")

        if self._settings.tesseract_cmd:
            pytesseract.pytesseract.tesseract_cmd = self._settings.tesseract_cmd

        img = Image.open(BytesIO(image_bytes))
        lang = "+".join(language_hints) if language_hints else "eng"

        loop = asyncio.get_running_loop()
        text = await loop.run_in_executor(
            None,
            lambda: pytesseract.image_to_string(img, lang=lang),
        )

        logger.info(
            "ocr_extraction_complete",
            provider="tesseract",
            text_length=len(text),
        )

        return {
            "text": text,
            "confidence": 0.7,
            "language": language_hints[0] if language_hints else "en",
            "pages": 1,
        }
