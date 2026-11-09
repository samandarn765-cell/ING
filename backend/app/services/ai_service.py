"""AI provayder abstraksiyasi: Google Gemini yoki OpenAI (REST orqali, SDK'siz).

Barcha modullar faqat shu fayldagi `ai.chat()` va `ai.generate_json()` dan foydalanadi,
shuning uchun provayderni .env dagi AI_PROVIDER orqali bitta joyda almashtirish mumkin.
"""
import json
import logging
import re

import httpx

from ..config import get_settings

log = logging.getLogger("ai")


class AIError(Exception):
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _extract_json(text: str):
    """Model ba'zan ```json ... ``` bilan o'rab yuboradi — tozalab parse qilamiz."""
    text = text.strip()
    fence = re.search(r"```(?:json)?\s*(.*?)```", text, re.DOTALL)
    if fence:
        text = fence.group(1).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Birinchi { yoki [ dan oxirgi } yoki ] gacha kesib ko'ramiz
        start = min([i for i in (text.find("{"), text.find("[")) if i != -1], default=-1)
        end = max(text.rfind("}"), text.rfind("]"))
        if start != -1 and end > start:
            return json.loads(text[start : end + 1])
        raise


class AIService:
    def __init__(self):
        self.settings = get_settings()

    @property
    def provider(self) -> str:
        return self.settings.ai_provider.lower().strip()

    def is_configured(self) -> bool:
        if self.provider == "openai":
            return bool(self.settings.openai_api_key)
        return bool(self.settings.gemini_api_key)

    def model_name(self) -> str:
        return self.settings.openai_model if self.provider == "openai" else self.settings.gemini_model

    async def chat(
        self,
        system: str,
        messages: list[dict],
        json_mode: bool = False,
        temperature: float = 0.7,
    ) -> str:
        """messages: [{"role": "user"|"assistant", "content": "..."}]"""
        if not self.is_configured():
            raise AIError(
                f"AI kaliti topilmadi. backend/.env faylida "
                f"{'OPENAI_API_KEY' if self.provider == 'openai' else 'GEMINI_API_KEY'} ni kiriting.",
                status_code=503,
            )
        try:
            if self.provider == "openai":
                return await self._openai(system, messages, json_mode, temperature)
            return await self._gemini(system, messages, json_mode, temperature)
        except httpx.TimeoutException:
            raise AIError("AI javob berishga ulgurmadi (timeout). Qayta urinib ko'ring.", 504)
        except httpx.HTTPError as e:
            raise AIError(f"AI bilan bog'lanishda xato: {e}", 502)

    async def generate_json(self, system: str, prompt: str, temperature: float = 0.7, retries: int = 1):
        last_err: Exception | None = None
        for _ in range(retries + 1):
            raw = await self.chat(system, [{"role": "user", "content": prompt}], json_mode=True, temperature=temperature)
            try:
                return _extract_json(raw)
            except (json.JSONDecodeError, ValueError) as e:
                log.warning("AI JSON parse xatosi, qayta urinish: %s", e)
                last_err = e
        raise AIError(f"AI noto'g'ri formatda javob qaytardi: {last_err}", 502)

    async def chat_json(self, system: str, messages: list[dict], temperature: float = 0.8) -> dict:
        """Ko'p xabarli suhbat, javob JSON. Parse bo'lmasa matnni 'reply' sifatida qaytaradi."""
        raw = await self.chat(system, messages, json_mode=True, temperature=temperature)
        try:
            data = _extract_json(raw)
            return data if isinstance(data, dict) else {"reply": str(data)}
        except (json.JSONDecodeError, ValueError):
            return {"reply": raw}

    # ---------- Provayderlar ----------

    async def _gemini(self, system: str, messages: list[dict], json_mode: bool, temperature: float) -> str:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.settings.gemini_model}:generateContent"
        contents = [
            {"role": "model" if m["role"] == "assistant" else "user", "parts": [{"text": m["content"]}]}
            for m in messages
        ]
        gen_config: dict = {"temperature": temperature}
        if json_mode:
            gen_config["responseMimeType"] = "application/json"
        body = {
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": contents,
            "generationConfig": gen_config,
        }
        async with httpx.AsyncClient(timeout=120) as client:
            r = await client.post(url, json=body, headers={"x-goog-api-key": self.settings.gemini_api_key})
        if r.status_code != 200:
            raise AIError(f"Gemini xatosi ({r.status_code}): {r.text[:400]}", 502)
        data = r.json()
        try:
            parts = data["candidates"][0]["content"]["parts"]
            return "".join(p.get("text", "") for p in parts)
        except (KeyError, IndexError):
            raise AIError(f"Gemini bo'sh javob qaytardi: {str(data)[:300]}", 502)

    async def _openai(self, system: str, messages: list[dict], json_mode: bool, temperature: float) -> str:
        body: dict = {
            "model": self.settings.openai_model,
            "messages": [{"role": "system", "content": system}, *messages],
            "temperature": temperature,
        }
        if json_mode:
            body["response_format"] = {"type": "json_object"}
        async with httpx.AsyncClient(timeout=120) as client:
            r = await client.post(
                "https://api.openai.com/v1/chat/completions",
                json=body,
                headers={"Authorization": f"Bearer {self.settings.openai_api_key}"},
            )
        if r.status_code != 200:
            raise AIError(f"OpenAI xatosi ({r.status_code}): {r.text[:400]}", 502)
        return r.json()["choices"][0]["message"]["content"]


ai = AIService()
