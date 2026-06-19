'use client'

import { useState } from 'react'
import { AlertCircle, FileText, Clock, Shield } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { UWScene } from '@/lib/uwTypes'
import { PORTFOLIO_METRICS } from '@/lib/uwData'

interface UWDashboardProps {
  onSceneChange: (scene: UWScene) => void
}

const m = PORTFOLIO_METRICS.morning

type Status = 'urgent' | 'pending' | 'in-review' | 'quoted'
type SortKey = 'urgency' | 'dateReceived' | 'insured'

interface DashRow {
  id: string
  insured: string
  broker: string
  type: string
  dateReceived: string
  status: Status
  deadline?: string
}

const URGENCY_ORDER: Record<Status, number> = { urgent: 0, 'in-review': 1, pending: 2, quoted: 3 }

function sortRows(rows: DashRow[], key: SortKey): DashRow[] {
  return [...rows].sort((a, b) => {
    if (key === 'urgency') return URGENCY_ORDER[a.status] - URGENCY_ORDER[b.status]
    if (key === 'dateReceived') return b.dateReceived.localeCompare(a.dateReceived)
    return a.insured.localeCompare(b.insured)
  })
}

function fmtDate(iso: string): string {
  const parts = iso.split('-')
  const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[parseInt(parts[1])]} ${parseInt(parts[2])}`
}

const BROKER_SUBMISSIONS: DashRow[] = [
  { id: 'fab', insured: 'Fabrikam Manufacturing', broker: 'Adatum', type: 'Commercial Property', dateReceived: '2026-06-12', status: 'urgent', deadline: 'Today 5:00 PM' },
  { id: 'nw', insured: 'Northwind Logistics', broker: 'Contoso Brokers', type: 'General Liability', dateReceived: '2026-06-11', status: 'pending' },
  { id: 'alpine', insured: 'Alpine Ventures Group', broker: 'Proseware Insurance', type: 'Commercial Property', dateReceived: '2026-06-10', status: 'pending' },
  { id: 'metro', insured: 'Metro Warehouse Complex', broker: 'WG Premier Brokers', type: 'Property + Equipment Breakdown', dateReceived: '2026-06-09', status: 'in-review' },
]

const POLICY_SERVICING: DashRow[] = [
  { id: 'ps-1', insured: 'Fabrikam Manufacturing', broker: 'Adatum', type: 'Endorsement – Coverage Extension', dateReceived: '2026-06-10', status: 'pending' },
  { id: 'ps-2', insured: 'Northwind Logistics', broker: 'Contoso Brokers', type: 'Certificate of Insurance', dateReceived: '2026-06-11', status: 'in-review' },
  { id: 'ps-3', insured: 'Metro Warehouse Complex', broker: 'WG Premier Brokers', type: 'Add Location – Policy Change', dateReceived: '2026-06-09', status: 'pending' },
  { id: 'ps-4', insured: 'Alpine Ventures Group', broker: 'Proseware Insurance', type: 'Billing Inquiry', dateReceived: '2026-06-08', status: 'quoted' },
]

const RENEWALS_TABLE: DashRow[] = [
  { id: 'ren-fab', insured: 'Fabrikam Manufacturing', broker: 'Adatum', type: 'Commercial Property', dateReceived: '2026-05-28', status: 'urgent', deadline: 'Jul 12' },
  { id: 'ren-nw', insured: 'Northwind Logistics', broker: 'Contoso Brokers', type: 'General Liability', dateReceived: '2026-06-02', status: 'in-review' },
  { id: 'ren-alpine', insured: 'Alpine Ventures Group', broker: 'Proseware Insurance', type: 'Commercial Property', dateReceived: '2026-06-04', status: 'pending' },
  { id: 'ren-metro', insured: 'Metro Warehouse Complex', broker: 'WG Premier Brokers', type: 'Property + Equipment', dateReceived: '2026-06-06', status: 'pending' },
  { id: 'ren-pinnacle', insured: 'Pinnacle State Campus', broker: 'Adatum', type: 'Commercial Property', dateReceived: '2026-06-08', status: 'pending' },
]

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

function KPICard({ label, value, detail, icon: Icon, iconColor, iconBg, valueColor = 'text-gray-900' }: {
  label: string; value: string; detail: string; icon: LucideIcon; iconColor: string; iconBg: string; valueColor?: string
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

function StatusBadge({ status }: { status: Status }) {
  const map: Record<Status, string> = {
    urgent: 'bg-red-50 text-red-700 border border-red-200',
    pending: 'bg-amber-50 text-amber-700 border border-amber-200',
    'in-review': 'bg-blue-50 text-blue-700 border border-blue-200',
    quoted: 'bg-green-50 text-green-700 border border-green-200',
  }
  const labels: Record<Status, string> = { urgent: 'Urgent', pending: 'Pending', 'in-review': 'In Review', quoted: 'Quoted' }
  return (
    <span className={`text-xs font-medium rounded-full px-2.5 py-0.5 ${map[status]}`}>
      {labels[status]}
    </span>
  )
}

function SectionTable({ title, rows, sort, onSort, countLabel }: {
  title: string
  rows: DashRow[]
  sort: SortKey
  onSort: (key: SortKey) => void
  countLabel?: string
}) {
  const sorted = sortRows(rows, sort)
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        <div className="flex items-center gap-3">
          {countLabel && <span className="text-xs text-gray-400">{countLabel}</span>}
          <select
            value={sort}
            onChange={e => onSort(e.target.value as SortKey)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-600 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-300"
          >
            <option value="urgency">Sort: Urgency</option>
            <option value="dateReceived">Sort: Date Received</option>
            <option value="insured">Sort: Insured</option>
          </select>
        </div>
      </div>
      {sorted.map((row, i) => (
        <div
          key={row.id}
          className={`flex items-center gap-4 px-5 py-3 ${i < sorted.length - 1 ? 'border-b border-gray-50' : ''} ${row.status === 'urgent' ? 'bg-red-50/30' : 'hover:bg-gray-50'} transition-colors`}
        >
          <div className="flex-1 min-w-0">
            <div className={`text-sm font-medium truncate ${row.status === 'urgent' ? 'text-red-800' : 'text-gray-900'}`}>
              {row.insured}
            </div>
            <div className="text-xs text-gray-400 truncate">via {row.broker} · {row.type}</div>
          </div>
          <div className="text-xs text-gray-500 shrink-0 w-10 text-right">{fmtDate(row.dateReceived)}</div>
          <div className="shrink-0 text-right">
            <StatusBadge status={row.status} />
            {row.deadline && <div className="text-xs text-red-600 font-medium mt-0.5">{row.deadline}</div>}
          </div>
          <button
            type="button"
            className="text-xs text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 rounded-lg px-2.5 py-1 transition-colors font-medium shrink-0"
          >
            Refer
          </button>
        </div>
      ))}
    </div>
  )
}

export function UWDashboard({ onSceneChange }: UWDashboardProps) {
  const [brokerSort, setBrokerSort] = useState<SortKey>('urgency')
  const [policySort, setPolicySort] = useState<SortKey>('urgency')
  const [renewalsSort, setRenewalsSort] = useState<SortKey>('urgency')

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
          <KPICard label="Open Submissions" value={String(m.submissionsTotal)} detail={`${m.pendingDecisions} require decision today`} icon={FileText} iconColor="text-indigo-500" iconBg="bg-indigo-50" />
          <KPICard label="Avg. Cycle Time" value={`${m.cycleTimeDays}d`} detail="Current portfolio average" icon={Clock} iconColor="text-blue-500" iconBg="bg-blue-50" />
          <KPICard label="Pending Decisions" value={String(m.pendingDecisions)} detail="Require your action today" icon={AlertCircle} iconColor="text-amber-500" iconBg="bg-amber-50" valueColor="text-amber-600" />
          <KPICard label="Portfolio TIV" value="$4.8B" detail="Total insured value managed" icon={Shield} iconColor="text-emerald-500" iconBg="bg-emerald-50" />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-3 gap-4">

          {/* Left 2/3 — three stacked submission sections */}
          <div className="col-span-2 space-y-4">
            <SectionTable
              title="Broker Submissions"
              rows={BROKER_SUBMISSIONS}
              sort={brokerSort}
              onSort={setBrokerSort}
              countLabel={`${BROKER_SUBMISSIONS.length} submissions`}
            />
            <SectionTable
              title="Policy Servicing"
              rows={POLICY_SERVICING}
              sort={policySort}
              onSort={setPolicySort}
              countLabel={`${POLICY_SERVICING.length} requests`}
            />
            <SectionTable
              title="Renewals"
              rows={RENEWALS_TABLE}
              sort={renewalsSort}
              onSort={setRenewalsSort}
              countLabel={`${RENEWALS_TABLE.length} renewals`}
            />
          </div>

          {/* Right rail */}
          <div className="col-span-1 space-y-4">

            {/* Copilot Morning Brief */}
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

            {/* Upcoming Renewals widget */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">Upcoming Renewals</h3>
                <span className="text-xs text-gray-400">Next 60 days</span>
              </div>
              <div className="divide-y divide-gray-50">
                {UPCOMING_RENEWALS.map(({ name, days, broker }) => (
                  <div key={name} className="flex items-center gap-3 px-5 py-3">
                    <div className={`inline-flex items-center gap-1 text-xs font-bold rounded-lg px-2 py-1 shrink-0 ${renewalUrgency(days)}`}>
                      <Clock className="w-3 h-3" />
                      {days}d
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
                      <p className="text-xs text-gray-400">{broker}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
