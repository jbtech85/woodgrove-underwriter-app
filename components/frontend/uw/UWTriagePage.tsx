'use client'

import { ChevronLeft, AlertTriangle, Shield, ChevronRight, Flag } from 'lucide-react'
import type { UWScene } from '@/lib/uwTypes'
import { SUBMISSIONS } from '@/lib/uwData'

interface UWTriagePageProps {
  onSceneChange: (scene: UWScene) => void
}

function FraudBadge({ risk }: { risk: 'low' | 'moderate' | 'high' }) {
  const map = {
    low: 'bg-green-50 text-green-700',
    moderate: 'bg-amber-50 text-amber-700',
    high: 'bg-red-50 text-red-700',
  }
  return (
    <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${map[risk]}`}>
      Fraud: {risk.charAt(0).toUpperCase() + risk.slice(1)}
    </span>
  )
}

export function UWTriagePage({ onSceneChange }: UWTriagePageProps) {
  const urgent = SUBMISSIONS.filter(s => s.status === 'urgent')
  const others = SUBMISSIONS.filter(s => s.status !== 'urgent')

  return (
    <div className="h-full overflow-y-auto bg-gray-50" style={{ scrollbarGutter: 'stable' }}>
      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onSceneChange('dashboard')}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Dashboard
            </button>
            <span className="text-gray-300">/</span>
            <h1 className="text-xl font-semibold text-gray-900">Triage Panel</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-red-50 text-red-700 border border-red-200 rounded-full px-3 py-1 text-sm font-medium">
              {urgent.length} urgent
            </span>
            <span className="bg-gray-100 text-gray-600 rounded-full px-3 py-1 text-sm">
              {SUBMISSIONS.length} total flagged
            </span>
          </div>
        </div>

        {/* AI triage banner */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 mb-6 flex items-center gap-3">
          <Shield className="w-5 h-5 text-indigo-600 shrink-0" />
          <div className="flex-1 text-sm text-indigo-800">
            <span className="font-medium">AI Triage complete</span> — {SUBMISSIONS.length} submissions reviewed overnight. Flags include fraud signals, compliance gaps, and authority limits. Recommendations pre-populated below.
          </div>
        </div>

        {/* Urgent */}
        <div className="mb-2">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-red-50 text-red-700 rounded-lg px-3 py-2 text-sm font-medium">
              Requires Immediate Attention ({urgent.length})
            </div>
          </div>

          {urgent.map((sub, index) => (
            <div
              key={sub.id}
              onClick={() => onSceneChange('submission-intake')}
              className="bg-white rounded-xl p-4 border border-red-100 shadow-sm mb-3 cursor-pointer hover:ring-2 hover:ring-red-200 hover:bg-red-50/20 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-7 h-7 rounded-full bg-red-600 text-white text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-gray-900">{sub.client}</span>
                    <span className="text-sm text-gray-500">via {sub.broker} · {sub.brokerContact}</span>
                    <FraudBadge risk={sub.fraudRisk} />
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {sub.line} · {sub.requestedLimit} limit · TIV {sub.tiv}
                    {sub.deadline && (
                      <span className="ml-2 text-red-600 font-medium">· Deadline: {sub.deadline}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {sub.flagReasons.map(r => (
                      <span key={r} className="text-xs bg-red-50 text-red-700 border border-red-100 rounded px-2 py-0.5 flex items-center gap-1">
                        <Flag className="w-3 h-3" />
                        {r}
                      </span>
                    ))}
                  </div>
                  {sub.complianceFlags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {sub.complianceFlags.map(f => (
                        <span key={f} className="text-xs bg-amber-50 text-amber-700 border border-amber-100 rounded px-2 py-0.5 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {f}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-sm text-indigo-700 bg-indigo-50 rounded-lg px-3 py-1.5 w-fit">
                    <Shield className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-medium">AI:</span>
                    <span>{sub.aiRecommendation}</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 shrink-0 mt-1" />
              </div>
            </div>
          ))}
        </div>

        {/* Review needed */}
        <div className="mt-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-amber-50 text-amber-700 rounded-lg px-3 py-2 text-sm font-medium">
              Review Needed ({others.length})
            </div>
          </div>

          {others.map((sub, index) => (
            <div
              key={sub.id}
              className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm mb-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="w-7 h-7 rounded-full bg-amber-500 text-white text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                  {urgent.length + index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-gray-900">{sub.client}</span>
                    <span className="text-sm text-gray-500">via {sub.broker}</span>
                    <FraudBadge risk={sub.fraudRisk} />
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {sub.line} · {sub.requestedLimit} limit · TIV {sub.tiv} · {sub.submittedAt}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {sub.flagReasons.map(r => (
                      <span key={r} className="text-xs bg-gray-100 text-gray-600 rounded px-2 py-0.5">
                        {r}
                      </span>
                    ))}
                  </div>
                  {sub.complianceFlags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {sub.complianceFlags.map(f => (
                        <span key={f} className="text-xs bg-amber-50 text-amber-700 border border-amber-100 rounded px-2 py-0.5 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {f}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-sm text-indigo-700 bg-indigo-50 rounded-lg px-3 py-1.5 w-fit">
                    <Shield className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-medium">AI:</span>
                    <span>{sub.aiRecommendation}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
