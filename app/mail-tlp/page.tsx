'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'
import { supabase } from '@/lib/supabase'
import EmailSentAlert from '@/components/EmailSentAlert'
import {
  PlusIcon, XMarkIcon, PaperAirplaneIcon, TrashIcon,
  MagnifyingGlassIcon, CheckCircleIcon, ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckSolid } from '@heroicons/react/24/solid'

// ── Types ─────────────────────────────────────────────────────────
type MailRecord = {
  id: string; created_at: string
  traducator: string | null; din_ziua: string; pana_ziua: string
  citate_lipsesc: string | null; trimis: boolean; trimis_at: string | null; trimis_de: string | null
  traducator_user?: { id: string; full_name: string; email: string; language: string } | null
  trimis_de_user?: { full_name: string } | null
}
type User = { id: string; full_name: string; email: string; language: string; role: string }
type CitatIncomplete = {
  id: string; public_id: string; citat_ro: string | null; autor_original: string
  missing_langs: string[]; translators: Record<string, string>
}
type CitatROIncomplete = {
  id: string; public_id: string; text_original: string; autor_original: string
  traducator_ro_user?: { full_name: string } | null
}

const LANGS = ['RO','ES','EN','DE','PT','FR','IT']
const LANG_FIELDS: Record<string, string> = {
  RO:'citat_ro', ES:'citat_es', EN:'citat_en', DE:'citat_de', PT:'citat_pt', FR:'citat_fr', IT:'citat_it'
}
const TRANSLATOR_FIELDS: Record<string, string> = {
  ES:'traductor_es', EN:'traductor_en', DE:'traductor_de', PT:'traductor_pt', FR:'traductor_fr', IT:'traductor_it'
}
const GIF = 'https://res.cloudinary.com/dlgqpbpwu/image/upload/v1780257817/Gif_TPT_2026_1_wl9try.gif'

function generateEmailHtml(toName: string, dinZiua: string, panaZiua: string, citateLipsesc: string, fromName: string, fromEmail: string, language: string, fromRole: string) {
  const ids = citateLipsesc.split(',').map(s => s.trim()).filter(Boolean)
  const fmt = (d: string) => new Date(d).toLocaleDateString('ro-RO', { day:'2-digit', month:'long', year:'numeric' })
  const citateList = ids.map(id => `<div style="padding:10px 16px;border-bottom:1px solid #f0e9e5;font-size:15px;font-weight:700;color:#ce0100;letter-spacing:0.02em;">${id}</div>`).join('')
  const logoUrl = 'https://res.cloudinary.com/dlgqpbpwu/image/upload/v1780257817/logo_tpt_email.png'

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f9f7f5;font-family:Helvetica,Arial,sans-serif;color:#2e2e2e;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">

  <!-- Header -->
  <div style="background:#ce0100;border-radius:16px 16px 0 0;padding:28px 32px;">
    <div style="margin-bottom:22px;">
      <img src="https://res.cloudinary.com/dlgqpbpwu/image/upload/v1780344170/new_tpt_1_sxiu3b.png" alt="TP Translator" style="height:32px;width:auto;display:block;" />
    </div>
    <h1 style="margin:0;font-size:32px;font-weight:300;color:#fff;line-height:1.2;letter-spacing:-0.02em;font-family:Helvetica,Arial,sans-serif;">
      Citate în așteptare<br>
      <span style="font-style:italic;color:rgba(255,255,255,0.85);font-family:'Times New Roman',Georgia,serif;font-weight:400;">pentru traducere.</span>
    </h1>
  </div>
  <div style="height:4px;background:#a80000;border-radius:0;"></div>

  <!-- Contenido -->
  <div style="background:#ffffff;padding:32px;border:1px solid #f0e9e5;border-top:none;border-radius:0 0 16px 16px;">

    <p style="margin:0 0 20px;font-size:17px;font-weight:600;color:#ce0100;font-family:Helvetica,Arial,sans-serif;">
      Bună, ${toName.split(' ')[0]}!
    </p>

    <p style="margin:0 0 16px;font-size:14px;line-height:1.75;color:#444;font-family:Helvetica,Arial,sans-serif;">
      Îți mulțumim pentru contribuția ta la proiectul nostru de traduceri.<br>
      Conform evidenței noastre, ai următoarele citate netraduse:
    </p>

    <!-- Periodo -->
    <div style="background:#faf7f5;border-radius:10px;padding:16px 20px;margin-bottom:20px;border:1px solid #f0e9e5;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.12em;font-family:Helvetica,Arial,sans-serif;">Citatele care lipsesc de tradus</p>
      <p style="margin:0;font-size:14px;color:#111;font-family:Helvetica,Arial,sans-serif;">
        <strong>${fmt(dinZiua)}</strong> — <strong>${fmt(panaZiua)}</strong>
      </p>
    </div>

    <!-- IDs table -->
    <div style="background:#fff7f7;border:1px solid #ffd3d3;border-radius:10px;overflow:hidden;margin-bottom:24px;">
      ${citateList}
    </div>

    <!-- Instructions -->
    <p style="margin:0 0 20px;font-size:14px;line-height:1.75;color:#444;font-family:Helvetica,Arial,sans-serif;">
      Te rugăm să le traduci în măsura în care timpul îți permite având în vedere că termenul limită este de <strong style="color:#111;">3 luni</strong>. De asemenea, poți transmite traducerile atât prin adresa de mail <a href="mailto:echipa@tptranslator.com" style="color:#ce0100;text-decoration:none;">echipa@tptranslator.com</a> cât și prin grupul de WhatsApp.<br>
      Dacă ai întrebări, nu ezita să ne contactezi.
    </p>

    <!-- Divider -->
    <div style="height:1px;background:#f0e9e5;margin:24px 0;"></div>

    <!-- Firma profesional -->
    <div style="background:#faf7f5;border-radius:12px;padding:18px 20px;border:1px solid #f0e9e5;">
      <p style="margin:0 0 4px;font-size:17px;font-weight:700;color:#111;font-family:Helvetica,Arial,sans-serif;letter-spacing:-0.02em;">${fromName}</p>
      <p style="margin:0 0 5px;font-size:13px;font-weight:500;color:#ce0100;font-family:Helvetica,Arial,sans-serif;">${fromRole}</p>
      <p style="margin:0;font-size:12px;color:#888;font-family:Helvetica,Arial,sans-serif;">
        <a href="mailto:${fromEmail}" style="color:#888;text-decoration:none;">${fromEmail}</a>
      </p>
    </div>
  </div>

  <!-- GIF -->
  <div style="margin-top:20px;border-radius:12px;overflow:hidden;">
    <img src="${GIF}" alt="TP Translator" style="width:100%;display:block;border-radius:12px;" />
  </div>

  <!-- Footer -->
  <p style="margin:16px 0 0;text-align:center;font-size:11px;color:#bbb;font-family:Helvetica,Arial,sans-serif;">
    © 2026 TP Translator · <a href="mailto:echipa@tptranslator.com" style="color:#bbb;text-decoration:none;">echipa@tptranslator.com</a>
  </p>

</div>
</body>
</html>`
}

// ── Delete Modal ──────────────────────────────────────────────────
function DeleteModal({ item, onClose, onDeleted }: { item: MailRecord|null; onClose:()=>void; onDeleted:()=>void }) {
  const [loading, setLoading] = useState(false)
  if (!item) return null
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4"
      style={{ background:'rgba(10,6,4,0.65)', backdropFilter:'blur(10px)' }}
      onClick={e => { if (e.target === e.currentTarget && !loading) onClose() }}>
      <div className="bg-white rounded-[24px] w-full max-w-[380px] overflow-x-hidden shadow-[0_32px_80px_rgba(0,0,0,0.2)]">
        <div className="h-[4px] bg-[#ce0100]" />
        <div className="px-8 pt-7 pb-6">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-[#fff1f1] border-2 border-[#f4d4d4] flex items-center justify-center">
              <ExclamationTriangleIcon className="w-5 h-5 text-[#ce0100]" />
            </div>
          </div>
          <h3 className="text-[17px] font-semibold text-[#111] text-center mb-2">Ștergi înregistrarea?</h3>
          <p className="text-[13px] text-[#888] text-center mb-6">{item.traducator_user?.full_name} · {item.din_ziua} — {item.pana_ziua}</p>
          <div className="flex gap-3">
            <button onClick={onClose} disabled={loading} className="flex-1 h-10 rounded-[12px] border border-[#e8e2de] bg-white text-[13px] font-semibold text-[#666] hover:bg-[#faf7f5] transition-all">Anulează</button>
            <button onClick={async () => { setLoading(true); await supabase.from('mail_tlp').delete().eq('id', item.id); setLoading(false); onDeleted(); onClose() }}
              disabled={loading} className="flex-1 h-10 rounded-[12px] bg-[#ce0100] text-white text-[13px] font-bold shadow-[0_4px_12px_rgba(206,1,0,0.3)] hover:bg-[#a80000] disabled:opacity-70 transition-all">
              {loading ? 'Se șterge...' : 'Da, șterge'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Resizable divider ─────────────────────────────────────────────
function ResizableDivider({ onResize }: { onResize: (dx: number) => void }) {
  const dragging = useRef(false)
  const lastX = useRef(0)

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true
    lastX.current = e.clientX
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return
      onResize(e.clientX - lastX.current)
      lastX.current = e.clientX
    }
    const onMouseUp = () => {
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp) }
  }, [onResize])

  return (
    <div onMouseDown={onMouseDown}
      className="w-[8px] flex-shrink-0 cursor-col-resize flex items-center justify-center group relative"
      style={{ background: 'transparent' }}>
      <div className="absolute inset-y-0 left-[3px] w-[1px] bg-[#e8e2de] group-hover:bg-[#ce0100] transition-colors" />
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 z-10">
        {[0,1,2,3,4].map(i => <div key={i} className="w-1 h-1 rounded-full bg-[#ce0100]" />)}
      </div>
    </div>
  )
}

// ── Vertical resizable divider ────────────────────────────────────
function VerticalDivider({ onResize }: { onResize: (dy: number) => void }) {
  const dragging = useRef(false)
  const lastY = useRef(0)

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true
    lastY.current = e.clientY
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
  }

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return
      onResize(e.clientY - lastY.current)
      lastY.current = e.clientY
    }
    const onMouseUp = () => {
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp) }
  }, [onResize])

  return (
    <div onMouseDown={onMouseDown}
      className="h-[8px] flex-shrink-0 cursor-row-resize flex items-center justify-center group relative"
      style={{ background: 'transparent' }}>
      <div className="absolute inset-x-0 top-[3px] h-[1px] bg-[#e8e2de] group-hover:bg-[#ce0100] transition-colors" />
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-row gap-1 z-10">
        {[0,1,2,3,4].map(i => <div key={i} className="w-1 h-1 rounded-full bg-[#ce0100]" />)}
      </div>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────
export default function MailTLPPage() {
  const [records, setRecords] = useState<MailRecord[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [currentUser, setCurrentUser] = useState<User|null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteItem, setDeleteItem] = useState<MailRecord|null>(null)
  const [sendingId, setSendingId] = useState<string|null>(null)
  const [sendingAll, setSendingAll] = useState(false)
  const [sentIds, setSentIds] = useState<string[]>([])
  const [emailAlert, setEmailAlert] = useState<{ name: string; email: string } | null>(null)

  // Reference panels data
  const [citateIncomp, setCitateIncomp] = useState<CitatIncomplete[]>([])
  const [citateROIncomp, setCitateROIncomp] = useState<CitatROIncomplete[]>([])
  const [searchCitate, setSearchCitate] = useState('')
  const [searchCitateRO, setSearchCitateRO] = useState('')
  const [userMap, setUserMap] = useState<Record<string, string>>({})

  // New record form
  const [traducator, setTraducator] = useState('')
  const [dinZiua, setDinZiua] = useState('')
  const [panaZiua, setPanaZiua] = useState('')
  const [citateLipsesc, setCitateLipsesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string|null>(null)

  // Layout
  const [leftWidth, setLeftWidth] = useState(420)
  const [rightTopHeight, setRightTopHeight] = useState(50) // percentage
  const [mobileTab, setMobileTab] = useState<'lista' | 'formular' | 'referinta'>('lista')

  const canManage = currentUser?.role === 'Coordonator principal' || currentUser?.role === 'Admin'

  const fetchData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: p } = await supabase.from('users').select('*').eq('auth_user_id', user.id).single()
      setCurrentUser(p ?? null)
    }
    const [{ data: r }, { data: u }] = await Promise.all([
      supabase.from('mail_tlp').select('*, traducator_user:traducator(id, full_name, email, language), trimis_de_user:trimis_de(full_name)').order('created_at', { ascending: false }),
      supabase.from('users').select('id, full_name, email, language, role').eq('active', true),
    ])
    setRecords(r || [])
    setAllUsers((u || []).filter((u: User) => u.role === 'Traducător'))
    const uMap: Record<string,string> = {}
    ;(u||[]).forEach((usr: User) => { uMap[usr.id] = usr.full_name })
    setUserMap(uMap)
    setLoading(false)
  }

  const fetchRefPanels = async () => {
    const [{ data: ct }, { data: ro }] = await Promise.all([
      supabase.from('texts').select('*, traductor_es(full_name), traductor_en(full_name), traductor_de(full_name), traductor_pt(full_name), traductor_fr(full_name), traductor_it(full_name)').eq('status', 'Incomplet'),
      supabase.from('citate_ro').select('*, traducator_ro_user:traducator_ro(full_name)').eq('status', 'Incomplet'),
    ])

    const incompCitate: CitatIncomplete[] = (ct || []).map((row: any) => {
      const missing = LANGS.filter(l => !row[LANG_FIELDS[l]]?.trim())
      const translators: Record<string,string> = {}
      ;['ES','EN','DE','PT','FR','IT'].forEach(l => {
        const tf = TRANSLATOR_FIELDS[l]
        if (row[tf]?.full_name) translators[l] = row[tf].full_name
      })
      return { id: row.id, public_id: row.public_id, citat_ro: row.citat_ro, autor_original: row.autor_original, missing_langs: missing, translators }
    })
    setCitateIncomp(incompCitate)
    setCitateROIncomp(ro || [])
  }

  useEffect(() => { fetchData(); fetchRefPanels() }, [])

  const assignedUserIds = records.filter(r => !r.trimis).map(r => r.traducator).filter(Boolean) as string[]
  const availableUsers = allUsers.filter(u => !assignedUserIds.includes(u.id))

  const handleSave = async () => {
    if (!traducator || !dinZiua || !panaZiua) { setFormError('Traducătorul și datele sunt obligatorii.'); return }
    setSaving(true); setFormError(null)
    const { data: { user } } = await supabase.auth.getUser()
    let createdBy = null
    if (user) { const { data: p } = await supabase.from('users').select('id').eq('auth_user_id', user.id).single(); createdBy = p?.id }
    const { error } = await supabase.from('mail_tlp').insert({ traducator, din_ziua: dinZiua, pana_ziua: panaZiua, citate_lipsesc: citateLipsesc || null, created_by: createdBy })
    if (error) { setFormError(error.message); setSaving(false); return }
    setTraducator(''); setDinZiua(''); setPanaZiua(''); setCitateLipsesc('')
    setSaving(false); fetchData()
  }

  const addId = (id: string) => {
    const ids = citateLipsesc.split(',').map(s => s.trim()).filter(Boolean)
    if (!ids.includes(id)) setCitateLipsesc([...ids, id].join(', '))
  }

  const sendEmail = async (record: MailRecord) => {
    if (!record.traducator_user || !record.citate_lipsesc) return
    setSendingId(record.id)
    const fromEmail = currentUser?.email ?? 'echipa@tptranslator.com'
    const fromName  = currentUser?.full_name ?? 'Echipa TP Translator'
    const fromRole = currentUser?.role ?? 'Coordonator'
    const html = generateEmailHtml(record.traducator_user.full_name, record.din_ziua, record.pana_ziua, record.citate_lipsesc, fromName, fromEmail, record.traducator_user.language, fromRole)
    const res = await fetch('/api/send-email', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: record.traducator_user.email, toName: record.traducator_user.full_name, type: 'custom', htmlBody: html, subject: 'Citate nefinalizate - TP Translator', fromEmail, fromName }),
    })
    if (res.ok) {
      await supabase.from('mail_tlp').update({ trimis: true, trimis_at: new Date().toISOString(), trimis_de: currentUser?.id }).eq('id', record.id)
      setSentIds(p => [...p, record.id])
      setEmailAlert({ name: record.traducator_user.full_name, email: record.traducator_user.email })
      setTimeout(() => { setSentIds(p => p.filter(id => id !== record.id)); fetchData() }, 2000)
    }
    setSendingId(null)
  }

  const sendAll = async () => {
    setSendingAll(true)
    const pending = records.filter(r => !r.trimis)
    for (const r of pending) if (r.traducator_user && r.citate_lipsesc) await sendEmail(r)
    setSendingAll(false); fetchData()
  }

  const handleResizeH = useCallback((dx: number) => {
    setLeftWidth(w => Math.max(300, Math.min(700, w + dx)))
  }, [])

  const handleResizeV = useCallback((dy: number) => {
    setRightTopHeight(h => Math.max(20, Math.min(80, h + dy / 6)))
  }, [])

  const fmt = (d: string) => new Date(d).toLocaleDateString('ro-RO', { day:'2-digit', month:'short', year:'numeric' })
  const pendingRecords = records.filter(r => !r.trimis)
  const sentRecords    = records.filter(r => r.trimis)

  const filteredCitate   = citateIncomp.filter(c => !searchCitate || c.public_id.toLowerCase().includes(searchCitate.toLowerCase()) || c.citat_ro?.toLowerCase().includes(searchCitate.toLowerCase()))
  const filteredCitateRO = citateROIncomp.filter(c => !searchCitateRO || c.public_id.toLowerCase().includes(searchCitateRO.toLowerCase()) || c.text_original?.toLowerCase().includes(searchCitateRO.toLowerCase()))

  return (
    <main className="flex h-screen overflow-hidden bg-[#f9f7f5]">
      <Sidebar />
      <div className="flex-1 w-0 flex flex-col overflow-x-hidden">

        {/* Header */}
        <div className="flex-shrink-0 px-4 pt-6 pb-4 md:px-8 md:pt-7 md:pb-5 border-b border-[#f0e9e5] bg-[#f9f7f5]">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-[11px] font-semibold text-[#9c8e87] uppercase tracking-[0.15em] mb-2">Coordonare traduceri</p>
              <h1 className="text-[36px] md:text-[44px] leading-none tracking-tight font-light text-[#111] mb-3">Mail TLP / TLG</h1>
              <div className="w-10 h-[3px] rounded-full bg-[#ce0100] mb-3" />
              <p className="text-sm font-light text-[#666]">Trimite reminder-uri personalizate traducătorilor cu citatele lipsă.</p>
            </div>
            <div className="flex flex-col gap-3 md:items-end md:mt-1">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-[11px] text-[#aaa] font-light">Înregistrări active</p>
                  <p className="text-2xl font-light text-[#111] leading-none">{records.length}</p>
                </div>
                <div className="w-px h-10 bg-[#f0e9e5]" />
                <div>
                  <p className="text-[11px] text-[#aaa] font-light">În așteptare</p>
                  <p className="text-2xl font-light text-[#c05c00] leading-none">{pendingRecords.length}</p>
                </div>
                <div className="w-px h-10 bg-[#f0e9e5]" />
                <div>
                  <p className="text-[11px] text-[#aaa] font-light">Trimise</p>
                  <p className="text-2xl font-light text-[#166534] leading-none">{records.filter(r => r.trimis).length}</p>
                </div>
              </div>
              {canManage && pendingRecords.length > 0 && (
                <button onClick={sendAll} disabled={sendingAll}
                  className="h-10 px-6 rounded-xl bg-[#ce0100] text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(206,1,0,0.22)] hover:bg-[#a80000] disabled:opacity-60 transition-all w-full md:w-auto">
                  <PaperAirplaneIcon className="w-4 h-4" />
                  {'TLG ' + (sendingAll ? 'Se trimite...' : 'Trimite tuturor (' + pendingRecords.length + ')')}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile tabs */}
        <div className="flex md:hidden items-center gap-1.5 px-4 pt-4 pb-0">
          {(['lista', 'formular', 'referinta'] as const).map(tab => (
            <button key={tab} onClick={() => setMobileTab(tab)}
              className={`h-8 px-4 rounded-xl text-[11px] font-semibold flex-1 transition-all capitalize ${
                mobileTab === tab ? 'bg-[#ce0100] text-white' : 'bg-white border border-[#e8e2de] text-[#666]'
              }`}>
              {tab === 'lista' ? 'Listă' : tab === 'formular' ? 'Formular' : 'Referință'}
            </button>
          ))}
        </div>

        {/* Main split layout — desktop horizontal, mobile tabbed */}
        <div className="flex-1 flex overflow-hidden">

          {/* LEFT — Records + Form */}
          <div
            style={{ width: typeof window !== 'undefined' && window.innerWidth >= 768 ? leftWidth : undefined }}
            className={`${mobileTab !== 'lista' && mobileTab !== 'formular' ? 'hidden' : ''} md:flex md:flex-col md:flex-shrink-0 overflow-x-hidden bg-[#f9f7f5] w-full md:w-auto`}>

            {/* New record form */}
            {canManage && (
              <div className={`${mobileTab === 'lista' ? 'hidden md:block' : ''} flex-shrink-0 p-5 border-b border-[#f0e9e5]`}>
                <p className="text-[11px] font-semibold text-[#888] uppercase tracking-wide mb-3">Înregistrare nouă</p>
                <div className="bg-white border border-[#e8e2de] rounded-2xl p-4 flex flex-col gap-3">
                  <select value={traducator} onChange={e => setTraducator(e.target.value)}
                    className={`w-full h-10 rounded-xl border px-3 text-sm text-[#111] outline-none focus:border-[#ce0100] transition-all bg-white ${!traducator ? 'border-[#ffd3d3]' : 'border-[#f0e9e5]'}`}>
                    <option value="">-- Selecteaza traducatorul --</option>
                    {availableUsers.map(u => <option key={u.id} value={u.id}>{u.full_name} ({u.language})</option>)}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" value={dinZiua} onChange={e => setDinZiua(e.target.value)}
                      className="w-full h-10 rounded-xl border border-[#f0e9e5] px-3 text-sm text-[#111] outline-none focus:border-[#ce0100] transition-all" />
                    <input type="date" value={panaZiua} onChange={e => setPanaZiua(e.target.value)}
                      className="w-full h-10 rounded-xl border border-[#f0e9e5] px-3 text-sm text-[#111] outline-none focus:border-[#ce0100] transition-all" />
                  </div>
                  <div>
                    <textarea value={citateLipsesc} onChange={e => setCitateLipsesc(e.target.value)} rows={2}
                      placeholder="ID-uri lipsa (CT001, CT002...)"
                      className="w-full rounded-xl border border-[#f0e9e5] px-3 py-2 text-sm text-[#111] resize-none outline-none focus:border-[#ce0100] transition-all placeholder:text-[#ccc]" />
                    <p className="text-[10px] text-[#bbb] mt-1">Apasă pe un ID din panoul din dreapta pentru a-l adăuga automat</p>
                  </div>
                  {formError && <p className="text-xs text-[#ce0100] font-medium">{formError}</p>}
                  <button onClick={handleSave} disabled={saving}
                    className="h-10 rounded-xl bg-[#ce0100] text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(206,1,0,0.22)] hover:bg-[#a80000] disabled:opacity-50 transition-all">
                    <PlusIcon className="w-4 h-4" />
                    {saving ? 'Se salvează...' : 'Adaugă înregistrare'}
                  </button>
                </div>
              </div>
            )}

            {/* Records list */}
            <div className={`${mobileTab === 'formular' ? 'hidden md:block' : ''} flex-1 overflow-y-auto p-4 md:p-5 flex flex-col gap-3`}>
              {pendingRecords.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-[#888] uppercase tracking-wide mb-2">În așteptare · {pendingRecords.length}</p>
                  {pendingRecords.map(record => (
                    <RecordCard key={record.id} record={record} canManage={canManage}
                      isSending={sendingId === record.id} isSent={sentIds.includes(record.id)}
                      onSend={() => sendEmail(record)} onDelete={() => setDeleteItem(record)} fmt={fmt} />
                  ))}
                </div>
              )}
              {sentRecords.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-[#888] uppercase tracking-wide mb-2 mt-2">Trimise · {sentRecords.length}</p>
                  {sentRecords.map(record => (
                    <RecordCard key={record.id} record={record} canManage={canManage}
                      isSending={false} isSent={false}
                      onSend={() => {}} onDelete={() => setDeleteItem(record)} fmt={fmt} />
                  ))}
                </div>
              )}
              {!loading && records.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm font-light text-[#888]">Nicio înregistrare</p>
                  <p className="text-xs text-[#bbb] mt-1">Adaugă primul reminder folosind formularul de mai sus.</p>
                </div>
              )}
            </div>
          </div>

          {/* HORIZONTAL DIVIDER — desktop only */}
          <div className="hidden md:block">
            <ResizableDivider onResize={handleResizeH} />
          </div>

          {/* RIGHT — Reference panels */}
          <div className={`${mobileTab !== 'referinta' ? 'hidden' : ''} md:flex flex-1 min-w-0 flex-col overflow-x-hidden`}>

            {/* TOP — Citate incomplete */}
            <div style={{ height: `${rightTopHeight}%` }} className="flex flex-col overflow-x-hidden">
              <div className="flex-shrink-0 px-4 md:px-5 py-3 border-b border-[#f0e9e5] flex items-center justify-between bg-white gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-[#9c8e87] uppercase tracking-[0.12em]">Citate · idiomas lipsă</p>
                  <p className="text-sm font-light text-[#111]">{filteredCitate.length} <span className="text-[#9c8e87] hidden sm:inline">· apasă ID pentru a-l adăuga</span></p>
                </div>
                <div className="flex items-center gap-2 bg-[#f9f7f5] border border-[#e8e2de] rounded-lg px-3 h-8 w-36 md:w-48 flex-shrink-0">
                  <MagnifyingGlassIcon className="w-3.5 h-3.5 text-[#999] flex-shrink-0" />
                  <input type="text" placeholder="Caută..." value={searchCitate} onChange={e => setSearchCitate(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-xs placeholder:text-[#ccc]" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto bg-white">
                {filteredCitate.map((c, i) => (
                  <div key={c.id} className="px-5 py-3 hover:bg-[#faf7f5] transition-colors"
                    style={{ borderBottom: i < filteredCitate.length-1 ? '1px solid #f8f3f0' : 'none' }}>
                    <div className="flex items-start gap-3">
                      {/* Clickable ID */}
                      <button onClick={() => addId(c.public_id)}
                        className="text-[12px] font-bold text-[#ce0100] hover:bg-[#fff4f4] px-2 py-0.5 rounded-lg transition-all flex-shrink-0 border border-transparent hover:border-[#ffd3d3]"
                        title="Click pentru a adăuga în câmpul de ID-uri">
                        {c.public_id}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-[#555] truncate font-light">{c.citat_ro || '—'}</p>
                        <p className="text-[10px] text-[#aaa] mt-0.5">— {c.autor_original}</p>
                      </div>
                    </div>
                    {/* Missing langs + translators */}
                    <div className="flex flex-wrap gap-1.5 mt-2 ml-[52px]">
                      {c.missing_langs.map(lang => (
                        <span key={lang} className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 h-[18px] rounded-full bg-[#fff4f4] text-[#ce0100] border border-[#ffd3d3]">
                          {lang}
                          {c.translators[lang] && <span className="font-normal text-[#888]">· {c.translators[lang].split(' ')[0]}</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {filteredCitate.length === 0 && <p className="text-center py-8 text-xs text-[#bbb]">Nicio cită incompletă.</p>}
              </div>
            </div>

            {/* VERTICAL DIVIDER */}
            <VerticalDivider onResize={handleResizeV} />

            {/* BOTTOM — Citate RO incomplete */}
            <div style={{ height: `${100 - rightTopHeight}%` }} className="flex flex-col overflow-x-hidden">
              <div className="flex-shrink-0 px-4 md:px-5 py-3 border-b border-[#f0e9e5] flex items-center justify-between bg-white gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-[#9c8e87] uppercase tracking-[0.12em]">Citate RO · fără traducere</p>
                  <p className="text-sm font-light text-[#111]">{filteredCitateRO.length} <span className="text-[#9c8e87] hidden sm:inline">· apasă ID pentru a-l adăuga</span></p>
                </div>
                <div className="flex items-center gap-2 bg-[#f9f7f5] border border-[#e8e2de] rounded-lg px-3 h-8 w-36 md:w-48 flex-shrink-0">
                  <MagnifyingGlassIcon className="w-3.5 h-3.5 text-[#999] flex-shrink-0" />
                  <input type="text" placeholder="Caută..." value={searchCitateRO} onChange={e => setSearchCitateRO(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-xs placeholder:text-[#ccc]" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto bg-white">
                {filteredCitateRO.map((c, i) => (
                  <div key={c.id} className="px-5 py-3 hover:bg-[#faf7f5] transition-colors"
                    style={{ borderBottom: i < filteredCitateRO.length-1 ? '1px solid #f8f3f0' : 'none' }}>
                    <div className="flex items-start gap-3">
                      <button onClick={() => addId(c.public_id)}
                        className="text-[12px] font-bold text-[#ec4899] hover:bg-[#fdf2f8] px-2 py-0.5 rounded-lg transition-all flex-shrink-0 border border-transparent hover:border-[#fbcfe8]"
                        title="Click para añadir al campo de IDs">
                        {c.public_id}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-[#555] truncate font-light">{c.text_original}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[10px] text-[#aaa]">— {c.autor_original}</p>
                          {(c as any).traducator_ro_user?.full_name && (
                            <span className="text-[10px] text-[#888] bg-[#f9f7f5] px-1.5 rounded">
                              {(c as any).traducator_ro_user.full_name.split(' ')[0]}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold px-2 h-[18px] inline-flex items-center rounded-full bg-[#fff5eb] text-[#c05c00] flex-shrink-0">RO</span>
                    </div>
                  </div>
                ))}
                {filteredCitateRO.length === 0 && <p className="text-center py-8 text-xs text-[#bbb]">Nicio cită RO incompletă.</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <DeleteModal item={deleteItem} onClose={() => setDeleteItem(null)} onDeleted={fetchData} />

      {emailAlert && (
        <EmailSentAlert
          recipientName={emailAlert.name}
          recipientEmail={emailAlert.email}
          senderEmail={currentUser?.email ?? ''}
          onClose={() => setEmailAlert(null)}
        />
      )}
    </main>
  )
}

// ── Record Card ───────────────────────────────────────────────────
function RecordCard({ record, canManage, isSending, isSent, onSend, onDelete, fmt }: {
  record: MailRecord; canManage: boolean; isSending: boolean; isSent: boolean
  onSend: ()=>void; onDelete: ()=>void; fmt: (d:string)=>string
}) {
  const ids = record.citate_lipsesc?.split(',').map(s => s.trim()).filter(Boolean) ?? []
  const [copied, setCopied] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [copiedEchipa, setCopiedEchipa] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const copyRef = useRef<HTMLDivElement>(null)

  const handleCopy = () => {
    if (!copyRef.current) return
    const range = document.createRange()
    range.selectNode(copyRef.current)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
    document.execCommand('copy')
    selection?.removeAllRanges()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(record.traducator_user?.email ?? '')
    setCopiedEmail(true)
    setTimeout(() => setCopiedEmail(false), 2000)
  }

  const handleCopyEchipa = () => {
    navigator.clipboard.writeText('echipa@tptranslator.com')
    setCopiedEchipa(true)
    setTimeout(() => setCopiedEchipa(false), 2000)
  }

  const name = record.traducator_user?.full_name?.split(' ')[0] ?? ''
  const lang = record.traducator_user?.language ?? ''
  const dateRange = `${fmt(record.din_ziua)} — ${fmt(record.pana_ziua)}`
  const idList = ids.join(', ')

  return (
    <>
    <div className={`bg-white border border-[#e8e2de] rounded-xl mb-2 overflow-x-hidden ${record.trimis ? 'opacity-70' : ''}`}>
      <div className={`h-1 ${record.trimis ? 'bg-[#166534]' : 'bg-[#c05c00]'}`} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="text-sm font-semibold text-[#111]">{record.traducator_user?.full_name ?? '—'}</p>
            <p className="text-[11px] text-[#888]">{record.traducator_user?.email}</p>
            <span className="text-[10px] font-bold px-2 h-[16px] inline-flex items-center rounded-full bg-[#fff4f4] text-[#ce0100] border border-[#ffd3d3] mt-1">
              {record.traducator_user?.language}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {!record.trimis && canManage && (
              <button onClick={onSend} disabled={isSending || !record.citate_lipsesc}
                className={`h-8 px-3 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                  isSent ? 'bg-[#edfaf3] text-[#166534]' : 'bg-[#ce0100] text-white shadow-[0_3px_8px_rgba(206,1,0,0.2)] hover:bg-[#a80000] disabled:opacity-50'
                }`}>
                {isSent ? <><CheckSolid className="w-3 h-3"/>Trimis!</> : isSending ? '...' : <><PaperAirplaneIcon className="w-3 h-3"/>TLP</>}
              </button>
            )}
            {canManage && ids.length > 0 && (
              <button onClick={() => setShowModal(true)}
                className="h-8 px-3 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all border bg-white text-[#555] border-[#e8e2de] hover:bg-[#f9f7f5]">
                ⎘ Șablon
              </button>
            )}
            {canManage && (
              <button onClick={onDelete} className="h-8 w-8 rounded-lg bg-[#fff1f1] text-[#ce0100] flex items-center justify-center hover:bg-[#ffe0e0] transition-all">
                <TrashIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-[#666] mb-3 bg-[#faf7f5] rounded-lg px-3 py-1.5">
          <span>{fmt(record.din_ziua)}</span><span className="text-[#ccc]">—</span><span>{fmt(record.pana_ziua)}</span>
        </div>

        {ids.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {ids.map(id => (
              <span key={id} className="text-[10px] font-bold px-2 h-[20px] inline-flex items-center rounded-full bg-[#fff4f4] text-[#ce0100] border border-[#ffd3d3]">{id}</span>
            ))}
          </div>
        ) : <p className="text-[11px] text-[#ccc] italic">Niciun ID adăugat</p>}
        {record.trimis && record.trimis_de_user && (
          <div className="mt-3 pt-2 border-t border-[#f0e9e5] flex items-center gap-1.5">
            <CheckCircleIcon className="w-3.5 h-3.5 text-[#166534]" />
            <p className="text-[10px] text-[#166534]">Trimis de <strong>{record.trimis_de_user.full_name}</strong></p>
          </div>
        )}
      </div>

      {/* Hidden div for execCommand copy — renders the full styled email template */}
      <div ref={copyRef} style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div style={{ maxWidth: '600px', fontFamily: 'Helvetica, Arial, sans-serif', fontSize: '14px', color: '#2e2e2e', backgroundColor: '#f9f7f5', padding: '24px 16px' }}>

          {/* Header */}
          <div style={{ background: '#ce0100', borderRadius: '16px 16px 0 0', padding: '28px 32px' }}>
            <img src="https://res.cloudinary.com/dlgqpbpwu/image/upload/v1780344170/new_tpt_1_sxiu3b.png" alt="TP Translator" style={{ height: '32px', width: 'auto', display: 'block', marginBottom: '20px' }} />
            <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 300, color: '#fff', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
              Citate în așteptare<br />
              <span style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.85)', fontFamily: "'Times New Roman', Georgia, serif", fontWeight: 400 }}>pentru traducere.</span>
            </h1>
          </div>
          <div style={{ height: '4px', background: '#a80000' }} />

          {/* Body */}
          <div style={{ background: '#ffffff', padding: '32px', border: '1px solid #f0e9e5', borderTop: 'none', borderRadius: '0 0 16px 16px' }}>
            <p style={{ margin: '0 0 20px', fontSize: '17px', fontWeight: 600, color: '#ce0100' }}>Bună, {name}!</p>

            <p style={{ margin: '0 0 14px', fontSize: '14px', lineHeight: 1.75, color: '#444' }}>
              Îți mulțumim pentru contribuția ta la proiectul nostru de traduceri.<br />
              Conform evidenței noastre, ai următoarele citate netraduse:
            </p>

            <div style={{ background: '#ce0100', color: '#fff', padding: '10px 16px', fontWeight: 700, borderRadius: '8px', margin: '20px 0 10px' }}>
              CITATELE CARE LIPSESC DE TRADUS [{lang}]<br />
              <span style={{ fontWeight: 400, fontSize: '13px' }}>{dateRange}</span>
            </div>

            <div style={{ background: '#faf7f5', border: '1px solid #f0e9e5', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', textAlign: 'center', fontSize: '15px', fontWeight: 700, color: '#ce0100', letterSpacing: '0.05em' }}>
              {idList}
            </div>

            <p style={{ margin: '0 0 14px', fontSize: '14px', lineHeight: 1.75, color: '#444' }}>
              Te rugăm să le traduci în măsura în care timpul îți permite, având în vedere că termenul limită este de <strong style={{ color: '#111' }}>3 luni</strong>.
            </p>

            <p style={{ margin: '0 0 14px', fontSize: '14px', lineHeight: 1.75, color: '#444' }}>
              Traducerile pot fi transmise atât prin <strong style={{ color: '#ce0100' }}>WhatsApp</strong> cât și prin e-mail la adresa <a href="mailto:echipa@tptranslator.com" style={{ color: '#ce0100', textDecoration: 'none' }}>echipa@tptranslator.com</a>.
            </p>

            <p style={{ margin: '20px 0 0', fontSize: '14px', color: '#444' }}>
              Cu recunoștință,<br />
              <strong style={{ color: '#111' }}>Echipa TP Translator</strong>
            </p>
          </div>

          {/* GIF */}
          <div style={{ marginTop: '20px', borderRadius: '12px', overflow: 'hidden' }}>
            <img src="https://res.cloudinary.com/dlgqpbpwu/image/upload/v1780257817/Gif_TPT_2026_1_wl9try.gif" alt="TP Translator" style={{ width: '100%', display: 'block', borderRadius: '12px' }} />
          </div>

          <p style={{ margin: '16px 0 0', textAlign: 'center', fontSize: '11px', color: '#bbb' }}>
            © 2026 TP Translator · <a href="mailto:echipa@tptranslator.com" style={{ color: '#bbb', textDecoration: 'none' }}>echipa@tptranslator.com</a>
          </p>
        </div>
      </div>
    </div>

      {/* Șablon Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-[580px] bg-white rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.15)] overflow-hidden max-h-[90vh] flex flex-col">
            <div className="h-1 bg-[#ce0100]" />
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0e8e4] flex-shrink-0">
              <div>
                <p className="text-[11px] font-bold text-[#ce0100] tracking-widest uppercase mb-0.5">Șablon email</p>
                <h2 className="text-base font-semibold text-[#111]">{record.traducator_user?.full_name ?? '—'}</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-[#f9f7f5] flex items-center justify-center hover:bg-[#f0e8e4] transition-all">
                <XMarkIcon className="w-4 h-4 text-[#666]" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Preview */}
              <div>
                <label className="text-xs font-semibold text-[#888] uppercase tracking-wide block mb-2">Previzualizare email</label>
                <div className="bg-[#faf7f5] border border-[#e8e2de] rounded-xl p-4 text-sm leading-relaxed">
                  <p style={{ fontFamily: 'Helvetica,Arial,sans-serif', fontSize: '13px', color: '#555', marginBottom: '12px', lineHeight: '1.7' }}>
                    Bună, <strong style={{ color: '#111' }}>{name}</strong>!
                  </p>
                  <p style={{ fontFamily: 'Helvetica,Arial,sans-serif', fontSize: '13px', color: '#555', marginBottom: '12px', lineHeight: '1.7' }}>
                    Îți mulțumim pentru contribuția ta la proiectul nostru de traduceri.<br />
                    Conform evidenței noastre, ai următoarele citate netraduse:
                  </p>
                  <div style={{ background: '#ce0100', color: '#fff', padding: '8px 14px', borderRadius: '8px', marginBottom: '8px', fontSize: '12px', fontWeight: 700 }}>
                    CITATELE CARE LIPSESC DE TRADUS [{lang}] — {dateRange}
                  </div>
                  <div style={{ background: '#fff4f4', border: '1px solid #ffd3d3', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', textAlign: 'center', fontSize: '14px', fontWeight: 700, color: '#ce0100', letterSpacing: '0.05em' }}>
                    {idList}
                  </div>
                  <p style={{ fontFamily: 'Helvetica,Arial,sans-serif', fontSize: '13px', color: '#555', lineHeight: '1.7' }}>
                    Traducerile pot fi transmise prin <strong>WhatsApp</strong> sau la <strong style={{ color: '#ce0100' }}>echipa@tptranslator.com</strong>.
                  </p>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button onClick={handleCopy}
                  className={`flex-1 h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                    copied ? 'bg-[#166534] text-white' : 'bg-[#ce0100] text-white hover:bg-[#a80000] shadow-[0_4px_12px_rgba(206,1,0,0.22)]'
                  }`}>
                  {copied ? '✓ Copiat!' : '⎘ Copiați șablonul'}
                </button>
                <button onClick={handleCopyEmail}
                  className={`flex-1 h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all border ${
                    copiedEmail ? 'bg-[#166534] text-white border-transparent' : 'bg-white text-[#444] border-[#e8e2de] hover:bg-[#f9f7f5]'
                  }`}>
                  {copiedEmail ? '✓ Copiat!' : '@ Copiați emailul'}
                </button>
              </div>

              <button onClick={handleCopyEchipa}
                className={`w-full h-10 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all border ${
                  copiedEchipa ? 'bg-[#166534] text-white border-transparent' : 'bg-white text-[#ce0100] border-[#ffd3d3] hover:bg-[#fff1f1]'
                }`}>
                {copiedEchipa ? '✓ Copiat!' : '⎘ Copiați echipa@tptranslator.com'}
              </button>

              {/* Email preview */}
              {record.traducator_user?.email && (
                <div className="bg-[#f0f4ff] border border-[#c7d8ff] rounded-xl px-4 py-3">
                  <p className="text-[11px] font-semibold text-[#1e40af] uppercase tracking-wide mb-1">Email traducător</p>
                  <p className="text-xs text-[#444]">{record.traducator_user.email}</p>
                </div>
              )}

              {/* Instructions */}
              <div className="bg-[#fffdf0] border border-[#e8e2c0] rounded-xl p-4">
                <p className="text-[11px] font-bold text-[#888] uppercase tracking-wide mb-2">Instrucțiuni</p>
                <ul className="text-xs text-[#555] leading-relaxed space-y-1.5">
                  <li>1. Copiază <strong>Șablonul</strong> și lipește-l în corpul emailului.</li>
                  <li>2. În <strong>PARA / TO</strong> pune emailul traducătorului (butonul "@ Copiați emailul").</li>
                  <li>3. În <strong>CC sau CCO</strong> pune <strong className="text-[#ce0100]">echipa@tptranslator.com</strong>.</li>
                  <li>4. Subiect: <strong>Citate nefinalizate - TP Translator</strong></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}