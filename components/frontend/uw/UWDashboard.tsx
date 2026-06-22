'use client'

import { useState } from 'react'
import { AlertCircle, FileText, Clock, Shield, ChevronDown, CheckCircle2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { UWScene } from '@/lib/uwTypes'
import { PORTFOLIO_METRICS } from '@/lib/uwData'

interface UWDashboardProps {
  onSceneChange: (scene: UWScene) => void
}

const m = PORTFOLIO_METRICS.morning

type Status = 'urgent' | 'pending' | 'in-review' | 'quoted'
type SortKey = 'urgency' | 'dateReceived' | 'insured'
type Category = 'submission' | 'servicing' | 'renewal'

interface DashDoc { label: string; received: boolean }
interface DashRow {
  id: string
  insured: string
  broker: string
  line: string
  industry: string
  category: Category
  dateReceived: string
  effectiveDate: string
  requestedLimit: string
  status: Status
  deadline?: string
  docs: DashDoc[]
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

const ALL_SUBMISSIONS: DashRow[] = [
  {
    id: 'fab', insured: 'Fabrikam Manufacturing', broker: 'Adatum', line: 'Commercial Property', industry: 'Manufacturing',
    category: 'submission', dateReceived: '2026-06-12', effectiveDate: 'Jul 1, 2026', requestedLimit: '$50M',
    status: 'urgent', deadline: 'Today 5:00 PM',
    docs: [
      { label: 'SOV – 47 pages', received: true },
      { label: 'ACORD 125', received: true },
      { label: 'Loss Run 2019–2024', received: true },
      { label: 'Prior Policy', received: true },
      { label: 'Inspection Report', received: false },
      { label: 'Engineering Survey', received: false },
    ],
  },
  {
    id: 'nw', insured: 'Northwind Logistics', broker: 'Contoso Brokers', line: 'General Liability', industry: 'Transportation',
    category: 'submission', dateReceived: '2026-06-11', effectiveDate: 'Aug 15, 2026', requestedLimit: '$5M',
    status: 'pending',
    docs: [
      { label: 'ACORD 125', received: true },
      { label: 'GL Application', received: true },
      { label: 'Loss Summary', received: true },
      { label: 'Certificate of Insurance', received: false },
    ],
  },
  {
    id: 'alpine', insured: 'Alpine Ventures Group', broker: 'Proseware Insurance', line: 'Commercial Property', industry: 'Real Estate',
    category: 'submission', dateReceived: '2026-06-10', effectiveDate: 'Sep 1, 2026', requestedLimit: '$12M',
    status: 'pending',
    docs: [
      { label: 'ACORD 125', received: true },
      { label: 'Property Schedule', received: true },
      { label: 'Prior Policy', received: false },
      { label: 'Loss Run', received: false },
    ],
  },
  {
    id: 'metro', insured: 'Metro Warehouse Complex', broker: 'WG Premier Brokers', line: 'Property + Equipment Breakdown', industry: 'Warehousing',
    category: 'submission', dateReceived: '2026-06-09', effectiveDate: 'Aug 1, 2026', requestedLimit: '$20M',
    status: 'in-review',
    docs: [
      { label: 'ACORD 125', received: true },
      { label: 'Equipment Schedule', received: true },
      { label: 'Property Schedule', received: true },
      { label: 'Inspection Report', received: false },
    ],
  },
  {
    id: 'ps-1', insured: 'Fabrikam Manufacturing', broker: 'Adatum', line: 'Endorsement – Coverage Extension', industry: 'Manufacturing',
    category: 'servicing', dateReceived: '2026-06-10', effectiveDate: 'Jul 1, 2026', requestedLimit: '$52M',
    status: 'pending',
    docs: [
      { label: 'Endorsement Request Form', received: true },
      { label: 'Coverage Agreement', received: true },
      { label: 'Updated SOV', received: false },
    ],
  },
  {
    id: 'ps-2', insured: 'Northwind Logistics', broker: 'Contoso Brokers', line: 'Certificate of Insurance', industry: 'Transportation',
    category: 'servicing', dateReceived: '2026-06-11', effectiveDate: 'Aug 15, 2026', requestedLimit: '$5M',
    status: 'in-review',
    docs: [
      { label: 'COI Request Form', received: true },
      { label: 'Policy Summary', received: true },
    ],
  },
  {
    id: 'ps-3', insured: 'Metro Warehouse Complex', broker: 'WG Premier Brokers', line: 'Add Location – Policy Change', industry: 'Warehousing',
    category: 'servicing', dateReceived: '2026-06-09', effectiveDate: 'Aug 1, 2026', requestedLimit: '$20M',
    status: 'pending',
    docs: [
      { label: 'Location Schedule', received: true },
      { label: 'Updated SOV', received: false },
      { label: 'Site Survey', received: false },
    ],
  },
  {
    id: 'ps-4', insured: 'Alpine Ventures Group', broker: 'Proseware Insurance', line: 'Billing Inquiry', industry: 'Real Estate',
    category: 'servicing', dateReceived: '2026-06-08', effectiveDate: 'Sep 1, 2026', requestedLimit: '$12M',
    status: 'quoted',
    docs: [
      { label: 'Billing Statement', received: true },
      { label: 'Premium Breakdown', received: true },
    ],
  },
  {
    id: 'ren-fab', insured: 'Fabrikam Manufacturing', broker: 'Adatum', line: 'Commercial Property', industry: 'Manufacturing',
    category: 'renewal', dateReceived: '2026-05-28', effectiveDate: 'Jul 12, 2026', requestedLimit: '$50M',
    status: 'urgent', deadline: 'Jul 12',
    docs: [
      { label: 'Renewal Application', received: true },
      { label: 'Updated SOV', received: true },
      { label: 'Updated Loss Runs', received: true },
      { label: 'Renewal Survey', received: false },
    ],
  },
  {
    id: 'ren-nw', insured: 'Northwind Logistics', broker: 'Contoso Brokers', line: 'General Liability', industry: 'Transportation',
    category: 'renewal', dateReceived: '2026-06-02', effectiveDate: 'Sep 15, 2026', requestedLimit: '$5M',
    status: 'in-review',
    docs: [
      { label: 'Renewal Application', received: true },
      { label: 'Loss Summary', received: true },
      { label: 'GL Renewal Form', received: false },
    ],
  },
  {
    id: 'ren-alpine', insured: 'Alpine Ventures Group', broker: 'Proseware Insurance', line: 'Commercial Property', industry: 'Real Estate',
    category: 'renewal', dateReceived: '2026-06-04', effectiveDate: 'Oct 1, 2026', requestedLimit: '$12M',
    status: 'pending',
    docs: [
      { label: 'Renewal Application', received: true },
      { label: 'Updated Property Schedule', received: false },
    ],
  },
  {
    id: 'ren-metro', insured: 'Metro Warehouse Complex', broker: 'WG Premier Brokers', line: 'Property + Equipment', industry: 'Warehousing',
    category: 'renewal', dateReceived: '2026-06-06', effectiveDate: 'Sep 1, 2026', requestedLimit: '$20M',
    status: 'pending',
    docs: [
      { label: 'Renewal Application', received: true },
      { label: 'Equipment Schedule', received: true },
      { label: 'Inspection Report', received: false },
    ],
  },
  {
    id: 'ren-pinnacle', insured: 'Pinnacle State Campus', broker: 'Adatum', line: 'Commercial Property', industry: 'Education',
    category: 'renewal', dateReceived: '2026-06-08', effectiveDate: 'Sep 15, 2026', requestedLimit: '$8M',
    status: 'pending',
    docs: [
      { label: 'Renewal Application', received: true },
      { label: 'Campus Survey', received: false },
      { label: 'Loss Summary', received: false },
    ],
  },
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
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
      <div className="flex items-center justify-between mb-1">
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

function CategoryChip({
  category,
  active,
  onClick,
}: {
  category: Category
  active?: boolean
  onClick?: () => void
}) {
  const base: Record<Category, string> = {
    submission: 'bg-blue-50 text-blue-700 border-blue-200',
    servicing: 'bg-purple-50 text-purple-700 border-purple-200',
    renewal: 'bg-teal-50 text-teal-700 border-teal-200',
  }
  const activated: Record<Category, string> = {
    submission: 'bg-blue-100 text-blue-800 border-blue-400 ring-1 ring-blue-400 ring-offset-1',
    servicing: 'bg-purple-100 text-purple-800 border-purple-400 ring-1 ring-purple-400 ring-offset-1',
    renewal: 'bg-teal-100 text-teal-800 border-teal-400 ring-1 ring-teal-400 ring-offset-1',
  }
  const labels: Record<Category, string> = { submission: 'Submission', servicing: 'Servicing', renewal: 'Renewal' }
  const cls = `text-xs font-medium rounded-full px-2.5 py-0.5 border whitespace-nowrap transition-all ${active ? activated[category] : base[category]}`

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${cls} ${!active ? 'hover:opacity-80' : ''}`}>
        {labels[category]}
      </button>
    )
  }
  return <span className={cls}>{labels[category]}</span>
}

export function UWDashboard({ onSceneChange }: UWDashboardProps) {
  const [sort, setSort] = useState<SortKey>('urgency')
  const [filterCategory, setFilterCategory] = useState<Category | null>(null)
  const [openDocRow, setOpenDocRow] = useState<string | null>(null)

  const sorted = sortRows(ALL_SUBMISSIONS, sort)
  const displayed = filterCategory ? sorted.filter(r => r.category === filterCategory) : sorted

  function toggleFilter(cat: Category) {
    setFilterCategory(prev => prev === cat ? null : cat)
    setOpenDocRow(null)
  }

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

        {/* Main content: table + side rail */}
        <div className="flex gap-4 items-start">

        {/* Submissions table */}
        <div className="flex-1 min-w-0 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Table toolbar */}
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-gray-800">All Submissions</h3>
              <span className="text-xs text-gray-400">{displayed.length} of {ALL_SUBMISSIONS.length}</span>
              <div className="flex items-center gap-1.5">
                {(['submission', 'servicing', 'renewal'] as Category[]).map(cat => (
                  <CategoryChip
                    key={cat}
                    category={cat}
                    active={filterCategory === cat}
                    onClick={() => toggleFilter(cat)}
                  />
                ))}
                {filterCategory && (
                  <button
                    type="button"
                    onClick={() => { setFilterCategory(null); setOpenDocRow(null) }}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors ml-1"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortKey)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-600 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-300"
            >
              <option value="urgency">Sort: Urgency</option>
              <option value="dateReceived">Sort: Date Received</option>
              <option value="insured">Sort: Insured</option>
            </select>
          </div>

          {/* Column headers */}
          <div className="flex items-center gap-3 px-5 py-2 bg-gray-50/60 border-b border-gray-100">
            <div className="w-[96px] shrink-0 text-[10px] font-medium text-gray-400 uppercase tracking-wide">Type</div>
            <div className="flex-1 min-w-0 text-[10px] font-medium text-gray-400 uppercase tracking-wide">Insured / Broker</div>
            <div className="w-[150px] shrink-0 text-[10px] font-medium text-gray-400 uppercase tracking-wide">Line / Industry</div>
            <div className="w-[68px] shrink-0 text-[10px] font-medium text-gray-400 uppercase tracking-wide">Req. Limit</div>
            <div className="w-[84px] shrink-0 text-[10px] font-medium text-gray-400 uppercase tracking-wide">Eff. Date</div>
            <div className="w-[44px] shrink-0 text-[10px] font-medium text-gray-400 uppercase tracking-wide">Received</div>
            <div className="w-[90px] shrink-0 text-[10px] font-medium text-gray-400 uppercase tracking-wide">Status</div>
            <div className="w-[70px] shrink-0 text-[10px] font-medium text-gray-400 uppercase tracking-wide">Docs</div>
            <div className="w-[46px] shrink-0" />
          </div>

          {/* Rows */}
          {displayed.map((row, i) => {
            const docsOpen = openDocRow === row.id
            const receivedCount = row.docs.filter(d => d.received).length
            const isNavigable = row.id === 'fab'

            return (
              <div key={row.id} className={i < displayed.length - 1 ? 'border-b border-gray-50' : ''}>
                <div
                  onClick={isNavigable ? () => onSceneChange('submission-intake') : undefined}
                  className={`flex items-center gap-3 px-5 py-3 transition-colors cursor-pointer ${
                    row.status === 'urgent' ? 'bg-red-50/30 hover:bg-red-100/80' : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="w-[96px] shrink-0">
                    <CategoryChip category={row.category} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium truncate ${row.status === 'urgent' ? 'text-red-800' : 'text-gray-900'}`}>
                      {row.insured}
                    </div>
                    <div className="text-xs text-gray-400 truncate">via {row.broker}</div>
                  </div>
                  <div className="w-[150px] shrink-0">
                    <div className="text-xs text-gray-700 truncate">{row.line}</div>
                    <div className="text-xs text-gray-400 truncate">{row.industry}</div>
                  </div>
                  <div className="w-[68px] shrink-0 text-xs font-medium text-gray-700">{row.requestedLimit}</div>
                  <div className="w-[84px] shrink-0 text-xs text-gray-500">{row.effectiveDate}</div>
                  <div className="w-[44px] shrink-0 text-xs text-gray-500">{fmtDate(row.dateReceived)}</div>
                  <div className="w-[90px] shrink-0">
                    <StatusBadge status={row.status} />
                    {row.deadline && <div className="text-xs text-red-600 font-medium mt-0.5 whitespace-nowrap">{row.deadline}</div>}
                  </div>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setOpenDocRow(docsOpen ? null : row.id) }}
                    className="w-[70px] shrink-0 flex items-center gap-1 text-xs text-gray-600 border border-gray-200 bg-gray-50 hover:bg-gray-100 rounded-lg px-2 py-1 transition-colors font-medium"
                  >
                    <FileText className="w-3 h-3 shrink-0" />
                    {receivedCount}/{row.docs.length}
                    <ChevronDown className={`w-3 h-3 shrink-0 transition-transform duration-200 ml-auto ${docsOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={e => e.stopPropagation()}
                    className="w-[46px] shrink-0 text-xs text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 rounded-lg px-2 py-1 transition-colors font-medium"
                  >
                    Refer
                  </button>
                </div>

                {docsOpen && (
                  <div className="px-5 py-3 bg-gray-50/60 border-t border-gray-100 flex flex-wrap gap-2">
                    {row.docs.map(doc => (
                      <span
                        key={doc.label}
                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs border ${
                          doc.received
                            ? 'bg-white text-gray-700 border-gray-200'
                            : 'bg-gray-50 text-gray-400 border-dashed border-gray-300'
                        }`}
                      >
                        {doc.received
                          ? <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                          : <Clock className="w-3 h-3 text-gray-400 shrink-0" />
                        }
                        {doc.label}
                        {!doc.received && <span className="text-gray-400"> · Awaiting</span>}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Side rail */}
        <div className="w-[300px] shrink-0 space-y-4">

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

          {/* Upcoming Renewals */}
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
                    <p className="text-xs text-gray-400">via {broker}</p>
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
