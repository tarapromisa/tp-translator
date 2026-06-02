'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import CreateCitatModal from '@/components/CreateCitatModal'
import AnimatedCounter from '@/components/AnimatedCounter'
import { supabase } from '@/lib/supabase'
import {
  BellIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  Squares2X2Icon,
  TableCellsIcon,
  ListBulletIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronUpDownIcon,
} from '@heroicons/react/24/outline'
import { FaWhatsapp, FaRegEnvelope } from 'react-icons/fa'

// ── Types ────────────────────────────────────────────────────────
type TextRow = {
  id: string
  public_id: string
  status: string
  validation: string | null
  citat_ro?: string | null
  autor_original?: string | null
  citat_es?: string | null; citat_en?: string | null; citat_de?: string | null
  citat_pt?: string | null; citat_fr?: string | null; citat_it?: string | null
  traducator_ro?: string | null; traductor_es?: string | null; traductor_en?: string | null
  traductor_de?: string | null; traductor_pt?: string | null; traductor_fr?: string | null
  traductor_it?: string | null; created_at?: string
}
type ViewMode = 'cards' | 'table' | 'compact'
type SortField = 'created_at' | 'public_id' | 'progress'
type SortDir = 'asc' | 'desc'

const LANG_FIELDS = [
  { code: 'RO', field: 'citat_ro' }, { code: 'ES', field: 'citat_es' },
  { code: 'EN', field: 'citat_en' }, { code: 'DE', field: 'citat_de' },
  { code: 'PT', field: 'citat_pt' }, { code: 'FR', field: 'citat_fr' },
  { code: 'IT', field: 'citat_it' },
] as const

const CITATION_TYPES = ['CT', 'SP', 'TXT', 'RE']
const STATUS_FILTERS = ['Incomplet', 'Completat', 'În așteptare', 'Validat', 'Refuzat']

function getCompletedCount(text: TextRow) {
  return LANG_FIELDS.filter((l) => !!(text as any)[l.field]?.trim()).length
}
function getDisplayStatus(text: TextRow) {
  return getCompletedCount(text) < 7 ? 'Incomplet' : (text.validation ?? 'În așteptare')
}
function getCitationType(publicId: string) {
  return CITATION_TYPES.find((t) => publicId?.startsWith(t)) ?? '—'
}

const STATUS_STYLE: Record<string, { pill: string; dot: string }> = {
  'Incomplet':    { pill: 'bg-[#fff5eb] text-[#c05c00]', dot: 'bg-[#c05c00]' },
  'Completat':    { pill: 'bg-[#edfaf3] text-[#166534]', dot: 'bg-[#166534]' },
  'În așteptare': { pill: 'bg-[#eef3ff] text-[#1e40af]', dot: 'bg-[#1e40af]' },
  'Validat':      { pill: 'bg-[#edfaf3] text-[#166534]', dot: 'bg-[#166534]' },
  'Refuzat':      { pill: 'bg-[#fff1f1] text-[#991b1b]', dot: 'bg-[#991b1b]' },
}
const STATUS_ACCENT: Record<string, string> = {
  'Incomplet': '#c05c00', 'Completat': '#166534',
  'În așteptare': '#1e40af', 'Validat': '#166534', 'Refuzat': '#991b1b',
}

function StatusPill({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE['Incomplet']
  return (
    <span className={`inline-flex items-center gap-[5px] px-[10px] h-[26px] rounded-full text-[12px] font-semibold whitespace-nowrap ${s.pill}`}>
      <span className={`w-[5px] h-[5px] rounded-full flex-shrink-0 ${s.dot}`} />
      {status}
    </span>
  )
}

// ── Main ─────────────────────────────────────────────────────────
export default function CitatePage() {
  const router = useRouter()
  const [texts, setTexts] = useState<TextRow[]>([])
  const [loading, setLoading] = useState(true)
  const [openCreateModal, setOpenCreateModal] = useState(false)
  const [view, setView] = useState<ViewMode>('cards')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  useEffect(() => {
    supabase.from('texts').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setTexts(data || []); setLoading(false) })
  }, [])

  const stats = {
    total:       texts.length,
    translating: texts.filter((t) => getCompletedCount(t) < 7).length,
    validating:  texts.filter((t) => getCompletedCount(t) === 7 && t.validation === 'În așteptare').length,
    validated:   texts.filter((t) => t.validation === 'Validat').length,
  }

  const filtered = texts
    .filter((t) => {
      if (search) {
        const q = search.toLowerCase()
        if (!t.citat_ro?.toLowerCase().includes(q) && !t.public_id?.toLowerCase().includes(q) && !t.autor_original?.toLowerCase().includes(q)) return false
      }
      if (typeFilter.length > 0 && !typeFilter.includes(getCitationType(t.public_id))) return false
      if (statusFilter.length > 0 && !statusFilter.includes(getDisplayStatus(t))) return false
      return true
    })
    .sort((a, b) => {
      let va: any, vb: any
      if (sortField === 'created_at') { va = a.created_at ?? ''; vb = b.created_at ?? '' }
      else if (sortField === 'public_id') { va = a.public_id ?? ''; vb = b.public_id ?? '' }
      else { va = getCompletedCount(a); vb = getCompletedCount(b) }
      return sortDir === 'asc' ? (va < vb ? -1 : 1) : (va > vb ? -1 : 1)
    })

  const toggleType = (t: string) => setTypeFilter(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t])
  const toggleStatus = (s: string) => setStatusFilter(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])
  const toggleSort = (f: SortField) => { if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortField(f); setSortDir('desc') } }

  const sendToWhatsapp = (text: TextRow) => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`*CITAT ${text.public_id}*\n\n${text.citat_ro || ''}\n\n_${text.autor_original || 'Anonim'}_`)}`, '_blank')
  }
  const openEmail = async (text: TextRow) => {
    const ids = [text.traductor_es, text.traductor_en, text.traductor_de, text.traductor_pt, text.traductor_fr, text.traductor_it].filter(Boolean)
    const { data: users } = await supabase.from('users').select('id,email').in('id', ids)
    const emails = users?.map((u: any) => u.email).filter(Boolean).join(',') || ''
    window.open(`https://echipatp.github.io/tptranslator/mailcitatect.html?numarCitat=${encodeURIComponent(text.public_id)}&citatRO=${encodeURIComponent(text.citat_ro || '')}&autorRO=${encodeURIComponent(text.autor_original || '')}&emails=${encodeURIComponent(emails)}`, '_blank')
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUpDownIcon className="w-3.5 h-3.5 text-[#aaa]" />
    return sortDir === 'asc' ? <ChevronUpIcon className="w-3.5 h-3.5 text-[#ce0100]" /> : <ChevronDownIcon className="w-3.5 h-3.5 text-[#ce0100]" />
  }

  return (
    <main className="flex min-h-screen bg-[#f9f7f5]">
      <Sidebar />
      <div className="flex-1 px-10 py-8 overflow-y-auto">

        {/* ── HEADER ── */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-[52px] leading-none tracking-tight font-light text-[#111] mb-3">Citate</h1>
            <div className="w-10 h-[3px] rounded-full bg-[#ce0100] mb-4" />
            <p className="text-base text-[#666]">Gestionează traducerile și validările pentru toate limbile.</p>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <button className="w-11 h-11 rounded-xl bg-white border border-[#e8e2de] flex items-center justify-center hover:bg-[#faf7f5] transition-all">
              <BellIcon className="w-5 h-5 text-[#444]" />
            </button>
            <button onClick={() => setOpenCreateModal(true)}
              className="h-11 px-6 rounded-xl bg-[#ce0100] text-white text-sm font-semibold shadow-[0_6px_16px_rgba(206,1,0,0.22)] hover:bg-[#a80000] transition-all">
              + Citat nou
            </button>
          </div>
        </div>

        {/* ── STATS ── */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { title: 'Citate active',  value: stats.total,       Icon: () => <svg width="18" height="14" viewBox="0 0 20 16" fill="none"><path d="M0 16V9.6C0 7.2.633 5.133 1.9 3.4 3.2 1.633 5 .467 7.3 0L8.2 1.6C6.867 1.967 5.8 2.7 5 3.8 4.233 4.867 3.85 6.067 3.85 7.4H7.3V16H0ZM11.7 16V9.6c0-2.4.633-4.467 1.9-6.2C14.9 1.633 16.7.467 19 0L19.9 1.6C18.567 1.967 17.5 2.7 16.7 3.8c-.767 1.067-1.15 2.267-1.15 3.6H19V16H11.7Z" fill="#ce0100" fillOpacity=".85"/></svg>, accent: '#ce0100' },
            { title: 'În traducere',   value: stats.translating,  Icon: ClockIcon,        accent: '#c05c00' },
            { title: 'În validare',    value: stats.validating,   Icon: ShieldCheckIcon,  accent: '#1e40af' },
            { title: 'Validate',       value: stats.validated,    Icon: CheckCircleIcon,  accent: '#166534' },
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
              <input type="text" placeholder="Caută după ID, text sau autor..."
                value={search} onChange={(e) => setSearch(e.target.value)}
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
            <span className="text-sm text-[#666] mr-1">Tip:</span>
            {CITATION_TYPES.map((t) => (
              <button key={t} onClick={() => toggleType(t)}
                className={`h-7 px-3 rounded-full text-sm font-medium border transition-all ${
                  typeFilter.includes(t) ? 'bg-[#ce0100] text-white border-[#ce0100]' : 'bg-white text-[#444] border-[#e8e2de] hover:border-[#ffd3d3]'
                }`}>{t}</button>
            ))}
            <span className="w-px h-4 bg-[#e8e2de] mx-1" />
            <span className="text-sm text-[#666] mr-1">Stare:</span>
            {STATUS_FILTERS.map((s) => {
              const st = STATUS_STYLE[s]
              return (
                <button key={s} onClick={() => toggleStatus(s)}
                  className={`h-7 px-3 rounded-full text-sm font-medium border transition-all ${
                    statusFilter.includes(s) ? `${st.pill} border-transparent` : 'bg-white text-[#444] border-[#e8e2de] hover:border-[#e0d8d4]'
                  }`}>{s}</button>
              )
            })}
            {(typeFilter.length > 0 || statusFilter.length > 0) && (
              <button onClick={() => { setTypeFilter([]); setStatusFilter([]) }}
                className="h-7 px-3 rounded-full text-sm text-[#ce0100] border border-[#ffd3d3] bg-[#fff7f7] hover:bg-[#ffe8e8] ml-1 transition-all">
                Șterge filtrele
              </button>
            )}
          </div>
        </div>

        {/* Count */}
        <p className="text-sm text-[#666] mb-4 pl-1">
          {filtered.length} {filtered.length === 1 ? 'citat' : 'citate'} {(typeFilter.length > 0 || statusFilter.length > 0 || search) ? 'filtrate' : 'total'}
        </p>

        {/* ── CONTENT ── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-base text-[#888]">Se încarcă...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <p className="text-3xl">🔍</p>
            <p className="text-base text-[#888]">Niciun citat găsit.</p>
          </div>
        ) : (
          <>
            {/* ═══ CARDS ═══ */}
            {view === 'cards' && (
              <div className="grid grid-cols-3 gap-5 items-start">
                {filtered.map((text) => {
                  const count = getCompletedCount(text)
                  const pct = (count / 7) * 100
                  const ds = getDisplayStatus(text)
                  const accent = STATUS_ACCENT[ds] ?? '#ce0100'
                  return (
                    <div key={text.id} onClick={() => router.push(`/citate/${text.id}`)}
                      className="group bg-white border border-[#e8e2de] rounded-2xl overflow-hidden cursor-pointer hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(0,0,0,0.09)] transition-all duration-300">
                      <div className="h-[3px]" style={{ background: accent }} />
                      <div className="p-5">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div>
                            <span className="text-[13px] font-bold text-[#ce0100]">{text.public_id}</span>
                            <span className="text-[12px] text-[#aaa] ml-2">
                              {text.created_at ? new Date(text.created_at).toLocaleDateString('ro-RO', { day:'2-digit', month:'short' }) : ''}
                            </span>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] text-[#999] uppercase tracking-wide">
                              {count === 7 ? 'Starea validării' : 'Starea traducerii'}
                            </span>
                            <StatusPill status={ds} />
                          </div>
                        </div>

                        {/* Quote */}
                        <h2 className="text-lg leading-snug font-normal text-[#111] line-clamp-2 mb-2">
                          "{text.citat_ro}"
                        </h2>
                        <p className="text-sm text-[#888] mb-5">— {text.autor_original || 'Anonim'}</p>

                        {/* Progress */}
                        <div className="mb-4">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-xs font-medium text-[#777] uppercase tracking-wide">Progres</span>
                            <span className="text-xs font-bold text-[#111]">{count}<span className="text-[#aaa] font-normal">/7</span></span>
                          </div>
                          <div className="h-1 bg-[#f0e8e4] rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${pct}%`, background: count === 7 ? '#166534' : '#ce0100' }} />
                          </div>
                        </div>

                        {/* Lang pills */}
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {LANG_FIELDS.map((lang) => {
                            const done = !!(text as any)[lang.field]?.trim()
                            return (
                              <span key={lang.code}
                                className={`inline-flex items-center justify-center h-6 px-2.5 rounded-full text-[11px] font-bold leading-none ${
                                  done ? 'bg-[#ce0100] text-white' : 'bg-[#f0e8e4] text-[#bbb]'
                                }`}>{lang.code}</span>
                            )
                          })}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-4 border-t border-[#f4ece9]">
                          <button onClick={(e) => { e.stopPropagation(); sendToWhatsapp(text) }}
                            className="flex-1 h-9 rounded-xl bg-[#f9f7f5] border border-[#e8e2de] inline-flex items-center justify-center gap-2 text-sm text-[#444] hover:bg-[#25D366] hover:text-white hover:border-[#25D366] transition-all">
                            <FaWhatsapp className="text-sm" /> WhatsApp
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); openEmail(text) }}
                            className="flex-1 h-9 rounded-xl bg-[#f9f7f5] border border-[#e8e2de] inline-flex items-center justify-center gap-2 text-sm text-[#444] hover:bg-[#111] hover:text-white hover:border-[#111] transition-all">
                            <FaRegEnvelope className="text-sm" /> Email
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ═══ TABLE ═══ */}
            {view === 'table' && (
              <div className="bg-white border border-[#e8e2de] rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#f0e8e4]">
                      {[['ID','public_id'],['Citat',null],['Autor',null],['Progres','progress'],['Limbi',null],['Stare',null],['Dată','created_at'],['',null]].map(([label, field]) => (
                        <th key={label as string}
                          onClick={() => field && toggleSort(field as SortField)}
                          className={`px-5 py-3 text-left text-xs font-semibold text-[#666] uppercase tracking-wide ${field ? 'cursor-pointer hover:text-[#ce0100]' : ''}`}>
                          <div className="flex items-center gap-1">
                            {label}
                            {field && <SortIcon field={field as SortField} />}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((text, i) => {
                      const count = getCompletedCount(text)
                      const ds = getDisplayStatus(text)
                      return (
                        <tr key={text.id} onClick={() => router.push(`/citate/${text.id}`)}
                          className={`cursor-pointer hover:bg-[#faf7f5] transition-colors ${i < filtered.length - 1 ? 'border-b border-[#f8f3f0]' : ''}`}>
                          <td className="px-5 py-3"><span className="text-sm font-bold text-[#ce0100]">{text.public_id}</span></td>
                          <td className="px-5 py-3"><p className="text-sm text-[#222] line-clamp-1">"{text.citat_ro}"</p></td>
                          <td className="px-5 py-3"><p className="text-sm text-[#666] truncate">{text.autor_original || 'Anonim'}</p></td>
                          <td className="px-5 py-3 w-36">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1 bg-[#f0e8e4] rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${(count/7)*100}%`, background: count===7?'#166534':'#ce0100' }} />
                              </div>
                              <span className="text-xs font-bold text-[#111]">{count}/7</span>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex flex-wrap gap-1">
                              {LANG_FIELDS.map((lang) => {
                                const done = !!(text as any)[lang.field]?.trim()
                                return <span key={lang.code} className={`inline-flex items-center justify-center h-5 px-2 rounded-full text-[10px] font-bold ${done ? 'bg-[#ce0100] text-white' : 'bg-[#f0e8e4] text-[#bbb]'}`}>{lang.code}</span>
                              })}
                            </div>
                          </td>
                          <td className="px-5 py-3"><StatusPill status={ds} /></td>
                          <td className="px-5 py-3"><span className="text-xs text-[#888]">{text.created_at ? new Date(text.created_at).toLocaleDateString('ro-RO',{day:'2-digit',month:'short',year:'2-digit'}) : '—'}</span></td>
                          <td className="px-5 py-3">
                            <div className="flex gap-1.5">
                              <button onClick={(e)=>{e.stopPropagation();sendToWhatsapp(text)}} className="w-7 h-7 rounded-lg bg-[#faf7f5] border border-[#e8e2de] flex items-center justify-center hover:bg-[#25D366] hover:text-white hover:border-[#25D366] transition-all"><FaWhatsapp className="text-xs" /></button>
                              <button onClick={(e)=>{e.stopPropagation();openEmail(text)}} className="w-7 h-7 rounded-lg bg-[#faf7f5] border border-[#e8e2de] flex items-center justify-center hover:bg-[#111] hover:text-white hover:border-[#111] transition-all"><FaRegEnvelope className="text-[10px]" /></button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ═══ COMPACT ═══ */}
            {view === 'compact' && (
              <div className="flex flex-col gap-2">
                {filtered.map((text) => {
                  const count = getCompletedCount(text)
                  const ds = getDisplayStatus(text)
                  const accent = STATUS_ACCENT[ds] ?? '#ce0100'
                  return (
                    <div key={text.id} onClick={() => router.push(`/citate/${text.id}`)}
                      className="bg-white border border-[#e8e2de] rounded-xl px-5 py-3.5 flex items-center gap-4 cursor-pointer hover:bg-[#faf7f5] hover:border-[#ddd4cf] transition-all">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: accent }} />
                      <span className="w-16 flex-shrink-0 text-sm font-bold text-[#ce0100]">{text.public_id}</span>
                      <p className="flex-1 text-sm text-[#222] truncate">"{text.citat_ro}"</p>
                      <span className="w-32 flex-shrink-0 text-sm text-[#777] truncate">— {text.autor_original || 'Anonim'}</span>
                      <div className="flex gap-1 flex-shrink-0">
                        {LANG_FIELDS.map((lang) => {
                          const done = !!(text as any)[lang.field]?.trim()
                          return <span key={lang.code} className={`inline-flex items-center justify-center h-5 px-2 rounded-full text-[10px] font-bold ${done ? 'bg-[#ce0100] text-white' : 'bg-[#f0e8e4] text-[#bbb]'}`}>{lang.code}</span>
                        })}
                      </div>
                      <span className="text-xs font-bold text-[#111] flex-shrink-0">{count}<span className="text-[#aaa] font-normal">/7</span></span>
                      <div className="w-28 flex-shrink-0 flex justify-end"><StatusPill status={ds} /></div>
                      <span className="w-16 flex-shrink-0 text-xs text-[#aaa] text-right">
                        {text.created_at ? new Date(text.created_at).toLocaleDateString('ro-RO',{day:'2-digit',month:'short'}) : '—'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      <CreateCitatModal open={openCreateModal} onClose={() => setOpenCreateModal(false)} />
    </main>
  )
}