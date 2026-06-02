'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { supabase } from '@/lib/supabase'
import {
  CheckCircleIcon,
  XCircleIcon,
  BookOpenIcon,
  ShieldCheckIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckSolid, XCircleIcon as XSolid } from '@heroicons/react/24/solid'

// ── Types ─────────────────────────────────────────────────────────
type CitatRow = {
  id: string; public_id: string; citat_ro: string; autor_original: string
  validation: string | null; status: string; created_at: string
  citat_es?: string; citat_en?: string; citat_de?: string
  citat_pt?: string; citat_fr?: string; citat_it?: string
}
type VersetRow = {
  id: string; public_id: string; referinta_ro: string; verset_ro: string
  validation: string | null; status: string; created_at: string
  verset_es?: string; verset_en?: string; verset_de?: string
  verset_pt?: string; verset_fr?: string; verset_it?: string
}
type ContentTab = 'citate' | 'versete'
type StatusTab  = 'asteptare' | 'validat' | 'refuzat'

const LANG_FIELDS_C = ['citat_ro','citat_es','citat_en','citat_de','citat_pt','citat_fr','citat_it']
const LANG_FIELDS_V = ['verset_ro','verset_es','verset_en','verset_de','verset_pt','verset_fr','verset_it']
const LANG_CODES = ['RO','ES','EN','DE','PT','FR','IT']

// ── Validate Modal ────────────────────────────────────────────────
function ValidateModal({ item, type, onClose, onDone }: {
  item: CitatRow | VersetRow | null; type: ContentTab
  onClose: () => void; onDone: () => void
}) {
  const [action, setAction] = useState<'Validat' | 'Refuzat' | null>(null)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState('RO')

  useEffect(() => {
    setAction(null); setComment(''); setError(null); setActiveTab('RO')
    if (item) {
      const langs = type === 'citate' ? LANG_FIELDS_C : LANG_FIELDS_V
      const init: Record<string, string> = {}
      langs.forEach(f => { init[f] = (item as any)[f] ?? '' })
      setFields(init)
    }
  }, [item])

  if (!item) return null

  const title = type === 'citate' ? (item as CitatRow).autor_original : (item as VersetRow).referinta_ro
  const langs = type === 'citate' ? LANG_FIELDS_C : LANG_FIELDS_V
  const table = type === 'citate' ? 'texts' : 'versete'

  const canConfirm = !!action && comment.trim().length > 0
  const activeLangField = langs[LANG_CODES.indexOf(activeTab)]

  const handleConfirm = async () => {
    if (!canConfirm) return
    setLoading(true)
    setError(null)

    // Save edits + validation in one update
    const { error: updateError } = await supabase
      .from(table)
      .update({ ...fields, validation: action })
      .eq('id', item.id)

    if (updateError) {
      console.error('Validation error:', updateError)
      setError(updateError.message)
      setLoading(false)
      return
    }

    // Log activity
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from('users').select('id').eq('auth_user_id', user.id).single()
      if (profile) {
        await supabase.from('activity_logs').insert({
          user_id: profile.id,
          action: action === 'Validat' ? 'validate' : 'refuse',
          entity_type: type === 'citate' ? 'citat' : 'verset',
          entity_name: `${item.public_id} — ${comment}`,
        })
      }
    }

    setLoading(false)
    onDone()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(10,6,4,0.6)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose() }}>
      <div className="bg-white rounded-[28px] w-full max-w-[680px] overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.2)]"
        style={{ maxHeight: '92vh', overflowY: 'auto' }}>
        <div className="h-[4px] bg-[#ce0100]" />
        <div className="px-[36px] pt-[32px] pb-[28px]">

          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-[20px]">
            <div>
              <span className="text-[12px] font-bold text-[#ce0100]">{item.public_id}</span>
              <h3 className="text-[20px] font-light text-[#111] mt-[4px] tracking-tight">{title}</h3>
            </div>
            <div className="flex flex-wrap gap-[3px] justify-end">
              {LANG_CODES.map((code, i) => {
                const done = !!fields[langs[i]]?.trim()
                return <span key={code} className={`inline-flex items-center justify-center h-[22px] px-[7px] rounded-full text-[9px] font-bold ${done ? 'bg-[#ce0100] text-white' : 'bg-[#f0e8e4] text-[#bbb]'}`}>{code}</span>
              })}
            </div>
          </div>

          {/* Language tabs */}
          <div className="flex gap-[5px] flex-wrap mb-[12px]">
            {LANG_CODES.map((code, i) => {
              const done = !!fields[langs[i]]?.trim()
              const isActive = activeTab === code
              return (
                <button key={code} onClick={() => setActiveTab(code)}
                  className={`h-[28px] px-[10px] rounded-full text-[11px] font-bold flex items-center gap-[4px] transition-all border ${
                    isActive ? 'bg-[#ce0100] text-white border-[#ce0100]' :
                    'bg-white border-[#e8e2de] text-[#444] hover:border-[#ffd3d3]'
                  }`}>
                  {code}
                  {done && !isActive && <span className="w-[5px] h-[5px] rounded-full bg-[#166534]" />}
                </button>
              )
            })}
          </div>

          {/* Editable textarea */}
          <div className="mb-[20px]">
            <div className="flex items-center justify-between mb-[6px]">
              <p className="text-[11px] font-semibold text-[#666] uppercase tracking-wide">{activeTab} — {['Română','Español','English','Deutsch','Português','Français','Italiano'][LANG_CODES.indexOf(activeTab)]}</p>
              {activeTab === 'RO' && <span className="text-[10px] text-[#aaa] bg-[#f9f7f5] px-[8px] h-[18px] inline-flex items-center rounded-full">Original</span>}
            </div>
            <textarea
              value={fields[activeLangField] ?? ''}
              onChange={e => setFields(p => ({ ...p, [activeLangField]: e.target.value }))}
              rows={5}
              placeholder={`Traducere în ${LANG_CODES[LANG_CODES.indexOf(activeTab)]}...`}
              className="w-full rounded-[14px] border border-[#f0e9e5] px-[14px] py-[12px] text-[13px] text-[#111] resize-none outline-none focus:border-[#ce0100] focus:shadow-[0_0_0_3px_rgba(206,1,0,0.07)] transition-all placeholder:text-[#ccc] leading-relaxed"
            />
          </div>

          {/* Decision */}
          <p className="text-[11px] font-semibold text-[#666] uppercase tracking-wide mb-[8px]">Decizie</p>
          <div className="grid grid-cols-2 gap-[8px] mb-[16px]">
            <button onClick={() => setAction('Validat')}
              className={`h-[48px] rounded-[14px] border-[2px] flex items-center justify-center gap-2 text-[13px] font-semibold transition-all ${
                action === 'Validat' ? 'border-[#166534] bg-[#edfaf3] text-[#166534]' : 'border-[#f0e9e5] text-[#444] hover:border-[#166534] hover:bg-[#edfaf3]'
              }`}>
              <CheckCircleIcon className="w-[18px] h-[18px]" /> Validează
            </button>
            <button onClick={() => setAction('Refuzat')}
              className={`h-[48px] rounded-[14px] border-[2px] flex items-center justify-center gap-2 text-[13px] font-semibold transition-all ${
                action === 'Refuzat' ? 'border-[#ce0100] bg-[#fff1f1] text-[#ce0100]' : 'border-[#f0e9e5] text-[#444] hover:border-[#ce0100] hover:bg-[#fff1f1]'
              }`}>
              <XCircleIcon className="w-[18px] h-[18px]" /> Refuză
            </button>
          </div>

          {/* Comment — obligatory */}
          <div className="mb-[20px]">
            <p className="text-[11px] font-semibold text-[#666] uppercase tracking-wide mb-[8px]">
              Comentariu <span className="text-[#ce0100]">*</span>
              <span className="text-[#bbb] font-normal normal-case ml-1">obligatoriu</span>
            </p>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Explică decizia ta pentru traducători..."
              rows={3}
              className="w-full rounded-[14px] border border-[#f0e9e5] px-[14px] py-[12px] text-[13px] text-[#111] resize-none outline-none focus:border-[#ce0100] focus:shadow-[0_0_0_3px_rgba(206,1,0,0.07)] transition-all placeholder:text-[#ccc]"
            />
            {action && !comment.trim() && (
              <p className="text-[11px] text-[#ce0100] mt-[6px]">Comentariul este obligatoriu pentru a confirma decizia.</p>
            )}
          </div>

          {error && <p className="text-[12px] text-[#ce0100] mb-[12px] font-medium">Eroare: {error}</p>}

          {/* Buttons */}
          <div className="flex gap-[10px]">
            <button onClick={onClose} disabled={loading}
              className="flex-1 h-[46px] rounded-[14px] border border-[#e8e2de] bg-white text-[13px] font-semibold text-[#666] hover:bg-[#faf7f5] disabled:opacity-40 transition-all">
              Anulează
            </button>
            <button onClick={handleConfirm} disabled={!canConfirm || loading}
              className={`flex-1 h-[46px] rounded-[14px] text-[13px] font-bold flex items-center justify-center gap-2 transition-all ${
                !canConfirm ? 'bg-[#f0e9e5] text-[#aaa]' :
                action === 'Validat' ? 'bg-[#166534] text-white shadow-[0_6px_16px_rgba(22,101,52,0.3)] hover:bg-[#0f4d27]' :
                'bg-[#ce0100] text-white shadow-[0_6px_16px_rgba(206,1,0,0.3)] hover:bg-[#a80000]'
              } disabled:opacity-40`}>
              {loading ? 'Se salvează...' :
               action === 'Validat' ? <><CheckSolid className="w-4 h-4" />Confirmă validarea</> :
               action === 'Refuzat' ? <><XSolid className="w-4 h-4" />Confirmă refuzul</> :
               'Selectează o decizie'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Item row ──────────────────────────────────────────────────────
function ItemRow({ item, type, statusTab, canValidate, onValidate, onView, onRevert }: {
  item: CitatRow | VersetRow; type: ContentTab; statusTab: StatusTab
  canValidate: boolean; onValidate: () => void; onView: () => void; onRevert: () => void
}) {
  const isCitat = type === 'citate'
  const text    = isCitat ? (item as CitatRow).citat_ro      : (item as VersetRow).verset_ro
  const title   = isCitat ? (item as CitatRow).autor_original : (item as VersetRow).referinta_ro
  const langs   = isCitat ? LANG_FIELDS_C : LANG_FIELDS_V

  return (
    <div className="flex items-center gap-4 px-6 py-4 hover:bg-[#faf7f5] transition-colors">
      {/* Icon */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
        isCitat ? 'bg-[#fff4f4] border border-[#ffd3d3]' : 'bg-[#eef3ff] border border-[#c7d2fe]'
      }`}>
        {isCitat
          ? <svg width="13" height="10" viewBox="0 0 20 16" fill="none"><path d="M0 16V9.6C0 7.2.633 5.133 1.9 3.4 3.2 1.633 5 .467 7.3 0L8.2 1.6C6.867 1.967 5.8 2.7 5 3.8 4.233 4.867 3.85 6.067 3.85 7.4H7.3V16H0ZM11.7 16V9.6c0-2.4.633-4.467 1.9-6.2C14.9 1.633 16.7.467 19 0L19.9 1.6C18.567 1.967 17.5 2.7 16.7 3.8c-.767 1.067-1.15 2.267-1.15 3.6H19V16H11.7Z" fill="#ce0100" fillOpacity=".8"/></svg>
          : <BookOpenIcon className="w-4 h-4 text-[#1e40af]" strokeWidth={1.6} />
        }
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-[12px] font-bold ${isCitat ? 'text-[#ce0100]' : 'text-[#1e40af]'}`}>{item.public_id}</span>
          <span className="text-[11px] text-[#aaa]">·</span>
          <span className="text-[11px] font-medium text-[#888] truncate">{title}</span>
          <span className="text-[10px] text-[#bbb] flex-shrink-0">
            {item.created_at ? new Date(item.created_at).toLocaleDateString('ro-RO',{day:'2-digit',month:'short'}) : ''}
          </span>
        </div>
        <p className="text-[12px] text-[#555] truncate italic">"{text}"</p>
      </div>

      {/* Lang pills */}
      <div className="flex gap-[2px] flex-shrink-0">
        {LANG_CODES.map((code, idx) => {
          const done = !!(item as any)[langs[idx]]?.trim()
          return <span key={code} className={`inline-flex items-center justify-center h-[18px] px-[5px] rounded-full text-[8px] font-bold ${done?'bg-[#ce0100] text-white':'bg-[#f0e8e4] text-[#bbb]'}`}>{code}</span>
        })}
      </div>

      {/* Status badge for non-pending tabs */}
      {statusTab !== 'asteptare' && (
        <span className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 h-6 rounded-full text-[11px] font-semibold ${
          statusTab === 'validat' ? 'bg-[#edfaf3] text-[#166534]' : 'bg-[#fff1f1] text-[#ce0100]'
        }`}>
          {statusTab === 'validat' ? <><CheckSolid className="w-3 h-3"/>Validat</> : <><XSolid className="w-3 h-3"/>Refuzat</>}
        </span>
      )}

      {/* Action */}
      <div className="flex items-center gap-[6px] flex-shrink-0">
        {statusTab === 'asteptare' && canValidate && (
          <button onClick={onValidate}
            className="h-8 px-4 rounded-xl bg-[#ce0100] text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-[0_4px_10px_rgba(206,1,0,0.2)] hover:bg-[#a80000] transition-all">
            <ShieldCheckIcon className="w-[14px] h-[14px]" /> Validează
          </button>
        )}
        {statusTab !== 'asteptare' && canValidate && (
          <button onClick={onRevert}
            className="h-8 px-4 rounded-xl border border-[#e8e2de] bg-white text-[11px] font-semibold text-[#555] hover:bg-[#fff5eb] hover:border-[#ffd3a0] hover:text-[#c05c00] transition-all flex items-center gap-1.5">
            <ClockIcon className="w-[13px] h-[13px]" /> Revertește
          </button>
        )}
        <button onClick={onView}
          className="h-8 px-3 rounded-xl border border-[#e8e2de] bg-white text-[11px] font-semibold text-[#444] hover:bg-[#faf7f5] transition-all">
          Vezi
        </button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────
export default function ValidariPage() {
  const router = useRouter()
  const [contentTab, setContentTab] = useState<ContentTab>('citate')
  const [statusTab, setStatusTab]   = useState<StatusTab>('asteptare')
  const [allCitate, setAllCitate]   = useState<CitatRow[]>([])
  const [allVersete, setAllVersete] = useState<VersetRow[]>([])
  const [loading, setLoading]       = useState(true)
  const [selected, setSelected]     = useState<CitatRow | VersetRow | null>(null)
  const [userRole, setUserRole]     = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    // Fetch separately to avoid enum issues with .in()
    const [c1, c2, c3, v1, v2, v3] = await Promise.all([
      supabase.from('texts').select('*').eq('validation', 'În așteptare').order('created_at', { ascending: false }),
      supabase.from('texts').select('*').eq('validation', 'Validat').order('created_at', { ascending: false }),
      supabase.from('texts').select('*').eq('validation', 'Refuzat').order('created_at', { ascending: false }),
      supabase.from('versete').select('*').eq('validation', 'În așteptare').order('created_at', { ascending: false }),
      supabase.from('versete').select('*').eq('validation', 'Validat').order('created_at', { ascending: false }),
      supabase.from('versete').select('*').eq('validation', 'Refuzat').order('created_at', { ascending: false }),
    ])
    setAllCitate([...(c1.data||[]), ...(c2.data||[]), ...(c3.data||[])])
    setAllVersete([...(v1.data||[]), ...(v2.data||[]), ...(v3.data||[])])
    setLoading(false)
  }

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('users').select('role').eq('auth_user_id', user.id).single()
        setUserRole(profile?.role ?? null)
      }
      await fetchData()
    }
    load()
  }, [])

  const canValidate = userRole === 'Coordonator principal' || userRole === 'Admin'

  const filterByStatus = (items: (CitatRow|VersetRow)[], status: StatusTab) => {
    if (status === 'asteptare') return items.filter(i => i.validation === 'În așteptare')
    if (status === 'validat')   return items.filter(i => i.validation === 'Validat')
    return items.filter(i => i.validation === 'Refuzat')
  }

  const baseItems  = contentTab === 'citate' ? allCitate : allVersete
  const items      = filterByStatus(baseItems, statusTab)

  const counts = {
    citate:   { asteptare: allCitate.filter(i=>i.validation==='În așteptare').length,  validat: allCitate.filter(i=>i.validation==='Validat').length,  refuzat: allCitate.filter(i=>i.validation==='Refuzat').length },
    versete:  { asteptare: allVersete.filter(i=>i.validation==='În așteptare').length, validat: allVersete.filter(i=>i.validation==='Validat').length, refuzat: allVersete.filter(i=>i.validation==='Refuzat').length },
  }

  const STATUS_TABS: { key: StatusTab; label: string; color: string }[] = [
    { key: 'asteptare', label: 'În așteptare', color: '#c05c00' },
    { key: 'validat',   label: 'Validate',     color: '#166534' },
    { key: 'refuzat',   label: 'Refuzate',     color: '#ce0100' },
  ]

  return (
    <main className="flex min-h-screen bg-[#f9f7f5] overflow-hidden">
      <Sidebar />
      <div className="flex-1 w-0 px-10 py-8 overflow-y-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[52px] leading-none tracking-tight font-light text-[#111] mb-3">Validări</h1>
          <div className="w-10 h-[3px] rounded-full bg-[#ce0100] mb-4" />
          <p className="text-base text-[#666]">Aprobă sau refuză traducerile finalizate.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Citate în așteptare',  value: counts.citate.asteptare,  accent: '#ce0100' },
            { label: 'Versete în așteptare', value: counts.versete.asteptare, accent: '#1e40af' },
            { label: 'Total validate',       value: counts.citate.validat + counts.versete.validat, accent: '#166534' },
          ].map(({ label, value, accent }) => (
            <div key={label} className="bg-white border border-[#e8e2de] rounded-2xl px-5 h-20 flex items-center gap-4 shadow-sm">
              <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ background: accent }} />
              <div>
                <p className="text-sm text-[#666]">{label}</p>
                <p className="text-2xl font-light text-[#111] leading-none">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Access warning */}
        {!canValidate && userRole && (
          <div className="bg-[#fff5eb] border border-[#ffd3a0] rounded-2xl px-5 py-3.5 mb-6 flex items-center gap-3">
            <ShieldCheckIcon className="w-4 h-4 text-[#c05c00] flex-shrink-0" />
            <p className="text-sm text-[#c05c00]">Doar <strong>Coordonator principal</strong> și <strong>Admin</strong> pot valida.</p>
          </div>
        )}

        {/* Content tabs */}
        <div className="flex items-center gap-2 mb-4">
          {(['citate','versete'] as ContentTab[]).map(t => (
            <button key={t} onClick={() => setContentTab(t)}
              className={`h-9 px-5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all capitalize ${
                contentTab === t ? 'bg-[#ce0100] text-white shadow-[0_4px_12px_rgba(206,1,0,0.22)]' : 'bg-white border border-[#e8e2de] text-[#444] hover:bg-[#faf7f5]'
              }`}>
              {t === 'citate' ? 'Citate' : 'Versete'}
              <span className={`inline-flex items-center justify-center h-5 min-w-[18px] px-1 rounded-full text-[10px] font-bold ${
                contentTab === t ? 'bg-white text-[#ce0100]' : 'bg-[#f0e8e4] text-[#888]'
              }`}>{counts[t].asteptare + counts[t].validat + counts[t].refuzat}</span>
            </button>
          ))}
        </div>

        {/* Status sub-tabs */}
        <div className="flex items-center gap-1.5 mb-5 bg-white border border-[#e8e2de] rounded-xl p-1 w-fit shadow-sm">
          {STATUS_TABS.map(({ key, label, color }) => {
            const count = counts[contentTab][key]
            return (
              <button key={key} onClick={() => setStatusTab(key)}
                className={`h-8 px-4 rounded-lg text-[12px] font-semibold flex items-center gap-1.5 transition-all ${
                  statusTab === key ? 'bg-white shadow-sm text-[#111]' : 'text-[#888] hover:text-[#444]'
                }`}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                {label}
                {count > 0 && (
                  <span className={`inline-flex items-center justify-center h-[18px] min-w-[18px] px-1 rounded-full text-[9px] font-bold ${
                    statusTab === key ? 'text-white' : 'text-[#888] bg-[#f0e8e4]'
                  }`} style={{ background: statusTab === key ? color : undefined }}>{count}</span>
                )}
              </button>
            )
          })}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-[#888]">Se încarcă...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white border border-[#e8e2de] rounded-2xl p-12 text-center shadow-sm">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: statusTab === 'validat' ? '#edfaf3' : statusTab === 'refuzat' ? '#fff1f1' : '#fff5eb' }}>
              {statusTab === 'validat'
                ? <CheckSolid className="w-6 h-6 text-[#166534]" />
                : statusTab === 'refuzat'
                ? <XSolid className="w-6 h-6 text-[#ce0100]" />
                : <ClockIcon className="w-6 h-6 text-[#c05c00]" />
              }
            </div>
            <p className="text-base font-light text-[#111] mb-1">
              {statusTab === 'asteptare' ? 'Nicio traducere în așteptare' :
               statusTab === 'validat'   ? 'Nicio traducere validată' :
                                           'Nicio traducere refuzată'}
            </p>
            <p className="text-sm text-[#888]">pentru {contentTab === 'citate' ? 'citate' : 'versete'}</p>
          </div>
        ) : (
          <div className="bg-white border border-[#e8e2de] rounded-2xl overflow-hidden shadow-sm divide-y divide-[#f8f3f0]">
            {items.map(item => (
              <ItemRow
                key={item.id}
                item={item}
                type={contentTab}
                statusTab={statusTab}
                canValidate={canValidate}
                onValidate={() => setSelected(item)}
                onView={() => router.push(`/${contentTab === 'citate' ? 'citate' : 'versete'}/${item.id}`)}
                onRevert={async () => {
                  const table = contentTab === 'citate' ? 'texts' : 'versete'
                  await supabase.from(table).update({ validation: 'În așteptare' }).eq('id', item.id)
                  fetchData()
                }}
              />
            ))}
          </div>
        )}
      </div>

      <ValidateModal
        item={selected}
        type={contentTab}
        onClose={() => setSelected(null)}
        onDone={fetchData}
      />
    </main>
  )
}