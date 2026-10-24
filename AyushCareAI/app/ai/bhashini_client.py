from __future__ import annotations

import httpx
import structlog
from typing import Any, Dict, Optional, Tuple
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)

logger = structlog.get_logger(__name__)


class BhashiniError(Exception):
    """Base exception for Bhashini API errors."""
    pass


class BhashiniClient:
    """Core HTTP client for India's Bhashini AI platform (ULCA API)."""

    def __init__(
        self,
        udyat_key: str,
        user_id: str,
        inference_key: str = "",
        pipeline_url: str = "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline",
    ):
        """Initialize the Bhashini client."""
        self.udyat_key = udyat_key
        self.user_id = user_id
        self.inference_key = inference_key
        self.pipeline_url = pipeline_url
        self.pipeline_id = "64392f96daac500b55c543cd"
        
        self.client = httpx.AsyncClient(timeout=30.0)
        # Cache keyed by (task_type, source_lang, target_lang)
        # Values are (callback_url, inference_api_key)
        self._config_cache: Dict[Tuple[str, str, Optional[str]], Tuple[str, str]] = {}
        self._config_inflight: Dict[Tuple[str, str, Optional[str]], Any] = {}

    def _invalidate_cache(self) -> None:
        """Invalidate the pipeline configuration cache."""
        self._config_cache.clear()
        logger.info("bhashini_client.cache_invalidated")

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((httpx.RequestError, httpx.TimeoutException, BhashiniError)),
        reraise=True
    )
    async def _get_pipeline_config(
        self,
        task_type: str,
        source_lang: str,
        target_lang: Optional[str] = None,
        service_id: Optional[str] = None,
    ) -> Tuple[str, str]:
        """Call Step 1 to get the compute endpoint and inference key."""
        cache_key = (task_type, source_lang, target_lang)
        if cache_key in self._config_cache:
            return self._config_cache[cache_key]
        existing_request = self._config_inflight.get(cache_key)
        if existing_request is not None:
            return await existing_request

        headers = {
            "ulcaApiKey": self.udyat_key,
            "userID": self.user_id,
            "Content-Type": "application/json",
        }

        task_config: Dict[str, Any] = {
            "language": {"sourceLanguage": source_lang}
        }
        if target_lang:
            task_config["language"]["targetLanguage"] = target_lang
        if service_id:
            task_config["serviceId"] = service_id

        payload = {
            "pipelineTasks": [
                {
                    "taskType": task_type,
                    "config": task_config
                }
            ],
            "pipelineRequestConfig": {
                "pipelineId": self.pipeline_id
            }
        }

        logger.debug("bhashini_client.get_pipeline_config", task_type=task_type, source_lang=source_lang, target_lang=target_lang)
        import asyncio
        config_request = asyncio.current_task()
        self._config_inflight[cache_key] = config_request
        try:
            response = await self.client.post(self.pipeline_url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            
            endpoint_data = data.get("pipelineInferenceAPIEndPoint", {})
            callback_url = endpoint_data.get("callbackUrl")
            inference_api_key = endpoint_data.get("inferenceApiKey", {}).get("value")

            if not callback_url or not inference_api_key:
                raise BhashiniError("Invalid response format: missing callbackUrl or inferenceApiKey")

            self._config_cache[cache_key] = (callback_url, inference_api_key)
            return callback_url, inference_api_key

        except httpx.HTTPStatusError as e:
            logger.error("bhashini_client.pipeline_config_error", status_code=e.response.status_code, response=e.response.text)
            raise BhashiniError(f"Failed to get pipeline config: {e.response.text}") from e
        except Exception as e:
            logger.error("bhashini_client.pipeline_config_error", error=str(e))
            raise
        finally:
            if self._config_inflight.get(cache_key) is config_request:
                self._config_inflight.pop(cache_key, None)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((httpx.RequestError, httpx.TimeoutException)),
        reraise=True
    )
    async def _compute(
        self,
        task_type: str,
        source_lang: str,
        target_lang: Optional[str],
        service_id: Optional[str],
        input_data: list,
        pipeline_config: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Call Step 2 with retry. Auto-refreshes pipeline config on 401."""
        try:
            callback_url, inference_key = await self._get_pipeline_config(
                task_type=task_type,
                source_lang=source_lang,
                target_lang=target_lang,
                service_id=service_id,
            )

            headers = {
                "Authorization": inference_key,
                "Content-Type": "application/json",
            }

            task_config: Dict[str, Any] = {
                "language": {"sourceLanguage": source_lang}
            }
            if target_lang:
                task_config["language"]["targetLanguage"] = target_lang
            if service_id:
                task_config["serviceId"] = service_id
            
            # Allow overriding task config via pipeline_config
            if pipeline_config:
                task_config.update(pipeline_config)

            payload = {
                "pipelineTasks": [
                    {
                        "taskType": task_type,
                        "config": task_config
                    }
                ],
                "inputData": input_data
            }

            response = await self.client.post(callback_url, headers=headers, json=payload)
            
            if response.status_code == 401:
                logger.warning("bhashini_client.compute.unauthorized_refreshing_cache")
                self._invalidate_cache()
                # Re-fetch config and retry once
                callback_url, inference_key = await self._get_pipeline_config(
                    task_type=task_type,
                    source_lang=source_lang,
                    target_lang=target_lang,
                    service_id=service_id,
                )
                headers["Authorization"] = inference_key
                response = await self.client.post(callback_url, headers=headers, json=payload)

            response.raise_for_status()
            return response.json()

        except httpx.HTTPStatusError as e:
            logger.error("bhashini_client.compute_error", status_code=e.response.status_code, response=e.response.text)
            raise BhashiniError(f"Compute request failed: {e.response.text}") from e
        except Exception as e:
            logger.error("bhashini_client.compute_error", error=str(e))
            raise

    async def asr(self, audio_base64: str, source_lang: str, service_id: Optional[str] = None) -> Dict[str, Any]:
        """Perform Automatic Speech Recognition (ASR)."""
        input_data = {"audio": [{"audioContent": audio_base64}]}
        response = await self._compute(
            task_type="asr",
            source_lang=source_lang,
            target_lang=None,
            service_id=service_id,
            input_data=input_data,
        )
        
        try:
            result = response["pipelineResponse"][0]["output"][0]
            return {
                "text": result.get("source", ""),
                "confidence": result.get("confidenceScore", 0.0),
            }
        except (KeyError, IndexError) as e:
            logger.error("bhashini_client.asr.parse_error", response=response)
            raise BhashiniError("Failed to parse ASR response") from e

    async def tts(
        self, text: str, target_lang: str, gender: str = "female", service_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Perform Text-to-Speech (TTS)."""
        input_data = {"input": [{"source": text}]}
        pipeline_config = {"gender": gender}
        response = await self._compute(
            task_type="tts",
            source_lang=target_lang,
            target_lang=None,
            service_id=service_id,
            input_data=input_data,
            pipeline_config=pipeline_config,
        )
        
        try:
            result = response["pipelineResponse"][0]["audio"][0]
            return {
                "audio_base64": result.get("audioContent", ""),
                "encoding": "wav"
            }
        except (KeyError, IndexError) as e:
            logger.error("bhashini_client.tts.parse_error", response=response)
            raise BhashiniError("Failed to parse TTS response") from e

    async def translate(
        self, text: str, source_lang: str, target_lang: str, service_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Perform Text Translation."""
        input_data = {"input": [{"source": text}]}
        response = await self._compute(
            task_type="translation",
            source_lang=source_lang,
            target_lang=target_lang,
            service_id=service_id,
            input_data=input_data,
        )
        
        try:
            result = response["pipelineResponse"][0]["output"][0]
            return {
                "translated_text": result.get("target", "")
            }
        except (KeyError, IndexError) as e:
            logger.error("bhashini_client.translate.parse_error", response=response)
            raise BhashiniError("Failed to parse Translation response") from e

    async def translate_batch(
        self, texts: list[str], source_lang: str, target_lang: str, service_id: Optional[str] = None
    ) -> list[str]:
        """Translate multiple strings with one Bhashini pipeline request."""
        if not texts:
            return []
        input_data = {"input": [{"source": text} for text in texts]}
        response = await self._compute(
            task_type="translation",
            source_lang=source_lang,
            target_lang=target_lang,
            service_id=service_id,
            input_data=input_data,
        )
        try:
            outputs = response["pipelineResponse"][0]["output"]
            return [item.get("target", "") for item in outputs]
        except (KeyError, IndexError, TypeError) as e:
            logger.error("bhashini_client.translate_batch.parse_error", response=response)
            raise BhashiniError("Failed to parse batch translation response") from e

    async def ocr(
        self, image_base64: str, source_lang: str, service_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Perform Optical Character Recognition (OCR)."""
        input_data = {"image": [{"imageContent": image_base64}]}
        response = await self._compute(
            task_type="ocr",
            source_lang=source_lang,
            target_lang=None,
            service_id=service_id,
            input_data=input_data,
        )
        
        try:
            result = response["pipelineResponse"][0]["output"][0]
            return {
                "text": result.get("source", ""),
                "confidence": result.get("confidenceScore", 0.0),
            }
        except (KeyError, IndexError) as e:
            logger.error("bhashini_client.ocr.parse_error", response=response)
            raise BhashiniError("Failed to parse OCR response") from e
            
    async def detect_language_text(self, text: str, service_id: Optional[str] = None) -> Dict[str, Any]:
        """Detect language of a given text."""
        # Using task_type txt-lang-detection as an assumed bhashini task type, or whatever it might be.
        input_data = {"input": [{"source": text}]}
        response = await self._compute(
            task_type="txt-lang-detection",
            source_lang="en",  # usually source lang may not matter for detection
            target_lang=None,
            service_id=service_id,
            input_data=input_data,
        )
        
        try:
            result = response["pipelineResponse"][0]["output"][0]
            return {
                "detected_language": result.get("langIdentifier", "")
            }
        except (KeyError, IndexError) as e:
            logger.error("bhashini_client.detect_lang_text.parse_error", response=response)
            raise BhashiniError("Failed to parse Text Language Detection response") from e

    async def detect_language_audio(self, audio_base64: str, service_id: Optional[str] = None) -> Dict[str, Any]:
        """Detect language of a given audio snippet."""
        input_data = {"audio": [{"audioContent": audio_base64}]}
        response = await self._compute(
            task_type="audio-lang-detection",
            source_lang="en", 
            target_lang=None,
            service_id=service_id,
            input_data=input_data,
        )
        
        try:
            result = response["pipelineResponse"][0]["output"][0]
            return {
                "detected_language": result.get("langIdentifier", "")
            }
        except (KeyError, IndexError) as e:
            logger.error("bhashini_client.detect_lang_audio.parse_error", response=response)
            raise BhashiniError("Failed to parse Audio Language Detection response") from e

    async def close(self) -> None:
        """Close the underlying HTTP client."""
        await self.client.aclose()
        logger.info("bhashini_client.closed")
