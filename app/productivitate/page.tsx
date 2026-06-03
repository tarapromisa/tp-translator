'use client'

import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import { supabase } from '@/lib/supabase'
import {
  UserIcon, ChartBarIcon, ClockIcon, CheckCircleIcon,
  XCircleIcon, ArrowUpIcon, ArrowDownIcon, MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import AnimatedCounter from '@/components/AnimatedCounter'

// ── Types ─────────────────────────────────────────────────────────
type Translator = { id: string; full_name: string; email: string; language: string; active: boolean }

type CitatStat = {
  id: string; public_id: string
  data_asignarii: string | null
  data_trad: string | null  // data_trad_XX pentru limba traducătorului
  lang_filled: boolean
}

type TranslatorStats = {
  translator: Translator
  total: number
  completate: number
  inTime: number
  late: number
  inProgress: number
  productivity: number
  avgDays: number | null
  citate: CitatStat[]
}

const LANG_TRAD_FIELD: Record<string, string> = {
  RO: 'data_trad_ro', ES: 'data_trad_es', EN: 'data_trad_en',
  DE: 'data_trad_de', PT: 'data_trad_pt', FR: 'data_trad_fr', IT: 'data_trad_it',
}
const LANG_CITAT_FIELD: Record<string, string> = {
  RO: 'citat_ro', ES: 'citat_es', EN: 'citat_en',
  DE: 'citat_de', PT: 'citat_pt', FR: 'citat_fr', IT: 'citat_it',
}
const TRANSLATOR_FIELD: Record<string, string> = {
  ES: 'traductor_es', EN: 'traductor_en', DE: 'traductor_de',
  PT: 'traductor_pt', FR: 'traductor_fr', IT: 'traductor_it', RO: 'traducator_ro',
}

function monthsBetween(from: string, to: string): number {
  const a = new Date(from), b = new Date(to)
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) +
    (b.getDate() - a.getDate()) / 30
}
function daysBetween(from: string, to: string): number {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000)
}
function getProductivityColor(pct: number): string {
  if (pct >= 80) return '#166534'
  if (pct >= 60) return '#1e40af'
  if (pct >= 40) return '#c05c00'
  return '#ce0100'
}
function ProductivityBar({ value, color = '#ce0100' }: { value: number; color?: string }) {
  return (
    <div className="relative w-full h-2 bg-[#f0e9e5] rounded-full overflow-hidden">
      <div className="absolute left-0 top-0 h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.min(100, value)}%`, background: color }} />
    </div>
  )
}
function RankBadge({ rank }: { rank: number }) {
  const colors = ['#f59e0b', '#9ca3af', '#cd7c2f']
  const bg = rank <= 3 ? colors[rank - 1] : '#e8e2de'
  const text = rank <= 3 ? 'white' : '#888'
  return (
    <div style={{ width:24, height:24, borderRadius:'50%', background:bg, color:text, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>
      {rank}
    </div>
  )
}

// ── Translator Detail Modal ───────────────────────────────────────
function TranslatorDetail({ stats, onClose }: { stats: TranslatorStats; onClose: () => void }) {
  const fmt = (d: string) => new Date(d).toLocaleDateString('ro-RO', { day:'2-digit', month:'short', year:'numeric' })
  const color = getProductivityColor(stats.productivity)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background:'rgba(10,6,4,0.6)', backdropFilter:'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-[28px] w-full max-w-[680px] overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.2)] flex flex-col" style={{ maxHeight:'85vh' }}>
        <div className="h-[4px]" style={{ background: color }} />

        <div className="px-8 pt-7 pb-5 border-b border-[#f0e9e5] flex items-start justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
              style={{ background: color }}>
              {stats.translator.full_name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-light text-[#111] tracking-tight">{stats.translator.full_name}</h2>
              <p className="text-sm text-[#888]">{stats.translator.email} · <span className="font-semibold text-[#ce0100]">{stats.translator.language}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#faf7f5] border border-[#e8e2de] flex items-center justify-center hover:bg-[#ffe0e0] transition-all">
            <XCircleIcon className="w-4 h-4 text-[#555]" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 px-8 py-5 border-b border-[#f0e9e5] flex-shrink-0">
          {[
            { label:'Total asignate', value:stats.total,      color:'#111'     },
            { label:'La timp',        value:stats.inTime,     color:'#166534'  },
            { label:'Cu întârziere',  value:stats.late,       color:'#c05c00'  },
            { label:'În lucru',       value:stats.inProgress, color:'#1e40af'  },
          ].map(({ label, value, color:c }) => (
            <div key={label} className="text-center">
              <p className="text-2xl font-light leading-none mb-1" style={{ color:c }}>{value}</p>
              <p className="text-[11px] text-[#888] font-medium uppercase tracking-wide">{label}</p>
            </div>
          ))}
        </div>

        <div className="px-8 py-4 border-b border-[#f0e9e5] flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-[#111]">Productivitate globală</p>
            <p className="text-2xl font-light" style={{ color }}>{stats.productivity}%</p>
          </div>
          <ProductivityBar value={stats.productivity} color={color} />
          {stats.avgDays !== null && (
            <p className="text-[11px] text-[#888] mt-2">Medie: <strong>{stats.avgDays} zile</strong> per citat completat</p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-8 py-3 border-b border-[#f0e9e5]">
            <p className="text-xs font-semibold text-[#888] uppercase tracking-wide">Istoricul citatelor</p>
          </div>
          {stats.citate.map((c, i) => {
            const isComplete = !!c.data_trad
            const months = c.data_asignarii && c.data_trad
              ? monthsBetween(c.data_asignarii, c.data_trad)
              : c.data_asignarii ? monthsBetween(c.data_asignarii, new Date().toISOString()) : null
            const days = c.data_asignarii && c.data_trad ? daysBetween(c.data_asignarii, c.data_trad) : null
            const inTime = isComplete && months !== null && months <= 3
            const isOverdue = !isComplete && months !== null && months > 3

            return (
              <div key={c.id} className="flex items-center gap-4 px-8 py-3 hover:bg-[#faf7f5] transition-colors"
                style={{ borderBottom: i < stats.citate.length-1 ? '1px solid #f8f3f0' : 'none' }}>
                <span className="text-[12px] font-bold text-[#ce0100] w-16 flex-shrink-0">{c.public_id}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {c.data_asignarii
                      ? <span className="text-[11px] text-[#888]">Asignat: {fmt(c.data_asignarii)}</span>
                      : <span className="text-[11px] text-[#ccc] italic">Fără dată asignare</span>
                    }
                    {c.data_trad && <span className="text-[11px] text-[#888]">→ Tradus: {fmt(c.data_trad)}</span>}
                  </div>
                  {days !== null && <p className="text-[11px] text-[#555] mt-0.5">{days} zile pentru traducere</p>}
                </div>
                <div className="flex-shrink-0">
                  {isComplete ? (
                    <span className={`text-[10px] font-semibold px-2 h-5 inline-flex items-center rounded-full ${inTime ? 'bg-[#edfaf3] text-[#166534]' : 'bg-[#fff5eb] text-[#c05c00]'}`}>
                      {inTime ? 'La timp' : 'Întârziat'}
                    </span>
                  ) : (
                    <span className={`text-[10px] font-semibold px-2 h-5 inline-flex items-center rounded-full ${isOverdue ? 'bg-[#fff1f1] text-[#ce0100]' : 'bg-[#eef3ff] text-[#1e40af]'}`}>
                      {isOverdue ? 'Depășit' : 'În lucru'}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────
export default function ProductivitatePage() {
  const [translatorStats, setTranslatorStats] = useState<TranslatorStats[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStats, setSelectedStats] = useState<TranslatorStats|null>(null)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'productivity'|'total'|'inTime'|'avgDays'>('productivity')
  const [sortDir, setSortDir] = useState<'desc'|'asc'>('desc')
  const [view, setView] = useState<'grid'|'table'>('grid')

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      const { data: translators } = await supabase
        .from('users').select('id, full_name, email, language, active')
        .eq('active', true).eq('role', 'Traducător')

      if (!translators) { setLoading(false); return }

      const { data: texts } = await supabase.from('texts').select(
        'id, public_id, data_asignarii, ' +
        'data_trad_ro, data_trad_es, data_trad_en, data_trad_de, data_trad_pt, data_trad_fr, data_trad_it, ' +
        'traducator_ro, traductor_es, traductor_en, traductor_de, traductor_pt, traductor_fr, traductor_it, ' +
        'citat_ro, citat_es, citat_en, citat_de, citat_pt, citat_fr, citat_it'
      )

      const stats: TranslatorStats[] = translators.map(t => {
        const lang = t.language
        const translatorField = TRANSLATOR_FIELD[lang]
        const tradDateField = LANG_TRAD_FIELD[lang]
        const citatField = LANG_CITAT_FIELD[lang]

        if (!translatorField || !tradDateField || !citatField) return null

        const assigned = (texts || []).filter((tx: any) => tx[translatorField] === t.id)

        let totalDays = 0, daysCount = 0

        const citate: CitatStat[] = assigned.map((tx: any) => ({
          id: tx.id,
          public_id: tx.public_id,
          data_asignarii: tx.data_asignarii,
          data_trad: tx[tradDateField] ?? null,
          lang_filled: !!(tx[citatField]?.trim()),
        }))

        const completate = citate.filter(c => c.data_trad)
        const inTime = completate.filter(c => {
          if (!c.data_asignarii || !c.data_trad) return false
          return monthsBetween(c.data_asignarii, c.data_trad) <= 3
        })
        const late = completate.filter(c => {
          if (!c.data_asignarii || !c.data_trad) return false
          return monthsBetween(c.data_asignarii, c.data_trad) > 3
        })
        const inProgress = citate.filter(c => !c.data_trad)

        completate.forEach(c => {
          if (c.data_asignarii && c.data_trad) {
            totalDays += daysBetween(c.data_asignarii, c.data_trad)
            daysCount++
          }
        })

        const productivity = assigned.length > 0
          ? Math.round((inTime.length / assigned.length) * 100)
          : 0

        return {
          translator: t, total: assigned.length,
          completate: completate.length, inTime: inTime.length,
          late: late.length, inProgress: inProgress.length,
          productivity,
          avgDays: daysCount > 0 ? Math.round(totalDays / daysCount) : null,
          citate,
        }
      }).filter(Boolean) as TranslatorStats[]

      setTranslatorStats(stats)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = translatorStats
    .filter(s => !search || s.translator.full_name.toLowerCase().includes(search.toLowerCase()) || s.translator.language.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const va = sortBy === 'avgDays' ? (a.avgDays ?? 9999) : (a[sortBy] ?? 0)
      const vb = sortBy === 'avgDays' ? (b.avgDays ?? 9999) : (b[sortBy] ?? 0)
      return sortDir === 'desc' ? vb - va : va - vb
    })

  const totalStats = {
    translators: translatorStats.length,
    totalCitate: translatorStats.reduce((s, t) => s + t.total, 0),
    totalInTime: translatorStats.reduce((s, t) => s + t.inTime, 0),
    avgProductivity: translatorStats.length > 0
      ? Math.round(translatorStats.reduce((s, t) => s + t.productivity, 0) / translatorStats.length) : 0,
  }

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortBy(field); setSortDir('desc') }
  }

  return (
    <main className="flex min-h-screen bg-[#f9f7f5] overflow-hidden">
      <Sidebar />
      <div className="flex-1 min-w-0 px-4 md:px-10 py-6 md:py-8 overflow-y-auto">

        <div className="mb-8">
          <p className="text-[11px] font-semibold text-[#9c8e87] uppercase tracking-[0.15em] mb-2">Analiză echipă</p>
          <h1 className="text-[32px] md:text-[48px] leading-none tracking-tight font-light text-[#111] mb-3">Productivitate</h1>
          <div className="w-10 h-[3px] rounded-full bg-[#ce0100] mb-4" />
          <p className="text-sm font-light text-[#666]">Performanța traducătorilor — citate completate la timp vs. total asignate.</p>
        </div>

        {/* Global stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
          {[
            { label:'Traducători activi',    value:totalStats.translators,    color:'#ce0100', Icon:UserIcon         },
            { label:'Total citate asignate', value:totalStats.totalCitate,    color:'#1e40af', Icon:ChartBarIcon     },
            { label:'Completate la timp',    value:totalStats.totalInTime,    color:'#166534', Icon:CheckCircleIcon  },
            { label:'Productivitate medie',  value:totalStats.avgProductivity,color:getProductivityColor(totalStats.avgProductivity), Icon:ClockIcon, suffix:'%' },
          ].map(({ label, value, color, Icon, suffix }) => (
            <div key={label} className="bg-white border border-[#f0e9e5] rounded-[22px] p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-[12px] flex items-center justify-center" style={{ background:`${color}18` }}>
                  <Icon className="w-5 h-5" style={{ color }} strokeWidth={1.5} />
                </div>
              </div>
              <p className="text-[36px] font-light leading-none mb-2" style={{ color }}>
                <AnimatedCounter value={value} />{suffix}
              </p>
              <p className="text-sm font-light text-[#666]">{label}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 flex items-center gap-3 bg-white border border-[#e8e2de] rounded-xl px-4 h-10 shadow-sm">
            <MagnifyingGlassIcon className="w-4 h-4 text-[#999] flex-shrink-0" />
            <input type="text" placeholder="Caută traducător sau limbă..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-[#bbb]" />
          </div>
          <div className="flex items-center gap-1.5 bg-white border border-[#e8e2de] rounded-xl p-1 shadow-sm">
            {([['productivity','Productivitate'],['total','Total'],['inTime','La timp'],['avgDays','Viteză']] as [typeof sortBy,string][]).map(([field,label]) => (
              <button key={field} onClick={() => toggleSort(field)}
                className={`h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${sortBy===field?'bg-[#ce0100] text-white':'text-[#666] hover:text-[#111]'}`}>
                {label}
                {sortBy===field && (sortDir==='desc'?<ArrowDownIcon className="w-3 h-3"/>:<ArrowUpIcon className="w-3 h-3"/>)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-white border border-[#e8e2de] rounded-xl p-1 shadow-sm">
            {(['grid','table'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`h-8 px-3 rounded-lg text-xs font-semibold transition-all ${view===v?'bg-[#ce0100] text-white':'text-[#666] hover:text-[#111]'}`}>
                {v==='grid'?'Carduri':'Tabel'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-sm text-[#888]">Se încarcă...</p>
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filtered.map((stats, index) => {
              const color = getProductivityColor(stats.productivity)
              return (
                <div key={stats.translator.id} onClick={() => setSelectedStats(stats)}
                  className="bg-white border border-[#f0e9e5] rounded-[22px] overflow-hidden cursor-pointer hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(0,0,0,0.09)] transition-all duration-300">
                  <div className="h-1" style={{ background:color }} />
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                          style={{ background:color }}>
                          {stats.translator.full_name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#111] leading-tight">{stats.translator.full_name}</p>
                          <span className="text-[10px] font-bold px-2 h-[16px] inline-flex items-center rounded-full bg-[#fff4f4] text-[#ce0100] border border-[#ffd3d3]">
                            {stats.translator.language}
                          </span>
                        </div>
                      </div>
                      <RankBadge rank={index+1} />
                    </div>

                    <div className="flex items-center gap-4 mb-5">
                      <div className="relative w-[72px] h-[72px] flex-shrink-0">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 72 72">
                          <circle cx="36" cy="36" r="28" fill="none" stroke="#f0eae7" strokeWidth="8"/>
                          <circle cx="36" cy="36" r="28" fill="none" stroke={color} strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={`${(stats.productivity/100)*2*Math.PI*28} ${2*Math.PI*28}`}/>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[14px] font-light text-[#111]">{stats.productivity}%</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-[11px] text-[#888] uppercase tracking-wide font-medium mb-1">Productivitate</p>
                        <ProductivityBar value={stats.productivity} color={color} />
                        {stats.avgDays !== null && (
                          <p className="text-[11px] text-[#aaa] mt-1.5">~{stats.avgDays} zile / citat</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label:'Asignate', value:stats.total,       color:'#111'    },
                        { label:'La timp',  value:stats.inTime,      color:'#166534' },
                        { label:'În lucru', value:stats.inProgress,  color:'#1e40af' },
                      ].map(({ label, value, color:c }) => (
                        <div key={label} className="bg-[#faf7f5] rounded-[10px] p-2.5 text-center">
                          <p className="text-[18px] font-light leading-none mb-1" style={{ color:c }}>{value}</p>
                          <p className="text-[9px] text-[#888] uppercase tracking-wide font-medium">{label}</p>
                        </div>
                      ))}
                    </div>

                    {stats.late > 0 && (
                      <div className="mt-3 flex items-center gap-1.5 bg-[#fff5eb] rounded-lg px-3 py-2">
                        <ClockIcon className="w-3.5 h-3.5 text-[#c05c00]" />
                        <p className="text-[11px] text-[#c05c00] font-medium">{stats.late} citate cu întârziere</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white border border-[#f0e9e5] rounded-[22px] overflow-hidden shadow-sm">
            <table className="w-full table-fixed">
              <colgroup>
                <col className="w-8"/><col/><col className="w-20"/>
                <col className="w-24"/><col className="w-24"/><col className="w-24"/>
                <col className="w-36"/><col className="w-24"/>
              </colgroup>
              <thead>
                <tr className="border-b border-[#f0e9e5]">
                  {['#','Traducător','Limbă','Asignate','La timp','În lucru','Productivitate','Viteză'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-[#888] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((stats, index) => {
                  const color = getProductivityColor(stats.productivity)
                  return (
                    <tr key={stats.translator.id} onClick={() => setSelectedStats(stats)}
                      className="cursor-pointer hover:bg-[#faf7f5] transition-colors border-b border-[#f8f3f0] last:border-0">
                      <td className="px-4 py-3"><RankBadge rank={index+1}/></td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-[#111] truncate">{stats.translator.full_name}</p>
                        <p className="text-[11px] text-[#888] truncate">{stats.translator.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold px-2 h-5 inline-flex items-center rounded-full bg-[#fff4f4] text-[#ce0100] border border-[#ffd3d3]">
                          {stats.translator.language}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-light text-[#111]">{stats.total}</td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-[#166534]">{stats.inTime}</span>
                        {stats.late > 0 && <span className="text-[10px] text-[#c05c00] ml-1">+{stats.late}î</span>}
                      </td>
                      <td className="px-4 py-3 text-sm font-light text-[#1e40af]">{stats.inProgress}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-[#f0eae7] rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width:`${stats.productivity}%`, background:color }}/>
                          </div>
                          <span className="text-sm font-semibold w-10 text-right" style={{ color }}>{stats.productivity}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-light text-[#888]">
                        {stats.avgDays !== null ? `${stats.avgDays}z` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedStats && <TranslatorDetail stats={selectedStats} onClose={() => setSelectedStats(null)} />}
    </main>
  )
}