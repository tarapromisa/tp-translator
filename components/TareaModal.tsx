'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/context/UserContext'
import { createTarea, updateTarea, deleteTarea, TareaCalendarWithStatus } from '@/lib/calendarTasks'
import { isValidReference } from '@/lib/bibleReference'
import { XMarkIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useToast, ToastContainer } from '@/components/Toast'
import ConfirmDialog from '@/components/ConfirmDialog'

type CoordonatorOption = { id: string; full_name: string }

type Props = {
  open: boolean
  onClose: () => void
  onSaved: () => void
  tarea: TareaCalendarWithStatus | null
  defaultDate: string | null
}

export default function TareaModal({ open, onClose, onSaved, tarea, defaultDate }: Props) {
  const { profile } = useUser()
  const [data, setData] = useState(defaultDate ?? '')
  const [referintaRo, setReferintaRo] = useState('')
  const [coordonatorId, setCoordonatorId] = useState<string>('')
  const [nota, setNota] = useState('')
  const [coordonatori, setCoordonatori] = useState<CoordonatorOption[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const { toasts, showToast } = useToast()

  const isVerset = isValidReference(referintaRo.trim())

  useEffect(() => {
    if (tarea) {
      setData(tarea.data)
      setReferintaRo(tarea.referinta_ro)
      setCoordonatorId(tarea.coordonator_id ?? '')
      setNota(tarea.nota ?? '')
    } else {
      setData(defaultDate ?? '')
      setReferintaRo('')
      setCoordonatorId('')
      setNota('')
    }
    setError(null)
  }, [tarea, defaultDate, open])

  useEffect(() => {
    supabase
      .from('users')
      .select('id, full_name, role')
      .in('role', ['Admin', 'Coordonator', 'Coordonator principal'])
      .order('full_name', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setCoordonatori(data as CoordonatorOption[])
      })
  }, [])

  if (!open) return null

  const handleSave = async () => {
    setError(null)
    if (!data) { setError('Selectează o dată.'); return }
    if (!referintaRo.trim()) { setError('Introdu o descriere sau referință biblică.'); return }

    setSaving(true)

    if (tarea) {
      const result = await updateTarea(supabase, tarea.id, {
        data,
        referinta_ro: referintaRo.trim(),
        coordonator_id: coordonatorId || null,
        nota: nota.trim() || null,
      })
      setSaving(false)
      if (!result.success) { showToast(result.error ?? 'Eroare la salvare.', 'error'); return }
      showToast('Sarcina a fost actualizată.', 'success')
    } else {
      const result = await createTarea(supabase, {
        data,
        referinta_ro: referintaRo.trim(),
        coordonator_id: coordonatorId || null,
        nota: nota.trim() || null,
        created_by: profile?.id ?? '',
      })
      setSaving(false)
      if (!result.success) { showToast(result.error ?? 'Eroare la salvare.', 'error'); return }
      showToast('Sarcina a fost creată.', 'success')
    }

    onSaved()
  }

  const handleDelete = async () => {
    if (!tarea) return
    setSaving(true)
    const result = await deleteTarea(supabase, tarea.id)
    setSaving(false)
    setConfirmDeleteOpen(false)
    if (!result.success) { showToast(result.error ?? 'Eroare la ștergere.', 'error'); return }
    showToast('Sarcina a fost ștearsă.', 'success')
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[480px] bg-white rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.15)] overflow-hidden max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0e8e4]">
          <h2 className="text-lg font-semibold text-[#111]">
            {tarea ? 'Editează sarcina' : 'Sarcină nouă'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#f9f7f5] flex items-center justify-center hover:bg-[#f0e8e4] transition-all">
            <XMarkIcon className="w-4 h-4 text-[#666]" />
          </button>
        </div>

        <div className="p-5 space-y-4">

          <div>
            <label className="text-sm font-medium text-[#444] block mb-1.5">Data</label>
            <input type="date" value={data} onChange={e => setData(e.target.value)}
              className="w-full h-11 rounded-xl border border-[#e8e2de] px-3 text-sm text-[#111] outline-none focus:border-[#ce0100] transition-all bg-[#fcfbfa]" />
          </div>

          <div>
            <label className="text-sm font-medium text-[#444] block mb-1.5">Descriere / Referință biblică</label>
            <input type="text" value={referintaRo} onChange={e => setReferintaRo(e.target.value)}
              placeholder="ex: Isaia 5:1 sau Trimite emailuri traducători"
              className="w-full h-11 rounded-xl border border-[#e8e2de] px-3 text-sm text-[#111] outline-none focus:border-[#ce0100] transition-all bg-[#fcfbfa] placeholder:text-[#bbb]" />
            {referintaRo.trim() && (
              <p className={`text-[11px] mt-1 ${isVerset ? 'text-[#166534]' : 'text-[#999]'}`}>
                {isVerset ? '✓ Referință biblică validă — se va verifica automat' : 'Sarcină generală — fără verificare'}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-[#444] block mb-1.5">Asignat lui (opțional)</label>
            <select value={coordonatorId} onChange={e => setCoordonatorId(e.target.value)}
              className="w-full h-11 rounded-xl border border-[#e8e2de] px-3 text-sm text-[#111] outline-none focus:border-[#ce0100] transition-all bg-[#fcfbfa]">
              <option value="">— Niciun coordonator —</option>
              {coordonatori.map(c => (
                <option key={c.id} value={c.id}>{c.full_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-[#444] block mb-1.5">Notă (opțional)</label>
            <textarea value={nota} onChange={e => setNota(e.target.value)} rows={2}
              placeholder="Detalii suplimentare..."
              className="w-full rounded-xl border border-[#e8e2de] px-3 py-2 text-sm text-[#111] outline-none focus:border-[#ce0100] transition-all bg-[#fcfbfa] placeholder:text-[#bbb] resize-none" />
          </div>

          {error && (
            <div className="px-3 py-2 rounded-xl bg-[#fff5eb] border border-[#ffd9a8]">
              <p className="text-[12px] text-[#c05c00] font-medium">{error}</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 px-5 py-4 border-t border-[#f0e8e4]">
          {tarea && (
            <button onClick={() => setConfirmDeleteOpen(true)} disabled={saving}
              className="h-11 px-4 rounded-xl border border-[#ffd3d3] bg-[#fff7f7] text-[#ce0100] text-sm font-semibold flex items-center gap-2 hover:bg-[#ffe8e8] transition-all disabled:opacity-50">
              <TrashIcon className="w-4 h-4" /> Șterge
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onClose} disabled={saving}
            className="h-11 px-5 rounded-xl border border-[#e8e2de] text-sm font-semibold text-[#666] hover:bg-[#f9f7f5] transition-all disabled:opacity-50">
            Anulează
          </button>
          <button onClick={handleSave} disabled={saving}
            className="h-11 px-6 rounded-xl bg-[#ce0100] text-white text-sm font-semibold shadow-[0_6px_16px_rgba(206,1,0,0.22)] hover:bg-[#a80000] transition-all disabled:opacity-50">
            {saving ? 'Se salvează...' : 'Salvează'}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Șterge sarcina"
        message="Sigur vrei să ștergi această sarcină? Acțiunea nu poate fi anulată."
        confirmLabel="Șterge"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />

      <ToastContainer toasts={toasts} />
    </div>
  )
}