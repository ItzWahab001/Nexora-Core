"""OpenAI-compatible AI provider with bounded, actionable failures."""
from __future__ import annotations

import logging
from config import config

log = logging.getLogger("bot.services.ai")
MAX_HISTORY_MESSAGES = 20
AI_REQUEST_TIMEOUT = 45.0


class AIServiceError(Exception):
    pass


class AIService:
    def __init__(self) -> None:
        self._client = None
        key = (config.ai_api_key or "").strip()
        if not key or key in {"your_api_key_here", "YOUR_API_KEY", "sk-your_api_key_here"}:
            return
        try:
            from openai import AsyncOpenAI
            self._client = AsyncOpenAI(
                api_key=key,
                base_url=config.ai_base_url,
                timeout=AI_REQUEST_TIMEOUT,
                max_retries=1,
            )
        except ImportError:
            log.exception("openai package is not installed")

    @property
    def is_configured(self) -> bool:
        return self._client is not None

    async def get_response(self, system_prompt: str, history: list[dict[str, str]], user_message: str) -> str:
        if not self.is_configured:
            raise AIServiceError("AI is not configured. Set a real AI_API_KEY in Railway Variables and redeploy/restart the bot.")
        if not config.ai_model:
            raise AIServiceError("AI_MODEL is empty. Set AI_MODEL in Railway Variables.")

        messages = [{"role": "system", "content": system_prompt or "You are a helpful assistant."}]
        for item in history[-MAX_HISTORY_MESSAGES:]:
            role = item.get("role")
            content = item.get("content")
            if role in {"user", "assistant"} and content:
                messages.append({"role": role, "content": content})
        messages.append({"role": "user", "content": user_message})

        try:
            completion = await self._client.chat.completions.create(
                model=config.ai_model,
                messages=messages,
                max_tokens=800,
                temperature=0.7,
            )
        except Exception as exc:
            log.exception("AI provider request failed: base_url=%s model=%s", config.ai_base_url, config.ai_model)
            raise AIServiceError(
                "AI provider rejected the request. Check AI_API_KEY, AI_BASE_URL, AI_MODEL, and your provider account/credits."
            ) from exc

        choice = completion.choices[0] if completion.choices else None
        content = choice.message.content if choice and choice.message else None
        if not content or not content.strip():
            raise AIServiceError("AI provider returned an empty response.")
        return content.strip()


ai_service = AIService()
