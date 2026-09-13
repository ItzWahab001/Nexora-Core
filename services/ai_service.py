"""
AI provider abstraction.

The rest of the bot never talks to an AI SDK directly -- it calls
`AIService.get_response(...)`. That means swapping OpenAI for Anthropic,
a local model server, or any other OpenAI-compatible endpoint later is a
one-file change. AI_BASE_URL in .env can point at any OpenAI-compatible
chat/completions API (OpenAI itself, Azure OpenAI, vLLM, Ollama's OpenAI
shim, etc).
"""

from __future__ import annotations

import logging

from config import config

log = logging.getLogger("bot.services.ai")

MAX_HISTORY_MESSAGES = 20


class AIServiceError(Exception):
    """Raised when the AI provider fails or is not configured."""


class AIService:
    def __init__(self) -> None:
        self._client = None
        if config.ai_api_key:
            try:
                from openai import AsyncOpenAI  # imported lazily so the bot

                self._client = AsyncOpenAI(
                    api_key=config.ai_api_key, base_url=config.ai_base_url
                )
            except ImportError:
                log.warning("openai package not installed; AI features disabled.")

    @property
    def is_configured(self) -> bool:
        return self._client is not None

    async def get_response(
        self,
        system_prompt: str,
        history: list[dict[str, str]],
        user_message: str,
    ) -> str:
        """
        history: list of {"role": "user"|"assistant", "content": str}, oldest first.
        Returns the assistant's reply text. Raises AIServiceError on failure.
        """
        if not self.is_configured:
            raise AIServiceError(
                "AI chat is not configured. Set AI_API_KEY in the bot's .env file."
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
        except Exception as exc:  # noqa: BLE001 - surface any provider error uniformly
            log.exception("AI provider request failed")
            raise AIServiceError(f"The AI provider returned an error: {exc}") from exc

        choice = completion.choices[0] if completion.choices else None
        if not choice or not choice.message or not choice.message.content:
            raise AIServiceError("The AI provider returned an empty response.")
        return choice.message.content.strip()


ai_service = AIService()
