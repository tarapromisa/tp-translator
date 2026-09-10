'use client'

import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import Pagination from '@/components/Pagination'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/context/UserContext'
import {
  MagnifyingGlassIcon, PencilSquareIcon, TrashIcon,
  XMarkIcon, PlusIcon, ExclamationTriangleIcon,
  Squares2X2Icon, TableCellsIcon, ListBulletIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckSolid } from '@heroicons/react/24/solid'
import { motion, AnimatePresence } from 'framer-motion'

type CitatRO = {
  id: string
  public_id: string
  text_original: string
  autor_original: string
  status: string
  traducator_ro: string | null
  citat_ro?: string | null
  data_asignarii?: string | null
  data_limita?: string | null
  tip?: string | null
  created_at: string
  traducator_ro_user?: { full_name: string } | null
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const STATUS_STYLE: Record<string, { pill: string; dot: string }> = {
  'Completat': { pill: 'bg-[#edfaf3] text-[#166534]', dot: 'bg-[#166534]' },
  'Incomplet': { pill: 'bg-[#fff5eb] text-[#c05c00]', dot: 'bg-[#c05c00]' },
}

function StatusPill({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE['Incomplet']
  return (
    <span className={`inline-flex items-center gap-[5px] px-[10px] h-[24px] rounded-full text-[11px] font-semibold whitespace-nowrap ${s.pill}`}>
      <span className={`w-[4px] h-[4px] rounded-full flex-shrink-0 ${s.dot}`} />
      {status}
    </span>
  )
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return 'acum'
  if (diff < 3600) return `${Math.floor(diff/60)} min`
  if (diff < 86400) return `${Math.floor(diff/3600)}h`
  const d = Math.floor(diff/86400)
  if (d < 30) return `${d} zile`
  const m = Math.floor(d/30)
  if (m < 12) return `${m} luni`
  return `${Math.floor(m/12)} ani`
}

function CitatROModal({ item, users, onClose, onSaved, isCoordinator }: {
  item: CitatRO | null
  users: { id: string; full_name: string }[]
  onClose: () => void
  onSaved: () => void
  isCoordinator: boolean
}) {
  const isEdit = !!item
  const [textOriginal, setTextOriginal] = useState(item?.text_original ?? '')
  const [citatRo, setCitatRo] = useState<string>((item as any)?.citat_ro ?? '')
  const [autorOriginal, setAutorOriginal] = useState(item?.autor_original ?? '')
  const [traducatorRo, setTraducatorRo] = useState(item?.traducator_ro ?? '')
  const [dataAsignarii, setDataAsignarii] = useState(item?.data_asignarii ?? '')
  const [dataLimita, setDataLimita] = useState(item?.data_limita ?? '')
  const [tip, setTip] = useState<'CT' | 'SP' | 'TXT' | 'RE'>((item as any)?.tip ?? 'CT')
  const [lastDate, setLastDate] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [error, setError] = useState<string | null>(null)

  // For new items, fetch last used date and auto-fill
  useEffect(() => {
    if (isEdit || !isCoordinator) return
    supabase
      .from('citate_ro')
      .select('data_asignarii')
      .not('data_asignarii', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data?.data_asignarii) {
          setLastDate(data.data_asignarii)
          setDataAsignarii(data.data_asignarii)
          // Auto-fill limita = asignarii + 7 days
          const d = new Date(data.data_asignarii + 'T00:00:00')
          d.setDate(d.getDate() + 7)
          const limita = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
          setDataLimita(limita)
        }
      })
  }, [])

  const handleSave = async () => {
    if (isCoordinator && (!textOriginal.trim() || !autorOriginal.trim())) {
      setError('Textul și autorul sunt obligatorii.')
      return
    }
    setSaveState('saving')
    setError(null)

    let payload: any

    if (isCoordinator) {
      payload = {
        text_original: textOriginal.trim(),
        citat_ro: citatRo.trim() || null,
        autor_original: autorOriginal.trim(),
        traducator_ro: traducatorRo || null,
        data_asignarii: dataAsignarii || null,
        data_limita: dataLimita || null,
        tip,
      }
    } else {
      // Traducător RO — poate edita doar citat_ro
      payload = { citat_ro: citatRo.trim() || null }
    }

    const { error: e } = isEdit
      ? await supabase.from('citate_ro').update(payload).eq('id', item!.id)
      : await supabase.from('citate_ro').insert(payload)

    if (e) { setError(e.message); setSaveState('error'); return }
    setSaveState('saved')
    setTimeout(() => { onClose(); onSaved() }, 900)
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4"
      style={{ background: 'rgba(10,6,4,0.65)', backdropFilter: 'blur(10px)' }}
      onClick={(e) => { if (e.target === e.currentTarget && saveState !== 'saving') onClose() }}>
      <style>{`@keyframes mIn{from{opacity:0;transform:scale(.94) translateY(16px)}to{opacity:1;transform:scale(1) translateY(0)}}.m-in{animation:mIn .28s cubic-bezier(.22,1,.36,1) forwards}`}</style>
      <div className="m-in bg-white rounded-[32px] w-full max-w-[540px] overflow-x-hidden shadow-[0_48px_100px_rgba(0,0,0,0.22)] max-h-[90vh] overflow-y-auto">
        <div className="h-[4px] bg-[#ce0100] sticky top-0" />
        <div className="px-5 pt-6 pb-5 md:px-[40px] md:pt-[36px] md:pb-[32px]">
          <div className="flex items-start justify-between mb-[28px]">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.16em] text-[#ce0100] uppercase mb-[6px]">
                {isEdit ? 'Editează citat RO' : 'Citat nou RO'}
              </p>
              <h2 className="text-[22px] md:text-[26px] font-light text-[#111] tracking-tight">
                {isEdit ? item!.public_id : 'Adaugă un citat'}
              </h2>
            </div>
            <button onClick={onClose} disabled={saveState === 'saving'}
              className="w-[34px] h-[34px] rounded-full bg-[#faf7f5] border border-[#e8e2de] flex items-center justify-center hover:bg-[#ffe0e0] transition-all flex-shrink-0">
              <XMarkIcon className="w-[14px] h-[14px] text-[#555]" />
            </button>
          </div>

          <div className="flex flex-col gap-[16px] mb-[24px]">

            {/* Text original — vizibil pentru traducatori ca referinta */}
            {!isCoordinator && item?.text_original && (
              <div className="bg-[#faf7f5] border border-[#e8e2de] rounded-[14px] p-[14px]">
                <label className="text-[11px] font-semibold text-[#888] uppercase tracking-wide block mb-[8px]">
                  Text original
                </label>
                <p className="text-[14px] text-[#111] leading-relaxed italic">
                  "{item.text_original}"
                </p>
                {item.autor_original && (
                  <p className="text-[12px] text-[#888] mt-[6px]">— {item.autor_original}</p>
                )}
              </div>
            )}

            {/* Traducere RO — visible pentru toți */}
            <div>
              <label className="text-[11px] font-semibold text-[#666] uppercase tracking-wide block mb-[6px]">
                Traducere în română
              </label>
              <textarea value={citatRo} onChange={e => setCitatRo(e.target.value)} rows={4}
                placeholder="Introdu traducerea în română..."
                className="w-full rounded-[14px] border border-[#f0e9e5] px-[14px] py-[12px] text-[14px] text-[#111] resize-none outline-none focus:border-[#ce0100] focus:shadow-[0_0_0_3px_rgba(206,1,0,0.07)] transition-all placeholder:text-[#ccc] leading-relaxed" />
              <p className="text-[11px] text-[#999] mt-1">Lasă gol dacă traducerea nu a fost făcută încă — statusul va rămâne "Incomplet".</p>
            </div>

            {/* Câmpuri doar pentru coordonatori */}
            {isCoordinator && (
              <>
                {/* Tip citat */}
                <div>
                  <label className="text-[11px] font-semibold text-[#666] uppercase tracking-wide block mb-[6px]">
                    Tip citat <span className="text-[#ce0100]">*</span>
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['CT', 'SP', 'TXT', 'RE'] as const).map(t => (
                      <button key={t} type="button" onClick={() => setTip(t)}
                        className={`h-[40px] rounded-[12px] border-2 text-[13px] font-bold transition-all ${
                          tip === t
                            ? 'border-[#ce0100] bg-[#fff1f1] text-[#ce0100]'
                            : 'border-[#f0e9e5] text-[#666] hover:border-[#ffd3d3]'
                        }`}>
                        {t}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-[#aaa] mt-1.5">
                    {tip === 'CT' && 'Citat general — poate fi folosit în orice proiect CT'}
                    {tip === 'SP' && 'Citat special — doar pentru proiecte SP'}
                    {tip === 'TXT' && 'Text lung — transcrieri, predici etc.'}
                    {tip === 'RE' && 'Reminder — texte de reamintire'}
                  </p>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#666] uppercase tracking-wide block mb-[6px]">
                    Text original <span className="text-[#ce0100]">*</span>
                  </label>
                  <textarea value={textOriginal} onChange={e => setTextOriginal(e.target.value)} rows={4}
                    placeholder="Introdu citatul în limba originală..."
                    className="w-full rounded-[14px] border border-[#f0e9e5] px-[14px] py-[12px] text-[14px] text-[#111] resize-none outline-none focus:border-[#ce0100] focus:shadow-[0_0_0_3px_rgba(206,1,0,0.07)] transition-all placeholder:text-[#ccc] leading-relaxed" />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#666] uppercase tracking-wide block mb-[6px]">
                    Autor <span className="text-[#ce0100]">*</span>
                  </label>
                  <input value={autorOriginal} onChange={e => setAutorOriginal(e.target.value)}
                    placeholder="Numele autorului..."
                    className="w-full h-[46px] rounded-[14px] border border-[#f0e9e5] px-[14px] text-[14px] text-[#111] outline-none focus:border-[#ce0100] focus:shadow-[0_0_0_3px_rgba(206,1,0,0.07)] transition-all placeholder:text-[#ccc]" />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#666] uppercase tracking-wide block mb-[6px]">
                    Traducător RO <span className="text-[#ce0100]">*</span>
                  </label>
                  <select value={traducatorRo} onChange={e => setTraducatorRo(e.target.value)}
                    className={`w-full h-[40px] rounded-[12px] border px-[12px] text-[13px] text-[#111] outline-none focus:border-[#ce0100] transition-all bg-white ${
                      !traducatorRo ? 'border-[#ffd3d3]' : 'border-[#f0e9e5]'
                    }`}>
                    <option value="">— Selectează —</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                  </select>
                </div>

                {/* Date fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[#666] uppercase tracking-wide block mb-[6px]">
                      Dată asignare
                    </label>
                    <input type="date" value={dataAsignarii ?? ''} onChange={e => {
                      setDataAsignarii(e.target.value)
                      // Auto-update limita to +7 days when asignare changes
                      if (e.target.value) {
                        const d = new Date(e.target.value + 'T00:00:00')
                        d.setDate(d.getDate() + 7)
                        const limita = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
                        setDataLimita(limita)
                      }
                    }}
                      className="w-full h-[40px] rounded-[12px] border border-[#f0e9e5] px-[12px] text-[13px] text-[#111] outline-none focus:border-[#ce0100] transition-all" />
                    {!isEdit && lastDate && (
                      <p className="text-[10px] text-[#aaa] mt-1">Ultima folosită: {new Date(lastDate + 'T00:00:00').toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#666] uppercase tracking-wide block mb-[6px]">
                      Dată limită
                    </label>
                    <input type="date" value={dataLimita ?? ''} onChange={e => setDataLimita(e.target.value)}
                      className="w-full h-[40px] rounded-[12px] border border-[#f0e9e5] px-[12px] text-[13px] text-[#111] outline-none focus:border-[#ce0100] transition-all" />
                    {!isEdit && (
                      <p className="text-[10px] text-[#aaa] mt-1">Implicit: 7 zile după asignare</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {error && <p className="text-[12px] text-[#ce0100] mb-[12px] font-medium">{error}</p>}

          <div className="flex gap-[10px]">
            <button onClick={onClose} disabled={saveState === 'saving'}
              className="flex-1 h-[46px] rounded-[14px] border border-[#e8e2de] bg-white text-[13px] font-semibold text-[#666] hover:bg-[#faf7f5] disabled:opacity-40 transition-all">
              Anulează
            </button>
            <button onClick={handleSave} disabled={saveState === 'saving' || saveState === 'saved'}
              className={`flex-1 h-[46px] rounded-[14px] text-[13px] font-bold flex items-center justify-center gap-2 transition-all ${
                saveState === 'saved' ? 'bg-[#166534] text-white' :
                'bg-[#ce0100] text-white shadow-[0_6px_16px_rgba(206,1,0,0.25)] hover:bg-[#a80000] disabled:opacity-50'
              }`}>
              {saveState === 'saving' ? 'Se salvează...' :
               saveState === 'saved' ? <><CheckSolid className="w-4 h-4" />Salvat!</> :
               isEdit ? 'Salvează modificările' : 'Adaugă citatul'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function DeleteModal({ item, onClose, onDeleted }: {
  item: CitatRO | null; onClose: () => void; onDeleted: () => void
}) {
  const [loading, setLoading] = useState(false)
  if (!item) return null
  const handleDelete = async () => {
    setLoading(true)
    await supabase.from('citate_ro').delete().eq('id', item.id)
    setLoading(false)
    onDeleted()
    onClose()
  }
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4"
      style={{ background: 'rgba(10,6,4,0.65)', backdropFilter: 'blur(10px)' }}
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose() }}>
      <div className="bg-white rounded-[28px] w-full max-w-[400px] overflow-x-hidden shadow-[0_32px_80px_rgba(0,0,0,0.2)]">
        <div className="h-[4px] bg-[#ce0100]" />
        <div className="px-5 pt-6 pb-5 md:px-[36px] md:pt-[32px] md:pb-[28px]">
          <div className="flex justify-center mb-[18px]">
            <div className="w-[60px] h-[60px] rounded-full bg-[#fff1f1] border-[2px] border-[#f4d4d4] flex items-center justify-center">
              <ExclamationTriangleIcon className="w-[26px] h-[26px] text-[#ce0100]" />
            </div>
          </div>
          <h3 className="text-[18px] font-semibold text-[#111] text-center mb-[6px]">Ștergi citatul?</h3>
          <p className="text-[13px] text-[#666] text-center mb-[6px]"><strong className="text-[#ce0100]">{item.public_id}</strong></p>
          <p className="text-[12px] text-[#888] text-center mb-[24px] line-clamp-2 italic">"{item.text_original}"</p>
          <div className="flex gap-[10px]">
            <button onClick={onClose} disabled={loading}
              className="flex-1 h-[44px] rounded-[14px] border border-[#e8e2de] bg-white text-[13px] font-semibold text-[#666] hover:bg-[#faf7f5] disabled:opacity-40 transition-all">
              Anulează
            </button>
            <button onClick={handleDelete} disabled={loading}
              className="flex-1 h-[44px] rounded-[14px] bg-[#ce0100] text-white text-[13px] font-bold flex items-center justify-center shadow-[0_6px_16px_rgba(206,1,0,0.3)] hover:bg-[#a80000] disabled:opacity-70 transition-all">
              {loading ? 'Se șterge...' : 'Da, șterge'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


type ViewMode = 'cards' | 'table' | 'compact'
type SortField = 'created_at' | 'public_id' | 'status'
type SortDir = 'asc' | 'desc'

export default function CitateROPage() {
  const { profile } = useUser()
  const role = profile?.role ?? ''
  const isCoordinator = ['Admin', 'Coordonator principal', 'Coordonator'].includes(role)
  const isTraducatorRO = role === 'Traducător' && profile?.language === 'RO'

  const [items, setItems] = useState<CitatRO[]>([])
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [tipFilter, setTipFilter] = useState<string>('all')
  const [traducatorFilter, setTraducatorFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [selectedItem, setSelectedItem] = useState<CitatRO | null>(null)
  const [editItem, setEditItem] = useState<CitatRO | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleteItem, setDeleteItem] = useState<CitatRO | null>(null)
  const [mobileTab, setMobileTab] = useState<'lista' | 'detalii'>('lista')
  const [page, setPage] = useState(1)
  const PER_PAGE = 20

  const fetchData = async () => {
    setLoading(true)
    let query = supabase
      .from('citate_ro')
      .select('*, traducator_ro_user:traducator_ro(full_name), citat_ro, data_asignarii, data_limita, tip')

    if (isTraducatorRO && profile?.id) {
      query = query.eq('traducator_ro', profile.id)
    }

    const { data } = await query
    setItems(data || [])

    const { data: u } = await supabase.from('users').select('id, full_name').eq('language', 'RO').eq('active', true)
    setUsers(u || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const filtered = items.filter(i => {
    const q = search.toLowerCase()
    if (q && !i.public_id?.toLowerCase().includes(q) &&
        !i.text_original?.toLowerCase().includes(q) &&
        !i.autor_original?.toLowerCase().includes(q) &&
        !(i as any).traducator_ro_user?.full_name?.toLowerCase().includes(q)) return false
    if (statusFilter !== 'all' && i.status !== statusFilter) return false
    if (tipFilter !== 'all' && (i as any).tip !== tipFilter) return false
    if (traducatorFilter !== 'all' && i.traducator_ro !== traducatorFilter) return false
    return true
  }).sort((a, b) => {
    let valA: any, valB: any
    if (sortField === 'public_id') { valA = a.public_id; valB = b.public_id }
    else if (sortField === 'status') { valA = a.status; valB = b.status }
    else { valA = a.created_at; valB = b.created_at }
    return sortDir === 'asc' ? valA?.localeCompare(valB) : valB?.localeCompare(valA)
  })

  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const stats = {
    total: items.length,
    complete: items.filter(i => i.status === 'Completat').length,
    incomplete: items.filter(i => i.status === 'Incomplet').length,
  }

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  const SortIcon = ({ field }: { field: SortField }) => (
    sortField !== field ? <span className="text-[#ddd]">↕</span> :
    sortDir === 'asc' ? <span className="text-[#ce0100]">↑</span> : <span className="text-[#ce0100]">↓</span>
  )

  return (
    <main className="flex h-screen overflow-hidden bg-[#f9f7f5]">
      <Sidebar />

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#f0e8e4] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="TP" className="h-8 w-auto" />
        </div>
        <div className="flex gap-2">
          {mobileTab === 'lista' && isCoordinator && (
            <button onClick={() => { setEditItem(null); setShowModal(true) }}
              className="h-9 px-3 rounded-xl bg-[#ce0100] text-white text-[12px] font-bold flex items-center gap-1.5">
              <PlusIcon className="w-3.5 h-3.5" /> Nou
            </button>
          )}
          {selectedItem && (
            <button onClick={() => setMobileTab(mobileTab === 'lista' ? 'detalii' : 'lista')}
              className="h-9 px-3 rounded-xl border border-[#e8e2de] text-[12px] font-semibold text-[#555]">
              {mobileTab === 'lista' ? 'Detalii' : 'Listă'}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row min-w-0 pt-[56px] md:pt-0">

        {/* Left panel — list */}
        <div className={`${mobileTab === 'detalii' ? 'hidden md:flex' : 'flex'} flex-col flex-1 min-w-0 md:max-w-[520px] md:border-r md:border-[#f0e8e4] overflow-hidden`}>

          {/* Header */}
          <div className="px-4 pt-5 pb-3 md:px-6 md:pt-7 flex-shrink-0">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-[32px] md:text-[40px] leading-none tracking-tight font-light text-[#111] mb-2">Citate RO</h1>
                <div className="w-8 h-[3px] rounded-full bg-[#ce0100]" />
              </div>
              {isCoordinator && (
                <button onClick={() => { setEditItem(null); setShowModal(true) }}
                  className="hidden md:flex h-10 px-5 rounded-xl bg-[#ce0100] text-white text-sm font-semibold shadow-[0_4px_12px_rgba(206,1,0,0.22)] hover:bg-[#a80000] transition-all items-center gap-2">
                  <PlusIcon className="w-4 h-4" /> Citat nou
                </button>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: 'Total', value: stats.total, color: '#111' },
                { label: 'Complete', value: stats.complete, color: '#166534' },
                { label: 'Incomplete', value: stats.incomplete, color: '#c05c00' },
              ].map(s => (
                <div key={s.label} className="bg-white border border-[#f0e8e4] rounded-xl px-3 py-2.5 text-center">
                  <p className="text-[20px] font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[10px] text-[#aaa] font-medium uppercase tracking-wide">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#bbb]" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Caută după ID, text sau autor..."
                className="w-full h-10 pl-9 pr-4 rounded-xl border border-[#f0e9e5] text-sm text-[#111] outline-none focus:border-[#ce0100] transition-all bg-white" />
            </div>

            {/* Filters row */}
            <div className="flex items-center gap-2 flex-wrap mb-3">
              {/* Status */}
              <div className="flex items-center bg-white border border-[#f0e9e5] rounded-xl overflow-hidden">
                {[['all','Toate'],['Completat','Complete'],['Incomplet','Incomplete']].map(([v,l]) => (
                  <button key={v} onClick={() => { setStatusFilter(v); setPage(1) }}
                    className={`h-8 px-3 text-[11px] font-semibold transition-all ${
                      statusFilter === v ? 'bg-[#ce0100] text-white' : 'text-[#666] hover:bg-[#faf7f5]'
                    }`}>{l}</button>
                ))}
              </div>

              {/* Tip */}
              <div className="flex items-center bg-white border border-[#f0e9e5] rounded-xl overflow-hidden">
                {[['all','Tip'],['CT','CT'],['SP','SP'],['TXT','TXT'],['RE','RE']].map(([v,l]) => (
                  <button key={v} onClick={() => { setTipFilter(v); setPage(1) }}
                    className={`h-8 px-2.5 text-[11px] font-semibold transition-all ${
                      tipFilter === v ? 'bg-[#ce0100] text-white' : 'text-[#666] hover:bg-[#faf7f5]'
                    }`}>{l}</button>
                ))}
              </div>

              {/* Traducator filter */}
              {isCoordinator && users.length > 0 && (
                <select value={traducatorFilter} onChange={e => { setTraducatorFilter(e.target.value); setPage(1) }}
                  className="h-8 px-2 rounded-xl border border-[#f0e9e5] text-[11px] text-[#555] bg-white outline-none cursor-pointer">
                  <option value="all">Toți</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              )}

              {/* View mode */}
              <div className="ml-auto flex items-center gap-1 bg-white border border-[#f0e9e5] rounded-xl p-0.5">
                {([['cards', Squares2X2Icon], ['table', TableCellsIcon], ['compact', ListBulletIcon]] as [ViewMode, any][]).map(([v, Icon]) => (
                  <button key={v} onClick={() => setViewMode(v)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                      viewMode === v ? 'bg-[#ce0100] text-white' : 'text-[#aaa] hover:text-[#555]'
                    }`}>
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                ))}
              </div>
            </div>

            {/* Sort row */}
            <div className="flex items-center gap-2 text-[11px] text-[#888]">
              <span>Sortează:</span>
              {([['created_at','Dată'],['public_id','ID'],['status','Stare']] as [SortField,string][]).map(([f,l]) => (
                <button key={f} onClick={() => toggleSort(f)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all ${
                    sortField === f ? 'bg-[#fff1f1] text-[#ce0100] font-semibold' : 'hover:bg-[#f9f7f5]'
                  }`}>
                  {l} <SortIcon field={f} />
                </button>
              ))}
              <span className="ml-auto text-[#bbb]">{filtered.length} rezultate</span>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-4">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <p className="text-[#888] text-sm">Se încarcă...</p>
              </div>
            ) : paginated.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <p className="text-3xl">📋</p>
                <p className="text-sm text-[#888]">Niciun citat găsit.</p>
              </div>
            ) : viewMode === 'cards' ? (
              <div className="flex flex-col gap-2">
                {paginated.map(item => (
                  <button key={item.id} onClick={() => { setSelectedItem(item); setMobileTab('detalii') }}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      selectedItem?.id === item.id ? 'border-[#ce0100] bg-[#fff7f7] shadow-sm' : 'border-[#f0e8e4] bg-white hover:border-[#ffd3d3]'
                    }`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-bold text-[#ce0100]">{item.public_id}</span>
                        {(item as any).tip && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#f0e8e4] text-[#7a6e69]">{(item as any).tip}</span>
                        )}
                      </div>
                      <StatusPill status={item.status} />
                    </div>
                    <p className="text-[13px] text-[#333] line-clamp-2 leading-snug mb-1">"{item.text_original}"</p>
                    <div className="flex items-center gap-3 text-[11px] text-[#aaa]">
                      {item.autor_original && <span>— {item.autor_original}</span>}
                      {(item as any).traducator_ro_user?.full_name && (
                        <span className="ml-auto">{(item as any).traducator_ro_user.full_name}</span>
                      )}
                    </div>
                    {(item as any).data_asignarii && (
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-[#bbb]">
                        <span>📅 {new Date((item as any).data_asignarii + 'T00:00:00').toLocaleDateString('ro-RO', { day:'2-digit', month:'short' })}</span>
                        {(item as any).data_limita && <span>→ {new Date((item as any).data_limita + 'T00:00:00').toLocaleDateString('ro-RO', { day:'2-digit', month:'short' })}</span>}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : viewMode === 'table' ? (
              <div className="bg-white rounded-xl border border-[#f0e8e4] overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#f5efec]">
                      <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-[#888] uppercase tracking-wide cursor-pointer" onClick={() => toggleSort('public_id')}>
                        ID <SortIcon field="public_id" />
                      </th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-[#888] uppercase tracking-wide">Text</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-[#888] uppercase tracking-wide">Tip</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-[#888] uppercase tracking-wide cursor-pointer" onClick={() => toggleSort('status')}>
                        Stare <SortIcon field="status" />
                      </th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-[#888] uppercase tracking-wide">Traducător</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((item, i) => (
                      <tr key={item.id} onClick={() => { setSelectedItem(item); setMobileTab('detalii') }}
                        className={`cursor-pointer transition-colors ${i < paginated.length-1 ? 'border-b border-[#f8f3f0]' : ''} ${
                          selectedItem?.id === item.id ? 'bg-[#fff7f7]' : 'hover:bg-[#faf7f5]'
                        }`}>
                        <td className="px-3 py-2.5 font-bold text-[#ce0100] text-[12px]">{item.public_id}</td>
                        <td className="px-3 py-2.5 text-[12px] text-[#444] max-w-[180px] truncate">"{item.text_original}"</td>
                        <td className="px-3 py-2.5">
                          {(item as any).tip && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#f0e8e4] text-[#7a6e69]">{(item as any).tip}</span>}
                        </td>
                        <td className="px-3 py-2.5"><StatusPill status={item.status} /></td>
                        <td className="px-3 py-2.5 text-[11px] text-[#888]">{(item as any).traducator_ro_user?.full_name ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              // Compact view
              <div className="flex flex-col divide-y divide-[#f5efec] bg-white rounded-xl border border-[#f0e8e4] overflow-hidden">
                {paginated.map(item => (
                  <button key={item.id} onClick={() => { setSelectedItem(item); setMobileTab('detalii') }}
                    className={`flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      selectedItem?.id === item.id ? 'bg-[#fff7f7]' : 'hover:bg-[#faf7f5]'
                    }`}>
                    <span className="text-[11px] font-bold text-[#ce0100] w-16 flex-shrink-0">{item.public_id}</span>
                    <span className="text-[12px] text-[#444] flex-1 truncate">"{item.text_original}"</span>
                    {(item as any).tip && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#f0e8e4] text-[#7a6e69] flex-shrink-0">{(item as any).tip}</span>}
                    <StatusPill status={item.status} />
                  </button>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                  className="h-8 w-8 rounded-lg border border-[#e8e2de] flex items-center justify-center disabled:opacity-40 hover:bg-[#faf7f5] transition-all">
                  ‹
                </button>
                <span className="text-[12px] text-[#666]">{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
                  className="h-8 w-8 rounded-lg border border-[#e8e2de] flex items-center justify-center disabled:opacity-40 hover:bg-[#faf7f5] transition-all">
                  ›
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right panel — detail */}
        <div className={`${mobileTab === 'lista' ? 'hidden md:flex' : 'flex'} flex-1 flex-col overflow-hidden`}>
          {!selectedItem ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-4xl mb-3">📖</p>
                <p className="text-sm text-[#888]">Selectează un citat pentru a vedea detaliile.</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-4 py-5 md:px-8 md:py-8">
              {/* Detail header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-[32px] font-light text-[#ce0100] tracking-tight leading-none">{selectedItem.public_id}</h2>
                    {(selectedItem as any).tip && (
                      <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-[#f0e8e4] text-[#7a6e69]">{(selectedItem as any).tip}</span>
                    )}
                  </div>
                  <StatusPill status={selectedItem.status} />
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setEditItem(selectedItem); setShowModal(true) }}
                    className="h-9 px-3 rounded-xl border border-[#e8e2de] bg-white text-sm font-semibold text-[#444] hover:bg-[#faf7f5] transition-all flex items-center gap-2">
                    <PencilSquareIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">{isCoordinator ? 'Editează' : 'Adaugă traducerea'}</span>
                  </button>
                  {isCoordinator && (
                    <button onClick={() => { setDeleteItem(selectedItem); setShowDelete(true) }}
                      className="h-9 w-9 rounded-xl bg-[#fff1f1] text-[#ce0100] flex items-center justify-center hover:bg-[#ffe0e0] transition-all">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Original text */}
              <div className="bg-[#faf7f5] border border-[#e8e2de] rounded-2xl p-5 mb-5">
                <p className="text-[11px] font-semibold text-[#888] uppercase tracking-wide mb-2">Text original</p>
                <p className="text-[15px] text-[#111] leading-relaxed italic">"{selectedItem.text_original}"</p>
                {selectedItem.autor_original && (
                  <p className="text-[13px] text-[#888] mt-2 font-medium">— {selectedItem.autor_original}</p>
                )}
              </div>

              {/* Translation */}
              <div className="bg-white border border-[#e8e2de] rounded-2xl p-5 mb-5">
                <p className="text-[11px] font-semibold text-[#888] uppercase tracking-wide mb-2">Traducere în română</p>
                {(selectedItem as any).citat_ro ? (
                  <p className="text-[15px] text-[#111] leading-relaxed">"{(selectedItem as any).citat_ro}"</p>
                ) : (
                  <p className="text-[13px] text-[#bbb] italic">Traducerea în română nu a fost adăugată încă.</p>
                )}
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                {[
                  { label: 'ID public', value: selectedItem.public_id },
                  { label: 'Tip', value: (selectedItem as any).tip ?? 'CT' },
                  { label: 'Stare', value: <StatusPill status={selectedItem.status} /> },
                  { label: 'Traducător RO', value: (selectedItem as any).traducator_ro_user?.full_name ?? '—' },
                  { label: 'Data creării', value: new Date(selectedItem.created_at).toLocaleDateString('ro-RO', { day:'2-digit', month:'long', year:'numeric' }) },
                  { label: 'Data asignării', value: (selectedItem as any).data_asignarii ? new Date((selectedItem as any).data_asignarii + 'T00:00:00').toLocaleDateString('ro-RO', { day:'2-digit', month:'short', year:'numeric' }) : '—' },
                  { label: 'Dată limită', value: (selectedItem as any).data_limita ? new Date((selectedItem as any).data_limita + 'T00:00:00').toLocaleDateString('ro-RO', { day:'2-digit', month:'short', year:'numeric' }) : '—' },
                  { label: 'Stare validare', value: selectedItem.validation === 'Validat' && (selectedItem as any).validated_by_user?.full_name ? (
                    <span className="text-[13px] font-semibold text-[#166534]">✓ {(selectedItem as any).validated_by_user.full_name}</span>
                  ) : '—' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[11px] font-semibold text-[#888] uppercase tracking-wide mb-1">{label}</p>
                    {typeof value === 'string'
                      ? <p className="text-[14px] text-[#111] font-medium">{value}</p>
                      : value}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <CitatROModal
          item={editItem}
          users={users}
          isCoordinator={isCoordinator}
          onClose={() => { setShowModal(false); setEditItem(null) }}
          onSaved={fetchData}
        />
      )}

      {showDelete && deleteItem && (
        <DeleteModal
          item={deleteItem}
          onClose={() => { setShowDelete(false); setDeleteItem(null) }}
          onDeleted={() => { fetchData(); setSelectedItem(null) }}
        />
      )}
    </main>
  )
}