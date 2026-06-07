'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import CreateVersetModal from '@/components/CreateVersetModal'
import AnimatedCounter from '@/components/AnimatedCounter'
import { supabase } from '@/lib/supabase'
import {
  BellIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  BookOpenIcon,
  Squares2X2Icon,
  TableCellsIcon,
  ListBulletIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronUpDownIcon,
} from '@heroicons/react/24/outline'

// ── Types ────────────────────────────────────────────────────────
type VersetRow = {
  id: string
  public_id: string
  validation: string | null
  referinta_ro?: string | null
  verset_ro?: string | null
  verset_es?: string | null; verset_en?: string | null; verset_de?: string | null
  verset_pt?: string | null; verset_fr?: string | null; verset_it?: string | null
  referinta_es?: string | null; referinta_en?: string | null; referinta_de?: string | null
  referinta_pt?: string | null; referinta_fr?: string | null; referinta_it?: string | null
  created_at?: string
}
type ViewMode = 'cards' | 'table' | 'compact'
type SortField = 'created_at' | 'public_id' | 'progress'
type SortDir = 'asc' | 'desc'

const LANG_FIELDS = [
  { code: 'RO', field: 'verset_ro' }, { code: 'ES', field: 'verset_es' },
  { code: 'EN', field: 'verset_en' }, { code: 'DE', field: 'verset_de' },
  { code: 'PT', field: 'verset_pt' }, { code: 'FR', field: 'verset_fr' },
  { code: 'IT', field: 'verset_it' },
] as const

const STATUS_FILTERS = ['În traducere', 'În așteptare', 'Validat', 'Refuzat']

function getCompletedCount(v: VersetRow) {
  return LANG_FIELDS.filter(l => !!(v as any)[l.field]?.trim()).length
}
function getDisplayStatus(v: VersetRow) {
  const count = getCompletedCount(v)
  if (count < 7) return 'În traducere'
  return v.validation ?? 'În așteptare'
}

const STATUS_STYLE: Record<string, { pill: string; dot: string }> = {
  'În traducere': { pill: 'bg-[#fff5eb] text-[#c05c00]', dot: 'bg-[#c05c00]' },
  'În așteptare': { pill: 'bg-[#eef3ff] text-[#1e40af]', dot: 'bg-[#1e40af]' },
  'Validat':      { pill: 'bg-[#edfaf3] text-[#166534]', dot: 'bg-[#166534]' },
  'Refuzat':      { pill: 'bg-[#fff1f1] text-[#991b1b]', dot: 'bg-[#991b1b]' },
}
const STATUS_ACCENT: Record<string, string> = {
  'În traducere': '#c05c00', 'În așteptare': '#1e40af',
  'Validat': '#166534', 'Refuzat': '#991b1b',
}

function StatusPill({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE['În traducere']
  return (
    <span className={`inline-flex items-center gap-[5px] px-[10px] h-[26px] rounded-full text-[12px] font-semibold whitespace-nowrap ${s.pill}`}>
      <span className={`w-[5px] h-[5px] rounded-full flex-shrink-0 ${s.dot}`} />
      {status}
    </span>
  )
}

// ── Main ─────────────────────────────────────────────────────────
export default function VersetePage() {
  const router = useRouter()
  const [versets, setVersets] = useState<VersetRow[]>([])
  const [loading, setLoading] = useState(true)
  const [openCreateModal, setOpenCreateModal] = useState(false)
  const [view, setView] = useState<ViewMode>('cards')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  useEffect(() => {
    supabase.from('versete').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setVersets(data || []); setLoading(false) })
  }, [])

  const stats = {
    total:       versets.length,
    translating: versets.filter(v => getCompletedCount(v) < 7).length,
    validating:  versets.filter(v => getCompletedCount(v) === 7 && v.validation === 'În așteptare').length,
    validated:   versets.filter(v => v.validation === 'Validat').length,
  }

  const filtered = versets
    .filter(v => {
      if (search) {
        const q = search.toLowerCase()
        if (!v.referinta_ro?.toLowerCase().includes(q) &&
            !v.public_id?.toLowerCase().includes(q) &&
            !v.verset_ro?.toLowerCase().includes(q)) return false
      }
      if (statusFilter.length > 0 && !statusFilter.includes(getDisplayStatus(v))) return false
      return true
    })
    .sort((a, b) => {
      let va: any, vb: any
      if (sortField === 'created_at') { va = a.created_at ?? ''; vb = b.created_at ?? '' }
      else if (sortField === 'public_id') { va = a.public_id ?? ''; vb = b.public_id ?? '' }
      else { va = getCompletedCount(a); vb = getCompletedCount(b) }
      return sortDir === 'asc' ? (va < vb ? -1 : 1) : (va > vb ? -1 : 1)
    })

  const toggleStatus = (s: string) => setStatusFilter(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])
  const toggleSort = (f: SortField) => { if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortField(f); setSortDir('desc') } }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUpDownIcon className="w-3.5 h-3.5 text-[#aaa]" />
    return sortDir === 'asc' ? <ChevronUpIcon className="w-3.5 h-3.5 text-[#ce0100]" /> : <ChevronDownIcon className="w-3.5 h-3.5 text-[#ce0100]" />
  }

  return (
    <main className="flex min-h-screen bg-[#f9f7f5] overflow-x-hidden">
      <Sidebar />
      <div className="flex-1 w-0 px-10 py-8 overflow-y-auto overflow-x-hidden">

        {/* ── HEADER ── */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-[52px] leading-none tracking-tight font-light text-[#111] mb-3">Versete biblice</h1>
            <div className="w-10 h-[3px] rounded-full bg-[#ce0100] mb-4" />
            <p className="text-base text-[#666]">Gestionează traducerile și referințele biblice pentru toate limbile.</p>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <button className="w-11 h-11 rounded-xl bg-white border border-[#e8e2de] flex items-center justify-center hover:bg-[#faf7f5] transition-all">
              <BellIcon className="w-5 h-5 text-[#444]" />
            </button>
            <button onClick={() => setOpenCreateModal(true)}
              className="h-11 px-6 rounded-xl bg-[#ce0100] text-white text-sm font-semibold shadow-[0_6px_16px_rgba(206,1,0,0.22)] hover:bg-[#a80000] transition-all">
              + Verset nou
            </button>
          </div>
        </div>

        {/* ── STATS ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { title: 'Versete active', value: stats.total,       Icon: BookOpenIcon,    accent: '#ce0100' },
            { title: 'În traducere',   value: stats.translating,  Icon: ClockIcon,       accent: '#c05c00' },
            { title: 'În validare',    value: stats.validating,   Icon: ShieldCheckIcon, accent: '#1e40af' },
            { title: 'Validate',       value: stats.validated,    Icon: CheckCircleIcon, accent: '#166534' },
          ].map(({ title, value, Icon, accent }) => (
            <div key={title} className="bg-white border border-[#e8e2de] rounded-2xl px-5 h-24 flex items-center gap-4 shadow-sm">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${accent}18` }}>
                <Icon className="w-5 h-5" style={{ color: accent }} strokeWidth={1.6} />
              </div>
              <div>
                <p className="text-sm text-[#666] mb-1">{title}</p>
                <p className="text-3xl font-light text-[#111] leading-none"><AnimatedCounter value={value} /></p>
              </div>
            </div>
          ))}
        </div>

        {/* ── TOOLBAR ── */}
        <div className="bg-white border border-[#e8e2de] rounded-2xl px-5 py-4 mb-4 shadow-sm">
          {/* Row 1 */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 flex items-center gap-3 bg-[#f9f7f5] border border-[#e8e2de] rounded-xl px-4 h-10">
              <MagnifyingGlassIcon className="w-4 h-4 text-[#999] flex-shrink-0" />
              <input type="text" placeholder="Caută după referință, text sau ID..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm text-[#111] placeholder:text-[#bbb]" />
              {search && <button onClick={() => setSearch('')} className="text-xs text-[#999] hover:text-[#ce0100]">✕</button>}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              {([['created_at','Dată'],['public_id','ID'],['progress','Progres']] as [SortField,string][]).map(([f, label]) => (
                <button key={f} onClick={() => toggleSort(f)}
                  className={`h-10 px-3 rounded-xl border flex items-center gap-1.5 text-sm transition-all ${
                    sortField === f ? 'border-[#ffd3d3] bg-[#fff7f7] text-[#ce0100] font-semibold' : 'border-[#e8e2de] bg-white text-[#555] hover:bg-[#faf7f5]'
                  }`}>
                  {label} <SortIcon field={f} />
                </button>
              ))}
            </div>

            {/* View */}
            <div className="flex items-center gap-1 bg-[#f9f7f5] border border-[#e8e2de] rounded-xl p-1">
              {([['cards', Squares2X2Icon],['table', TableCellsIcon],['compact', ListBulletIcon]] as [ViewMode, any][]).map(([v, Icon]) => (
                <button key={v} onClick={() => setView(v)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                    view === v ? 'bg-white shadow-sm text-[#ce0100]' : 'text-[#aaa] hover:text-[#444]'
                  }`}>
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          {/* Row 2 — filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-[#666] mr-1">Stare:</span>
            {STATUS_FILTERS.map(s => {
              const st = STATUS_STYLE[s]
              return (
                <button key={s} onClick={() => toggleStatus(s)}
                  className={`h-7 px-3 rounded-full text-sm font-medium border transition-all ${
                    statusFilter.includes(s) ? `${st.pill} border-transparent` : 'bg-white text-[#444] border-[#e8e2de] hover:border-[#e0d8d4]'
                  }`}>{s}</button>
              )
            })}
            {statusFilter.length > 0 && (
              <button onClick={() => setStatusFilter([])}
                className="h-7 px-3 rounded-full text-sm text-[#ce0100] border border-[#ffd3d3] bg-[#fff7f7] hover:bg-[#ffe8e8] ml-1 transition-all">
                Șterge filtrele
              </button>
            )}
          </div>
        </div>

        {/* Count */}
        <p className="text-sm text-[#666] mb-4 pl-1">
          {filtered.length} {filtered.length === 1 ? 'verset' : 'versete'}{statusFilter.length > 0 || search ? ' filtrate' : ' total'}
        </p>

        {/* ── CONTENT ── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-base text-[#888]">Se încarcă...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <p className="text-3xl">📖</p>
            <p className="text-base text-[#888]">Niciun verset găsit.</p>
          </div>
        ) : (
          <>
            {/* ═══ CARDS ═══ */}
            {view === 'cards' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                {filtered.map(v => {
                  const count = getCompletedCount(v)
                  const pct = (count / 7) * 100
                  const ds = getDisplayStatus(v)
                  const accent = STATUS_ACCENT[ds] ?? '#ce0100'
                  return (
                    <div key={v.id} onClick={() => router.push(`/versete/${v.id}`)}
                      className="group bg-white border border-[#e8e2de] rounded-2xl overflow-x-hidden cursor-pointer hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(0,0,0,0.09)] transition-all duration-300">
                      <div className="h-[3px]" style={{ background: accent }} />
                      <div className="p-5">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <span className="text-[13px] font-bold text-[#ce0100]">{v.public_id}</span>
                            <span className="text-[12px] text-[#aaa] ml-2">
                              {v.created_at ? new Date(v.created_at).toLocaleDateString('ro-RO',{day:'2-digit',month:'short'}) : ''}
                            </span>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] text-[#999] uppercase tracking-wide">
                              {count === 7 ? 'Starea validării' : 'Starea traducerii'}
                            </span>
                            <StatusPill status={ds} />
                          </div>
                        </div>

                        {/* Reference */}
                        <h2 className="text-xl font-semibold text-[#111] mb-2">{v.referinta_ro}</h2>

                        {/* Verset text */}
                        <p className="text-sm text-[#555] leading-relaxed line-clamp-3 mb-5">{v.verset_ro}</p>

                        {/* Progress */}
                        <div className="mb-4">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-xs font-medium text-[#777] uppercase tracking-wide">Progres</span>
                            <span className="text-xs font-bold text-[#111]">{count}<span className="text-[#aaa] font-normal">/7</span></span>
                          </div>
                          <div className="h-1 bg-[#f0e8e4] rounded-full overflow-x-hidden">
                            <div className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${pct}%`, background: count === 7 ? '#166534' : '#ce0100' }} />
                          </div>
                        </div>

                        {/* Lang pills */}
                        <div className="flex flex-wrap gap-1.5">
                          {LANG_FIELDS.map(lang => {
                            const done = !!(v as any)[lang.field]?.trim()
                            return (
                              <span key={lang.code}
                                className={`inline-flex items-center justify-center h-6 px-2.5 rounded-full text-[11px] font-bold leading-none ${
                                  done ? 'bg-[#ce0100] text-white' : 'bg-[#f0e8e4] text-[#bbb]'
                                }`}>{lang.code}</span>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ═══ TABLE ═══ */}
            {view === 'table' && (
              <div className="bg-white border border-[#e8e2de] rounded-2xl overflow-x-hidden shadow-sm w-full">
                <table className="w-full table-fixed">
                  <colgroup>
                    <col className="w-[110px]" />
                    <col className="w-[140px]" />
                    <col />
                    <col className="w-[130px]" />
                    <col className="w-[160px]" />
                    <col className="w-[140px]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-[#f0e8e4]">
                      {([['ID','public_id'],['Referință',null],['Text RO',null],['Progres','progress'],['Limbi',null],['Stare',null]] as [string, SortField|null][]).map(([label, field]) => (
                        <th key={label}
                          onClick={() => field && toggleSort(field)}
                          className={`px-4 py-3 text-left text-xs font-semibold text-[#666] uppercase tracking-wide ${field ? 'cursor-pointer hover:text-[#ce0100]' : ''}`}>
                          <div className="flex items-center gap-1">
                            {label}
                            {field && <SortIcon field={field} />}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((v, i) => {
                      const count = getCompletedCount(v)
                      const ds = getDisplayStatus(v)
                      return (
                        <tr key={v.id} onClick={() => router.push(`/versete/${v.id}`)}
                          className={`cursor-pointer hover:bg-[#faf7f5] transition-colors ${i < filtered.length-1 ? 'border-b border-[#f8f3f0]' : ''}`}>
                          <td className="px-4 py-3"><span className="text-sm font-bold text-[#ce0100]">{v.public_id}</span></td>
                          <td className="px-4 py-3"><span className="text-sm font-semibold text-[#111] truncate block">{v.referinta_ro}</span></td>
                          <td className="px-4 py-3"><p className="text-sm text-[#555] truncate">{v.verset_ro}</p></td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1 bg-[#f0e8e4] rounded-full overflow-x-hidden">
                                <div className="h-full rounded-full" style={{ width: `${(count/7)*100}%`, background: count===7?'#166534':'#ce0100' }} />
                              </div>
                              <span className="text-xs font-bold text-[#111] flex-shrink-0">{count}/7</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {LANG_FIELDS.map(lang => {
                                const done = !!(v as any)[lang.field]?.trim()
                                return <span key={lang.code} className={`inline-flex items-center justify-center h-5 px-1.5 rounded-full text-[10px] font-bold ${done?'bg-[#ce0100] text-white':'bg-[#f0e8e4] text-[#bbb]'}`}>{lang.code}</span>
                              })}
                            </div>
                          </td>
                          <td className="px-4 py-3"><StatusPill status={ds} /></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ═══ COMPACT ═══ */}
            {view === 'compact' && (
              <div className="bg-white border border-[#e8e2de] rounded-2xl overflow-x-hidden shadow-sm">
                {filtered.map((v, i) => {
                  const count = getCompletedCount(v)
                  const ds = getDisplayStatus(v)
                  const accent = STATUS_ACCENT[ds] ?? '#ce0100'
                  return (
                    <div key={v.id} onClick={() => router.push(`/versete/${v.id}`)}
                      className={`flex items-center cursor-pointer hover:bg-[#faf7f5] transition-colors ${i < filtered.length - 1 ? 'border-b border-[#f8f3f0]' : ''}`}
                      style={{ minWidth: 0 }}>
                      {/* Accent bar */}
                      <div className="w-1 self-stretch flex-shrink-0" style={{ background: accent }} />
                      {/* ID */}
                      <div className="w-[110px] flex-shrink-0 px-4 py-3">
                        <span className="text-sm font-bold text-[#ce0100]">{v.public_id}</span>
                      </div>
                      {/* Referinta */}
                      <div className="w-[140px] flex-shrink-0 px-2 py-3">
                        <span className="text-sm font-semibold text-[#111] truncate block">{v.referinta_ro}</span>
                      </div>
                      {/* Text */}
                      <div className="flex-1 min-w-0 px-2 py-3">
                        <p className="text-sm text-[#555] truncate">{v.verset_ro}</p>
                      </div>
                      {/* Lang pills */}
                      <div className="w-[160px] flex-shrink-0 px-2 py-3 flex gap-0.5 flex-wrap">
                        {LANG_FIELDS.map(lang => {
                          const done = !!(v as any)[lang.field]?.trim()
                          return <span key={lang.code} className={`inline-flex items-center justify-center h-5 px-1.5 rounded-full text-[10px] font-bold ${done?'bg-[#ce0100] text-white':'bg-[#f0e8e4] text-[#bbb]'}`}>{lang.code}</span>
                        })}
                      </div>
                      {/* Status */}
                      <div className="w-[140px] flex-shrink-0 px-3 py-3">
                        <StatusPill status={ds} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      <CreateVersetModal open={openCreateModal} onClose={() => setOpenCreateModal(false)} />
    </main>
  )
}