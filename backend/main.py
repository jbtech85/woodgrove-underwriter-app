"""
Insurance Underwriting API Backend
FastAPI server connecting to Copilot Studio agent via M365 Agents SDK
"""

import os
import json
import asyncio
import uuid
import re
from typing import Any, List, Dict, Optional
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request as FastAPIRequest
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# Fabric Data Agent integration (optional, graceful fallback)
try:
    from fabric_service import fabric_client, FABRIC_AVAILABLE, build_fabric_enriched_prompt
except ImportError:
    FABRIC_AVAILABLE = False
    fabric_client = None
    def build_fabric_enriched_prompt(*a, **kw): return ""

# M365 Agents SDK
from microsoft_agents.copilotstudio.client import CopilotClient, ConnectionSettings, StartRequest
from microsoft_agents.activity import ActivityTypes
import msal

# Data directory
DATA_DIR = Path(__file__).parent / "data"

# Copilot Studio configuration
COPILOT_STUDIO_URL = os.environ.get("COPILOT_STUDIO_URL", "")
AZURE_TENANT_ID = os.environ.get("AZURE_TENANT_ID", "")
AZURE_CLIENT_ID = os.environ.get("AZURE_CLIENT_ID", "")
AZURE_CLIENT_SECRET = os.environ.get("AZURE_CLIENT_SECRET", "")
_cs_sessions: dict = {}  # session_id -> copilot_studio_conversation_id

print(f"Copilot Studio configured: {'yes' if COPILOT_STUDIO_URL else 'no — COPILOT_STUDIO_URL not set'}")

_msal_app: Optional[msal.ConfidentialClientApplication] = None


def _get_msal_app() -> Optional[msal.ConfidentialClientApplication]:
    global _msal_app
    if _msal_app is None and AZURE_CLIENT_ID and AZURE_CLIENT_SECRET and AZURE_TENANT_ID:
        _msal_app = msal.ConfidentialClientApplication(
            client_id=AZURE_CLIENT_ID,
            client_credential=AZURE_CLIENT_SECRET,
            authority=f"https://login.microsoftonline.com/{AZURE_TENANT_ID}",
        )
    return _msal_app


# Pydantic models
class ChatMessage(BaseModel):
    role: str
    content: str
    timestamp: Optional[float] = None


class AdvisorChatRequest(BaseModel):
    message: str
    advisor_id: str
    context: Optional[Dict[str, Any]] = None
    history: Optional[List[ChatMessage]] = []
    skip_mcp: bool = False


# Citation extraction (regulatory rule markers in agent responses)
def _load_regulatory_rules_map() -> Dict[str, Dict]:
    try:
        with open(DATA_DIR / "regulatory_rules.json", "r") as f:
            rules = json.load(f)
        return {r["id"]: r for r in rules}
    except Exception:
        return {}


def _extract_citations(text: str) -> tuple:
    rules_map = _load_regulatory_rules_map()
    pattern = re.compile(r'\[REF:([a-zA-Z0-9_-]+)\]')
    found_ids = list(dict.fromkeys(pattern.findall(text)))
    citations = []
    for rule_id in found_ids:
        rule = rules_map.get(rule_id)
        if rule:
            citations.append({
                "id": rule_id,
                "title": rule.get("title", rule_id),
                "source": rule.get("source_url", ""),
                "description": rule.get("description", ""),
                "jurisdiction": rule.get("jurisdiction", ""),
                "category": rule.get("category", ""),
                "values": rule.get("current_values", {}),
                "last_verified": rule.get("last_verified", ""),
            })
    return text, citations


# Copilot Studio agent integration
async def _get_copilot_token(user_access_token: str) -> str:
    """Exchange user's Easy Auth token for a Copilot Studio scoped token via OBO."""
    msal_app = _get_msal_app()
    if not msal_app:
        raise RuntimeError("Copilot Studio auth not configured (missing AZURE_CLIENT_ID/SECRET/TENANT_ID)")
    result = await asyncio.to_thread(
        msal_app.acquire_token_on_behalf_of,
        user_assertion=user_access_token,
        scopes=["https://api.powerplatform.com/CopilotStudio.Copilots.Invoke"],
    )
    if "access_token" not in result:
        raise RuntimeError(
            f"OBO token exchange failed: {result.get('error_description', result.get('error', 'unknown'))}"
        )
    return result["access_token"]


async def stream_copilot_response(session_id: str, user_message: str, user_access_token: str):
    """Async generator yielding SSE event dicts via Copilot Studio M365 Agents SDK."""
    if not COPILOT_STUDIO_URL:
        yield {"type": "content", "data": {"content": "Chat agent not configured (COPILOT_STUDIO_URL missing)."}}
        return

    yield {"type": "status", "data": {"status": "Thinking..."}}

    try:
        token = await _get_copilot_token(user_access_token)
        settings = ConnectionSettings(
            environment_id="",
            agent_identifier="",
            direct_connect_url=COPILOT_STUDIO_URL,
        )
        client = CopilotClient(settings, token)

        if session_id not in _cs_sessions:
            conv_id = str(uuid.uuid4())
            async for _ in client.start_conversation_with_request(
                StartRequest(emit_start_conversation_event=True, conversation_id=conv_id)
            ):
                pass
            _cs_sessions[session_id] = conv_id

        conv_id = _cs_sessions[session_id]
        accumulated = ""
        async for activity in client.ask_question(user_message, conv_id):
            print(f"[Activity] type={activity.type} text={str(activity.text)[:80] if activity.text else None} value={str(activity.value)[:80] if activity.value else None} attachments={len(activity.attachments) if activity.attachments else 0}")
            if activity.type == ActivityTypes.message and activity.text:
                accumulated += activity.text
                yield {"type": "content", "data": {"content": activity.text}}

        if not accumulated:
            yield {"type": "content", "data": {"content": "No response from agent."}}

    except Exception as e:
        print(f"Copilot Studio error: {e}")
        yield {"type": "content", "data": {"content": f"Agent error: {e}"}}


# FastAPI app
app = FastAPI(title="Insurance Underwriting API", version="1.0.0")

_cors_origins = os.environ.get("CORS_ORIGINS", "https://wonderful-sand-0867c671e.7.azurestaticapps.net")
allowed_origins = [o.strip() for o in _cors_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "Insurance Underwriting API", "status": "active"}


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "copilot_studio_configured": bool(COPILOT_STUDIO_URL),
    }


@app.get("/api/fabric/health")
async def fabric_health():
    return fabric_client.health_check()


@app.post("/api/fabric/query")
async def fabric_query(request: dict):
    if not FABRIC_AVAILABLE:
        raise HTTPException(status_code=503, detail="Fabric Data Agent is not configured.")
    question = request.get("question", "")
    if not question:
        raise HTTPException(status_code=400, detail="'question' field is required")
    try:
        result = await fabric_client.query(question)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fabric query failed: {str(e)}")


@app.post("/advisor/chat/stream")
async def advisor_chat_stream(request: AdvisorChatRequest, http_request: FastAPIRequest):
    """Streaming advisor chat via Copilot Studio M365 Agents SDK."""
    user_token = http_request.headers.get("x-user-token", "")

    async def generate():
        accumulated = ""
        async for ev in stream_copilot_response(
            f"advisor_{request.advisor_id}", request.message, user_token
        ):
            if ev["type"] == "content":
                accumulated += ev["data"].get("content", "")
                yield f"data: {json.dumps({'type': 'content', 'data': ev['data'].get('content', '')})}\n\n"
        clean_text, citations = _extract_citations(accumulated)
        yield f"data: {json.dumps({'type': 'complete', 'data': {'response': clean_text, 'citations': citations}})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )
