'use client'

import { CheckCircle2, Clock, FileText, Send, Calendar, Lightbulb } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PORTFOLIO_METRICS } from '@/lib/uwData'

const m = PORTFOLIO_METRICS.eod

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

const OPEN_CASES = [
  { client: 'Fabrikam Manufacturing', status: 'Quote sent to Adatum', time: '2:15 PM', resolved: true },
  { client: 'Northwind Logistics', status: 'Awaiting documentation from broker', time: 'Pending', resolved: false },
  { client: 'Alpine Ventures Group', status: 'Referred to senior underwriter', time: '11:40 AM', resolved: true },
  { client: 'Metro Warehouse Complex', status: 'Inspection request sent — awaiting response', time: '10:05 AM', resolved: false },
]

const TOMORROW_TASKS = [
  { task: 'Follow up: Northwind Logistics — missing ACORD documentation', priority: 'high' as const },
  { task: 'Renewal review: Pinnacle State Campus (due in 5 days)', priority: 'high' as const },
  { task: 'Inspection scheduling: Metro Warehouse Complex', priority: 'medium' as const },
  { task: 'Coverage expansion review: Alpine Ventures Group', priority: 'low' as const },
]

const INSIGHTS = [
  { stat: '3', desc: 'underwriting decision patterns captured for model improvement' },
  { stat: '−40%', desc: 'loss run parsing time vs. manual baseline on similar SOV volume' },
  { stat: '1,182/1,200', desc: 'locations with complete data — ready for policy issuance' },
]

export function WrapUpPage() {
  return (
    <div className="h-full overflow-y-auto bg-gray-50" style={{ scrollbarGutter: 'stable' }}>
      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* Greeting */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Wrap-Up & Handoff</h1>
            <p className="text-sm text-gray-500 mt-0.5">End of day summary · {m.label}</p>
          </div>
          <span className="bg-green-50 text-green-700 border border-green-200 rounded-full px-3 py-1.5 text-sm font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            Handoff ready
          </span>
        </div>

        {/* Metrics row — progressed from morning and midday */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <KPICard
            label="Submissions Processed"
            value={`${m.submissionsProcessed}/${m.submissionsTotal}`}
            detail={`${Math.round((m.submissionsProcessed / m.submissionsTotal) * 100)}% complete today`}
            icon={CheckCircle2}
            iconColor="text-emerald-500"
            iconBg="bg-emerald-50"
            valueColor="text-emerald-600"
          />
          <KPICard
            label="Avg. Cycle Time"
            value={`${m.cycleTimeDays}d`}
            detail="↓ 0.2d vs start of day"
            icon={Clock}
            iconColor="text-blue-500"
            iconBg="bg-blue-50"
          />
          <KPICard
            label="Decisions Made"
            value={String(m.decisionsToday)}
            detail={`${m.pendingDecisions} still pending`}
            icon={FileText}
            iconColor="text-indigo-500"
            iconBg="bg-indigo-50"
          />
          <KPICard
            label="Quotes Sent"
            value={String(m.quotesSent)}
            detail={`${m.referralsSent} referrals sent`}
            icon={Send}
            iconColor="text-violet-500"
            iconBg="bg-violet-50"
          />
        </div>

        {/* Open cases + tomorrow tasks */}
        <div className="grid grid-cols-3 gap-4 mb-6">

          {/* Open cases — 2/3 */}
          <div className="col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Open Cases Summary</h3>
              <span className="text-xs text-gray-400">Summarized for colleague handoff</span>
            </div>
            <div>
              {OPEN_CASES.map((c, i) => (
                <div
                  key={c.client}
                  className={`flex items-center gap-4 px-5 py-3.5 ${i < OPEN_CASES.length - 1 ? 'border-b border-gray-50' : ''}`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${c.resolved ? 'bg-green-100' : 'bg-amber-100'}`}>
                    {c.resolved
                      ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                      : <Clock className="w-4 h-4 text-amber-600" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-900">{c.client}</span>
                    <p className="text-xs text-gray-500 mt-0.5">{c.status}</p>
                  </div>
                  <span className={`text-xs font-medium shrink-0 ${c.resolved ? 'text-gray-400' : 'text-amber-600'}`}>
                    {c.time}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Tasks for tomorrow — 1/3 */}
          <div className="col-span-1 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-800">Queued for Tomorrow</h3>
            </div>
            <div className="p-4 space-y-2.5">
              {TOMORROW_TASKS.map(t => {
                const dot = t.priority === 'high' ? 'bg-red-500' : t.priority === 'medium' ? 'bg-amber-400' : 'bg-gray-300'
                return (
                  <div key={t.task} className="flex items-start gap-2.5">
                    <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${dot}`} />
                    <p className="text-sm text-gray-700 leading-tight">{t.task}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Insights panel */}
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
              <Lightbulb className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-indigo-900 mb-3">
                Insights Fed Back into Underwriting Models
              </h3>
              <div className="grid grid-cols-3 gap-3 mb-3">
                {INSIGHTS.map(item => (
                  <div key={item.stat} className="bg-white/70 rounded-lg p-3 border border-indigo-100">
                    <div className="text-xl font-bold text-indigo-700 mb-0.5">{item.stat}</div>
                    <div className="text-xs text-indigo-800">{item.desc}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-indigo-700">
                When Eva — or a colleague in another time zone — picks up tomorrow, they have full situational awareness. No lost context. Nothing falls through the cracks.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
