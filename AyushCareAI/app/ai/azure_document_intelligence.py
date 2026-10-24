"""Azure AI Document Intelligence OCR provider.

Uses the REST API so the ML service does not depend on a heavyweight Azure SDK.
Credentials are loaded only from server-side Settings.
"""

from __future__ import annotations

import asyncio
from typing import Any, Optional

import httpx
import structlog

from app.config import Settings

logger = structlog.get_logger(__name__)


class AzureDocumentIntelligenceError(Exception):
    """Raised when Azure Document Intelligence cannot process a document."""


class AzureDocumentIntelligence:
    """OCR/layout extraction using Azure AI Document Intelligence."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._endpoint = (settings.azure_document_intelligence_endpoint or "").rstrip("/")
        self._key = settings.azure_document_intelligence_key or ""
        self._api_version = settings.azure_document_intelligence_api_version

    @property
    def is_configured(self) -> bool:
        return bool(self._endpoint and self._key)

    async def analyze(
        self,
        document_bytes: bytes,
        *,
        content_type: str = "application/octet-stream",
    ) -> dict[str, Any]:
        if not self.is_configured:
            raise AzureDocumentIntelligenceError(
                "Azure Document Intelligence is selected but endpoint/key are not configured."
            )

        url = (
            f"{self._endpoint}/documentintelligence/documentModels/"
            f"prebuilt-read:analyze?api-version={self._api_version}"
        )
        headers = {
            "Ocp-Apim-Subscription-Key": self._key,
            "Content-Type": content_type,
        }

        async with httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=10.0)) as client:
            response = await client.post(url, headers=headers, content=document_bytes)
            if response.status_code not in (200, 201, 202):
                raise AzureDocumentIntelligenceError(
                    f"Azure Document Intelligence request failed "
                    f"({response.status_code}): {response.text[:500]}"
                )

            if response.status_code in (200, 201):
                result = response.json()
            else:
                operation_url = response.headers.get("Operation-Location")
                if not operation_url:
                    raise AzureDocumentIntelligenceError(
                        "Azure returned 202 without an Operation-Location header."
                    )
                result = await self._poll(client, operation_url)

        return self._normalize(result)

    async def _poll(self, client: httpx.AsyncClient, operation_url: str) -> dict[str, Any]:
        headers = {"Ocp-Apim-Subscription-Key": self._key}
        for _ in range(60):
            response = await client.get(operation_url, headers=headers)
            if response.status_code >= 400:
                raise AzureDocumentIntelligenceError(
                    f"Azure operation polling failed ({response.status_code}): {response.text[:500]}"
                )
            payload = response.json()
            status = str(payload.get("status", "")).lower()
            if status == "succeeded":
                return payload
            if status in {"failed", "cancelled"}:
                raise AzureDocumentIntelligenceError(
                    f"Azure document analysis {status}: {payload.get('error', payload) }"
                )
            await asyncio.sleep(1)

        raise AzureDocumentIntelligenceError("Azure document analysis timed out.")

    @staticmethod
    def _normalize(result: dict[str, Any]) -> dict[str, Any]:
        analyze = result.get("analyzeResult", result)
        pages = analyze.get("pages") or []
        content = analyze.get("content", "")

        page_items: list[dict[str, Any]] = []
        for page in pages:
            lines = []
            for line in page.get("lines") or []:
                lines.append({
                    "content": line.get("content", ""),
                    "polygon": line.get("polygon", []),
                    "spans": line.get("spans", []),
                })
            page_items.append({
                "page": page.get("pageNumber", len(page_items) + 1),
                "width": page.get("width"),
                "height": page.get("height"),
                "unit": page.get("unit"),
                "lines": lines,
                "spans": page.get("spans", []),
            })

        languages = []
        for language in analyze.get("languages") or []:
            code = language.get("locale") or language.get("languageCode")
            if code:
                languages.append(code)

        confidence_values = [
            word.get("confidence")
            for page in pages
            for word in (page.get("words") or [])
            if isinstance(word.get("confidence"), (int, float))
        ]
        confidence = (
            sum(confidence_values) / len(confidence_values)
            if confidence_values else 0.0
        )

        return {
            "text": content,
            "confidence": round(confidence, 4),
            "language": languages[0] if languages else "en",
            "pages": len(pages),
            "page_data": page_items,
            "tables": analyze.get("tables") or [],
            "provider": "azure",
            "raw": analyze,
        }
