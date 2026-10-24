"""LLM service — Groq as the sole LLM provider.

Provides structured output parsing, automatic retry with exponential backoff.
Groq uses openai/gpt-oss-120b for clinical reasoning and qwen/qwen3.6-27b for vision.
"""

from __future__ import annotations

import asyncio
import json
from typing import Any, Optional

import structlog
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.config import Settings

logger = structlog.get_logger(__name__)


class LLMError(Exception):
    """Raised when the LLM provider fails."""


class LLMService:
    """Unified LLM interface using Groq as the sole provider."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._groq_client: Any = None
        self._initialize_provider()

    def _initialize_provider(self) -> None:
        """Initialize the Groq LLM client."""
        if self._settings.groq_api_key:
            try:
                from groq import AsyncGroq
                self._groq_client = AsyncGroq(api_key=self._settings.groq_api_key)
                logger.info("llm_provider_initialized", provider="groq", model=self._settings.groq_model)
            except Exception as e:
                logger.warning("llm_groq_init_failed", error=str(e))

    @property
    def is_available(self) -> bool:
        return self._groq_client is not None

    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        *,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        response_format: Optional[str] = None,
        model_tier: str = "standard",
    ) -> str:
        """Generate a completion from Groq.

        Args:
            system_prompt: System instructions for the LLM.
            user_prompt: The user-facing prompt / question.
            temperature: Override default temperature.
            max_tokens: Override default max_tokens.
            response_format: "json" to request JSON-mode output.
            model_tier: "standard" or "advanced" (both use Groq).

        Returns:
            The generated text response.

        Raises:
            LLMError: If the provider fails.
        """
        if self._groq_client is None:
            raise LLMError("Groq API key not configured. Set GROQ_API_KEY.")

        try:
            return await asyncio.wait_for(
                self._call_groq(
                    system_prompt, user_prompt,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    response_format=response_format,
                ),
                timeout=self._settings.llm_request_timeout_seconds,
            )
        except Exception as e:
            logger.error("llm_groq_failed", error=str(e))
            raise LLMError(f"Groq LLM failed: {e}") from e

    async def generate_json(
        self,
        system_prompt: str,
        user_prompt: str,
        *,
        temperature: Optional[float] = None,
        model_tier: str = "standard",
    ) -> dict:
        """Generate and parse a JSON response.

        Returns:
            Parsed JSON as a dict.

        Raises:
            LLMError: If generation or parsing fails.
        """
        raw = await self.generate(
            system_prompt,
            user_prompt,
            temperature=temperature,
            response_format="json",
            model_tier=model_tier,
        )
        # Strip markdown code fences if present
        text = raw.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            # Remove first and last line (```json and ```)
            text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

        try:
            return json.loads(text)
        except json.JSONDecodeError as e:
            logger.error("llm_json_parse_failed", raw_response=raw[:500], error=str(e))
            raise LLMError(f"Failed to parse LLM JSON output: {e}") from e

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type(Exception),
        reraise=True,
    )
    async def _call_groq(
        self,
        system_prompt: str,
        user_prompt: str,
        *,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        response_format: Optional[str] = None,
    ) -> str:
        """Call Groq API with retry."""
        temp = temperature if temperature is not None else self._settings.groq_temperature
        tokens = max_tokens if max_tokens is not None else self._settings.groq_max_tokens

        kwargs: dict[str, Any] = {
            "model": self._settings.groq_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": temp,
            "max_tokens": tokens,
        }
        if response_format == "json":
            kwargs["response_format"] = {"type": "json_object"}

        response = await self._groq_client.chat.completions.create(**kwargs)
        text = response.choices[0].message.content

        if not text:
            raise LLMError("Groq returned empty response")

        logger.debug(
            "llm_groq_response",
            model=self._settings.groq_model,
            prompt_len=len(user_prompt),
            response_len=len(text),
        )
        return text
