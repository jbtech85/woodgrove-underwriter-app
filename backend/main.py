"""
Insurance Underwriting API Backend
FastAPI server with Azure AI integration for insurance underwriting analysis
Enhanced with streaming responses and real-time status updates
"""

import os
import json
import time
import asyncio
import uuid
import re
from typing import Any, List, Dict, Optional
from datetime import datetime
from pathlib import Path
from urllib import request as urllib_request
from urllib import error as urllib_error

from fastapi import FastAPI, HTTPException, Request as FastAPIRequest
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, ValidationError

# Storage imports
from storage import (
    storage,
    Conversation,
    ConversationMessage,
    SavedScenario,
    ScenarioShareRecord,
)


# Fabric Data Agent integration (optional, graceful fallback)
try:
    from fabric_service import fabric_client, FABRIC_AVAILABLE, build_fabric_enriched_prompt
except ImportError:
    FABRIC_AVAILABLE = False
    fabric_client = None
    def build_fabric_enriched_prompt(*a, **kw): return ""

# Data directory path
DATA_DIR = Path(__file__).parent / "data"

# Direct Line configuration (Copilot Studio)
DIRECTLINE_SECRET = os.environ.get("DIRECTLINE_SECRET", "")
DIRECTLINE_BASE = "https://directline.botframework.com/v3/directline"
_dl_sessions: dict = {}  # session_id -> {conversation_id, watermark}

print(f"Direct Line configured: {'yes' if DIRECTLINE_SECRET else 'no — DIRECTLINE_SECRET not set'}")

# Load data from JSON files
def load_user_profiles():
  """Load user profiles from JSON file"""
  try:
      with open(DATA_DIR / "user_profiles.json", 'r') as f:
          profiles_data = json.load(f)
          return [UserProfile(**profile) for profile in profiles_data]
  except (FileNotFoundError, json.JSONDecodeError) as e:
      print(f"Error loading user profiles: {e}")
      return []

# Pydantic Models
class UserProfile(BaseModel):
    id: str
    name: str
    age: int = Field(gt=0)
    current_cash: float = Field(ge=0)
    investment_assets: float = Field(ge=0)
    yearly_savings_rate: float = Field(ge=0, le=1)
    salary: float = Field(ge=0)
    portfolio: Dict[str, float]
    risk_appetite: str  # Allow any string value for risk appetite
    target_retire_age: int = Field(gt=0)
    target_monthly_income: float = Field(gt=0)
    description: Optional[str] = None
    advisor_id: Optional[str] = None

class ProductRec(BaseModel):
  name: str
  allocation: float = Field(ge=0, le=1)
  exp_return: Optional[float] = Field(ge=0, le=1)
  risk_rating: Optional[str] = None
  asset_class: Optional[str] = None

class CashflowPoint(BaseModel):
  year: int = Field(ge=0)
  end_assets: float = Field(ge=0)

class Metrics(BaseModel):
  monthly_income: float = Field(ge=0)
  success_rate_pct: float = Field(ge=0, le=100)
  risk_level: str  # Allow any string value for risk level
  flexibility: Optional[str] = None
  time_horizon_years: Optional[int] = Field(ge=0)

class Deltas(BaseModel):
    additional_savings_monthly: Optional[float] = Field(ge=0)
    # Baseline projected sustainable monthly retirement income BEFORE changes (absolute, non-negative)
    retirement_income_monthly: Optional[float] = Field(default=None, ge=0)
    retirement_income_delta: Optional[float] = None
    success_rate_delta_pct: Optional[float] = None
    extra_years_income_duration: Optional[float] = None  # Can be negative (reduced duration), accepts float and rounds to int

class Predictions(BaseModel):
  metrics: Metrics
  deltas: Optional[Deltas] = None
  products: List[ProductRec] = []
  cashflows: List[CashflowPoint] = []

class AnalysisOutput(BaseModel):
  scenario: UserProfile
  recommended_changes: Dict[str, Any]
  predictions: Predictions
  follow_ups: List[str]
  alternatives: List[str]
  considerations: str

# Cashflow validation constants
EXPECTED_CASHFLOW_YEARS = [0, 5, 10, 15, 20, 25]

def enforce_cashflow_horizon(cashflows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Normalize agent-provided cashflows into required 25-year (0..25, 5-year steps) series.

    Improvements over simple forward fill:
    - Uses linear interpolation between provided valid checkpoints to avoid unrealistic flat lines then vertical drops.
    - If depletion (<=0) occurs between two provided points, interpolates the zero crossing year proportionally and clamps later points to 0.
    - If only a single starting point is provided, assumes monotonic decline to 0 only if an explicit non-positive value is given later; otherwise keeps value constant (agent should supply trajectory via code tool).
    - Extra / off-interval years ignored.
    """
    if not isinstance(cashflows, list):
        return [{"year": y, "end_assets": 0.0} for y in EXPECTED_CASHFLOW_YEARS]

    # Collect valid points on expected grid or any interim for interpolation (allow any year 0..25)
    raw_points: List[tuple[int, float]] = []
    for pt in cashflows:
        try:
            y = int(pt.get("year"))
            v = float(pt.get("end_assets"))
        except Exception:
            continue
        if 0 <= y <= 25:
            raw_points.append((y, max(0.0, v)))

    # Deduplicate by year keeping last
    point_map: Dict[int, float] = {}
    for y, v in raw_points:
        point_map[y] = v

    if 0 not in point_map and raw_points:
        # ensure year 0 anchor using earliest value
        earliest_year = min(point_map.keys())
        point_map[0] = point_map[earliest_year]

    # Sorted unique years
    years_sorted = sorted(point_map.keys())
    if not years_sorted:
        return [{"year": y, "end_assets": 0.0} for y in EXPECTED_CASHFLOW_YEARS]

    # Build full 0..25 annual series via interpolation for missing internal years
    annual: Dict[int, float] = {}
    for idx, y in enumerate(years_sorted):
        annual[y] = point_map[y]
        if idx == 0:
            continue
        prev_y = years_sorted[idx - 1]
        prev_v = point_map[prev_y]
        cur_v = point_map[y]
        span = y - prev_y
        if span > 1:
            # Linear interpolation (including potential decline to zero)
            for step in range(1, span):
                interp_y = prev_y + step
                ratio = step / span
                interp_v = prev_v + (cur_v - prev_v) * ratio
                annual[interp_y] = max(0.0, interp_v)

    # Detect depletion crossing between positive -> zero sequences and clamp future
    # If value goes to zero or below, rest after that year is zero
    depleted = False
    for y in range(0, 26):
        if y in annual:
            val = annual[y]
        else:
            # interpolate between nearest known annual points (shouldn't normally happen now)
            # find previous and next known years
            prev_known = max([k for k in annual.keys() if k < y], default=None)
            next_known = min([k for k in annual.keys() if k > y], default=None)
            if prev_known is not None and next_known is not None:
                ratio = (y - prev_known) / (next_known - prev_known)
                val = annual[prev_known] + (annual[next_known] - annual[prev_known]) * ratio
            else:
                val = annual.get(prev_known or next_known or 0, 0.0)
            annual[y] = max(0.0, val)
        if not depleted and annual[y] <= 0:
            annual[y] = 0.0
            depleted = True
        elif depleted:
            annual[y] = 0.0

    # Now sample required 5-year checkpoints
    ordered: List[Dict[str, Any]] = []
    for y in EXPECTED_CASHFLOW_YEARS:
        ordered.append({"year": y, "end_assets": float(round(annual.get(y, 0.0), 2))})
    return ordered

def log_key_metrics(analysis: AnalysisOutput):
  """Print key scenario metrics to console for operational visibility.

  This is invoked every time an agent run produces a valid AnalysisOutput
  (both streaming and non‑streaming endpoints). Keeps output concise.
  """
  try:
      scenario = analysis.scenario
      metrics = analysis.predictions.metrics
      deltas = analysis.predictions.deltas
      products = analysis.predictions.products or []
      cashflows = analysis.predictions.cashflows or []

      print("\n=== Retirement Scenario Metrics ===")
      print(f"Timestamp: {datetime.utcnow().isoformat()}Z")
      print(f"Scenario: {scenario.id if hasattr(scenario,'id') else ''} | {scenario.name} (Age {scenario.age})  Target Monthly Income: ${scenario.target_monthly_income:,.0f}")
      print("-- Core Metrics --")
      print(f"Projected Monthly Income: ${metrics.monthly_income:,.0f}")
      print(f"Success Rate: {metrics.success_rate_pct:.0f}%  Risk Level: {metrics.risk_level}  Time Horizon: {metrics.time_horizon_years} yrs")
      if metrics.flexibility:
          print(f"Flexibility: {metrics.flexibility}")
      if deltas:
          print("-- Deltas (vs baseline) --")
          if deltas.retirement_income_monthly is not None:
              print(f"Baseline Monthly Income: ${deltas.retirement_income_monthly:,.0f}")
          if deltas.retirement_income_delta is not None:
              sign = '+' if deltas.retirement_income_delta >= 0 else ''
              print(f"Progress vs Target: {sign}${deltas.retirement_income_delta:,.0f}")
          if deltas.success_rate_delta_pct is not None:
              sign = '+' if deltas.success_rate_delta_pct >= 0 else ''
              print(f"Success Rate Delta: {sign}{deltas.success_rate_delta_pct:.0f} pp")
          if deltas.extra_years_income_duration is not None:
              sign = '+' if deltas.extra_years_income_duration >= 0 else ''
              print(f"Extra Income Duration: {sign}{deltas.extra_years_income_duration:.0f} yrs")
          if deltas.additional_savings_monthly is not None:
              print(f"Additional Monthly Savings Needed: ${deltas.additional_savings_monthly:,.0f}")
      if products:
          print(f"-- Product Recs ({len(products)}) --")
          for p in products[:5]:  # limit to first 5 for brevity
              alloc_pct = f"{p.allocation*100:.1f}%" if p.allocation is not None else 'n/a'
              exp_ret = f" {p.exp_return*100:.1f}%" if p.exp_return is not None else ''
              print(f"  - {p.name}: {alloc_pct}{exp_ret} {p.risk_rating or ''}".rstrip())
          if len(products) > 5:
              print(f"  ... {len(products)-5} more products")
      if cashflows:
          # Show first & last cashflow points for quick trajectory sense
          first_cf = cashflows[0]
          last_cf = cashflows[-1]
          print(f"-- Asset Trajectory -- Start (Year {first_cf.year}): ${first_cf.end_assets:,.0f}  |  End (Year {last_cf.year}): ${last_cf.end_assets:,.0f}")
      print(f"Considerations: {analysis.considerations[:200]}{'...' if len(analysis.considerations)>200 else ''}")
      print("=== End Scenario Metrics ===\n")
  except Exception as e:
      print(f"Metric logging failed: {e}")

class ChatMessage(BaseModel):
  role: str
  content: str
  timestamp: Optional[float] = None

class ChatRequest(BaseModel):
  message: str
  profile: Optional[UserProfile] = None
  history: List[ChatMessage] = []
  data_source: Optional[str] = None  # "local" (default) or "fabric"

class ChatResponse(BaseModel):
  response: str
  analysis: Optional[AnalysisOutput] = None
  status: str = "completed"

class StreamingChatResponse(BaseModel):
  type: str  # "status", "content", "analysis", "complete"
  data: Dict[str, Any]
  timestamp: float

class ProfilesResponse(BaseModel):
  profiles: List[UserProfile]

# Load data
SAMPLE_PROFILES = load_user_profiles()



# Conversation management — stores the last response ID per session for context continuity
class ConversationManager:
    def __init__(self):
        self._last_response_ids: dict = {}

    def get_previous_response_id(self, session_id: str):
        return self._last_response_ids.get(session_id)

    def set_last_response_id(self, session_id: str, response_id: str) -> None:
        self._last_response_ids[session_id] = response_id

    def clear(self, session_id: str) -> None:
        self._last_response_ids.pop(session_id, None)

conversation_manager = ConversationManager()


def _dl_request(method: str, path: str, body: dict = None) -> dict:
    url = f"{DIRECTLINE_BASE}{path}"
    headers = {
        "Authorization": f"Bearer {DIRECTLINE_SECRET}",
        "Content-Type": "application/json",
    }
    data = json.dumps(body).encode() if body is not None else b""
    req = urllib_request.Request(url, data=data if method != "GET" else None, headers=headers, method=method)
    with urllib_request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())


def stream_agent_response(session_id: str, user_message: str):
    """Synchronous generator that yields SSE event dicts via Copilot Studio Direct Line."""
    if not DIRECTLINE_SECRET:
        yield {"type": "content", "data": {"content": "Chat agent not configured (DIRECTLINE_SECRET missing)."}}
        return

    yield {"type": "status", "data": {"status": "Thinking..."}}

    try:
        if session_id not in _dl_sessions:
            conv = _dl_request("POST", "/conversations")
            _dl_sessions[session_id] = {"conversation_id": conv["conversationId"], "watermark": None}

        session = _dl_sessions[session_id]
        conv_id = session["conversation_id"]

        _dl_request("POST", f"/conversations/{conv_id}/activities", {
            "type": "message",
            "from": {"id": "user"},
            "text": user_message,
        })

        deadline = time.time() + 30
        while time.time() < deadline:
            watermark = session["watermark"]
            params = f"?watermark={watermark}" if watermark else ""
            result = _dl_request("GET", f"/conversations/{conv_id}/activities{params}")
            session["watermark"] = str(result.get("watermark", watermark or ""))
            bot_msgs = [
                a for a in result.get("activities", [])
                if a.get("from", {}).get("role") == "bot" and a.get("type") == "message"
            ]
            if bot_msgs:
                yield {"type": "content", "data": {"content": bot_msgs[-1].get("text", "")}}
                return
            time.sleep(0.75)

        yield {"type": "content", "data": {"content": "Agent response timed out."}}

    except Exception as e:
        print(f"Direct Line error: {e}")
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
      "directline_configured": bool(DIRECTLINE_SECRET)
  }


# ─── Fabric Data Agent Endpoints ──────────────────────────────────────────────

@app.get("/api/fabric/health")
async def fabric_health():
    """Check Fabric Data Agent connectivity and SPN token acquisition."""
    return fabric_client.health_check()


@app.post("/api/fabric/query")
async def fabric_query(request: dict):
    """
    Direct query to Fabric Data Agent.
    Body: { "question": "Show me Sarah Chen's portfolio" }
    Returns the raw Fabric Data Agent response.
    """
    if not FABRIC_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Fabric Data Agent is not configured. Set the required environment variables.",
        )
    question = request.get("question", "")
    if not question:
        raise HTTPException(status_code=400, detail="'question' field is required")

    try:
        result = await fabric_client.query(question)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fabric query failed: {str(e)}")


@app.get("/profiles", response_model=ProfilesResponse)
async def get_profiles():
  """Get available user profiles"""
  return ProfilesResponse(profiles=SAMPLE_PROFILES)


# ─── Advisor AI Chat Endpoints ───────────────────────────────────────────────

class AdvisorChatRequest(BaseModel):
    message: str
    advisor_id: str
    context: Optional[Dict[str, Any]] = None
    history: Optional[List[ChatMessage]] = []
    skip_mcp: bool = False  # Skip MCP KB lookup; use AI agent directly (for generation tasks)



def _load_regulatory_rules_map() -> Dict[str, Dict]:
    """Load regulatory rules into a dict keyed by rule ID for citation lookup."""
    import os
    data_dir = os.path.join(os.path.dirname(__file__), "data")
    try:
        with open(os.path.join(data_dir, "regulatory_rules.json"), "r") as f:
            rules = json.load(f)
        return {r["id"]: r for r in rules}
    except Exception:
        return {}


def _extract_citations(text: str) -> tuple:
    """Extract [REF:rule-id] citations from LLM output.
    Returns (clean_text, citations_list) where citations have title, source, rule_id, description.
    """
    import re
    rules_map = _load_regulatory_rules_map()
    pattern = re.compile(r'\[REF:([a-zA-Z0-9_-]+)\]')
    found_ids = list(dict.fromkeys(pattern.findall(text)))  # unique, ordered

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


class MCPQueryError(Exception):
    def __init__(self, reason: str):
        super().__init__(reason)
        self.reason = reason


def _load_sage_kb_mcp_config_from_workspace() -> Dict[str, Any]:
    workspace_mcp = Path(__file__).resolve().parent.parent / ".vscode" / "mcp.json"
    try:
        with open(workspace_mcp, "r", encoding="utf-8") as f:
            config = json.load(f)
        server = config.get("servers", {}).get("sage-advisor-kb", {})
        headers = server.get("headers", {}) if isinstance(server.get("headers", {}), dict) else {}
        return {
            "url": server.get("url", ""),
            "api_key": headers.get("api-key", ""),
        }
    except Exception:
        return {"url": "", "api_key": ""}


def _get_sage_kb_mcp_config() -> Dict[str, Any]:
    workspace_config = _load_sage_kb_mcp_config_from_workspace()
    timeout_default = 8.0
    try:
        timeout_default = float(os.environ.get("SAGE_KB_MCP_TIMEOUT_SECONDS", "8"))
    except ValueError:
        timeout_default = 8.0

    retry_default = 1
    try:
        retry_default = max(0, int(os.environ.get("SAGE_KB_MCP_RETRIES", "1")))
    except ValueError:
        retry_default = 1

    return {
        "url": os.environ.get("SAGE_KB_MCP_URL", workspace_config.get("url", "")),
        "api_key": os.environ.get("SAGE_KB_MCP_API_KEY", workspace_config.get("api_key", "")),
        "timeout_seconds": timeout_default,
        "tool_name": os.environ.get("SAGE_KB_MCP_TOOL_NAME", "knowledge_base_retrieve"),
        "retries": retry_default,
    }


def _build_mcp_tool_arguments(
    tool_name: str,
    message: str,
    advisor_id: str,
    context: Optional[Dict[str, Any]],
    compact_history: List[Dict[str, Any]],
) -> Dict[str, Any]:
    if tool_name == "knowledge_base_retrieve":
        intents = [message]
        topic = (context or {}).get("topic") if isinstance(context, dict) else None
        if isinstance(topic, str) and topic.strip() and topic.strip().lower() != message.strip().lower():
            intents.append(topic.strip())
        return {
            "request": {
                "knowledgeBaseIntents": intents[:3],
            }
        }

    return {
        "query": message,
        "advisor_id": advisor_id,
        "context": context or {},
        "history": compact_history,
    }


def _normalize_mcp_citations(raw_payload: Any) -> List[Dict[str, Any]]:
    if not isinstance(raw_payload, list):
        return []

    citations: List[Dict[str, Any]] = []
    for item in raw_payload:
        if isinstance(item, str):
            citations.append({"title": item, "source": ""})
            continue

        if not isinstance(item, dict):
            continue

        source = item.get("source") or item.get("url") or item.get("link") or ""
        title = item.get("title") or item.get("name") or source or "Reference"
        citation = {
            "id": item.get("id", ""),
            "title": title,
            "source": source,
            "description": item.get("description", ""),
            "jurisdiction": item.get("jurisdiction", ""),
            "category": item.get("category", ""),
            "values": item.get("values", {}),
            "last_verified": item.get("last_verified", ""),
        }
        citations.append(citation)

    return citations


def _build_mcp_ref_context_map(response_text: str) -> Dict[str, List[str]]:
    context_map: Dict[str, List[str]] = {}
    if not isinstance(response_text, str) or not response_text.strip():
        return context_map

    fragments = re.split(r"(?<=[.!?])\s+", response_text)
    marker_pattern = re.compile(r"\[ref_id\s*:\s*(\d+)\]", flags=re.IGNORECASE)

    for fragment in fragments:
        if not isinstance(fragment, str) or not fragment.strip():
            continue

        fragment_ref_ids: List[str] = []
        for match in marker_pattern.finditer(fragment):
            rid = match.group(1)
            if rid not in fragment_ref_ids:
                fragment_ref_ids.append(rid)

        if not fragment_ref_ids:
            continue

        cleaned_fragment = marker_pattern.sub("", fragment)
        cleaned_fragment = re.sub(r"\s+", " ", cleaned_fragment).strip()
        if not cleaned_fragment:
            continue

        for rid in fragment_ref_ids:
            contexts = context_map.setdefault(rid, [])
            if cleaned_fragment not in contexts:
                contexts.append(cleaned_fragment)

    return context_map


def _normalize_mcp_response(raw_response: Any) -> Dict[str, Any]:
    if not isinstance(raw_response, dict):
        raise MCPQueryError("mcp_invalid_response")

    result = raw_response.get("result", raw_response)
    if not isinstance(result, dict):
        raise MCPQueryError("mcp_invalid_result")

    text_candidates: List[str] = []
    for field in ["response", "answer", "text", "output", "message"]:
        value = result.get(field)
        if isinstance(value, str) and value.strip():
            text_candidates.append(value.strip())

    content = result.get("content")
    if isinstance(content, list):
        parts: List[str] = []
        for chunk in content:
            if isinstance(chunk, dict):
                chunk_text = chunk.get("text")
                if isinstance(chunk_text, str) and chunk_text.strip():
                    parts.append(chunk_text.strip())
            elif isinstance(chunk, str) and chunk.strip():
                parts.append(chunk.strip())
        if parts:
            text_candidates.append("\n".join(parts))

    data = result.get("data")
    if isinstance(data, dict):
        for field in ["response", "answer", "text", "output"]:
            value = data.get(field)
            if isinstance(value, str) and value.strip():
                text_candidates.append(value.strip())

    response_text = text_candidates[0].strip() if text_candidates else ""
    if not response_text:
        raise MCPQueryError("mcp_empty_response")

    no_answer_markers = [
        "sorry, i could not find an answer for your query",
        "i could not find an answer for your query",
        "no relevant information found",
    ]
    lowered = response_text.lower()
    if any(marker in lowered for marker in no_answer_markers):
        raise MCPQueryError("mcp_no_answer")

    raw_citations = result.get("citations")
    if raw_citations is None and isinstance(data, dict):
        raw_citations = data.get("citations") or data.get("sources") or data.get("references")
    if raw_citations is None:
        raw_citations = result.get("sources") or result.get("references")

    citations = _normalize_mcp_citations(raw_citations)

    # Some MCP responses return inline markers like [ref_id:0] without citation metadata.
    # Convert them into the existing [REF:id] pattern and synthesize lightweight citations
    # so the current frontend can render citation chips and Foundry IQ attribution.
    if not citations:
        ref_ids = []
        for match in re.findall(r"\[ref_id\s*:\s*(\d+)\]", response_text, flags=re.IGNORECASE):
            if match not in ref_ids:
                ref_ids.append(match)

        if ref_ids:
            context_map = _build_mcp_ref_context_map(response_text)

            for rid in ref_ids:
                response_text = re.sub(
                    rf"\[ref_id\s*:\s*{re.escape(rid)}\]",
                    f"[REF:mcp-ref-{rid}]",
                    response_text,
                    flags=re.IGNORECASE,
                )

            citations = []
            for index, rid in enumerate(ref_ids, start=1):
                contexts = context_map.get(rid, [])

                if contexts:
                    title = contexts[0]
                    if len(title) > 90:
                        title = f"{title[:89]}…"
                else:
                    title = f"MCP Reference {index}"

                if contexts:
                    description = " ".join(contexts[:2]).strip()
                else:
                    description = "Reference marker provided by MCP response."

                citations.append(
                    {
                        "id": f"mcp-ref-{rid}",
                        "title": title,
                        "source": "",
                        "description": description,
                        "jurisdiction": "",
                        "category": "",
                        "values": {},
                        "last_verified": "",
                    }
                )

    return {"response": response_text, "citations": citations}


def _execute_mcp_request(url: str, api_key: str, timeout_seconds: float, payload: Dict[str, Any]) -> Dict[str, Any]:
    body = json.dumps(payload).encode("utf-8")
    req = urllib_request.Request(url=url, data=body, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/json, text/event-stream")
    if api_key:
        req.add_header("api-key", api_key)

    try:
        with urllib_request.urlopen(req, timeout=timeout_seconds) as response:
            raw = response.read().decode("utf-8", errors="ignore")
    except urllib_error.HTTPError as e:
        body_text = ""
        try:
            body_text = e.read().decode("utf-8", errors="ignore")
        except Exception:
            body_text = ""
        raise MCPQueryError(f"mcp_http_{e.code}:{body_text[:200]}")

    stripped = raw.strip()
    for line in stripped.splitlines():
        if line.startswith("data:"):
            stripped = line[5:].strip()
            break

    parsed = json.loads(stripped) if stripped else {}
    if not isinstance(parsed, dict):
        raise MCPQueryError("mcp_non_json_object")
    if parsed.get("error"):
        raise MCPQueryError("mcp_error")
    return parsed


async def _query_sage_kb_mcp(
    message: str,
    advisor_id: str,
    context: Optional[Dict[str, Any]] = None,
    history: Optional[List[Any]] = None,
) -> Dict[str, Any]:
    config = _get_sage_kb_mcp_config()
    url = config.get("url", "")
    api_key = config.get("api_key", "")
    timeout_seconds = float(config.get("timeout_seconds", 4.0))
    tool_name = config.get("tool_name", "knowledge_base_retrieve")
    retries = int(config.get("retries", 1))

    if not url:
        raise MCPQueryError("mcp_not_configured")

    compact_history = []
    if history:
        for msg in history[-6:]:
            role = getattr(msg, "role", None)
            content = getattr(msg, "content", None)
            if role and content:
                compact_history.append({"role": role, "content": content})

    payloads = [
        {
            "jsonrpc": "2.0",
            "id": "sage-kb-1",
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": _build_mcp_tool_arguments(
                    tool_name=tool_name,
                    message=message,
                    advisor_id=advisor_id,
                    context=context,
                    compact_history=compact_history,
                ),
            },
        },
    ]

    started = time.perf_counter()
    last_error = "mcp_unavailable"

    for payload in payloads:
        for attempt in range(retries + 1):
            try:
                raw = await asyncio.to_thread(
                    _execute_mcp_request,
                    url,
                    api_key,
                    timeout_seconds,
                    payload,
                )
                normalized = _normalize_mcp_response(raw)
                latency_ms = int((time.perf_counter() - started) * 1000)
                normalized["latency_ms"] = latency_ms
                return normalized
            except (urllib_error.URLError, TimeoutError):
                last_error = "mcp_transport_error"
                if attempt < retries:
                    await asyncio.sleep(0.25)
                    continue
            except json.JSONDecodeError:
                last_error = "mcp_invalid_json"
            except MCPQueryError as e:
                last_error = e.reason
            except Exception:
                last_error = "mcp_unknown_error"
            break

    raise MCPQueryError(last_error)


@app.post("/advisor/chat/stream")
async def advisor_chat_stream(request: AdvisorChatRequest):
    """Streaming advisor chat via Copilot Studio Direct Line."""
    try:
        def generate():
            accumulated = ""
            for ev in stream_agent_response(f"advisor_{request.advisor_id}", request.message):
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

    except Exception as e:
        print(f"Advisor chat stream error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/evaluate/{thread_id}/{run_id}")
async def evaluate_run(thread_id: str, run_id: str):
  """Evaluate an agent run with IntentResolution, ToolCallAccuracy, and TaskAdherence"""
  try:
      results = await evaluate_agent_run(thread_id, run_id)
      
      if results is None:
          raise HTTPException(status_code=503, detail="Evaluation service not available")
      
      return {
          "status": "completed",
          "thread_id": thread_id,
          "run_id": run_id, 
          "evaluations": results,
          "timestamp": time.time()
      }
      
  except Exception as e:
      raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")

@app.post("/chat/stream")
async def chat_stream(request: ChatRequest, http_request: FastAPIRequest):
    """Streaming chat endpoint using Azure AI Projects Responses API."""
    use_fabric = (request.data_source == "fabric")

    # ── Fabric path — query Fabric first, then pass enriched prompt to agent ─
    if use_fabric:
        if not FABRIC_AVAILABLE:
            raise HTTPException(status_code=503, detail="Fabric Data Agent is not configured.")

        async def fabric_stream():
            yield f"data: {json.dumps({'type': 'status', 'data': {'status': 'Querying Fabric Data Agent...'}, 'timestamp': time.time()})}\n\n"
            try:
                fabric_result = await fabric_client.query(request.message, timeout=60)
            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'data': {'error': f'Fabric query failed: {e}'}, 'timestamp': time.time()})}\n\n"
                return

            profile = request.profile or SAMPLE_PROFILES[0]
            enriched = build_fabric_enriched_prompt(request.message, fabric_result, original_profile=profile.dict() if profile else None)

            loop = asyncio.get_event_loop()
            events = await loop.run_in_executor(None, lambda: list(stream_agent_response("fabric_session", enriched)))
            accumulated = ""
            for ev in events:
                if ev["type"] == "content":
                    accumulated += ev["data"].get("content", "")
                yield f"data: {json.dumps({**ev, 'timestamp': time.time()})}\n\n"

            yield f"data: {json.dumps({'type': 'complete', 'data': {'response': accumulated, 'source': 'fabric', 'fabric_data': fabric_result.get('data')}, 'timestamp': time.time()})}\n\n"

        return StreamingResponse(fabric_stream(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "Connection": "keep-alive"})

    # ── Default path ─────────────────────────────────────────────────────────
    profile = request.profile or SAMPLE_PROFILES[0]
    profile_context = (
        f"Applicant profile: {profile.name}, age {profile.age}, "
        f"risk appetite: {profile.risk_appetite}, salary: ${profile.salary:,}."
    )
    full_message = f"{profile_context}\n\n{request.message}"

    def generate():
        accumulated = ""
        for ev in stream_agent_response("default_session", full_message):
            accumulated += ev["data"].get("content", "") if ev["type"] == "content" else ""
            yield f"data: {json.dumps({**ev, 'timestamp': time.time()})}\n\n"
        yield f"data: {json.dumps({'type': 'complete', 'data': {'response': accumulated, 'analysis': None, 'status': 'completed'}, 'timestamp': time.time()})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "Content-Type": "text/event-stream"},
    )

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """Non-streaming chat endpoint for compatibility."""
    try:
        profile = request.profile or SAMPLE_PROFILES[0]
        profile_context = (
            f"Applicant profile: {profile.name}, age {profile.age}, "
            f"risk appetite: {profile.risk_appetite}, salary: ${profile.salary:,}."
        )
        full_message = f"{profile_context}\n\n{request.message}"

        loop = asyncio.get_event_loop()
        events = await loop.run_in_executor(None, lambda: list(stream_agent_response("default_session", full_message)))
        response_text = "".join(e["data"].get("content", "") for e in events if e["type"] == "content")
        return ChatResponse(response=response_text, analysis=None, status="completed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Scenario Projection Endpoint ────────────────────────────────────────────

class ProjectedAccount(BaseModel):
    id: str
    name: str
    current_value: float
    projected_value: float
    change: float
    change_percent: float

class ProjectedHolding(BaseModel):
    symbol: str
    name: str
    current_value: float
    projected_value: float
    current_allocation: float
    projected_allocation: float
    change: float
    change_percent: float

class ProjectionAssumptions(BaseModel):
    market_return_annual: float
    inflation_rate: float
    contribution_limit_401k: int
    contribution_limit_ira: int

class ProjectionResult(BaseModel):
    total_value: float
    total_change: float
    total_change_percent: float
    accounts: List[ProjectedAccount]
    holdings: List[ProjectedHolding]

class ScenarioRisk(BaseModel):
    title: str
    detail: str
    severity: str  # high, medium, low

class ScenarioOpportunity(BaseModel):
    title: str
    detail: str
    impact: str  # high, medium, low

class ScenarioActionItem(BaseModel):
    action: str
    priority: str  # high, medium, low
    category: str  # contribution, allocation, tax, planning

class ScenarioProjectionRequest(BaseModel):
    profile_id: str
    scenario_description: str
    timeframe_months: int = Field(ge=1, le=60)
    current_portfolio: Dict[str, Any]
    data_source: Optional[str] = None  # "local" (default) or "fabric"

class ScenarioProjectionResponse(BaseModel):
    projection: ProjectionResult
    assumptions: ProjectionAssumptions
    summary: str
    headline: Optional[str] = None
    risks: Any  # List[str] or List[ScenarioRisk]
    opportunities: Any  # List[str] or List[ScenarioOpportunity]
    action_items: Optional[List[ScenarioActionItem]] = None
    key_factors: Optional[List[str]] = None

SCENARIO_PROJECTION_PROMPT = """
You are a financial projection analyst. Your task is to analyze a user's portfolio and project future values based on a described scenario.

IMPORTANT: You must respond with ONLY a valid JSON object. No explanatory text before or after.

Given:
- Current portfolio value: ${total_value:,.0f}
- Scenario: {scenario}
- Timeframe: {timeframe_months} months
- User Profile: {profile_summary}

Current Accounts:
{accounts_summary}

Current Holdings:
{holdings_summary}

Analyze this scenario and provide projections. Consider:
1. Realistic market returns (historical average ~7% annually for diversified portfolios)
2. Impact of contribution changes on portfolio growth
3. Inflation (assume 2.5% annually)
4. 2026 contribution limits: 401(k) = $23,000, IRA = $7,000
5. Risk factors specific to the scenario
6. Compound growth over the timeframe

Calculate projected values for EACH account and holding based on:
- Base market return adjusted for scenario
- Additional contributions if scenario involves increased savings
- Reallocation effects if portfolio changes mentioned
- Timeframe-proportional growth ({timeframe_months}/12 of annual return)

CRITICAL: Your response must be a single JSON object with this exact structure:
{{
  "projection": {{
    "total_value": <number - projected total portfolio value>,
    "total_change": <number - change from current value (positive or negative)>,
    "total_change_percent": <number - percentage change>,
    "accounts": [
      {{
        "id": "<account id>",
        "name": "<account name>",
        "current_value": <number>,
        "projected_value": <number>,
        "change": <number>,
        "change_percent": <number>
      }}
    ],
    "holdings": [
      {{
        "symbol": "<ticker>",
        "name": "<holding name>",
        "current_value": <number>,
        "projected_value": <number>,
        "current_allocation": <number - percentage>,
        "projected_allocation": <number - percentage>,
        "change": <number>,
        "change_percent": <number>
      }}
    ]
  }},
  "assumptions": {{
    "market_return_annual": 0.07,
    "inflation_rate": 0.025,
    "contribution_limit_401k": 23000,
    "contribution_limit_ira": 7000
  }},
  "headline": "<Short 5-8 word headline summarizing the scenario outcome>",
  "summary": "<2-3 sentence explanation of projection results>",
  "key_factors": [
    "<key factor 1 driving this projection - keep under 10 words>",
    "<key factor 2>",
    "<key factor 3>"
  ],
  "risks": [
    {{
      "title": "<Short risk title, 3-6 words>",
      "detail": "<1-2 sentence explanation of this risk>",
      "severity": "high" | "medium" | "low"
    }}
  ],
  "opportunities": [
    {{
      "title": "<Short opportunity title, 3-6 words>",
      "detail": "<1-2 sentence explanation of this opportunity>",
      "impact": "high" | "medium" | "low"
    }}
  ],
  "action_items": [
    {{
      "action": "<Specific actionable step the user should take>",
      "priority": "high" | "medium" | "low",
      "category": "contribution" | "allocation" | "tax" | "planning"
    }}
  ]
}}

Provide 2-4 risks, 2-4 opportunities, 2-4 action_items, and 2-4 key_factors.
Be specific with numbers. All monetary values should be rounded to nearest dollar.
Percentages should have 1-2 decimal places.
Account for the specific timeframe - don't use full annual returns for shorter periods.
"""

@app.post("/api/project-scenario", response_model=ScenarioProjectionResponse)
async def project_scenario(request: ScenarioProjectionRequest):
    """Project portfolio changes based on a described scenario using AI analysis"""
    use_fabric = (request.data_source == "fabric")

    # ── Fabric-enriched scenario projection ──────────────────────────────
    if use_fabric:
        if not FABRIC_AVAILABLE:
            raise HTTPException(
                status_code=503,
                detail="Fabric Data Agent is not configured.",
            )
        # Ask Fabric for the latest client portfolio data
        fabric_question = (
            f"Get the full portfolio breakdown for profile {request.profile_id}: "
            f"accounts, holdings, total value, and risk appetite."
        )
        try:
            fabric_result = await fabric_client.query(fabric_question, timeout=60)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Fabric query failed: {e}")

        # Merge Fabric data with the request's current_portfolio
        fabric_portfolio = fabric_result.get("data") or {}
        if isinstance(fabric_portfolio, list) and len(fabric_portfolio) > 0:
            fabric_portfolio = fabric_portfolio[0] if isinstance(fabric_portfolio[0], dict) else {}
        merged_portfolio = {**request.current_portfolio}
        if isinstance(fabric_portfolio, dict):
            merged_portfolio.update(fabric_portfolio)

        # Continue with the normal projection flow using merged data
        request_dict = request.model_dump()
        request_dict["current_portfolio"] = merged_portfolio
        request_dict["data_source"] = "local"  # prevent recursion
        merged_request = ScenarioProjectionRequest(**request_dict)
        return await project_scenario(merged_request)

    # ── Default local projection (unchanged) ─────────────────────────────
    try:
        # Find the profile
        profile = next(
            (p for p in SAMPLE_PROFILES if p.id == request.profile_id),
            SAMPLE_PROFILES[0] if SAMPLE_PROFILES else None
        )
        
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        # Build context for the prompt
        total_value = request.current_portfolio.get("total_value", 0)
        accounts = request.current_portfolio.get("accounts", [])
        holdings = request.current_portfolio.get("holdings", [])
        
        accounts_summary = "\n".join([
            f"- {a.get('name', 'Unknown')}: ${a.get('balance', 0):,.0f}"
            for a in accounts
        ])
        
        holdings_summary = "\n".join([
            f"- {h.get('symbol', 'UNK')} ({h.get('name', 'Unknown')}): ${h.get('value', 0):,.0f} ({h.get('allocation', 0)}%)"
            for h in holdings
        ])
        
        profile_summary = f"Age {profile.age}, salary ${profile.salary:,.0f}, {profile.risk_appetite} risk tolerance, targeting retirement at {profile.target_retire_age}"
        
        # Format the prompt
        formatted_prompt = SCENARIO_PROJECTION_PROMPT.format(
            total_value=total_value,
            scenario=request.scenario_description,
            timeframe_months=request.timeframe_months,
            profile_summary=profile_summary,
            accounts_summary=accounts_summary or "No accounts provided",
            holdings_summary=holdings_summary or "No holdings provided"
        )
        
        loop = asyncio.get_event_loop()
        events = await loop.run_in_executor(
            None, lambda: list(stream_agent_response("projection_session", formatted_prompt))
        )
        response_text = "".join(e["data"].get("content", "") for e in events if e["type"] == "content").strip()
        
        # Parse JSON from response
        json_start = response_text.find('{')
        json_end = response_text.rfind('}') + 1
        
        if json_start == -1 or json_end <= json_start:
            raise HTTPException(status_code=500, detail="Failed to parse projection response")
        
        json_str = response_text[json_start:json_end]
        projection_data = json.loads(json_str)
        
        # Validate and return
        return ScenarioProjectionResponse(**projection_data)
        
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse projection JSON: {str(e)}")
    except ValidationError as e:
        raise HTTPException(status_code=500, detail=f"Invalid projection format: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Projection failed: {str(e)}")


@app.get("/scenarios")
async def get_quick_scenarios():
  """Get predefined quick scenario questions"""
  return {
      "scenarios": [
          "What if I retire 2 years earlier?",
          "How would a market crash affect my plan?",
          "Should I increase my savings rate by 5%?",
          "What if I need $100k for healthcare costs?",
          "How does inflation impact my retirement income?",
          "What if I work part-time in retirement?",
          "Should I pay off my mortgage before retiring?",
          "What if I inherit $200k from my parents?",
          "How would changing jobs affect my retirement?",
          "What if I want to retire abroad?",
      ]
  }


# ─── Conversation Storage Endpoints ──────────────────────────────────────────

class SaveConversationRequest(BaseModel):
    """Request to save a conversation."""
    user_id: str
    conversation_id: Optional[str] = None
    title: str = "New Conversation"
    messages: List[Dict[str, Any]]


class AddMessageRequest(BaseModel):
    """Request to add a message to a conversation."""
    role: str  # "user" or "assistant"
    content: str


@app.get("/api/conversations/{user_id}")
async def list_user_conversations(user_id: str):
    """List all conversations for a user."""
    conversations = await storage.list_conversations(user_id)
    return {
        "conversations": [
            {
                "id": c.id,
                "title": c.title,
                "message_count": len(c.messages),
                "created_at": c.created_at,
                "updated_at": c.updated_at,
                "preview": c.messages[-1].content[:100] if c.messages else ""
            }
            for c in conversations
        ]
    }


@app.get("/api/conversations/{user_id}/{conversation_id}")
async def get_conversation(user_id: str, conversation_id: str):
    """Get a specific conversation with all messages."""
    conversation = await storage.get_conversation(user_id, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation.model_dump()


@app.post("/api/conversations/{user_id}")
async def create_conversation(user_id: str, request: SaveConversationRequest):
    """Create a new conversation."""
    messages = [
        ConversationMessage(
            role=m.get("role", "user"),
            content=m.get("content", ""),
            timestamp=m.get("timestamp", datetime.utcnow().isoformat())
        )
        for m in request.messages
    ]
    
    conversation = Conversation(
        user_id=user_id,
        title=request.title,
        messages=messages
    )
    
    conversation_id = await storage.save_conversation(conversation)
    return {"id": conversation_id, "message": "Conversation created"}


@app.put("/api/conversations/{user_id}/{conversation_id}")
async def update_conversation(user_id: str, conversation_id: str, request: SaveConversationRequest):
    """Update an existing conversation."""
    existing = await storage.get_conversation(user_id, conversation_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    messages = [
        ConversationMessage(
            id=m.get("id", str(uuid.uuid4()) if 'uuid' in dir() else ""),
            role=m.get("role", "user"),
            content=m.get("content", ""),
            timestamp=m.get("timestamp", datetime.utcnow().isoformat())
        )
        for m in request.messages
    ]
    
    existing.title = request.title
    existing.messages = messages
    
    await storage.save_conversation(existing)
    return {"id": conversation_id, "message": "Conversation updated"}


@app.post("/api/conversations/{user_id}/{conversation_id}/messages")
async def add_message_to_conversation(user_id: str, conversation_id: str, request: AddMessageRequest):
    """Add a message to an existing conversation."""
    conversation = await storage.get_conversation(user_id, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    message = ConversationMessage(
        role=request.role,
        content=request.content
    )
    conversation.messages.append(message)
    
    await storage.save_conversation(conversation)
    return {"message_id": message.id, "message": "Message added"}


@app.delete("/api/conversations/{user_id}/{conversation_id}")
async def delete_conversation(user_id: str, conversation_id: str):
    """Delete a conversation."""
    success = await storage.delete_conversation(user_id, conversation_id)
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"message": "Conversation deleted"}


# ─── Scenario Storage Endpoints ──────────────────────────────────────────────

class SaveScenarioRequest(BaseModel):
    """Request to save a scenario."""
    name: str
    description: str
    timeframe_months: int
    projection_result: Dict[str, Any]


class ScenarioConsentRequest(BaseModel):
    """Request to record user consent for advisor scenario review."""
    advisor_id: Optional[str] = None
    scenario_description: str
    analysis_payload: Dict[str, Any] = Field(default_factory=dict)
    consent_status: str  # "accepted" | "rejected"


def _resolve_advisor_id_for_user(user_id: str, fallback_advisor_id: Optional[str] = None) -> Optional[str]:
    """Resolve advisor_id from user profile JSON with optional fallback."""
    if fallback_advisor_id:
        return fallback_advisor_id
    try:
        with open(DATA_DIR / "user_profiles.json", "r", encoding="utf-8") as f:
            profiles = json.load(f)
        for profile in profiles:
            if profile.get("id") == user_id:
                return profile.get("advisor_id")
    except Exception:
        pass
    return None


def _map_share_to_advisor_scenario(record: ScenarioShareRecord) -> Dict[str, Any]:
    """Map a share record into advisor UI scenario card shape."""
    analysis = record.analysis_payload or {}
    predictions = analysis.get("predictions") or {}
    metrics = predictions.get("metrics") or {}
    deltas = predictions.get("deltas") or {}
    cashflows = predictions.get("cashflows") or []

    success_rate_pct = metrics.get("success_rate_pct")
    current_success_pct = None
    if success_rate_pct is not None and deltas.get("success_rate_delta_pct") is not None:
        current_success_pct = success_rate_pct - deltas.get("success_rate_delta_pct")

    final_balance = None
    if isinstance(cashflows, list) and len(cashflows) > 0:
        final_balance = cashflows[-1].get("end_assets")

    impact = "neutral"
    success_delta = deltas.get("success_rate_delta_pct")
    if isinstance(success_delta, (int, float)):
        if success_delta > 0:
            impact = "positive"
        elif success_delta < 0:
            impact = "negative"

    recommendation = analysis.get("considerations") or "Client requested advisor review for this scenario analysis."

    return {
        "id": record.id,
        "name": "Client-shared scenario review",
        "description": record.scenario_description,
        "created_at": record.created_at,
        "run_by": "client",
        "impact": impact,
        "recommendation": recommendation,
        "projection_result": {
            "success_probability": (success_rate_pct / 100.0) if isinstance(success_rate_pct, (int, float)) else 0,
            "final_balance": final_balance if isinstance(final_balance, (int, float)) else 0,
            "monthly_income": metrics.get("monthly_income"),
            "current_success_probability": (current_success_pct / 100.0)
            if isinstance(current_success_pct, (int, float))
            else None,
        },
        "escalation_id": record.escalation_id,
    }




@app.get("/api/shared-scenarios/{advisor_id}/{client_id}")
async def get_shared_scenarios_for_advisor(advisor_id: str, client_id: str):
    """Return client scenarios shared with advisor by explicit user consent."""
    records = await storage.list_scenario_shares(
        user_id=client_id,
        advisor_id=advisor_id,
        consent_status="accepted",
    )
    return {"scenarios": [_map_share_to_advisor_scenario(r) for r in records]}


@app.get("/api/saved-scenarios/{user_id}")
async def list_user_scenarios(user_id: str):
    """List all saved scenarios for a user."""
    scenarios = await storage.list_scenarios(user_id)
    return {
        "scenarios": [
            {
                "id": s.id,
                "name": s.name,
                "description": s.description,
                "timeframe_months": s.timeframe_months,
                "created_at": s.created_at,
                "total_change_percent": s.projection_result.get("projection", {}).get("total_change_percent", 0)
            }
            for s in scenarios
        ]
    }


@app.get("/api/saved-scenarios/{user_id}/{scenario_id}")
async def get_saved_scenario(user_id: str, scenario_id: str):
    """Get a specific saved scenario with full projection data."""
    scenario = await storage.get_scenario(user_id, scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return scenario.model_dump()


@app.post("/api/saved-scenarios/{user_id}")
async def save_scenario(user_id: str, request: SaveScenarioRequest):
    """Save a new scenario."""
    scenario = SavedScenario(
        user_id=user_id,
        name=request.name,
        description=request.description,
        timeframe_months=request.timeframe_months,
        projection_result=request.projection_result
    )
    
    scenario_id = await storage.save_scenario(scenario)
    return {"id": scenario_id, "message": "Scenario saved"}


@app.delete("/api/saved-scenarios/{user_id}/{scenario_id}")
async def delete_saved_scenario(user_id: str, scenario_id: str):
    """Delete a saved scenario."""
    success = await storage.delete_scenario(user_id, scenario_id)
    if not success:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return {"message": "Scenario deleted"}


