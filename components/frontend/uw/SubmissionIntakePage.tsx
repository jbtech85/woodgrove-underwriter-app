'use client'

import { useEffect, useState } from 'react'
import {
  ChevronLeft, CheckCircle2, Loader2, ExternalLink,
  AlertTriangle, Building2, MapPin, Search, Activity,
  FileText, Shield,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface SubmissionIntakePageProps {
  onBack: () => void
}

const AGENTS: {
  id: string
  name: string
  description: string
  icon: LucideIcon
  color: string
  bg: string
  result: string
}[] = [
  {
    id: 'doc-intel',
    name: 'Schedule of Valued Items',
    description: 'Extracting 1,200+ locations from 47-page SOV',
    icon: Search,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    result: '1,200 locations extracted',
  },
  {
    id: 'loss-run',
    name: 'Loss-Run Parser',
    description: 'Normalizing 5 years of claims data',
    icon: Activity,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    result: '5 years · 23 claims normalized',
  },
  {
    id: 'acord-mapper',
    name: 'ACORD-to-Policy Mapper',
    description: 'Writing structured fields to spreadsheet',
    icon: FileText,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    result: 'Policy fields mapped — ready for PAS upload',
  },
  {
    id: 'data-quality',
    name: 'Data Quality Agent',
    description: 'Validating location records for completeness',
    icon: Shield,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    result: '18 locations flagged — missing construction codes',
  },
]

const DOCS_RECEIVED = [
  { label: 'SOV – 47 pages' },
  { label: 'ACORD 125' },
  { label: 'Loss Run 2019–2024' },
  { label: 'Prior Policy' },
]

const DOCS_MISSING = ['Inspection Report', 'Engineering Survey']

const FLAGGED_LOCATIONS = [
  { id: 'LOC-0041', address: '1401 Industrial Pkwy, Detroit, MI 48217', issue: 'Construction code missing' },
  { id: 'LOC-0078', address: '900 Commerce Blvd, Gary, IN 46402', issue: 'Construction code missing' },
  { id: 'LOC-0102', address: '2250 Port Access Rd, Baltimore, MD 21224', issue: 'Construction code missing' },
  { id: 'LOC-0134', address: '3800 Eastland Dr, Cleveland, OH 44105', issue: 'Construction code missing' },
  { id: 'LOC-0189', address: '7701 N Industrial Blvd, Chicago, IL 60631', issue: 'Construction code missing' },
]

const EXCEL_URL = 'https://woodgrovefs1.sharepoint.com/sites/Underwriting/Shared%20Documents/Knowledge%20Base/Accounts/Fabrikam/Fabrikam_LossRun_5yr.xlsx?web=1&xsdata=MDV8MDJ8fGFiY2M2YzIyMWE2YTRiZGZiZTczMDhkZWNlMjRjNjlkfGUwZTFlMDg2ZWQ3YjQxNTY4Y2U1NTY5NDQzMmM2ZGY1fDB8MHw2MzkxNzQ4NTQ0Nzk1NjAzMDd8VW5rbm93bnxWR1ZoYlhOVFpXTjFjbWwwZVZObGNuWnBZMlY4ZXlKRFFTSTZJbFJsWVcxelgwRlVVRk5sY25acFkyVmZVMUJQVEU5R0lpd2lWaUk2SWpBdU1DNHdNREF3SWl3aVVDSTZJbGRwYmpNeUlpd2lRVTRpT2lKUGRHaGxjaUlzSWxkVUlqb3hNWDA9fDF8TDJOb1lYUnpMekU1T21VNU56WTVNemhtTFdRMU4yWXRORGRoWlMwNU9ERm1MV1F3TUdRek1UWXdOekJpTVY5bFpUSmhNamczTWkxaFlXVTBMVFJrWlRFdFlUWXlPUzAwWVdZd1pXTTNPVFE1TkRkQWRXNXhMbWRpYkM1emNHRmpaWE12YldWemMyRm5aWE12TVRjNE1UZzRPRFkwTmpNeE5nPT18YWQzOTRhZGRhOWFjNDdiYjQ3N2IwOGRlY2UyNGM2OWR8MzRkYjc0NzM0MGI5NGU1N2EwZDM1ZjFmYzZlNTAzM2Q%3D&sdata=bmt4ZG1IWlY0ei9LSFk1Q3R0UHZMekRJMFZEVUFZTnd1WGQ5ejQ0ejkwUT0%3D&ovuser=e0e1e086-ed7b-4156-8ce5-5694432c6df5%2CJoshB%403sharp.com'

const FOUNDRY_URL = 'https://ai.azure.com/nextgen/r/m2wG4YAESyebC7dRu1CRxA,rg-finance-app-5726,,finance-app-5726-resource,finance-app-5726/agents/woodgrove-underwriting-agent/preview?version=26'

export function SubmissionIntakePage({ onBack }: SubmissionIntakePageProps) {
  const [completedAgents, setCompletedAgents] = useState<Set<string>>(new Set())
  const [orchestrationComplete, setOrchestrationComplete] = useState(false)

  useEffect(() => {
    const timers = [
      setTimeout(() => setCompletedAgents(s => new Set([...s, 'doc-intel'])), 900),
      setTimeout(() => setCompletedAgents(s => new Set([...s, 'loss-run'])), 1900),
      setTimeout(() => setCompletedAgents(s => new Set([...s, 'acord-mapper'])), 2900),
      setTimeout(() => setCompletedAgents(s => new Set([...s, 'data-quality'])), 3700),
      setTimeout(() => setOrchestrationComplete(true), 4000),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className="h-full overflow-y-auto bg-gray-50" style={{ scrollbarGutter: 'stable' }}>
      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Triage
          </button>
          <span className="text-gray-300">/</span>
          <h1 className="text-xl font-semibold text-gray-900">Submission Intake</h1>
        </div>

        {/* Submission header card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-bold text-gray-900">Fabrikam Manufacturing</h2>
                <span className="bg-red-50 text-red-700 border border-red-200 text-xs font-medium rounded-full px-2.5 py-0.5">Urgent</span>
              </div>
              <p className="text-sm text-gray-500 mb-4">Broker: Adatum · Contact: James Whitfield · Commercial Property</p>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">Requested Limit</div>
                  <div className="text-lg font-bold text-gray-900">$50M</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">Total Insured Value</div>
                  <div className="text-lg font-bold text-gray-900">$2.1B</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">Locations</div>
                  <div className="text-lg font-bold text-gray-900">1,200+</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">Broker Deadline</div>
                  <div className="text-lg font-bold text-red-600">Today 5:00 PM</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="flex gap-6 items-start">

          {/* Left — document category panels */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Docs Received */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                <h3 className="text-sm font-semibold text-gray-800">Documents Received</h3>
                <span className="ml-auto text-xs text-gray-400">{DOCS_RECEIVED.length} files</span>
              </div>
              <div className="p-4 flex flex-wrap gap-2">
                {DOCS_RECEIVED.map(doc => (
                  <button
                    key={doc.label}
                    type="button"
                    className="flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-blue-100 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    {doc.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Docs Missing */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                <h3 className="text-sm font-semibold text-gray-800">Documents Missing</h3>
                <span className="ml-auto text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-full px-2.5 py-0.5">{DOCS_MISSING.length} outstanding</span>
              </div>
              <div className="p-4 flex flex-wrap gap-2">
                {DOCS_MISSING.map(doc => (
                  <span
                    key={doc}
                    className="flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg px-3 py-1.5 text-sm font-medium"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {doc}
                  </span>
                ))}
              </div>
            </div>

            {/* Information Missing — revealed after orchestration */}
            {orchestrationComplete && (
              <div className="bg-white rounded-xl border border-amber-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-amber-100 bg-amber-50/50 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                  <h3 className="text-sm font-semibold text-amber-900">Information Missing — 18 Locations Need Attention</h3>
                  <span className="ml-auto text-xs text-amber-700 bg-amber-100 rounded-full px-2.5 py-0.5">Review Required</span>
                </div>
                <div className="px-5 py-3 bg-amber-50/30 border-b border-amber-100">
                  <p className="text-sm text-amber-800">
                    18 of 1,200 locations are missing construction codes. These are required before policy issuance. A sample is shown below — the full list is in the spreadsheet.
                  </p>
                </div>
                <div>
                  {FLAGGED_LOCATIONS.map((loc, i) => (
                    <div
                      key={loc.id}
                      className={`flex items-center gap-4 px-5 py-3 ${i < FLAGGED_LOCATIONS.length - 1 ? 'border-b border-gray-50' : ''}`}
                    >
                      <span className="text-xs font-mono font-medium text-gray-500 shrink-0 w-20">{loc.id}</span>
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="text-sm text-gray-700 truncate">{loc.address}</span>
                      </div>
                      <span className="text-xs bg-amber-50 text-amber-700 border border-amber-100 rounded px-2 py-0.5 shrink-0">
                        {loc.issue}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
                  <p className="text-xs text-gray-500">Showing 5 of 18 flagged locations · Open spreadsheet for complete list</p>
                </div>
              </div>
            )}

          </div>

          {/* Right — Foundry orchestration side panel */}
          <div className="w-[360px] shrink-0">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

              {/* Panel header */}
              <div className="px-4 py-3.5 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50">
                <div className="flex items-center gap-2">
                  {orchestrationComplete ? (
                    <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1 shrink-0">
                      <CheckCircle2 className="w-3 h-3" />
                      Complete
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2.5 py-1 shrink-0">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Running
                    </span>
                  )}
                  
                {orchestrationComplete && (
                  <a
                    href={FOUNDRY_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-[#643fb2] hover:bg-[#52339a] text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors w-full mt-3"
                  >
                    Deep Research Agent
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
                </div>
              </div>

              {/* Agent cards — single column */}
              <div className="p-4 space-y-2">
                {AGENTS.map(agent => {
                  const isComplete = completedAgents.has(agent.id)
                  const Icon = agent.icon
                  return (
                    <div
                      key={agent.id}
                      className={`rounded-xl border p-3.5 transition-all duration-500 ${isComplete ? 'bg-green-50/50 border-green-200' : 'bg-gray-50 border-gray-100'}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isComplete ? 'bg-green-100' : agent.bg}`}>
                          {isComplete
                            ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                            : <Icon className={`w-4 h-4 ${agent.color}`} />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{agent.name}</span>
                            {!isComplete && <Loader2 className="w-3 h-3 text-gray-400 animate-spin" />}
                          </div>
                          <p className={`text-xs mt-0.5 ${isComplete ? 'text-green-700 font-medium' : 'text-gray-500'}`}>
                            {isComplete ? agent.result : agent.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Excel output — appears when orchestration completes */}
              {orchestrationComplete && (
                <div className="px-4 pb-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-emerald-900">SOV Extraction Complete</p>
                        <p className="text-xs text-emerald-700">1,200 locations · ACORD fields mapped</p>
                      </div>
                    </div>
                    <a
                      href={EXCEL_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors w-full"
                    >
                      Open in Excel
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
