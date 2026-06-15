'use client'

import {
  BarChart2, TrendingUp, TrendingDown, Minus,
  Clock, AlertCircle, CheckCircle2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { RENEWALS, PORTFOLIO_METRICS, TEAM_WORKLOAD } from '@/lib/uwData'

const m = PORTFOLIO_METRICS.midday

function KPICard({
  label,
  value,
  detail,
  icon: Icon,
  iconColor,
  iconBg,
  valueColor = 'text-gray-900',
}: {
  label: string
  value: string
  detail: string
  icon: LucideIcon
  iconColor: string
  iconBg: string
  valueColor?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        <div className={`${iconBg} rounded-lg p-1.5`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
      </div>
      <div className={`text-[26px] font-bold ${valueColor} mb-1 leading-none`}>{value}</div>
      <div className="text-xs text-gray-400">{detail}</div>
    </div>
  )
}

function TrendIcon({ trend }: { trend: 'strong' | 'stable' | 'improving' | 'declining' }) {
  if (trend === 'strong' || trend === 'improving') return <TrendingUp className="w-4 h-4 text-emerald-500" />
  if (trend === 'declining') return <TrendingDown className="w-4 h-4 text-red-500" />
  return <Minus className="w-4 h-4 text-gray-400" />
}

function ChurnBadge({ risk }: { risk: 'low' | 'moderate' | 'high' }) {
  const map = {
    low: 'bg-green-50 text-green-700',
    moderate: 'bg-amber-50 text-amber-700',
    high: 'bg-red-50 text-red-700',
  }
  return (
    <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${map[risk]}`}>
      {risk.charAt(0).toUpperCase() + risk.slice(1)} churn risk
    </span>
  )
}

export function DailyTasksPage() {
  return (
    <div className="h-full overflow-y-auto bg-gray-50" style={{ scrollbarGutter: 'stable' }}>
      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* Greeting */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Midday Check-In</h1>
            <p className="text-sm text-gray-500 mt-0.5">Daily operational overview · {m.label}</p>
          </div>
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <KPICard
            label="Submissions Processed"
            value={`${m.submissionsProcessed}/${m.submissionsTotal}`}
            detail={`${Math.round((m.submissionsProcessed / m.submissionsTotal) * 100)}% of today's queue`}
            icon={CheckCircle2}
            iconColor="text-emerald-500"
            iconBg="bg-emerald-50"
            valueColor="text-emerald-600"
          />
          <KPICard
            label="Avg. Cycle Time"
            value={`${m.cycleTimeDays}d`}
            detail="↓ 0.1d vs this morning"
            icon={Clock}
            iconColor="text-blue-500"
            iconBg="bg-blue-50"
          />
          <KPICard
            label="Pending Decisions"
            value={String(m.pendingDecisions)}
            detail={`${m.decisionsToday} decisions made today`}
            icon={AlertCircle}
            iconColor="text-amber-500"
            iconBg="bg-amber-50"
            valueColor="text-amber-600"
          />
          <KPICard
            label="Quotes Sent"
            value={String(m.quotesSent)}
            detail={`${m.referralsSent} referral sent today`}
            icon={BarChart2}
            iconColor="text-indigo-500"
            iconBg="bg-indigo-50"
          />
        </div>

        {/* Renewals table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Renewals & Portfolio Optimization</h3>
            <span className="text-xs text-gray-400">AI recommendations pre-populated</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/50">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Account</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Renewal</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">TIV</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Profitability</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Churn</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">AI Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {RENEWALS.map((r, i) => (
                <tr
                  key={r.id}
                  className={`${i < RENEWALS.length - 1 ? 'border-b border-gray-50' : ''} hover:bg-gray-50/50 transition-colors`}
                >
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-gray-900">{r.client}</div>
                    <div className="text-xs text-gray-400">{r.broker} · {r.currentPremium}</div>
                  </td>
                  <td className="px-4 py-3.5 text-gray-600">{r.renewalDate}</td>
                  <td className="px-4 py-3.5 text-gray-600">{r.tiv}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <TrendIcon trend={r.profitabilityTrend} />
                      <span className="text-gray-600 capitalize">{r.profitabilityTrend}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <ChurnBadge risk={r.churnRisk} />
                  </td>
                  <td className="px-4 py-3.5">
                    {r.aiFlag && (
                      <div className="text-xs text-indigo-600 font-medium mb-0.5">{r.aiFlag}</div>
                    )}
                    <div className="text-xs text-gray-600">{r.recommendation}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Workload + Moody's */}
        <div className="grid grid-cols-3 gap-4">

          {/* Workload distribution — 2/3 */}
          <div className="col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Team Workload Distribution</h3>
              <span className="text-xs text-gray-400">Managers can rebalance if volumes spike</span>
            </div>
            <div className="p-5 space-y-3">
              {TEAM_WORKLOAD.map(member => {
                const pct = Math.round((member.submissions / member.capacity) * 100)
                const isEva = member.name.startsWith('Eva')
                return (
                  <div key={member.name} className="flex items-center gap-3">
                    <span className={`text-sm w-28 shrink-0 ${isEva ? 'font-semibold text-indigo-700' : 'text-gray-700'}`}>
                      {member.name}
                    </span>
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pct >= 90 ? 'bg-red-400' : pct >= 70 ? 'bg-amber-400' : 'bg-emerald-400'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-32 text-right">
                      {member.submissions}/{member.capacity} submissions
                    </span>
                    {isEva && (
                      <button className="text-xs text-indigo-600 hover:text-indigo-700 border border-indigo-200 rounded-lg px-2 py-1 transition-colors shrink-0">
                        Request rebalance
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Moody's widget — 1/3 */}
          <div className="col-span-1 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800">Credit & Risk Intelligence</h3>
            </div>
            <div className="p-4 space-y-3 flex-1">
              <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                <div className="text-xs text-gray-500 mb-1">Fabrikam Manufacturing</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-base font-bold text-gray-900">Baa2</span>
                  <span className="text-xs text-gray-500">Moody's Credit Rating</span>
                </div>
                <div className="text-xs text-amber-600 mt-0.5">Stable outlook · Watch for leverage increase</div>
              </div>
              <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                <div className="text-xs text-gray-500 mb-1">Portfolio Risk Score</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-base font-bold text-gray-900">72/100</span>
                  <span className="text-xs text-amber-600">↑ 3 pts this week</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">Concentration risk elevated — heavy mfg. segment</div>
              </div>
            </div>
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center gap-2">
              <div className="w-5 h-5 bg-blue-900 rounded flex items-center justify-center shrink-0">
                <span className="text-[8px] font-bold text-white">M</span>
              </div>
              <span className="text-xs text-gray-500">
                Powered by <span className="font-semibold text-gray-700">Moody&apos;s Analytics</span>
              </span>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
