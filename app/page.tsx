"use client"

import { useState, useEffect } from "react"
import { Leaf, Settings, LogOut, User, X, Clock, FileText } from "lucide-react"
import type { UWScene } from "@/lib/uwTypes"
import type { ChatMessage } from "@/components/frontend/advisor/AdvisorChatView"
import { UWDashboard } from "@/components/frontend/uw/UWDashboard"
import { UWTriagePage } from "@/components/frontend/uw/UWTriagePage"
import { SubmissionIntakePage } from "@/components/frontend/uw/SubmissionIntakePage"
import { DailyTasksPage } from "@/components/frontend/uw/DailyTasksPage"
import { WrapUpPage } from "@/components/frontend/uw/WrapUpPage"
import { MarcusDashboard } from "@/components/frontend/marcus/MarcusDashboard"
import { MOCK_ADVISOR } from "@/lib/advisorApi"
import { SageFloatingButton } from "@/components/frontend/shared/SageChatPane"
import { AdvisorChatView } from "@/components/frontend/advisor/AdvisorChatView"

// Hidden — original IRM components kept for reference, not used in current demo
// import { IRMDashboard } from "@/components/frontend/irm/IRMDashboard"
// import { OrchestrationView } from "@/components/frontend/irm/OrchestrationView"
// import { PhoneCallSimulator } from "@/components/frontend/irm/PhoneCallSimulator"
// import { CoworkPanel } from "@/components/frontend/irm/CoworkPanel"


const SCENE_TIMES: Record<UWScene, string> = {
  dashboard: '8:05 AM',
  triage: '8:32 AM',
  'submission-intake': '8:47 AM',
  'daily-tasks': '12:45 PM',
  'wrap-up': '4:40 PM',
}

function LiveClock({ fixedTime }: { fixedTime?: string }) {
  const [realTime, setRealTime] = useState('')
  useEffect(() => {
    if (fixedTime) return
    const tick = () =>
      setRealTime(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [fixedTime])
  return (
    <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5">
      <Clock className="w-3.5 h-3.5 text-gray-400" />
      <span className="text-sm font-medium text-gray-600 tabular-nums">{fixedTime ?? realTime}</span>
    </div>
  )
}

export default function UWApp() {
  const [persona, setPersona] = useState<'eva' | 'marcus'>('eva')
  const [scene, setScene] = useState<UWScene>('dashboard')
  const [showSettings, setShowSettings] = useState(false)
  const [swaUser, setSwaUser] = useState<{ name: string; email: string } | null>(null)
  const [isChatPaneOpen, setIsChatPaneOpen] = useState(false)
  const [docQAMessages, setDocQAMessages] = useState<ChatMessage[] | null>(null)

  const SOV_QA_MESSAGES: ChatMessage[] = [
    {
      id: 'sov-q1',
      role: 'user',
      content: 'Can you review the Fabrikam Manufacturing SOV and surface anything I should know before I make my decision?',
      timestamp: '8:47 AM',
    },
    {
      id: 'sov-a1',
      role: 'assistant',
      content: `I've reviewed the **Fabrikam Manufacturing Statement of Values** (47 pages, submitted by Adatum). Here's what stands out:\n\n**Portfolio overview**\n- 18 locations across 6 states — highest concentration in Michigan (7 sites)\n- Total Insured Value: **$2.1B TIV**\n- Largest single location: Detroit Assembly Plant at **$340M TIV**\n\n**Risk flags**\n- 3 locations in FEMA Flood Zone AE — flood sublimit should be reviewed before binding\n- 2 pre-1980 facilities with no documented upgrades on file\n- Sprinkler coverage gaps noted at 4 warehouse sites\n\n**Bottom line**\nThe Michigan concentration and flood exposure are the main concerns at this limit. The missing Inspection Report and Engineering Survey would normally address these directly — worth flagging to Adatum before the 5:00 PM deadline.\n\nWant me to draft a document request to Adatum, or pull the prior policy for comparison?`,
      timestamp: '8:47 AM',
    },
  ]

  function handleOpenDocQA() {
    setDocQAMessages(SOV_QA_MESSAGES)
    setIsChatPaneOpen(true)
  }

  useEffect(() => {
    fetch('/.auth/me')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data[0]) {
          const provider = data[0]
          const claims: { typ: string; val: string }[] = provider.user_claims || []
          const name = claims.find(c => c.typ === 'name')?.val
          const email = provider.user_id || claims.find(c => c.typ === 'preferred_username')?.val
          if (name || email) setSwaUser({ name: name || email || '', email: email || '' })
        } else if (data?.clientPrincipal) {
          const claims: { typ: string; val: string }[] = data.clientPrincipal.claims || []
          const name = claims.find(c => c.typ === 'name')?.val
          const email = data.clientPrincipal.userDetails
          if (name || email) setSwaUser({ name: name || email || '', email: email || '' })
        }
      })
      .catch(() => {})
  }, [])

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 via-slate-50/80 to-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-900 to-indigo-800 rounded-xl flex items-center justify-center shadow-lg">
              <Leaf className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold text-gray-900 tracking-tight">Woodgrove Insurance</h1>
              <p className="text-[11px] text-gray-400 font-medium">Underwriting Workbench</p>
            </div>
          </a>

          <div className="flex items-center gap-3">
            <LiveClock fixedTime={persona === 'eva' ? SCENE_TIMES[scene] : undefined} />

            <div className="flex items-center gap-2 bg-indigo-50 rounded-xl px-3 py-1.5">
              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                {persona === 'eva' ? 'EE' : 'MC'}
              </div>
              <span className="text-sm font-medium text-indigo-700">
                {persona === 'eva' ? 'Eva' : 'Marcus Chen'}
              </span>
              <span className="text-xs bg-indigo-100 text-indigo-600 rounded-full px-2 py-0.5">
                {persona === 'eva' ? 'UW' : 'CIO'}
              </span>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-colors"
              >
                <Settings className="w-4 h-4 text-gray-400" />
              </button>

              {showSettings && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSettings(false)} />
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
                    {swaUser && (
                      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{swaUser.name}</p>
                          <p className="text-xs text-gray-400 truncate">{swaUser.email}</p>
                        </div>
                      </div>
                    )}

                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-xs text-gray-500 font-medium mb-2">Switch Persona</p>
                      <div className="flex gap-2">
                        {([
                          { id: 'eva', name: 'Eva', initials: 'EE', role: 'Underwriter' },
                          { id: 'marcus', name: 'Marcus Chen', initials: 'MC', role: 'CIO' },
                        ] as const).map(p => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setPersona(p.id)
                              if (p.id === 'eva') setScene('dashboard')
                              setShowSettings(false)
                            }}
                            className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-lg border transition-colors text-center ${
                              persona === p.id
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-full text-white text-xs font-bold flex items-center justify-center ${persona === p.id ? 'bg-indigo-600' : 'bg-gray-400'}`}>
                              {p.initials}
                            </div>
                            <span className="text-xs font-medium leading-tight">{p.name}</span>
                            <span className="text-[10px] opacity-60">{p.role}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="px-2 py-2">
                      <a
                        href="/.auth/logout"
                        className="flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors w-full"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </a>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>


      {/* Main content + agent sidebar */}
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-hidden">
          {persona === 'eva' && scene === 'dashboard' && (
            <UWDashboard onSceneChange={setScene} onOpenDocQA={handleOpenDocQA} />
          )}
          {persona === 'eva' && scene === 'triage' && (
            <UWTriagePage onSceneChange={setScene} />
          )}
          {persona === 'eva' && scene === 'submission-intake' && (
            <SubmissionIntakePage onBack={() => setScene('triage')} />
          )}
          {persona === 'eva' && scene === 'daily-tasks' && (
            <DailyTasksPage />
          )}
          {persona === 'eva' && scene === 'wrap-up' && (
            <WrapUpPage />
          )}
          {persona === 'marcus' && <MarcusDashboard />}
        </main>

        {/* Agent sidebar — slides in at 500px */}
        <div
          className="flex-shrink-0 overflow-hidden transition-all duration-300 border-l border-gray-100"
          style={{ width: isChatPaneOpen ? 500 : 0 }}
        >
          <div className="w-[500px] h-full flex flex-col">
            <div className="bg-indigo-900 text-white px-4 py-3 flex items-center gap-2 flex-shrink-0">
              <Leaf className="w-4 h-4 text-indigo-300" />
              <span className="text-sm font-semibold">Woodgrove Copilot</span>
              <button
                onClick={() => { setIsChatPaneOpen(false); setDocQAMessages(null) }}
                className="ml-auto text-indigo-300 hover:text-white transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {docQAMessages && (
              <div className="bg-indigo-800 px-4 py-2 flex items-center gap-2 flex-shrink-0">
                <FileText className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
                <span className="text-xs text-indigo-200">Context: SOV – 47 pages · Fabrikam Manufacturing</span>
              </div>
            )}
            <div className="flex-1 overflow-hidden">
              <AdvisorChatView
                advisor={MOCK_ADVISOR}
                embedded
                scene={scene}
                initialMessages={docQAMessages ?? undefined}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Floating chat button — hidden while sidebar is open */}
      {!isChatPaneOpen && (
        <SageFloatingButton
          onClick={() => setIsChatPaneOpen(true)}
          variant="advisor"
        />
      )}
    </div>
  )
}
