"""
LLM Chat livre do Órion.
Permite conversa aberta quando nenhum comando direto é reconhecido.

Estratégia:
  1. OpenRouter primário (modelos free de 70B-480B parâmetros)
  2. Gemini Flash fallback (rotação de até 7 chaves)
  3. Persona AquaMonkey + regras anti-alucinação
  4. Memória curta (últimas 6 interações) para contexto

Variáveis de ambiente esperadas:
  - OPENROUTER_API_KEY            (primário)
  - GEMINI_API_KEY, GEMINI_API_KEY_2 ... GEMINI_API_KEY_7  (fallback)
"""

import os
import logging
import requests
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

# ============================================================
# Persona — alinhada à memória do projeto
# ============================================================
ORION_SYSTEM_PROMPT = """Você é o Órion, um assistente pessoal com personalidade AquaMonkey:
caloroso, direto, levemente espirituoso. Você NÃO é o JARVIS — nada de tom robótico ou formal demais.

Regras invioláveis:
1. Responda em português do Brasil, salvo se o usuário falar outra língua.
2. Seja conciso: 2 a 4 frases para perguntas simples. Detalhe só quando pedido.
3. Factualidade > criatividade. Se não souber, diga "não sei" — nunca invente fontes, datas ou números.
4. Nunca exponha infraestrutura interna (nomes de tabelas, endpoints, modelos, URLs internas).
5. Se a pergunta for sobre uma ação executável (tocar música, ligar luz, controlar robô),
   diga ao usuário para repetir o comando de forma direta — você é só o canal de conversa livre aqui.
"""

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODEL = "meta-llama/llama-3.3-70b-instruct:free"

GEMINI_URL_TMPL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-2.5-flash:generateContent?key={key}"
)

REQUEST_TIMEOUT = 25  # segundos


def _build_messages(user_query: str, history: List[Dict]) -> List[Dict]:
    """Monta a lista de mensagens no formato OpenAI/OpenRouter."""
    messages = [{"role": "system", "content": ORION_SYSTEM_PROMPT}]
    # Últimas 6 interações = 12 turnos
    for h in history[-6:]:
        u = h.get("user")
        a = h.get("assistant")
        if u:
            messages.append({"role": "user", "content": u})
        if a:
            messages.append({"role": "assistant", "content": a})
    messages.append({"role": "user", "content": user_query})
    return messages


# ============================================================
# OpenRouter (primário)
# ============================================================
def _try_openrouter(user_query: str, history: List[Dict]) -> Optional[str]:
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        logger.info("OPENROUTER_API_KEY ausente — pulando primário.")
        return None

    try:
        resp = requests.post(
            OPENROUTER_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://iasofthub.com",
                "X-Title": "Orion Core",
            },
            json={
                "model": OPENROUTER_MODEL,
                "messages": _build_messages(user_query, history),
                "temperature": 0.7,
                "max_tokens": 600,
            },
            timeout=REQUEST_TIMEOUT,
        )
        if resp.status_code == 429:
            logger.warning("OpenRouter rate-limited (429).")
            return None
        if not resp.ok:
            logger.warning(f"OpenRouter falhou {resp.status_code}: {resp.text[:200]}")
            return None
        data = resp.json()
        text = data["choices"][0]["message"]["content"].strip()
        return text or None
    except Exception as e:
        logger.warning(f"OpenRouter exceção: {e}")
        return None


# ============================================================
# Gemini (fallback com rotação de chaves)
# ============================================================
def _gemini_keys() -> List[str]:
    keys = []
    for name in ("GEMINI_API_KEY", "GEMINI_API_KEY_2", "GEMINI_API_KEY_3",
                 "GEMINI_API_KEY_4", "GEMINI_API_KEY_5", "GEMINI_API_KEY_6",
                 "GEMINI_API_KEY_7", "GEMINI_API_KEY_GCP"):
        v = os.getenv(name)
        if v:
            keys.append(v)
    return keys


def _try_gemini(user_query: str, history: List[Dict]) -> Optional[str]:
    keys = _gemini_keys()
    if not keys:
        logger.info("Nenhuma GEMINI_API_KEY configurada — pulando fallback.")
        return None

    # Converte para formato Gemini (contents + role user/model)
    contents = []
    for h in history[-6:]:
        if h.get("user"):
            contents.append({"role": "user", "parts": [{"text": h["user"]}]})
        if h.get("assistant"):
            contents.append({"role": "model", "parts": [{"text": h["assistant"]}]})
    contents.append({"role": "user", "parts": [{"text": user_query}]})

    payload = {
        "systemInstruction": {"parts": [{"text": ORION_SYSTEM_PROMPT}]},
        "contents": contents,
        "generationConfig": {"temperature": 0.7, "maxOutputTokens": 600},
    }

    for idx, key in enumerate(keys, start=1):
        try:
            resp = requests.post(
                GEMINI_URL_TMPL.format(key=key),
                json=payload,
                timeout=REQUEST_TIMEOUT,
            )
            if resp.status_code in (429, 403):
                logger.warning(f"Gemini chave #{idx} bloqueada ({resp.status_code}), tentando próxima.")
                continue
            if not resp.ok:
                logger.warning(f"Gemini chave #{idx} erro {resp.status_code}: {resp.text[:200]}")
                continue
            data = resp.json()
            parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
            text = "".join(p.get("text", "") for p in parts).strip()
            if text:
                return text
        except Exception as e:
            logger.warning(f"Gemini chave #{idx} exceção: {e}")
            continue

    return None


# ============================================================
# Entrada pública
# ============================================================
def chat(user_query: str, history: Optional[List[Dict]] = None) -> Dict:
    """
    Tenta gerar uma resposta conversacional para uma pergunta livre.

    Retorna:
      {
        "response": str,
        "provider": "openrouter" | "gemini" | "offline",
        "source": "Orion Free Chat"
      }
    """
    history = history or []

    # 1. OpenRouter primário
    text = _try_openrouter(user_query, history)
    if text:
        return {"response": text, "provider": "openrouter", "source": "Orion Free Chat"}

    # 2. Gemini fallback
    text = _try_gemini(user_query, history)
    if text:
        return {"response": text, "provider": "gemini", "source": "Orion Free Chat"}

    # 3. Tudo offline
    return {
        "response": "Estou sem conexão com meus motores de conversa agora. Tenta de novo em alguns segundos.",
        "provider": "offline",
        "source": "Orion Free Chat",
    }
