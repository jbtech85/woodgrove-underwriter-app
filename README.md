# Woodgrove Insurance Underwriting

Commercial insurance underwriting demo — an agent-powered platform for underwriters, built on Microsoft Copilot Studio.

---

## Architecture

```
+-----------------------------------------------------------------------------+
|  Next.js Frontend  :3847                                                    |
|  Underwriter workspace                                                      |
+-------------------------------+---------------------------------------------+
                                | /api/*  (HTTPS + SSE)
+-------------------------------v---------------------------------------------+
|  FastAPI Backend (BFF)  :8172                                               |
|  session state - OBO token exchange - citation resolution - SSE relay       |
+-------------------------------+---------------------------------------------+
                                |
+-------------------------------v---------------------------------------------+
|  Copilot Studio Agent (GPT-4.1)                                             |
+--------+-----------------+-----------------+--------------------------------+
         |                 |                 |                          |
         v                 v                 v                          v
    CAT Agent        Quoting Agent   Underwriting Guidelines Agent   Work IQ
  (cites Verisk,       (stand-in,     (grounded on the Underwriting  (M365
   Moody's RMS —        no data       Reference Library — a          context)
   not live-            attached)     SharePoint knowledge base)
   integrated)

```

## Modules

| Module | Key Capability |
|---|---|
| **Dashboard** | Simulates an AI-triaged morning briefing — overnight submissions, flagged risks, KPI rollups — that a production build would compute from the policy administration system and a real triage model |
| **Triage Panel** | Simulates AI-ranked submission triage — fraud signals, compliance gaps, authority-limit flags — with the AI's reasoning shown alongside each flag |
| **Submission Intake** | Simulates the multi-agent document-extraction pipeline (document intelligence, loss-run parsing, ACORD-to-policy mapping, data-quality checks) that a production build would run via Azure AI Foundry — shown as a scripted walkthrough with fixed results, not a live extraction |
| **Marcus** | An alternate, optional dashboard with its own submission queue — for presenters to extend the story beyond the main Underwriter walkthrough |
| **Advisor AI Chat** | Persistent chat side panel, live-connected to a Copilot Studio-hosted agent (GPT-4.1) via the Responses API — grounded in knowledge sources, with citation-backed answers. Available throughout the app |

---

## Agent

**Advisor AI Chat** is the one real, live agent connection in this app — not a simulation. Both the Underwriter and Advisor personas can reach it, though it currently responds the same way regardless of which one is asking; persona isn't passed into the agent call.

- **Platform:** Microsoft Copilot Studio (Power Platform) — reached from the backend via the M365 Agents SDK, not Azure AI Foundry
- **Knowledge source:** one SharePoint knowledge base, the Underwriting Reference Library (templates, samples, account manuals, proposals)
- **Sub-agents** (Copilot Studio's own agent-as-tool pattern — direct descendants of the main agent in the Copilot Studio Agents tab):
  - **CAT Agent** — instructed to cite Verisk (earthquake, flood) and Moody's RMS for catastrophe exposure by region or account; not actually integrated with either vendor today — a real build would need live API connections
  - **Quoting Agent** — a stand-in today, with no attached tools or data
  - **Underwriting Guidelines Agent** — grounded on the same SharePoint knowledge base, for underwriting-manual and treaty-guideline questions
- **Tools:** Work IQ (Microsoft 365 context)
- **Auth:** the backend exchanges the signed-in user's token for a Copilot Studio–scoped token on their behalf (on-behalf-of flow via MSAL) before calling the agent

### Citation resolution (separate from the agent)

After the agent responds, the backend scans its reply for `[REF:xxx]` markers and resolves them against a local, bundled `regulatory_rules.json` file — independent of whatever the agent itself is grounded on, and not a Copilot Studio tool call. Today, only the Advisor UI renders the resulting citation footer.

### Simulated agentic process

Beyond the real agent, the Underwriter persona's daily-workflow pages (Dashboard, Triage, Submission Intake, Midday Check-In, Wrap-Up) represent the broader Foundry-orchestrated pipeline described in the demo script, entirely through static UI with no connection to the agent above. Submission Intake depicts four named agents — document intelligence, loss-run parsing, ACORD-to-policy mapping, data quality — with fixed, scripted results rather than a live multi-agent run.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS |
| Backend runtime | Python, FastAPI, uvicorn |
| Agent runtime | Microsoft Copilot Studio (Power Platform), via the M365 Agents SDK (`microsoft-agents-copilotstudio-client`) |
| Knowledge / grounding | One SharePoint knowledge base (Underwriting Reference Library); Work IQ (M365 context) |
| Sub-agents | CAT Agent, Quoting Agent, Underwriting Guidelines Agent — Copilot Studio's agent-as-tool pattern |
| Auth | Microsoft Entra ID (user sign-in), on-behalf-of token exchange to a Copilot Studio–scoped token (MSAL confidential client) |
| Session / data storage | Local JSON files by default; an optional Azure Blob Storage backend also exists. The session-ID → Copilot Studio conversation-ID mapping is a separate in-memory dict today — not persistent across restarts or replicas |
| Citation resolution | Backend regex over the agent's reply text against a local `regulatory_rules.json` file — Advisor UI only |
| Deployment | Azure App Service (frontend), Azure Container Apps (backend), Azure Container Registry |
| CI/CD | GitHub Actions |

---

## Project Structure

```
app/
  page.tsx                              # Persona/scene state machine (Underwriter, Marcus, Advisor)
  layout.tsx                            # Root layout
  globals.css                           # Global styles
  api/advisor/chat/stream/route.ts      # Server-side proxy to the backend (same-origin SSE)

components/frontend/
  uw/
    UWDashboard.tsx                     # Morning submission dashboard
    UWTriagePage.tsx                    # AI-triaged fraud/compliance flags
    SubmissionIntakePage.tsx            # Simulated Foundry multi-agent extraction walkthrough
    DailyTasksPage.tsx                  # Midday KPI check-in
    WrapUpPage.tsx                      # End-of-day summary and handoff
  marcus/
    MarcusDashboard.tsx                 # Optional presenter-extension dashboard, alternate to the main Underwriter walkthrough
  advisor/
    AdvisorChatView.tsx                 # Advisor AI Chat — the real agent-connected panel
  shared/
    SageChatPane.tsx                    # Floating chat button
    ModeToggle.tsx, PoweredByLabel.tsx, UIComponents.tsx, VegaChart.tsx
  irm/                                  # Leftover from the IRM/Sage template — commented out in app/page.tsx, not part of this app

lib/
  uwData.ts, uwTypes.ts                 # Underwriter demo data and types
  advisorApi.ts                         # Real backend calls for the chat panel
  irmData.ts, irmTypes.ts, mockData.ts  # Leftover from the shared template — confirm before relying on these

backend/
  main.py                               # FastAPI entry point, Copilot Studio agent connection
  copilotstudio_compat.py               # Patches a pydantic bug in the M365 Agents SDK's citation model handling
  advisor_storage.py                    # Data layer behind the Advisor endpoints
  storage.py                            # Conversation/scenario storage abstraction (local JSON or Azure Blob)
  fabric_service.py                     # Inherited from the Sage template — not wired to any frontend, out of scope
  data/                                 # JSON seed data, including regulatory_rules.json
  pyproject.toml                        # Python dependencies

Dockerfile, backend/Dockerfile, docker-compose.yml, next.config.mjs, package.json
```
