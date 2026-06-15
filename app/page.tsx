"use client"

import { useState, useEffect } from "react"
import { Leaf, Settings, LogOut, User, X, Clock } from "lucide-react"
import type { UWScene } from "@/lib/uwTypes"
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

const NAV_TABS: { label: string; scenes: UWScene[]; target: UWScene }[] = [
  { label: 'Dashboard', scenes: ['dashboard', 'triage', 'submission-intake'], target: 'dashboard' },
  { label: 'Daily Tasks', scenes: ['daily-tasks'], target: 'daily-tasks' },
  { label: 'Wrap-Up', scenes: ['wrap-up'], target: 'wrap-up' },
]

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

      {/* Secondary nav — Eva persona only */}
      {persona === 'eva' && (
        <nav className="bg-white border-b border-gray-100 flex-shrink-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex">
            {NAV_TABS.map(tab => (
              <button
                key={tab.label}
                onClick={() => setScene(tab.target)}
                className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  tab.scenes.includes(scene)
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* Main content + agent sidebar */}
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-hidden">
          {persona === 'eva' && scene === 'dashboard' && (
            <UWDashboard onSceneChange={setScene} />
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
                onClick={() => setIsChatPaneOpen(false)}
                className="ml-auto text-indigo-300 hover:text-white transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <AdvisorChatView
                advisor={MOCK_ADVISOR}
                embedded
                scene={scene}
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
