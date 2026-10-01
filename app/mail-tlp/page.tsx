'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Sidebar from '@/components/Sidebar'
import AccessDenied from '@/components/AccessDenied'
import { useUser } from '@/context/UserContext'
import { supabase } from '@/lib/supabase'
import EmailSentAlert from '@/components/EmailSentAlert'
import {
  PlusIcon, XMarkIcon, PaperAirplaneIcon, TrashIcon,
  MagnifyingGlassIcon, CheckCircleIcon, ExclamationTriangleIcon,
  ArrowTopRightOnSquareIcon, ArrowsPointingInIcon, ChevronDownIcon,
  Squares2X2Icon, QueueListIcon, TableCellsIcon,
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
  data_asignarii?: string | null
}
type CitatROIncomplete = {
  id: string; public_id: string; text_original: string; autor_original: string
  traducator_ro_user?: { full_name: string } | null
  data_asignarii?: string | null
}

const LANGS = ['RO','ES','EN','DE','PT','FR','IT']
const LANG_FIELDS: Record<string, string> = {
  RO:'citat_ro', ES:'citat_es', EN:'citat_en', DE:'citat_de', PT:'citat_pt', FR:'citat_fr', IT:'citat_it'
}
const TRANSLATOR_FIELDS: Record<string, string> = {
  ES:'traductor_es', EN:'traductor_en', DE:'traductor_de', PT:'traductor_pt', FR:'traductor_fr', IT:'traductor_it'
}
// Columnas de la vista tabla: Traducător | Limbă | Perioadă | ID-uri | Acțiuni
const TABLE_COLS = 'minmax(150px,1.3fr) 52px 130px minmax(160px,2fr) 128px'
type ViewMode = 'card' | 'compact' | 'tabel'
type SortRef = 'id-asc' | 'id-desc' | 'date-desc' | 'date-asc'
const SORT_OPTIONS: { v: SortRef; label: string }[] = [
  { v: 'id-asc',    label: 'ID ↑' },
  { v: 'id-desc',   label: 'ID ↓' },
  { v: 'date-desc', label: 'Dată: noi' },
  { v: 'date-asc',  label: 'Dată: vechi' },
]
const idNum = (pid: string) => parseInt((pid ?? '').replace(/\D/g, ''), 10) || 0

// Ordena por número de ID o por data_asignarii (las que no tienen fecha van al final)
function sortRef<T extends { public_id: string; data_asignarii?: string | null }>(list: T[], mode: SortRef): T[] {
  return [...list].sort((a, b) => {
    if (mode === 'id-asc')  return idNum(a.public_id) - idNum(b.public_id)
    if (mode === 'id-desc') return idNum(b.public_id) - idNum(a.public_id)
    const da = a.data_asignarii ? new Date(a.data_asignarii).getTime() : null
    const db = b.data_asignarii ? new Date(b.data_asignarii).getTime() : null
    if (da === null && db === null) return idNum(a.public_id) - idNum(b.public_id)
    if (da === null) return 1
    if (db === null) return -1
    return mode === 'date-desc' ? db - da : da - db
  })
}

// Busca por ID, texto o fecha (sirve "08 sept", "08.09.2026" o "2026-09-08")
function matchRef(q: string, publicId: string, text: string | null | undefined, date: string | null | undefined) {
  if (!q) return true
  const needle = q.toLowerCase().trim()
  const hay = [publicId, text ?? '']
  if (date) {
    const d = new Date(date)
    hay.push(
      date.slice(0, 10),
      d.toLocaleDateString('ro-RO'),
      d.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' }),
      d.toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' }),
    )
  }
  return hay.some(h => h.toLowerCase().includes(needle))
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
// Los listeners se ponen en la ventana donde se arrastra (funciona también en la ventana emergente)
function startDrag(e: React.MouseEvent, axis: 'x' | 'y', onResize: (d: number) => void) {
  e.preventDefault()
  const win = (e.view as unknown as Window) || window
  const doc = win.document
  let last = axis === 'x' ? e.clientX : e.clientY
  doc.body.style.cursor = axis === 'x' ? 'col-resize' : 'row-resize'
  doc.body.style.userSelect = 'none'
  const onMove = (ev: MouseEvent) => {
    const cur = axis === 'x' ? ev.clientX : ev.clientY
    onResize(cur - last)
    last = cur
  }
  const onUp = () => {
    doc.body.style.cursor = ''
    doc.body.style.userSelect = ''
    win.removeEventListener('mousemove', onMove)
    win.removeEventListener('mouseup', onUp)
  }
  win.addEventListener('mousemove', onMove)
  win.addEventListener('mouseup', onUp)
}

function ResizableDivider({ onResize }: { onResize: (dx: number) => void }) {
  return (
    <div onMouseDown={e => startDrag(e, 'x', onResize)}
      className="w-[8px] h-full flex-shrink-0 cursor-col-resize flex items-center justify-center group relative"
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
  return (
    <div onMouseDown={e => startDrag(e, 'y', onResize)}
      className="h-[8px] flex-shrink-0 cursor-row-resize flex items-center justify-center group relative"
      style={{ background: 'transparent' }}>
      <div className="absolute inset-x-0 top-[3px] h-[1px] bg-[#e8e2de] group-hover:bg-[#ce0100] transition-colors" />
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-row gap-1 z-10">
        {[0,1,2,3,4].map(i => <div key={i} className="w-1 h-1 rounded-full bg-[#ce0100]" />)}
      </div>
    </div>
  )
}

// ── Ventana flotante (dentro de la página) ─────────────────────────
type SectionId = 'form' | 'list' | 'citate' | 'citateRO'
type Geo = { x: number; y: number; w: number; h: number }
const SECTION_TITLES: Record<SectionId, string> = {
  form: 'Înregistrare nouă', list: 'Înregistrări', citate: 'Citate · idiomas lipsă', citateRO: 'Citate RO',
}
const TITLEBAR_H = 36

function FloatingWindow({ title, geo, z, onFocus, onChange, onDock, onClose, children }: {
  title: string; geo: Geo; z: number
  onFocus: () => void; onChange: (g: Geo) => void; onDock: () => void; onClose: () => void
  children: React.ReactNode
}) {
  const drag = (e: React.PointerEvent, kind: 'move' | 'resize') => {
    if (kind === 'move' && (e.target as HTMLElement).closest('button')) return
    e.preventDefault()
    onFocus()
    const sx = e.clientX, sy = e.clientY, g0 = { ...geo }
    document.body.style.userSelect = 'none'
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy
      const vw = window.innerWidth, vh = window.innerHeight
      if (kind === 'move') {
        onChange({ ...g0,
          x: Math.max(-g0.w + 120, Math.min(vw - 120, g0.x + dx)),
          y: Math.max(0, Math.min(vh - TITLEBAR_H, g0.y + dy)) })
      } else {
        onChange({ ...g0, w: Math.max(280, g0.w + dx), h: Math.max(160, g0.h + dy) })
      }
    }
    const up = () => {
      document.body.style.userSelect = ''
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return createPortal(
    <div onPointerDownCapture={onFocus}
      style={{ position: 'fixed', left: geo.x, top: geo.y, width: geo.w, height: geo.h, zIndex: 80 + z }}
      className="bg-white rounded-2xl border border-[#e8e2de] shadow-[0_24px_70px_rgba(0,0,0,0.22)] flex flex-col overflow-hidden">
      <div onPointerDown={e => drag(e, 'move')} style={{ height: TITLEBAR_H }}
        className="flex-shrink-0 flex items-center justify-between gap-2 px-3 bg-[#faf7f5] border-b border-[#f0e9e5] cursor-move select-none">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-[#ce0100] flex-shrink-0" />
          <p className="text-[10px] font-semibold text-[#9c8e87] uppercase tracking-[0.12em] truncate">{title}</p>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button onClick={onDock} title="Readu în pagină"
            className="h-7 w-7 rounded-lg flex items-center justify-center text-[#888] hover:bg-white hover:text-[#ce0100] transition-all">
            <ArrowsPointingInIcon className="w-4 h-4" />
          </button>
          <button onClick={onClose} title="Închide"
            className="h-7 w-7 rounded-lg flex items-center justify-center text-[#888] hover:bg-white hover:text-[#ce0100] transition-all">
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 flex flex-col overflow-auto">{children}</div>
      {/* Esquina para redimensionar */}
      <div onPointerDown={e => drag(e, 'resize')} title="Trage pentru a redimensiona"
        className="absolute right-0 bottom-0 w-5 h-5 cursor-nwse-resize flex items-end justify-end p-1">
        <svg width="10" height="10" viewBox="0 0 10 10" stroke="#c9bdb7" strokeWidth="1.2">
          <line x1="9" y1="1" x2="1" y2="9" /><line x1="9" y1="5" x2="5" y2="9" />
        </svg>
      </div>
    </div>,
    document.body
  )
}

// ── Main ─────────────────────────────────────────────────────────
export default function MailTLPPage() {
  const { profile } = useUser()
  const userRole = profile?.role ?? ''
  const canAccess = ['Admin', 'Coordonator principal', 'Coordonator'].includes(userRole)

  if (!canAccess && userRole !== '') {
    return (
      <main className="flex h-[calc(100dvh-4rem-env(safe-area-inset-top))] md:h-dvh overflow-hidden bg-[#f9f7f5]">
        <Sidebar />
        <AccessDenied />
      </main>
    )
  }

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
  const [sortCitate, setSortCitate] = useState<SortRef>('id-asc')
  const [sortCitateRO, setSortCitateRO] = useState<SortRef>('id-asc')
  const [userMap, setUserMap] = useState<Record<string, string>>({})
  // public_id → data_asignarii (solo para ver en la app, no se envía en el mail)
  const [asignariMap, setAsignariMap] = useState<Record<string, string>>({})

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
  const [formHeight, setFormHeight] = useState<number | null>(null) // px, null = automático
  const formRef = useRef<HTMLDivElement | null>(null)
  const rightPanelRef = useRef<HTMLDivElement>(null)
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768
  const [mobileTab, setMobileTab] = useState<'lista' | 'formular' | 'referinta'>('lista')

  const canManage = currentUser?.role === 'Coordonator principal' || currentUser?.role === 'Admin' || currentUser?.role === 'Coordonator'

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

    // Fechas de asignación de cada cita que aparece en los registros
    const allIds = Array.from(new Set(
      (r || []).flatMap((rec: MailRecord) => (rec.citate_lipsesc ?? '').split(',').map(s => s.trim()).filter(Boolean))
    ))
    if (allIds.length > 0) {
      const [{ data: tDates }, { data: roDates }] = await Promise.all([
        (supabase.from('texts') as any).select('public_id, data_asignarii').in('public_id', allIds),
        (supabase.from('citate_ro') as any).select('public_id, data_asignarii').in('public_id', allIds),
      ])
      const aMap: Record<string, string> = {}
      ;[...(tDates || []), ...(roDates || [])].forEach((row: any) => {
        if (row?.public_id && row?.data_asignarii) aMap[row.public_id] = row.data_asignarii
      })
      setAsignariMap(aMap)
    }

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
      return { id: row.id, public_id: row.public_id, citat_ro: row.citat_ro, autor_original: row.autor_original, missing_langs: missing, translators, data_asignarii: row.data_asignarii ?? null }
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

  const [lastAdded, setLastAdded] = useState<string | null>(null)
  const addId = (id: string) => {
    const ids = citateLipsesc.split(',').map(s => s.trim()).filter(Boolean)
    if (!ids.includes(id)) setCitateLipsesc([...ids, id].join(', '))
    setLastAdded(id)
    setTimeout(() => setLastAdded(cur => (cur === id ? null : cur)), 1500)
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

  const handleResizeForm = useCallback((dy: number) => {
    setFormHeight(h => {
      const current = h ?? formRef.current?.offsetHeight ?? 300
      return Math.max(80, Math.min(700, current + dy))
    })
  }, [])

  const handleResizeV = useCallback((dy: number) => {
    // convierte los píxeles arrastrados en % real del panel, para que siga al ratón
    const total = rightPanelRef.current?.offsetHeight || 600
    setRightTopHeight(h => Math.max(15, Math.min(85, h + (dy / total) * 100)))
  }, [])

  const fmt = (d: string) => new Date(d).toLocaleDateString('ro-RO', { day:'2-digit', month:'short', year:'numeric' })
  const fmtShort = (d: string) => new Date(d).toLocaleDateString('ro-RO', { day:'2-digit', month:'short' })
  const pendingRecords = records.filter(r => !r.trimis)
  const sentRecords    = records.filter(r => r.trimis)

  // ── Secciones: anclada / ventana flotante / oculta ──
  const [secMode, setSecMode] = useState<Record<SectionId, 'docked' | 'float' | 'hidden'>>({
    form: 'docked', list: 'docked', citate: 'docked', citateRO: 'docked',
  })
  const [geos, setGeos] = useState<Partial<Record<SectionId, Geo>>>({})
  const [zOrder, setZOrder] = useState<SectionId[]>([])
  const sectionRefs = useRef<Partial<Record<SectionId, HTMLDivElement | null>>>({})

  // En móvil todo queda anclado (se usan las pestañas)
  const mode = (id: SectionId) => (isDesktop ? secMode[id] : 'docked')
  const docked = (id: SectionId) => mode(id) === 'docked'
  const bringToFront = (id: SectionId) => setZOrder(o => [...o.filter(x => x !== id), id])
  const setMode = (id: SectionId, m: 'docked' | 'float' | 'hidden') => setSecMode(s => ({ ...s, [id]: m }))

  // Abre la sección flotando exactamente donde y del tamaño que estaba
  const popOut = (id: SectionId) => {
    const el = sectionRefs.current[id]
    const r = el?.getBoundingClientRect()
    const vw = window.innerWidth, vh = window.innerHeight
    const w = Math.max(300, Math.round(r?.width ?? 480))
    const h = Math.min(vh - 20, Math.max(200, Math.round((r?.height ?? 420) + TITLEBAR_H)))
    const x = Math.min(Math.max(10, Math.round((r?.left ?? 100) + 24)), vw - w - 10)
    const y = Math.min(Math.max(10, Math.round((r?.top ?? 100) - TITLEBAR_H + 24)), vh - h - 10)
    setGeos(g => ({ ...g, [id]: { x, y, w, h } }))
    setMode(id, 'float')
    bringToFront(id)
  }

  const controls = (id: SectionId) => docked(id) ? (
    <div className="hidden md:flex items-center gap-0.5 flex-shrink-0">
      <button onClick={() => popOut(id)} title="Deschide în fereastră"
        className="h-7 w-7 rounded-lg flex items-center justify-center text-[#999] hover:bg-[#faf7f5] hover:text-[#ce0100] transition-all">
        <ArrowTopRightOnSquareIcon className="w-4 h-4" />
      </button>
      <button onClick={() => setMode(id, 'hidden')} title="Închide secțiunea"
        className="h-7 w-7 rounded-lg flex items-center justify-center text-[#999] hover:bg-[#faf7f5] hover:text-[#ce0100] transition-all">
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  ) : null

  const SECTION_IDS: SectionId[] = canManage ? ['form', 'list', 'citate', 'citateRO'] : ['list', 'citate', 'citateRO']
  const hiddenIds = SECTION_IDS.filter(id => mode(id) === 'hidden')
  const floatIds  = SECTION_IDS.filter(id => mode(id) === 'float')
  const formDocked = canManage && docked('form')
  const leftVisible  = formDocked || docked('list')
  const rightVisible = docked('citate') || docked('citateRO')

  // ── Lista de registros: vista, búsqueda, filtro, secciones plegables ──
  const [viewMode, setViewMode] = useState<ViewMode>('card')
  useEffect(() => {
    try {
      const v = localStorage.getItem('mailtlp_view')
      if (v === 'card' || v === 'compact' || v === 'tabel') setViewMode(v)
    } catch {}
  }, [])
  const changeView = (v: ViewMode) => {
    setViewMode(v)
    try { localStorage.setItem('mailtlp_view', v) } catch {}
  }
  const [searchRec, setSearchRec] = useState('')
  const [langFilter, setLangFilter] = useState('')
  const [collapsed, setCollapsed] = useState<{ pending: boolean; sent: boolean }>({ pending: false, sent: false })

  const matchRec = (r: MailRecord) => {
    if (langFilter && r.traducator_user?.language !== langFilter) return false
    if (!searchRec) return true
    const q = searchRec.toLowerCase()
    return (r.traducator_user?.full_name ?? '').toLowerCase().includes(q)
      || (r.traducator_user?.email ?? '').toLowerCase().includes(q)
      || (r.citate_lipsesc ?? '').toLowerCase().includes(q)
  }
  const shownPending = pendingRecords.filter(matchRec)
  const shownSent    = sentRecords.filter(matchRec)

  const renderSection = (key: 'pending' | 'sent', title: string, list: MailRecord[], color: string) => {
    if (list.length === 0) return null
    const isCollapsed = collapsed[key]
    const rows = list.map(record => (
      <RecordCard key={record.id} record={record} canManage={canManage} variant={viewMode}
        isSending={key === 'pending' && sendingId === record.id}
        isSent={key === 'pending' && sentIds.includes(record.id)}
        onSend={key === 'pending' ? () => sendEmail(record) : () => {}}
        onDelete={() => setDeleteItem(record)} fmt={fmt} asignariMap={asignariMap} />
    ))
    return (
      <div>
        <button onClick={() => setCollapsed(c => ({ ...c, [key]: !c[key] }))}
          className="flex items-center gap-1.5 text-[10px] font-semibold text-[#888] uppercase tracking-wide mb-2 hover:text-[#111] transition-colors">
          <ChevronDownIcon className={`w-3 h-3 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
          {title} · {list.length}
        </button>
        {!isCollapsed && (
          viewMode === 'tabel' ? (
            <div className="bg-white border border-[#e8e2de] rounded-xl overflow-x-auto">
              <div className="min-w-[620px]">
                <div className="grid gap-3 px-3 h-8 items-center bg-[#faf7f5] border-b border-[#f0e9e5] text-[10px] font-semibold text-[#9c8e87] uppercase tracking-wide"
                  style={{ gridTemplateColumns: TABLE_COLS }}>
                  <span>Traducător</span><span>Limbă</span><span>Perioadă</span><span>ID-uri</span><span className="text-right">Acțiuni</span>
                </div>
                {rows}
              </div>
            </div>
          ) : viewMode === 'compact' ? (
            <div className="bg-white border border-[#e8e2de] rounded-xl overflow-hidden">{rows}</div>
          ) : rows
        )}
      </div>
    )
  }

  const filteredCitate   = sortRef(citateIncomp.filter(c => matchRef(searchCitate, c.public_id, c.citat_ro, c.data_asignarii)), sortCitate)
  const filteredCitateRO = sortRef(citateROIncomp.filter(c => matchRef(searchCitateRO, c.public_id, c.text_original, c.data_asignarii)), sortCitateRO)

  // ── Contenido de cada sección (se pinta anclado o en ventana flotante) ──
  const formContent = (
    <div className="p-5">
                <div className={`flex items-center justify-between gap-2 mb-3 ${docked('form') ? '' : 'hidden'}`}>
                  <p className="text-[11px] font-semibold text-[#888] uppercase tracking-wide">Înregistrare nouă</p>
                  {controls('form')}
                </div>
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
  )

  const listContent = (
    <>
              {/* Toolbar: búsqueda, idioma, vista */}
              <div className="flex-shrink-0 px-4 md:px-5 pt-3 pb-2 flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2 bg-white border border-[#e8e2de] rounded-lg px-3 h-8 flex-1 min-w-[120px]">
                  <MagnifyingGlassIcon className="w-3.5 h-3.5 text-[#999] flex-shrink-0" />
                  <input type="text" placeholder="Caută traducător sau ID..." value={searchRec} onChange={e => setSearchRec(e.target.value)}
                    className="flex-1 min-w-0 bg-transparent outline-none text-xs placeholder:text-[#ccc]" />
                  {searchRec && (
                    <button onClick={() => setSearchRec('')} className="text-[#bbb] hover:text-[#666]"><XMarkIcon className="w-3.5 h-3.5" /></button>
                  )}
                </div>
                <select value={langFilter} onChange={e => setLangFilter(e.target.value)}
                  className="h-8 rounded-lg border border-[#e8e2de] bg-white px-2 text-xs text-[#555] outline-none focus:border-[#ce0100]">
                  <option value="">Toate</option>
                  {LANGS.filter(l => l !== 'RO').map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <div className="flex items-center bg-white border border-[#e8e2de] rounded-lg p-0.5">
                  {([
                    { v: 'card', Icon: Squares2X2Icon, t: 'Carduri' },
                    { v: 'compact', Icon: QueueListIcon, t: 'Compact' },
                    { v: 'tabel', Icon: TableCellsIcon, t: 'Tabel' },
                  ] as const).map(({ v, Icon, t }) => (
                    <button key={v} onClick={() => changeView(v)} title={t}
                      className={`h-7 w-7 rounded-md flex items-center justify-center transition-all ${viewMode === v ? 'bg-[#ce0100] text-white' : 'text-[#888] hover:bg-[#f9f7f5]'}`}>
                      <Icon className="w-4 h-4" />
                    </button>
                  ))}
                </div>
                {controls('list')}
              </div>

              <div className="flex-1 overflow-y-auto px-4 md:px-5 pb-4 flex flex-col gap-3">
                {renderSection('pending', 'În așteptare', shownPending, '#c05c00')}
                {renderSection('sent', 'Trimise', shownSent, '#166534')}
                {!loading && records.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <p className="text-sm font-light text-[#888]">Nicio înregistrare</p>
                    <p className="text-xs text-[#bbb] mt-1">Adaugă primul reminder folosind formularul de mai sus.</p>
                  </div>
                )}
                {!loading && records.length > 0 && shownPending.length === 0 && shownSent.length === 0 && (
                  <p className="text-center py-8 text-xs text-[#bbb]">Niciun rezultat pentru filtrul actual.</p>
                )}
              </div>
    </>
  )

  const citateContent = (
    <>
              <div className="flex-shrink-0 px-4 md:px-5 py-3 border-b border-[#f0e9e5] flex items-center justify-between flex-wrap bg-white gap-2">
                <div className="min-w-0 mr-auto">
                  <p className={`text-[10px] font-semibold text-[#9c8e87] uppercase tracking-[0.12em] ${docked('citate') ? '' : 'hidden'}`}>Citate · idiomas lipsă</p>
                  <p className="text-sm font-light text-[#111]">{filteredCitate.length} {lastAdded
                    ? <span className="text-[#166534] font-semibold">· ✓ {lastAdded} adăugat</span>
                    : <span className="text-[#9c8e87] hidden sm:inline">· apasă ID pentru a-l adăuga</span>}</p>
                </div>
                <div className="flex items-center gap-2 bg-[#f9f7f5] border border-[#e8e2de] rounded-lg px-3 h-8 w-32 md:w-44 min-w-0">
                  <MagnifyingGlassIcon className="w-3.5 h-3.5 text-[#999] flex-shrink-0" />
                  <input type="text" placeholder="ID, text sau dată..." value={searchCitate} onChange={e => setSearchCitate(e.target.value)}
                    className="flex-1 min-w-0 bg-transparent outline-none text-xs placeholder:text-[#ccc]" />
                  {searchCitate && (
                    <button onClick={() => setSearchCitate('')} className="text-[#bbb] hover:text-[#666]"><XMarkIcon className="w-3.5 h-3.5" /></button>
                  )}
                </div>
                <select value={sortCitate} onChange={e => setSortCitate(e.target.value as SortRef)} title="Ordonează"
                  className="h-8 rounded-lg border border-[#e8e2de] bg-[#f9f7f5] px-2 text-xs text-[#555] outline-none focus:border-[#ce0100] flex-shrink-0">
                  {SORT_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
                </select>
                {controls('citate')}
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
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[10px] text-[#aaa]">— {c.autor_original}</p>
                          {c.data_asignarii && (
                            <span className="text-[10px] text-[#888] bg-[#f9f7f5] px-1.5 rounded" title="Data asignării">
                              {fmtShort(c.data_asignarii)}
                            </span>
                          )}
                        </div>
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
    </>
  )

  const citateROContent = (
    <>
              <div className="flex-shrink-0 px-4 md:px-5 py-3 border-b border-[#f0e9e5] flex items-center justify-between flex-wrap bg-white gap-2">
                <div className="min-w-0 mr-auto">
                  <p className={`text-[10px] font-semibold text-[#9c8e87] uppercase tracking-[0.12em] ${docked('citateRO') ? '' : 'hidden'}`}>Citate RO · fără traducere</p>
                  <p className="text-sm font-light text-[#111]">{filteredCitateRO.length} {lastAdded
                    ? <span className="text-[#166534] font-semibold">· ✓ {lastAdded} adăugat</span>
                    : <span className="text-[#9c8e87] hidden sm:inline">· apasă ID pentru a-l adăuga</span>}</p>
                </div>
                <div className="flex items-center gap-2 bg-[#f9f7f5] border border-[#e8e2de] rounded-lg px-3 h-8 w-32 md:w-44 min-w-0">
                  <MagnifyingGlassIcon className="w-3.5 h-3.5 text-[#999] flex-shrink-0" />
                  <input type="text" placeholder="ID, text sau dată..." value={searchCitateRO} onChange={e => setSearchCitateRO(e.target.value)}
                    className="flex-1 min-w-0 bg-transparent outline-none text-xs placeholder:text-[#ccc]" />
                  {searchCitateRO && (
                    <button onClick={() => setSearchCitateRO('')} className="text-[#bbb] hover:text-[#666]"><XMarkIcon className="w-3.5 h-3.5" /></button>
                  )}
                </div>
                <select value={sortCitateRO} onChange={e => setSortCitateRO(e.target.value as SortRef)} title="Ordonează"
                  className="h-8 rounded-lg border border-[#e8e2de] bg-[#f9f7f5] px-2 text-xs text-[#555] outline-none focus:border-[#ce0100] flex-shrink-0">
                  {SORT_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
                </select>
                {controls('citateRO')}
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
                          {c.data_asignarii && (
                            <span className="text-[10px] text-[#888] bg-[#f9f7f5] px-1.5 rounded" title="Data asignării">
                              {fmtShort(c.data_asignarii)}
                            </span>
                          )}
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
    </>
  )

  const CONTENT: Record<SectionId, React.ReactNode> = {
    form: formContent, list: listContent, citate: citateContent, citateRO: citateROContent,
  }

  return (
    <main className="flex h-[calc(100dvh-4rem-env(safe-area-inset-top))] md:h-dvh overflow-hidden bg-[#f9f7f5]">
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
        <div className="flex-1 flex overflow-hidden relative">

          {/* LEFT — Form + Records */}
          {leftVisible && (
            <div
              style={{ width: isDesktop && rightVisible ? leftWidth : undefined }}
              className={`${mobileTab === 'referinta' ? 'hidden' : ''} md:flex md:flex-col ${rightVisible ? 'md:flex-shrink-0' : 'md:flex-1'} overflow-x-hidden bg-[#f9f7f5] w-full md:w-auto`}>

              {formDocked && (
                <div ref={el => { sectionRefs.current.form = el; formRef.current = el }}
                  style={{ height: isDesktop && formHeight !== null && docked('list') ? formHeight : undefined }}
                  className={`${mobileTab === 'lista' ? 'hidden md:block' : ''} ${docked('list') ? 'flex-shrink-0' : 'flex-1'} md:overflow-y-auto`}>
                  {formContent}
                </div>
              )}

              {/* VERTICAL DIVIDER formular / listă — desktop only */}
              {formDocked && docked('list') && (
                <div className="hidden md:block">
                  <VerticalDivider onResize={handleResizeForm} />
                </div>
              )}

              {docked('list') && (
                <div ref={el => { sectionRefs.current.list = el }}
                  className={`${mobileTab === 'formular' ? 'hidden md:flex' : 'flex'} flex-1 min-h-0 flex-col`}>
                  {listContent}
                </div>
              )}
            </div>
          )}

          {/* HORIZONTAL DIVIDER — desktop only */}
          {leftVisible && rightVisible && (
            <div className="hidden md:block">
              <ResizableDivider onResize={handleResizeH} />
            </div>
          )}

          {/* RIGHT — Citate + Citate RO */}
          {rightVisible && (
            <div ref={rightPanelRef}
              className={`${mobileTab !== 'referinta' ? 'hidden' : 'flex'} md:flex flex-1 min-w-0 flex-col overflow-x-hidden`}>
              {docked('citate') && (
                <div ref={el => { sectionRefs.current.citate = el }}
                  style={docked('citateRO') ? { height: `${rightTopHeight}%` } : undefined}
                  className={`${docked('citateRO') ? 'flex-shrink-0' : 'flex-1'} min-h-0 flex flex-col overflow-x-hidden`}>
                  {citateContent}
                </div>
              )}
              {docked('citate') && docked('citateRO') && <VerticalDivider onResize={handleResizeV} />}
              {docked('citateRO') && (
                <div ref={el => { sectionRefs.current.citateRO = el }}
                  className="flex-1 min-h-0 flex flex-col overflow-x-hidden">
                  {citateROContent}
                </div>
              )}
            </div>
          )}

          {/* Secciones cerradas: botones para volver a abrirlas */}
          {hiddenIds.length > 0 && (
            <div className="hidden md:flex absolute right-4 bottom-4 z-30 items-center gap-1.5 bg-white border border-[#e8e2de] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.10)] px-2.5 py-2">
              <span className="text-[10px] font-semibold text-[#9c8e87] uppercase tracking-wide mr-1">Secțiuni închise</span>
              {hiddenIds.map(id => (
                <button key={id} onClick={() => setMode(id, 'docked')} title="Redeschide"
                  className="h-7 px-2.5 rounded-lg bg-[#fff4f4] text-[#ce0100] text-[11px] font-semibold border border-[#ffd3d3] flex items-center gap-1 hover:bg-[#ffe9e9] transition-all">
                  <PlusIcon className="w-3 h-3" /> {SECTION_TITLES[id]}
                </button>
              ))}
            </div>
          )}

          {!leftVisible && !rightVisible && (
            <div className="hidden md:flex flex-1 items-center justify-center text-sm font-light text-[#bbb]">
              Toate secțiunile sunt în ferestre sau închise.
            </div>
          )}
        </div>
      </div>

      {/* Ventanas flotantes */}
      {floatIds.map(id => geos[id] && (
        <FloatingWindow key={id} title={SECTION_TITLES[id]} geo={geos[id]!}
          z={zOrder.indexOf(id) + 1}
          onFocus={() => { if (zOrder[zOrder.length - 1] !== id) bringToFront(id) }}
          onChange={g => setGeos(prev => ({ ...prev, [id]: g }))}
          onDock={() => setMode(id, 'docked')}
          onClose={() => setMode(id, 'hidden')}>
          {CONTENT[id]}
        </FloatingWindow>
      ))}

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
function RecordCard({ record, canManage, isSending, isSent, onSend, onDelete, fmt, asignariMap, variant = 'card' }: {
  record: MailRecord; canManage: boolean; isSending: boolean; isSent: boolean
  variant?: ViewMode
  onSend: ()=>void; onDelete: ()=>void; fmt: (d:string)=>string
  asignariMap: Record<string, string>
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

  const shortDate = (d: string) => new Date(d).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' })

  const actions = (small: boolean) => (
    <div className="flex items-center gap-1.5 justify-end flex-shrink-0">
      {!record.trimis && canManage && (
        <button onClick={onSend} disabled={isSending || !record.citate_lipsesc} title="Trimite TLP"
          className={`${small ? 'h-7 px-2' : 'h-8 px-3'} rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all ${
            isSent ? 'bg-[#edfaf3] text-[#166534]' : 'bg-[#ce0100] text-white shadow-[0_3px_8px_rgba(206,1,0,0.2)] hover:bg-[#a80000] disabled:opacity-50'
          }`}>
          {isSent ? <><CheckSolid className="w-3 h-3"/>{!small && 'Trimis!'}</> : isSending ? '...' : <><PaperAirplaneIcon className="w-3 h-3"/>TLP</>}
        </button>
      )}
      {canManage && ids.length > 0 && (
        <button onClick={() => setShowModal(true)} title="Șablon email"
          className={`${small ? 'h-7 px-2' : 'h-8 px-3'} rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all border bg-white text-[#555] border-[#e8e2de] hover:bg-[#f9f7f5]`}>
          ⎘{!small && ' Șablon'}
        </button>
      )}
      {canManage && (
        <button onClick={onDelete} title="Șterge"
          className={`${small ? 'h-7 w-7' : 'h-8 w-8'} rounded-lg bg-[#fff1f1] text-[#ce0100] flex items-center justify-center hover:bg-[#ffe0e0] transition-all`}>
          <TrashIcon className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )

  const idChip = (id: string) => (
    <span key={id} className="text-[10px] font-bold px-2 h-[20px] inline-flex items-center gap-1 rounded-full bg-[#fff4f4] text-[#ce0100] border border-[#ffd3d3]">
      {id}
      {asignariMap[id] && (
        <span className="font-normal text-[#888]" title="Data asignării">· {shortDate(asignariMap[id])}</span>
      )}
    </span>
  )

  const langChip = (
    <span className="text-[10px] font-bold px-2 h-[16px] inline-flex items-center rounded-full bg-[#fff4f4] text-[#ce0100] border border-[#ffd3d3] w-fit">
      {record.traducator_user?.language}
    </span>
  )
  const statusDot = <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${record.trimis ? 'bg-[#166534]' : 'bg-[#c05c00]'}`} />

  let body: React.ReactNode

  if (variant === 'tabel') {
    body = (
      <div className={`grid gap-3 px-3 py-2 items-center border-b border-[#f8f3f0] hover:bg-[#faf7f5] transition-colors ${record.trimis ? 'opacity-70' : ''}`}
        style={{ gridTemplateColumns: TABLE_COLS }}>
        <div className="min-w-0 flex items-center gap-2">
          {statusDot}
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-[#111] truncate">{record.traducator_user?.full_name ?? '—'}</p>
            <p className="text-[10px] text-[#999] truncate">
              {record.trimis && record.trimis_de_user ? `Trimis de ${record.trimis_de_user.full_name}` : record.traducator_user?.email}
            </p>
          </div>
        </div>
        {langChip}
        <span className="text-[11px] text-[#666] whitespace-nowrap">{shortDate(record.din_ziua)} — {shortDate(record.pana_ziua)}</span>
        <div className="flex flex-wrap gap-1">
          {ids.length > 0 ? ids.map(idChip) : <span className="text-[11px] text-[#ccc] italic">—</span>}
        </div>
        {actions(true)}
      </div>
    )
  } else if (variant === 'compact') {
    body = (
      <div className={`flex items-center gap-2 px-3 h-11 border-b border-[#f8f3f0] hover:bg-[#faf7f5] transition-colors ${record.trimis ? 'opacity-70' : ''}`}>
        {statusDot}
        <p className="text-[12px] font-semibold text-[#111] truncate min-w-0 flex-1">{record.traducator_user?.full_name ?? '—'}</p>
        {langChip}
        <span className="text-[10px] text-[#888] whitespace-nowrap hidden sm:inline">{shortDate(record.din_ziua)}–{shortDate(record.pana_ziua)}</span>
        <span className="text-[10px] font-bold px-2 h-[18px] inline-flex items-center rounded-full bg-[#fff4f4] text-[#ce0100] border border-[#ffd3d3] whitespace-nowrap cursor-default"
          title={ids.map(id => asignariMap[id] ? `${id} · ${shortDate(asignariMap[id])}` : id).join('\n')}>
          {ids.length} ID
        </span>
        {actions(true)}
      </div>
    )
  } else {
    body = (
      <div className={`bg-white border border-[#e8e2de] rounded-xl mb-2 overflow-x-hidden ${record.trimis ? 'opacity-70' : ''}`}>
        <div className={`h-1 ${record.trimis ? 'bg-[#166534]' : 'bg-[#c05c00]'}`} />
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#111]">{record.traducator_user?.full_name ?? '—'}</p>
              <p className="text-[11px] text-[#888] truncate">{record.traducator_user?.email}</p>
              <div className="mt-1">{langChip}</div>
            </div>
            {actions(false)}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#666] mb-3 bg-[#faf7f5] rounded-lg px-3 py-1.5">
            <span>{fmt(record.din_ziua)}</span><span className="text-[#ccc]">—</span><span>{fmt(record.pana_ziua)}</span>
          </div>
          {ids.length > 0 ? (
            <div className="flex flex-wrap gap-1">{ids.map(idChip)}</div>
          ) : <p className="text-[11px] text-[#ccc] italic">Niciun ID adăugat</p>}
          {record.trimis && record.trimis_de_user && (
            <div className="mt-3 pt-2 border-t border-[#f0e9e5] flex items-center gap-1.5">
              <CheckCircleIcon className="w-3.5 h-3.5 text-[#166534]" />
              <p className="text-[10px] text-[#166534]">Trimis de <strong>{record.trimis_de_user.full_name}</strong></p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      {body}

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

      {/* Șablon Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-[580px] bg-white rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.15)] overflow-hidden max-h-[90dvh] flex flex-col">
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