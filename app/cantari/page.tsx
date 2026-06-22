'use client'

import { useEffect, useState, useMemo } from 'react'
import Sidebar from '@/components/Sidebar'
import { useUser } from '@/context/UserContext'
import { supabase } from '@/lib/supabase'
import { useToast, ToastContainer } from '@/components/Toast'
import ConfirmDialog from '@/components/ConfirmDialog'
import {
  PlusIcon, MagnifyingGlassIcon, XMarkIcon,
  TrashIcon, CheckCircleIcon, MusicalNoteIcon,
  PencilIcon, ArrowLeftIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckSolid } from '@heroicons/react/24/solid'

// ── Types ─────────────────────────────────────────────────
type Parte = {
  id: string
  cantare_id: string
  eticheta: string
  ordine: number
  text_ro: string | null
  text_es: string | null
}

type Cantare = {
  id: string
  public_id: string
  titlu: string
  autor: string | null
  status: 'Incomplet' | 'Complet'
  created_at: string
}

// ── Helpers ───────────────────────────────────────────────
const ETICHETE_SUGESTII = ['Strofă 1', 'Strofă 2', 'Strofă 3', 'Cor', 'Punte', 'Intro', 'Outro', 'Vers 1', 'Vers 2']

// ── Main Page ─────────────────────────────────────────────
export default function CantariPage() {
  const { profile } = useUser()
  const role = profile?.role
  const isAdmin = role === 'Admin'
  const isCoordPrincipal = role === 'Coordonator principal'
  const canEdit = isAdmin || isCoordPrincipal
  const canCreate = isAdmin

  const [cantari, setCantari] = useState<Cantare[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'Incomplet' | 'Complet'>('all')
  const [selected, setSelected] = useState<Cantare | null>(null)
  const [parti, setParti] = useState<Parte[]>([])
  const [loadingParti, setLoadingParti] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const { toasts, showToast } = useToast()

  const fetchCantari = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('cantari')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) console.error(error)
    setCantari(data || [])
    setLoading(false)
  }

  const fetchParti = async (cantareId: string) => {
    setLoadingParti(true)
    const { data, error } = await supabase
      .from('cantari_parti')
      .select('*')
      .eq('cantare_id', cantareId)
      .order('ordine', { ascending: true })
    if (error) console.error(error)
    setParti(data || [])
    setLoadingParti(false)
  }

  useEffect(() => { fetchCantari() }, [])
  useEffect(() => { if (selected) fetchParti(selected.id) }, [selected])

  const filtered = useMemo(() => cantari.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!c.titlu?.toLowerCase().includes(q) && !c.public_id?.toLowerCase().includes(q) && !c.autor?.toLowerCase().includes(q)) return false
    }
    return true
  }), [cantari, search, statusFilter])

  const handleDeleteCantare = async () => {
    if (!confirmDeleteId) return
    const { error } = await supabase.from('cantari').delete().eq('id', confirmDeleteId)
    setConfirmDeleteId(null)
    if (error) { showToast('Eroare la ștergere.', 'error'); return }
    showToast('Cântarea a fost ștearsă.', 'success')
    if (selected?.id === confirmDeleteId) setSelected(null)
    fetchCantari()
  }

  const stats = {
    total: cantari.length,
    complete: cantari.filter(c => c.status === 'Complet').length,
    incomplete: cantari.filter(c => c.status === 'Incomplet').length,
  }

  return (
    <main className="flex min-h-screen bg-[#f9f7f5] overflow-x-hidden">
      <Sidebar />
      <div className="flex-1 w-0 px-4 py-6 md:px-10 md:py-8 overflow-y-auto overflow-x-hidden">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
          <div>
            <h1 className="text-[40px] md:text-[52px] leading-none tracking-tight font-light text-[#111] mb-3">Cântări</h1>
            <div className="w-10 h-[3px] rounded-full bg-[#ce0100] mb-4" />
            <p className="text-base text-[#666]">Traduceri cântări din română în spaniolă.</p>
          </div>
          {canCreate && (
            <button onClick={() => setShowCreate(true)}
              className="h-11 px-6 rounded-xl bg-[#ce0100] text-white text-sm font-semibold shadow-[0_6px_16px_rgba(206,1,0,0.22)] hover:bg-[#a80000] transition-all flex items-center gap-2">
              <PlusIcon className="w-4 h-4" /> Cântare nouă
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Total', value: stats.total, color: '#ce0100' },
            { label: 'Complete', value: stats.complete, color: '#166534' },
            { label: 'Incomplete', value: stats.incomplete, color: '#c05c00' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border border-[#e8e2de] rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3">
              <div className="w-1.5 h-7 rounded-full flex-shrink-0" style={{ background: color }} />
              <div>
                <p className="text-xs text-[#666]">{label}</p>
                <p className="text-2xl font-light text-[#111] leading-none">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 mb-5">
          <div className="flex-1 min-w-0 flex items-center gap-3 bg-white border border-[#e8e2de] rounded-xl px-4 h-10 shadow-sm">
            <MagnifyingGlassIcon className="w-4 h-4 text-[#999] flex-shrink-0" />
            <input type="text" placeholder="Caută după titlu, autor sau ID..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="flex-1 min-w-0 bg-transparent outline-none text-sm placeholder:text-[#bbb]" />
            {search && <button onClick={() => setSearch('')} className="text-xs text-[#999] hover:text-[#ce0100]">✕</button>}
          </div>
          <div className="flex items-center gap-1 bg-white border border-[#e8e2de] rounded-xl p-1 shadow-sm">
            {(['all', 'Complet', 'Incomplet'] as const).map(f => (
              <button key={f} onClick={() => setStatusFilter(f)}
                className={`h-8 px-3 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === f ? 'bg-[#ce0100] text-white' : 'text-[#666] hover:text-[#111]'
                }`}>
                {f === 'all' ? 'Toate' : f}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-base text-[#888]">Se încarcă...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <MusicalNoteIcon className="w-10 h-10 text-[#ddd]" />
            <p className="text-base text-[#888]">Nicio cântare găsită.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map(c => (
              <div key={c.id} onClick={() => setSelected(c)}
                className="group bg-white border border-[#e8e2de] rounded-2xl p-4 cursor-pointer hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)] transition-all duration-200 relative">
                {/* Status tick */}
                <div className="absolute top-3 right-3">
                  {c.status === 'Complet'
                    ? <CheckSolid className="w-5 h-5 text-[#166534]" />
                    : <div className="w-5 h-5 rounded-full border-2 border-[#e0d8d4]" />}
                </div>
                <div className="w-9 h-9 rounded-xl bg-[#fff1f1] flex items-center justify-center mb-3">
                  <MusicalNoteIcon className="w-5 h-5 text-[#ce0100]" />
                </div>
                <p className="text-[11px] font-bold text-[#ce0100] mb-1">{c.public_id}</p>
                <h3 className="text-[15px] font-semibold text-[#111] leading-snug mb-1 pr-6">{c.titlu}</h3>
                {c.autor && <p className="text-[12px] text-[#999]">{c.autor}</p>}
                <div className="mt-3 pt-3 border-t border-[#f5efec] flex items-center justify-between">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    c.status === 'Complet' ? 'bg-[#edfaf3] text-[#166534]' : 'bg-[#fff5eb] text-[#c05c00]'
                  }`}>{c.status}</span>
                  {isAdmin && (
                    <button onClick={e => { e.stopPropagation(); setConfirmDeleteId(c.id) }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-[#fff1f1] transition-all">
                      <TrashIcon className="w-3.5 h-3.5 text-[#ce0100]" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Editor lateral / fullscreen */}
      {selected && (
        <EditorCantare
          cantare={selected}
          parti={parti}
          loadingParti={loadingParti}
          canEdit={canEdit}
          isAdmin={isAdmin}
          onClose={() => setSelected(null)}
          onSaved={() => { fetchCantari(); fetchParti(selected.id) }}
          showToast={showToast}
        />
      )}

      {/* Modal creare cântare */}
      {showCreate && (
        <CreateCantareModal
          onClose={() => setShowCreate(false)}
          onSaved={(cantare) => { fetchCantari(); setShowCreate(false); setSelected(cantare) }}
          userId={profile?.id ?? ''}
          showToast={showToast}
        />
      )}

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Șterge cântarea"
        message="Sigur vrei să ștergi această cântare? Toate părțile vor fi șterse. Acțiunea nu poate fi anulată."
        confirmLabel="Șterge"
        onConfirm={handleDeleteCantare}
        onCancel={() => setConfirmDeleteId(null)}
      />

      <ToastContainer toasts={toasts} />
    </main>
  )
}

// ── Editor de cântare ─────────────────────────────────────
function EditorCantare({ cantare, parti, loadingParti, canEdit, isAdmin, onClose, onSaved, showToast }: {
  cantare: Cantare
  parti: Parte[]
  loadingParti: boolean
  canEdit: boolean
  isAdmin: boolean
  onClose: () => void
  onSaved: () => void
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void
}) {
  const [localParti, setLocalParti] = useState<Parte[]>([])
  const [saving, setSaving] = useState<string | null>(null)
  const [newEticheta, setNewEticheta] = useState('')
  const [addingParte, setAddingParte] = useState(false)
  const [showSugestii, setShowSugestii] = useState(false)
  const [confirmDeleteParteId, setConfirmDeleteParteId] = useState<string | null>(null)

  useEffect(() => { setLocalParti(parti) }, [parti])

  const handleSaveParte = async (parte: Parte) => {
    setSaving(parte.id)
    const { error } = await supabase
      .from('cantari_parti')
      .update({
        text_ro: parte.text_ro,
        text_es: parte.text_es,
        eticheta: parte.eticheta,
        updated_at: new Date().toISOString(),
      })
      .eq('id', parte.id)
    setSaving(null)
    if (error) { showToast('Eroare la salvare.', 'error'); return }
    showToast('Salvat.', 'success')
    onSaved()
  }

  const handleAddParte = async () => {
    if (!newEticheta.trim()) return
    const ordine = localParti.length > 0 ? Math.max(...localParti.map(p => p.ordine)) + 1 : 0
    const { error } = await supabase
      .from('cantari_parti')
      .insert({ cantare_id: cantare.id, eticheta: newEticheta.trim(), ordine, text_ro: null, text_es: null })
    if (error) { showToast('Eroare la adăugare.', 'error'); return }
    setNewEticheta('')
    setAddingParte(false)
    setShowSugestii(false)
    showToast('Parte adăugată.', 'success')
    onSaved()
  }

  const handleDeleteParte = async () => {
    if (!confirmDeleteParteId) return
    const { error } = await supabase.from('cantari_parti').delete().eq('id', confirmDeleteParteId)
    setConfirmDeleteParteId(null)
    if (error) { showToast('Eroare la ștergere.', 'error'); return }
    showToast('Parte ștearsă.', 'success')
    onSaved()
  }

  const updateLocal = (id: string, field: 'text_ro' | 'text_es', value: string) => {
    setLocalParti(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  return (
    <>
      <div className="fixed inset-0 z-[50] flex">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative ml-auto w-full md:w-[85vw] max-w-[1100px] h-full bg-[#f9f7f5] flex flex-col shadow-[0_0_60px_rgba(0,0,0,0.2)] overflow-hidden">

          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 bg-white border-b border-[#e8e2de] flex-shrink-0">
            <button onClick={onClose} className="w-9 h-9 rounded-xl bg-[#f9f7f5] border border-[#e8e2de] flex items-center justify-center hover:bg-[#f0e8e4] transition-all flex-shrink-0">
              <ArrowLeftIcon className="w-4 h-4 text-[#666]" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-[#ce0100]">{cantare.public_id}</span>
                {cantare.status === 'Complet'
                  ? <span className="flex items-center gap-1 text-[11px] font-semibold text-[#166534] bg-[#edfaf3] px-2 py-0.5 rounded-full"><CheckCircleIcon className="w-3.5 h-3.5" /> Complet</span>
                  : <span className="text-[11px] font-semibold text-[#c05c00] bg-[#fff5eb] px-2 py-0.5 rounded-full">Incomplet</span>}
              </div>
              <h2 className="text-lg font-semibold text-[#111] truncate">{cantare.titlu}</h2>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-4 py-5 md:px-8 space-y-4">

            {loadingParti ? (
              <p className="text-sm text-[#888] text-center py-10">Se încarcă...</p>
            ) : localParti.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <p className="text-sm text-[#bbb]">Nicio parte adăugată încă.</p>
                {isAdmin && <p className="text-xs text-[#ccc]">Adaugă prima parte mai jos.</p>}
              </div>
            ) : localParti.map(parte => (
              <div key={parte.id} className="bg-white border border-[#e8e2de] rounded-2xl overflow-hidden shadow-sm">
                {/* Parte header */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#f0e8e4] bg-[#fdfbfa]">
                  <span className="text-[12px] font-bold text-[#ce0100] uppercase tracking-wide">{parte.eticheta}</span>
                  <div className="flex items-center gap-2">
                    {parte.text_es?.trim()
                      ? <CheckSolid className="w-4 h-4 text-[#166534]" />
                      : <div className="w-4 h-4 rounded-full border-2 border-[#e0d8d4]" />}
                    {isAdmin && (
                      <button onClick={() => setConfirmDeleteParteId(parte.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#fff1f1] transition-all">
                        <TrashIcon className="w-3.5 h-3.5 text-[#ce0100]" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Columns RO / ES */}
                <div className="grid grid-cols-1 md:grid-cols-2">
                  {/* RO */}
                  <div className="p-4 md:border-r border-[#f0e8e4]">
                    <p className="text-[10px] font-bold text-[#999] uppercase tracking-wider mb-2">🇷🇴 Română</p>
                    <textarea
                      value={parte.text_ro ?? ''}
                      onChange={e => updateLocal(parte.id, 'text_ro', e.target.value)}
                      disabled={!isAdmin}
                      rows={6}
                      placeholder={isAdmin ? 'Introdu textul în română...' : '—'}
                      className="w-full text-sm text-[#111] bg-transparent outline-none resize-none leading-relaxed placeholder:text-[#ccc] disabled:opacity-60"
                    />
                  </div>
                  {/* ES */}
                  <div className="p-4 bg-[#fffef9]">
                    <p className="text-[10px] font-bold text-[#999] uppercase tracking-wider mb-2">🇪🇸 Español</p>
                    <textarea
                      value={parte.text_es ?? ''}
                      onChange={e => updateLocal(parte.id, 'text_es', e.target.value)}
                      disabled={!canEdit}
                      rows={6}
                      placeholder={canEdit ? 'Introdu traducerea în spaniolă...' : '—'}
                      className="w-full text-sm text-[#111] bg-transparent outline-none resize-none leading-relaxed placeholder:text-[#ccc] disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* Save button */}
                {canEdit && (
                  <div className="px-4 py-3 border-t border-[#f0e8e4] flex justify-end">
                    <button onClick={() => handleSaveParte(parte)} disabled={saving === parte.id}
                      className="h-8 px-4 rounded-xl bg-[#ce0100] text-white text-[12px] font-semibold hover:bg-[#a80000] transition-all disabled:opacity-50 flex items-center gap-1.5">
                      {saving === parte.id ? 'Se salvează...' : 'Salvează'}
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* Add parte */}
            {isAdmin && (
              <div className="bg-white border border-dashed border-[#e0d8d4] rounded-2xl p-4">
                {addingParte ? (
                  <div className="flex flex-col gap-3">
                    <div className="relative">
                      <input value={newEticheta} onChange={e => { setNewEticheta(e.target.value); setShowSugestii(true) }}
                        onFocus={() => setShowSugestii(true)}
                        placeholder="Numele părții (ex: Strofă 1, Cor...)"
                        className="w-full h-10 rounded-xl border border-[#e8e2de] px-3 text-sm outline-none focus:border-[#ce0100] transition-all" />
                      {showSugestii && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e8e2de] rounded-xl shadow-lg z-10 overflow-hidden">
                          {ETICHETE_SUGESTII.filter(s => !newEticheta || s.toLowerCase().includes(newEticheta.toLowerCase())).map(s => (
                            <button key={s} onClick={() => { setNewEticheta(s); setShowSugestii(false) }}
                              className="w-full text-left px-3 py-2 text-sm text-[#444] hover:bg-[#fff7f7] transition-colors">
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={handleAddParte} disabled={!newEticheta.trim()}
                        className="h-9 px-4 rounded-xl bg-[#ce0100] text-white text-sm font-semibold hover:bg-[#a80000] transition-all disabled:opacity-40">
                        Adaugă
                      </button>
                      <button onClick={() => { setAddingParte(false); setNewEticheta(''); setShowSugestii(false) }}
                        className="h-9 px-4 rounded-xl border border-[#e8e2de] text-sm text-[#666] hover:bg-[#f9f7f5] transition-all">
                        Anulează
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setAddingParte(true)}
                    className="w-full flex items-center justify-center gap-2 text-sm text-[#999] hover:text-[#ce0100] transition-colors py-2">
                    <PlusIcon className="w-4 h-4" /> Adaugă o parte nouă
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmDeleteParteId}
        title="Șterge partea"
        message="Sigur vrei să ștergi această parte? Acțiunea nu poate fi anulată."
        confirmLabel="Șterge"
        onConfirm={handleDeleteParte}
        onCancel={() => setConfirmDeleteParteId(null)}
      />
    </>
  )
}

// ── Modal creare cântare nouă ─────────────────────────────
function CreateCantareModal({ onClose, onSaved, userId, showToast }: {
  onClose: () => void
  onSaved: (cantare: Cantare) => void
  userId: string
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void
}) {
  const [titlu, setTitlu] = useState('')
  const [autor, setAutor] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!titlu.trim()) { setError('Titlul este obligatoriu.'); return }
    setSaving(true)
    const { data, error: e } = await supabase
      .from('cantari')
      .insert({ titlu: titlu.trim(), autor: autor.trim() || null, created_by: userId })
      .select('*')
      .single()
    setSaving(false)
    if (e) { setError(e.message); return }
    showToast('Cântarea a fost creată.', 'success')
    onSaved(data as Cantare)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[440px] bg-white rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.15)] overflow-hidden">
        <div className="h-1 bg-[#ce0100]" />
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-[#111]">Cântare nouă</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#f9f7f5] flex items-center justify-center hover:bg-[#f0e8e4] transition-all">
              <XMarkIcon className="w-4 h-4 text-[#666]" />
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-[#666] uppercase tracking-wide block mb-1.5">Titlu *</label>
              <input value={titlu} onChange={e => setTitlu(e.target.value)}
                placeholder="Titlul cântării..."
                className="w-full h-11 rounded-xl border border-[#e8e2de] px-3 text-sm outline-none focus:border-[#ce0100] transition-all" />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#666] uppercase tracking-wide block mb-1.5">Autor (opțional)</label>
              <input value={autor} onChange={e => setAutor(e.target.value)}
                placeholder="Autorul cântării..."
                className="w-full h-11 rounded-xl border border-[#e8e2de] px-3 text-sm outline-none focus:border-[#ce0100] transition-all" />
            </div>
            {error && <p className="text-xs text-[#ce0100] font-medium">{error}</p>}
          </div>
          <div className="flex items-center gap-2 mt-5">
            <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-[#e8e2de] text-sm font-semibold text-[#666] hover:bg-[#f9f7f5] transition-all">
              Anulează
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 h-11 rounded-xl bg-[#ce0100] text-white text-sm font-semibold shadow-[0_6px_16px_rgba(206,1,0,0.22)] hover:bg-[#a80000] transition-all disabled:opacity-50">
              {saving ? 'Se salvează...' : 'Creează'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
