"""
OpenAI-compatible AI provider.
"""

from __future__ import annotations

import logging

from config import config

log = logging.getLogger("bot.services.ai")

MAX_HISTORY_MESSAGES = 20
AI_REQUEST_TIMEOUT = 45.0


class AIServiceError(Exception):
    """Raised when the AI provider fails or is not configured."""


class AIService:
    def __init__(self) -> None:
        self._client = None

        if config.ai_api_key:
            try:
                from openai import AsyncOpenAI

                self._client = AsyncOpenAI(
                    api_key=config.ai_api_key,
                    base_url=config.ai_base_url,
                    timeout=AI_REQUEST_TIMEOUT,
                    max_retries=1,
                )
            except ImportError:
                log.exception("openai package is not installed; AI features disabled.")

    @property
    def is_configured(self) -> bool:
        return self._client is not None

    async def get_response(
        self,
        system_prompt: str,
        history: list[dict[str, str]],
        user_message: str,
    ) -> str:
        if not self.is_configured:
            raise AIServiceError(
                "AI chat is not configured. Set a valid AI_API_KEY, AI_BASE_URL "
                "and AI_MODEL in .env, then restart the bot."
            )

        messages = [{"role": "system", "content": system_prompt}]
        messages.extend(history[-MAX_HISTORY_MESSAGES:])
        messages.append({"role": "user", "content": user_message})

        try:
            completion = await self._client.chat.completions.create(
                model=config.ai_model,
                messages=messages,
                max_tokens=800,
                temperature=0.7,
            )
        except Exception as exc:
            log.exception(
                "AI provider request failed (base_url=%s, model=%s)",
                config.ai_base_url,
                config.ai_model,
            )
            raise AIServiceError(
                "The AI provider request failed. Check AI_API_KEY, AI_BASE_URL, "
                "AI_MODEL, provider access/credits, and the bot logs."
            ) from exc

        choice = completion.choices[0] if completion.choices else None
        content = choice.message.content if choice and choice.message else None
        if not content:
            raise AIServiceError("The AI provider returned an empty response.")

        return content.strip()


ai_service = AIService()
