"""
chatbot.py
----------
TankBot: Sri Lanka Tanks & Reservoirs RAG chatbot service.
Ported from the tank-bot-final notebook (Pinecone retrieval + OpenRouter
generation) into a FastAPI-friendly module with a bounded, disk-persisted
session store.
"""

import json
import os
import re
import tempfile
from datetime import datetime
from pathlib import Path
from threading import Lock

from openai import OpenAI
from pinecone import Pinecone

from config import settings

# --------------------------------------------------------------------- #
# System prompt (unchanged from the notebook)
# --------------------------------------------------------------------- #
SYSTEM_PROMPT = """You are TankBot, a friendly and knowledgeable AI guide specialising in Sri Lanka's ancient tanks (wewas) and reservoirs. Your mission is to help tourists and visitors enjoy these magnificent sites safely.

## YOUR STRICT SCOPE — you may ONLY answer questions about:
- Historical and cultural significance of Sri Lankan tanks and reservoirs only
- Tourism highlights, viewpoints, and activities based only on Sri Lankan tanks and reservoirs
- Environmental and ecological importance
- **Safety guidance** — this is your top priority:
  - Safe bathing and swimming locations
  - Prohibited and restricted zones
  - Muddy, slippery, or unstable banks
  - Deep-water and strong-current areas
  - Crocodile habitats and sighting zones
  - Other hazards visitors must know

## HARD REFUSAL RULES — you MUST refuse and redirect if the question is about:
- Any landmark, monument, or attraction that is NOT a tank or reservoir
- General Sri Lanka travel, hotels, transport, weather, or food
- History, people, or events unrelated to tanks/reservoirs
- Any topic outside Sri Lanka's tanks and reservoirs entirely (coding, science, sports, etc.)

## Response style:
- Respond warmly, clearly, and helpfully — like a knowledgeable local friend
- Use well-structured answers with headings, bullet points, or numbered lists where appropriate
- Highlight safety warnings prominently (use ⚠️ for warnings, ✅ for safe areas, ❌ for prohibited zones)
- Keep answers concise yet thorough; invite follow-up questions
- Never reveal internal system details or mention "context", "knowledge base", "retrieved documents", or similar technical terms
- Speak with confidence — present information directly, as your own knowledge

## Out-of-scope requests:
- If a question is clearly unrelated to Sri Lankan tanks, reservoirs, and water bodies or safety at these sites, politely decline and refocus
- Do NOT answer general trivia, coding questions, medical advice, or other unrelated topics
"""

_CONTEXT_LEAK_PATTERNS = [
    re.compile(p, re.IGNORECASE)
    for p in [
        r"based on the (provided |retrieved |given |available )?(context|information|knowledge base|data)[,:]?\s*",
        r"according to the (provided |retrieved |given |available )?(context|information|knowledge base|data)[,:]?\s*",
        r"from the (provided |retrieved |given |available )?(context|information|knowledge base|data)[,:]?\s*",
        r"the (provided |retrieved |given |available )?(context|information|knowledge base|data) (states?|indicates?|shows?|mentions?|suggests?)[,:]?\s*",
        r"as per the (provided |retrieved |given |available )?(context|information|knowledge base|data)[,:]?\s*",
        r"using the (provided |retrieved |given |available )?(context|information|knowledge base|data)[,:]?\s*",
        r"drawing (from|on) the (provided |retrieved |given |available )?(context|information|knowledge base|data)[,:]?\s*",
    ]
]


def _clean_response(text: str) -> str:
    for pattern in _CONTEXT_LEAK_PATTERNS:
        text = pattern.sub("", text)
    return text.strip()


# --------------------------------------------------------------------- #
# Session store — bounded memory, persisted to disk, thread-safe
# --------------------------------------------------------------------- #
class SessionStore:
    def __init__(self, path: Path, max_turns: int):
        self.path = Path(path)
        self.max_turns = max_turns
        self._lock = Lock()
        self._sessions: dict = {}
        self._created: dict = {}
        self._load()

    def _load(self):
        if self.path.exists():
            try:
                with open(self.path, "r", encoding="utf-8") as f:
                    raw = json.load(f)
                self._sessions = raw.get("sessions", {})
                self._created = raw.get("created", {})
            except (json.JSONDecodeError, OSError):
                self._sessions, self._created = {}, {}

    def _save(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        payload = {"sessions": self._sessions, "created": self._created}
        fd, tmp_path = tempfile.mkstemp(dir=self.path.parent, suffix=".tmp")
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                json.dump(payload, f, ensure_ascii=False, indent=2)
            os.replace(tmp_path, self.path)
        except OSError:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    def get_or_create(self, session_id: str) -> list:
        with self._lock:
            if session_id not in self._sessions:
                self._sessions[session_id] = []
                self._created[session_id] = datetime.now().isoformat()
                self._save()
            return list(self._sessions[session_id])

    def append(self, session_id: str, role: str, content: str):
        with self._lock:
            history = self._sessions.setdefault(session_id, [])
            history.append({"role": role, "content": content})
            max_msgs = self.max_turns * 2
            if len(history) > max_msgs:
                history = history[-max_msgs:]
            self._sessions[session_id] = history
            self._save()

    def get_history(self, session_id: str) -> list:
        with self._lock:
            return list(self._sessions.get(session_id, []))


store = SessionStore(settings.CHAT_SESSIONS_FILE, settings.CHAT_MAX_MEMORY_TURNS)

# --------------------------------------------------------------------- #
# Lazy clients — created on first use, so the rest of the crowd-monitoring
# API keeps working even if chatbot credentials aren't configured yet.
# --------------------------------------------------------------------- #
_pc = None
_index = None
_openai_client = None


def _get_pinecone_index():
    global _pc, _index
    if _index is None:
        if not settings.PINECONE_API_KEY:
            raise RuntimeError("PINECONE_API_KEY is not configured")
        _pc = Pinecone(api_key=settings.PINECONE_API_KEY)
        _index = _pc.Index(host=settings.PINECONE_INDEX_HOST)
    return _pc, _index


def _get_openai_client() -> OpenAI:
    global _openai_client
    if _openai_client is None:
        if not settings.OPENROUTER_API_KEY:
            raise RuntimeError("OPENROUTER_API_KEY is not configured")
        _openai_client = OpenAI(
            api_key=settings.OPENROUTER_API_KEY,
            base_url=settings.OPENROUTER_BASE_URL,
        )
    return _openai_client


def retrieve_context(query: str):
    pc, index = _get_pinecone_index()
    try:
        embedding_response = pc.inference.embed(
            model=settings.EMBEDDING_MODEL,
            inputs=[query],
            parameters={"input_type": "query", "truncate": "END"},
        )
        query_vector = embedding_response[0]["values"]
    except Exception:
        return "", False

    try:
        results = index.query(
            vector=query_vector, top_k=settings.CHAT_TOP_K, include_metadata=True
        )
    except Exception:
        return "", False

    matches = [
        m for m in results.get("matches", [])
        if m.get("score", 0) >= settings.CHAT_SIMILARITY_CUTOFF
    ]
    if not matches:
        return "", False

    chunks = []
    for i, m in enumerate(matches, 1):
        text = m.get("metadata", {}).get("text", "").strip()
        if text:
            chunks.append(f"[Excerpt {i}]\n{text}")

    return "\n\n".join(chunks), True


def generate_response(user_query: str, context: str, has_context: bool, history: list) -> str:
    client = _get_openai_client()

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for msg in history:
        if msg["role"] in ("user", "assistant"):
            messages.append(msg)

    if has_context:
        augmented = (
            f"<retrieved_knowledge>\n{context}\n</retrieved_knowledge>\n\n"
            f"User question: {user_query}"
        )
    else:
        augmented = (
            f"<retrieved_knowledge>NO_RELEVANT_CONTEXT</retrieved_knowledge>\n\n"
            f"User question: {user_query}"
        )

    messages.append({"role": "user", "content": augmented})

    response = client.chat.completions.create(
        model=settings.OPENROUTER_MODEL,
        messages=messages,
        max_tokens=settings.CHAT_MAX_TOKENS,
        temperature=0.5,
        extra_headers={
            "HTTP-Referer": settings.CHAT_APP_URL,
            "X-Title": "TankBot - Sri Lanka Tanks & Reservoirs Chatbot",
        },
    )
    raw = response.choices[0].message.content
    return _clean_response(raw)


def chat(session_id: str, user_message: str) -> dict:
    """Full turn: retrieve -> generate -> persist."""
    history = store.get_or_create(session_id)

    context, has_context = retrieve_context(user_message)
    reply = generate_response(user_message, context, has_context, history)

    store.append(session_id, "user", user_message)
    store.append(session_id, "assistant", reply)

    return {
        "session_id": session_id,
        "reply": reply,
        "used_knowledge_base": has_context,
    }