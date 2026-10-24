"""Azure AI Language - Text Analytics for Health provider.

This is an assistive medical NLP signal. It does not diagnose or replace
clinician review. Credentials remain server-side.
"""

from __future__ import annotations

from typing import Any

import httpx
import structlog

from app.config import Settings

logger = structlog.get_logger(__name__)


class AzureHealthNLPError(Exception):
    """Raised when Azure Text Analytics for Health fails."""


class AzureHealthNLP:
    """Medical entity/assertion extraction using Azure AI Language."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._endpoint = (settings.azure_language_endpoint or "").rstrip("/")
        self._key = settings.azure_language_key or ""
        self._api_version = settings.azure_language_api_version

    @property
    def is_configured(self) -> bool:
        return bool(self._endpoint and self._key)

    async def analyze(self, text: str, language: str = "en") -> dict[str, Any]:
        if not text.strip():
            return {"entities": [], "relations": [], "provider": "azure"}

        if not self.is_configured:
            raise AzureHealthNLPError(
                "Azure Text Analytics for Health is selected but endpoint/key are not configured."
            )

        # Text Analytics for Health accepts a Healthcare analysis task.
        # Azure's hosted Health model has a more limited language set than
        # Bhashini; when the OCR language is unsupported, callers may choose
        # to translate to English before invoking this provider.
        normalized_language = self._normalize_language(language)
        url = (
            f"{self._endpoint}/language/:analyze-text"
            f"?api-version={self._api_version}"
        )
        payload = {
            "kind": "Healthcare",
            "parameters": {
                "modelVersion": "latest",
                "showStats": False,
            },
            "analysisInput": {
                "documents": [
                    {
                        "id": "document-1",
                        "language": normalized_language,
                        "text": text,
                    }
                ]
            },
        }
        headers = {
            "Ocp-Apim-Subscription-Key": self._key,
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=10.0)) as client:
            response = await client.post(url, headers=headers, json=payload)
            if response.status_code >= 400:
                raise AzureHealthNLPError(
                    f"Azure Health NLP request failed ({response.status_code}): "
                    f"{response.text[:500]}"
                )
            data = response.json()

        return self._normalize(data)

    @staticmethod
    def _normalize_language(language: str) -> str:
        code = (language or "en").split("-")[0].lower()
        # Hosted Text Analytics for Health currently supports English and a
        # small set of other languages; unsupported Indic languages should be
        # translated upstream rather than silently mislabeled.
        return code

    @staticmethod
    def _normalize(data: dict[str, Any]) -> dict[str, Any]:
        docs = data.get("results", {}).get("documents", [])
        if not docs:
            return {"entities": [], "relations": [], "provider": "azure"}

        doc = docs[0]
        entities: list[dict[str, Any]] = []
        for entity in doc.get("entities", []):
            entities.append({
                "text": entity.get("text", ""),
                "category": entity.get("category", ""),
                "subcategory": entity.get("subcategory"),
                "confidence": entity.get("confidenceScore", 0.0),
                "offset": entity.get("offset"),
                "length": entity.get("length"),
                "assertion": entity.get("assertion"),
                "links": entity.get("links", []),
                "data_sources": entity.get("dataSources", []),
            })

        return {
            "entities": entities,
            "relations": doc.get("relations", []),
            "provider": "azure",
        }
