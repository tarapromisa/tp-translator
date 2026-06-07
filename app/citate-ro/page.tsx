'use client'

import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import { supabase } from '@/lib/supabase'
import {
  MagnifyingGlassIcon, PencilSquareIcon, TrashIcon,
  XMarkIcon, PlusIcon, ExclamationTriangleIcon,
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

function CitatROModal({ item, users, onClose, onSaved }: {
  item: CitatRO | null
  users: { id: string; full_name: string }[]
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!item
  const [textOriginal, setTextOriginal] = useState(item?.text_original ?? '')
  const [citatRo, setCitatRo] = useState<string>((item as any)?.citat_ro ?? '')
  const [autorOriginal, setAutorOriginal] = useState(item?.autor_original ?? '')
  const [traducatorRo, setTraducatorRo] = useState(item?.traducator_ro ?? '')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!textOriginal.trim() || !autorOriginal.trim()) {
      setError('Textul și autorul sunt obligatorii.')
      return
    }
    if (!traducatorRo) {
      setError('Traducătorul RO este obligatoriu.')
      return
    }
    setSaveState('saving')
    setError(null)

    const payload = {
      text_original: textOriginal.trim(),
      citat_ro: citatRo.trim() || null,
      autor_original: autorOriginal.trim(),
      traducator_ro: traducatorRo || null,
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
      <div className="m-in bg-white rounded-[32px] w-full max-w-[540px] overflow-x-hidden shadow-[0_48px_100px_rgba(0,0,0,0.22)]">
        <div className="h-[4px] bg-[#ce0100]" />
        <div className="px-[40px] pt-[36px] pb-[32px]">
          <div className="flex items-start justify-between mb-[28px]">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.16em] text-[#ce0100] uppercase mb-[6px]">
                {isEdit ? 'Editează citat RO' : 'Citat nou RO'}
              </p>
              <h2 className="text-[26px] font-light text-[#111] tracking-tight">
                {isEdit ? item!.public_id : 'Adaugă un citat'}
              </h2>
            </div>
            <button onClick={onClose} disabled={saveState === 'saving'}
              className="w-[34px] h-[34px] rounded-full bg-[#faf7f5] border border-[#e8e2de] flex items-center justify-center hover:bg-[#ffe0e0] transition-all">
              <XMarkIcon className="w-[14px] h-[14px] text-[#555]" />
            </button>
          </div>

          <div className="flex flex-col gap-[16px] mb-[24px]">
            <div>
              <label className="text-[11px] font-semibold text-[#666] uppercase tracking-wide block mb-[6px]">
                Text original <span className="text-[#ce0100]">*</span>
              </label>
              <textarea value={textOriginal} onChange={e => setTextOriginal(e.target.value)} rows={4}
                placeholder="Introdu citatul în română..."
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
        <div className="px-[36px] pt-[32px] pb-[28px]">
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

export default function CitateROPage() {
  const [items, setItems] = useState<CitatRO[]>([])
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedItem, setSelectedItem] = useState<CitatRO | null>(null)
  const [editItem, setEditItem] = useState<CitatRO | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleteItem, setDeleteItem] = useState<CitatRO | null>(null)

  const fetchData = async () => {
    setLoading(true)
    const { data: c, error: ce } = await supabase
      .from('citate_ro')
      .select('*, traducator_ro_user:traducator_ro(full_name)')
      .order('created_at', { ascending: false })

    const { data: u } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('language', 'RO')
      .eq('active', true)

    if (ce) console.error('citate_ro error:', ce)

    setItems(c || [])
    setUsers(u || [])
    setSelectedItem(prev => {
      if (!c || c.length === 0) return null
      const found = c.find((i: CitatRO) => i.id === prev?.id)
      return found ?? c[0]
    })
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const filtered = items.filter(i => {
    if (statusFilter !== 'all' && i.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!i.text_original?.toLowerCase().includes(q) &&
          !i.public_id?.toLowerCase().includes(q) &&
          !i.autor_original?.toLowerCase().includes(q)) return false
    }
    return true
  })

  const stats = {
    total:     items.length,
    completat: items.filter(i => i.status === 'Completat').length,
    incomplet: items.filter(i => i.status === 'Incomplet').length,
  }

  return (
    <main className="flex min-h-screen bg-[#f9f7f5] overflow-x-hidden">
      <Sidebar />
      <div className="flex-1 w-0 overflow-x-hidden flex flex-col">

        <div className="px-10 pt-8 pb-6 flex-shrink-0">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-[32px] md:text-[48px] leading-none tracking-tight font-light text-[#111] mb-3">Citate RO</h1>
              <div className="w-10 h-[3px] rounded-full bg-[#ce0100] mb-3" />
              <p className="text-sm text-[#666]">Texte originale în limba română.</p>
            </div>
            <button onClick={() => { setEditItem(null); setShowModal(true) }}
              className="mt-2 h-11 px-6 rounded-xl bg-[#ce0100] text-white text-sm font-semibold shadow-[0_6px_16px_rgba(206,1,0,0.22)] hover:bg-[#a80000] transition-all flex items-center gap-2">
              <PlusIcon className="w-4 h-4" /> Citat nou
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: 'Total', value: stats.total, color: '#ce0100' },
              { label: 'Completate', value: stats.completat, color: '#166534' },
              { label: 'Incomplete', value: stats.incomplet, color: '#c05c00' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white border border-[#e8e2de] rounded-xl px-4 h-16 flex items-center gap-3 shadow-sm">
                <div className="w-1.5 h-7 rounded-full flex-shrink-0" style={{ background: color }} />
                <div>
                  <p className="text-xs text-[#666]">{label}</p>
                  <p className="text-2xl font-light text-[#111] leading-none">{value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-3 bg-white border border-[#e8e2de] rounded-xl px-4 h-10 shadow-sm">
              <MagnifyingGlassIcon className="w-4 h-4 text-[#999] flex-shrink-0" />
              <input type="text" placeholder="Caută după ID, text sau autor..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm text-[#111] placeholder:text-[#bbb]" />
              {search && <button onClick={() => setSearch('')} className="text-xs text-[#999] hover:text-[#ce0100]">✕</button>}
            </div>
            <div className="flex items-center gap-1.5 bg-white border border-[#e8e2de] rounded-xl p-1 shadow-sm">
              {[['all','Toate'],['Completat','Completate'],['Incomplet','Incomplete']].map(([v, l]) => (
                <button key={v} onClick={() => setStatusFilter(v)}
                  className={`h-8 px-3 rounded-lg text-xs font-semibold transition-all ${
                    statusFilter === v ? 'bg-[#ce0100] text-white shadow-sm' : 'text-[#666] hover:text-[#111]'
                  }`}>{l}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-x-hidden flex px-10 pb-8 gap-4">

          {/* List */}
          <div className="w-[420px] flex-shrink-0 bg-white border border-[#e8e2de] rounded-2xl overflow-x-hidden shadow-sm flex flex-col">
            <div className="px-5 py-3 border-b border-[#f0e9e5] flex-shrink-0">
              <p className="text-xs text-[#888]">{filtered.length} {filtered.length === 1 ? 'citat' : 'citate'}</p>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-[#f8f3f0]">
              {loading ? (
                <p className="text-center py-10 text-sm text-[#888]">Se încarcă...</p>
              ) : filtered.length === 0 ? (
                <p className="text-center py-10 text-sm text-[#888]">Niciun citat găsit.</p>
              ) : filtered.map(item => (
                <div key={item.id} onClick={() => setSelectedItem(item)}
                  className={`flex items-start gap-3 px-5 py-4 cursor-pointer transition-colors ${
                    selectedItem?.id === item.id
                      ? 'bg-[#fff7f7] border-l-[3px] border-l-[#ce0100]'
                      : 'hover:bg-[#faf7f5] border-l-[3px] border-l-transparent'
                  }`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[12px] font-bold text-[#ce0100]">{item.public_id}</span>
                      <span className="text-[10px] text-[#bbb]">{timeAgo(item.created_at)}</span>
                    </div>
                    {(item as any).citat_ro
                      ? <p className="text-[13px] text-[#222] line-clamp-2 leading-snug mb-1">"{(item as any).citat_ro}"</p>
                      : <p className="text-[13px] text-[#999] line-clamp-2 leading-snug mb-1 italic">"{item.text_original}"</p>
                    }
                    <p className="text-[11px] text-[#888]">— {item.autor_original}</p>
                  </div>
                  <StatusPill status={item.status} />
                </div>
              ))}
            </div>
          </div>

          {/* Detail */}
          <div className="flex-1 min-w-0">
            {selectedItem ? (
              <AnimatePresence mode="wait">
                <motion.div key={selectedItem.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}
                  className="h-full flex flex-col gap-4">
                  <div className="bg-white border border-[#e8e2de] rounded-2xl p-6 shadow-sm">
                    <div className="flex items-start justify-between gap-4 mb-5">
                      <div>
                        <p className="text-[11px] font-bold tracking-[0.16em] text-[#ce0100] uppercase mb-1">Citat RO</p>
                        <h2 className="text-[32px] font-light text-[#ce0100] tracking-tight leading-none">{selectedItem.public_id}</h2>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setEditItem(selectedItem); setShowModal(true) }}
                          className="h-9 px-4 rounded-xl border border-[#e8e2de] bg-white text-sm font-semibold text-[#444] hover:bg-[#faf7f5] transition-all flex items-center gap-2">
                          <PencilSquareIcon className="w-4 h-4" /> Editează
                        </button>
                        <button onClick={() => { setDeleteItem(selectedItem); setShowDelete(true) }}
                          className="h-9 w-9 rounded-xl bg-[#fff1f1] text-[#ce0100] flex items-center justify-center hover:bg-[#ffe0e0] transition-all">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Text original */}
                    <div className="mb-4">
                      <p className="text-[11px] font-semibold text-[#888] uppercase tracking-wide mb-2">Text original</p>
                      <div className="bg-[#faf7f5] border border-[#f0e9e5] rounded-[14px] px-5 py-4">
                        <p className="text-[15px] text-[#555] leading-relaxed italic">"{selectedItem.text_original || '—'}"</p>
                        <p className="text-[13px] text-[#aaa] mt-2">— {selectedItem.autor_original}</p>
                      </div>
                    </div>

                    {/* Traducere RO */}
                    <div>
                      <p className="text-[11px] font-semibold text-[#888] uppercase tracking-wide mb-2">Traducere română</p>
                      {(selectedItem as any).citat_ro ? (
                        <div className="border-l-[3px] border-[#ce0100] pl-5 py-1">
                          <p className="text-[20px] font-light text-[#111] leading-relaxed italic">"{(selectedItem as any).citat_ro}"</p>
                          <p className="text-[14px] text-[#888] mt-2">— {selectedItem.autor_original}</p>
                        </div>
                      ) : (
                        <div className="bg-[#fffafa] border border-dashed border-[#ffd3d3] rounded-[14px] px-5 py-4">
                          <p className="text-[13px] text-[#ccc] italic">Traducerea în română nu a fost adăugată încă.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white border border-[#e8e2de] rounded-2xl p-6 shadow-sm">
                    <h3 className="text-sm font-semibold text-[#111] mb-4">Detalii</h3>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                      {[
                        { label: 'ID public',        value: selectedItem.public_id },
                        { label: 'Stare',            value: <StatusPill status={selectedItem.status} /> },
                        { label: 'Autor',            value: selectedItem.autor_original },
                        { label: 'Traducător RO', value: (selectedItem as any).traducator_ro_user?.full_name ?? '—' },
                        { label: 'Data creării', value: new Date(selectedItem.created_at).toLocaleDateString('ro-RO', { day:'2-digit', month:'long', year:'numeric' }) },
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
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="h-full bg-white border border-[#e8e2de] rounded-2xl flex items-center justify-center shadow-sm">
                <p className="text-sm text-[#aaa]">Selectează un citat din listă</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <CitatROModal
          item={editItem}
          users={users}
          onClose={() => { setShowModal(false); setEditItem(null) }}
          onSaved={fetchData}
        />
      )}
      {showDelete && (
        <DeleteModal
          item={deleteItem}
          onClose={() => { setShowDelete(false); setDeleteItem(null) }}
          onDeleted={() => { fetchData(); setSelectedItem(null) }}
        />
      )}
    </main>
  )
}