"use client"

import { AlertCircle, FileText, Clock, Shield, ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// 3 carried over from Eva's day + 4 new overnight = 7 open activities
const SUBMISSIONS = [
  {
    id: 'litware',
    client: 'Litware Industries',
    broker: 'Adatum',
    line: 'Commercial Property',
    tiv: '$650M',
    requestedLimit: '$30M',
    status: 'urgent' as const,
    deadline: 'Today 3:00 PM',
    tag: 'New',
  },
  {
    id: 'northwind',
    client: 'Northwind Logistics',
    broker: 'Contoso Brokers',
    line: 'General Liability',
    tiv: '$180M',
    requestedLimit: '$5M',
    status: 'pending' as const,
    tag: 'Carried over',
  },
  {
    id: 'tailspin',
    client: 'Tailspin Aerospace',
    broker: 'Proseware Insurance',
    line: 'General Liability + Property',
    tiv: '$210M',
    requestedLimit: '$15M',
    status: 'pending' as const,
    tag: 'New',
  },
  {
    id: 'metro',
    client: 'Metro Warehouse Complex',
    broker: 'Woodgrove Premier Brokers',
    line: 'Commercial Property + Equipment Breakdown',
    tiv: '$340M',
    requestedLimit: '$20M',
    status: 'in-review' as const,
    tag: 'Carried over',
  },
  {
    id: 'alpine',
    client: 'Alpine Ventures Group',
    broker: 'Proseware Insurance',
    line: 'Commercial Property',
    tiv: '$95M',
    requestedLimit: '$12M',
    status: 'pending' as const,
    tag: 'Carried over',
  },
  {
    id: 'contoso-mfg',
    client: 'Contoso Manufacturing Group',
    broker: 'WG Premier Brokers',
    line: 'Commercial Property',
    tiv: '$820M',
    requestedLimit: '$22M',
    status: 'pending' as const,
    tag: 'New',
  },
  {
    id: 'fourth-coffee',
    client: 'Fourth Coffee Distribution',
    broker: 'Contoso Brokers',
    line: 'Commercial Property + GL',
    tiv: '$45M',
    requestedLimit: '$8M',
    status: 'pending' as const,
    tag: 'New',
  },
]

const RENEWALS = [
  { name: 'Tailspin Aerospace', days: 22, broker: 'Proseware Insurance' },
  { name: 'Contoso Mfg Group', days: 44, broker: 'WG Premier Brokers' },
  { name: 'Northwind Logistics', days: 62, broker: 'Contoso Brokers' },
  { name: 'Fourth Coffee Dist.', days: 78, broker: 'Contoso Brokers' },
]

function renewalUrgency(days: number) {
  if (days <= 20) return 'bg-red-50 text-red-600'
  if (days <= 35) return 'bg-amber-50 text-amber-600'
  return 'bg-indigo-50 text-indigo-600'
}

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

export function MarcusDashboard() {
  const newCount = SUBMISSIONS.filter(s => s.tag === 'New').length
  const urgentCount = SUBMISSIONS.filter(s => s.status === 'urgent').length

  return (
    <div className="h-full overflow-y-auto bg-gray-50" style={{ scrollbarGutter: 'stable' }}>
      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* Greeting */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Good morning, Marcus</h1>
            <p className="text-sm text-gray-500 mt-0.5">Commercial Underwriter · Authorized up to $25M primary line</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-indigo-50 text-indigo-700 rounded-full px-3 py-1 text-sm font-medium">$3.2B Portfolio TIV</span>
            <span className="bg-gray-100 text-gray-600 rounded-full px-3 py-1 text-sm">{SUBMISSIONS.length} Active Submissions</span>
          </div>
        </div>

        {/* Overnight alert */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
          <div className="flex-1">
            <span className="text-sm font-medium text-amber-900">{newCount} new submissions received overnight</span>
            <span className="text-sm text-amber-700"> · 3 open items carried over from yesterday. Copilot has briefed your queue.</span>
          </div>
          <span className="bg-amber-100 text-amber-800 text-xs font-medium rounded-full px-2.5 py-1 shrink-0">
            {urgentCount} urgent
          </span>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <KPICard
            label="Open Activities"
            value={String(SUBMISSIONS.length)}
            detail="4 new · 3 carried over"
            icon={FileText}
            iconColor="text-indigo-500"
            iconBg="bg-indigo-50"
          />
          <KPICard
            label="Avg. Cycle Time"
            value="4.3d"
            detail="Current portfolio average"
            icon={Clock}
            iconColor="text-blue-500"
            iconBg="bg-blue-50"
          />
          <KPICard
            label="Pending Decisions"
            value="4"
            detail="Require your action today"
            icon={AlertCircle}
            iconColor="text-amber-500"
            iconBg="bg-amber-50"
            valueColor="text-amber-600"
          />
          <KPICard
            label="Portfolio TIV"
            value="$3.2B"
            detail="Total insured value managed"
            icon={Shield}
            iconColor="text-emerald-500"
            iconBg="bg-emerald-50"
          />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">

          {/* Submissions — 2/3 */}
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
                      <span className={`text-[10px] font-medium rounded px-1.5 py-0.5 ${sub.tag === 'New' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                        {sub.tag}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {sub.line} · {sub.requestedLimit} requested · TIV {sub.tiv}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <StatusBadge status={sub.status} />
                    {'deadline' in sub && sub.deadline && (
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

          {/* Copilot brief — 1/3 */}
          <div className="col-span-1">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-indigo-50/50">
                <h3 className="text-sm font-semibold text-indigo-800">Copilot Morning Brief</h3>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-sm text-gray-700 leading-relaxed">
                  Eva completed the Fabrikam Manufacturing quote yesterday and handed off 3 open activities. Litware Industries (Adatum) is flagged as your top priority — <span className="font-semibold text-red-600">deadline 3:00 PM today</span>.
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Litware's $30M request is near your $25M authority. A senior referral may be required. Open Copilot for a full briefing.
                </p>
                <div className="pt-1 space-y-1.5">
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <span className="text-xs text-gray-600">Northwind Logistics — identity docs still outstanding</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <span className="text-xs text-gray-600">Metro Warehouse — inspection response awaited</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                    <span className="text-xs text-gray-600">Contoso Mfg Group — new, $22M property tower</span>
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
            <span className="text-xs text-gray-400">Next 90 days</span>
          </div>
          <div className="grid grid-cols-4 divide-x divide-gray-50">
            {RENEWALS.map(({ name, days, broker }) => (
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
