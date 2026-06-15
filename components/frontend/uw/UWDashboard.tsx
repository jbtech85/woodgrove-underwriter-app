'use client'

import { AlertCircle, FileText, Clock, Shield, ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { UWScene } from '@/lib/uwTypes'
import { SUBMISSIONS, PORTFOLIO_METRICS } from '@/lib/uwData'

interface UWDashboardProps {
  onSceneChange: (scene: UWScene) => void
}

const m = PORTFOLIO_METRICS.morning

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
      <div className="text-xs text-gray-400 leading-snug">{detail}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: 'urgent' | 'pending' | 'in-review' | 'quoted' }) {
  const map = {
    urgent: 'bg-red-50 text-red-700 border border-red-200',
    pending: 'bg-amber-50 text-amber-700 border border-amber-200',
    'in-review': 'bg-blue-50 text-blue-700 border border-blue-200',
    quoted: 'bg-green-50 text-green-700 border border-green-200',
  }
  const labels = { urgent: 'Urgent', pending: 'Pending', 'in-review': 'In Review', quoted: 'Quoted' }
  return (
    <span className={`text-xs font-medium rounded-full px-2.5 py-0.5 ${map[status]}`}>
      {labels[status]}
    </span>
  )
}

const UPCOMING_RENEWALS = [
  { name: 'Fabrikam Manufacturing', days: 15, broker: 'Adatum' },
  { name: 'Northwind Logistics', days: 32, broker: 'Contoso Brokers' },
  { name: 'Alpine Ventures Group', days: 39, broker: 'Proseware Insurance' },
  { name: 'Metro Warehouse Complex', days: 51, broker: 'WG Premier Brokers' },
]

function renewalUrgency(days: number) {
  if (days <= 20) return 'bg-red-50 text-red-600'
  if (days <= 35) return 'bg-amber-50 text-amber-600'
  return 'bg-indigo-50 text-indigo-600'
}

export function UWDashboard({ onSceneChange }: UWDashboardProps) {
  return (
    <div className="h-full overflow-y-auto bg-gray-50" style={{ scrollbarGutter: 'stable' }}>
      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* Greeting */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Good morning, Eva</h1>
            <p className="text-sm text-gray-500 mt-0.5">Commercial Underwriter · Authorized up to $25M primary line</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-indigo-50 text-indigo-700 rounded-full px-3 py-1 text-sm font-medium">$4.8B Portfolio TIV</span>
            <span className="bg-gray-100 text-gray-600 rounded-full px-3 py-1 text-sm">{m.submissionsTotal} Active Submissions</span>
          </div>
        </div>

        {/* Overnight alert */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
          <div className="flex-1">
            <span className="text-sm font-medium text-amber-900">3 new submissions received overnight</span>
            <span className="text-sm text-amber-700"> · Copilot has analyzed your queue. 1 requires immediate attention.</span>
          </div>
          <button
            className="bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg px-4 py-1.5 transition-colors shrink-0"
            onClick={() => onSceneChange('triage')}
          >
            View Flagged Submissions →
          </button>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <KPICard
            label="Open Submissions"
            value={String(m.submissionsTotal)}
            detail={`${m.pendingDecisions} require decision today`}
            icon={FileText}
            iconColor="text-indigo-500"
            iconBg="bg-indigo-50"
          />
          <KPICard
            label="Avg. Cycle Time"
            value={`${m.cycleTimeDays}d`}
            detail="Current portfolio average"
            icon={Clock}
            iconColor="text-blue-500"
            iconBg="bg-blue-50"
          />
          <KPICard
            label="Pending Decisions"
            value={String(m.pendingDecisions)}
            detail="Require your action today"
            icon={AlertCircle}
            iconColor="text-amber-500"
            iconBg="bg-amber-50"
            valueColor="text-amber-600"
          />
          <KPICard
            label="Portfolio TIV"
            value="$4.8B"
            detail="Total insured value managed"
            icon={Shield}
            iconColor="text-emerald-500"
            iconBg="bg-emerald-50"
          />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">

          {/* Broker submissions — 2/3 */}
          <div className="col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Broker Submissions</h3>
              <span className="text-xs text-gray-400">{SUBMISSIONS.length} submissions in queue</span>
            </div>
            <div>
              {SUBMISSIONS.map((sub, i) => (
                <div
                  key={sub.id}
                  className={`flex items-center gap-4 px-5 py-3.5 ${i < SUBMISSIONS.length - 1 ? 'border-b border-gray-50' : ''} ${sub.status === 'urgent' ? 'bg-red-50/40' : 'hover:bg-gray-50'} transition-colors`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-medium text-sm ${sub.status === 'urgent' ? 'text-red-800' : 'text-gray-900'}`}>
                        {sub.client}
                      </span>
                      <span className="text-xs text-gray-400">via {sub.broker}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {sub.line} · {sub.requestedLimit} requested · TIV {sub.tiv}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <StatusBadge status={sub.status} />
                    {sub.deadline && (
                      <div className="text-xs text-red-600 font-medium mt-1">{sub.deadline}</div>
                    )}
                  </div>
                  {sub.status === 'urgent' && (
                    <ChevronRight className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Copilot morning brief — 1/3 */}
          <div className="col-span-1">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-indigo-50/50">
                <h3 className="text-sm font-semibold text-indigo-800">Copilot Morning Brief</h3>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-sm text-gray-700 leading-relaxed">
                  Fabrikam Manufacturing (Adatum) is your top priority — $50M property tower, TIV $2.1B, broker deadline at <span className="font-semibold text-red-600">5:00 PM today</span>.
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  The request exceeds your $25M authority. A senior referral will be needed. Open Copilot for a full briefing.
                </p>
                <div className="pt-1 space-y-1.5">
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                    <span className="text-xs text-gray-600">Northwind Logistics — identity verification incomplete</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <span className="text-xs text-gray-600">Metro Warehouse — inspection report overdue</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <span className="text-xs text-gray-600">Alpine Ventures — ACORD 125 incomplete</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming renewals */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Upcoming Renewals</h3>
            <span className="text-xs text-gray-400">Next 60 days</span>
          </div>
          <div className="grid grid-cols-4 divide-x divide-gray-50">
            {UPCOMING_RENEWALS.map(({ name, days, broker }) => (
              <div key={name} className="px-5 py-4">
                <div className={`inline-flex items-center gap-1.5 text-xs font-bold rounded-lg px-2 py-1 mb-2 ${renewalUrgency(days)}`}>
                  <Clock className="w-3 h-3" />
                  {days}d
                </div>
                <p className="text-sm font-medium text-gray-900 leading-tight">{name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{broker}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
