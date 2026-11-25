'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/context/UserContext'
import { createTarea, updateTarea, deleteTarea, TareaCalendarWithStatus } from '@/lib/calendarTasks'
import { isValidReference } from '@/lib/bibleReference'
import { checkReferenceAvailability } from '@/lib/referinteBiblice'
import { XMarkIcon, TrashIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { useToast, ToastContainer } from '@/components/Toast'
import ConfirmDialog from '@/components/ConfirmDialog'

type CoordonatorOption = { id: string; full_name: string; role: string }

type RefStatus = 'idle' | 'checking' | 'available' | 'used_versete' | 'used_calendar' | 'invalid'

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
  const [refStatus, setRefStatus] = useState<RefStatus>('idle')
  const [refMessage, setRefMessage] = useState<string | null>(null)

  // ── Forțare verset (solo Admin) ──
  const isAdmin = profile?.role === 'Admin'
  const [forceOn, setForceOn] = useState(false)
  const [forceId, setForceId] = useState('')
  const [forceCheck, setForceCheck] = useState<null | { ok: boolean; ref?: string }>(null)
  const [forceChecking, setForceChecking] = useState(false)

  const verifyForce = useCallback(async (raw: string) => {
    const id = raw.trim().toUpperCase()
    if (!id) { setForceCheck(null); return false }
    setForceChecking(true)
    const { data } = await supabase.from('versete').select('public_id, referinta_ro').eq('public_id', id).maybeSingle()
    setForceChecking(false)
    setForceCheck(data ? { ok: true, ref: data.referinta_ro ?? '' } : { ok: false })
    return !!data
  }, [])
  const { toasts, showToast } = useToast()

  const isVerset = isValidReference(referintaRo.trim())

  useEffect(() => {
    if (tarea) {
      setData(tarea.data)
      setReferintaRo(tarea.referinta_ro)
      setCoordonatorId(tarea.coordonator_id ?? '')
      setNota(tarea.nota ?? '')
      setForceOn(!!tarea.verset_fortat)
      setForceId(tarea.verset_fortat ?? '')
      setForceCheck(tarea.verset_fortat ? { ok: true } : null)
    } else {
      setData(defaultDate ?? '')
      setReferintaRo('')
      setCoordonatorId('')
      setNota('')
      setForceOn(false)
      setForceId('')
      setForceCheck(null)
    }
    setError(null)
    setRefStatus('idle')
    setRefMessage(null)
  }, [tarea, defaultDate, open])

  useEffect(() => {
    supabase
      .from('users')
      .select('id, full_name, role')
      .in('role', ['Admin', 'Coordonator', 'Coordonator principal', 'Operator versete'])
      .eq('active', true)
      .order('full_name', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setCoordonatori(data as CoordonatorOption[])
      })
  }, [])

  // Verifică disponibilitatea referinței (apelat la onBlur sau înainte de salvare)
  const checkRef = useCallback(async (ref: string): Promise<boolean> => {
    const trimmed = ref.trim()
    if (!trimmed || !isValidReference(trimmed)) {
      setRefStatus('idle')
      setRefMessage(null)
      return true // referință generală, nu blocăm
    }

    setRefStatus('checking')
    setRefMessage(null)

    // 1. Verifică în referinte_biblice (dacă e folosit într-un verset)
    const availability = await checkReferenceAvailability(supabase, trimmed, null)

    if (availability.status === 'used_by_other') {
      setRefStatus('used_versete')
      setRefMessage(
        `Această referință a fost deja introdusă ca verset${
          availability.folositDe.public_id ? ` (${availability.folositDe.public_id})` : ''
        }. Poți totuși programa sarcina dacă dorești.`
      )
      // Nu blocăm — doar avertizăm că e deja introdus ca verset
    }

    // 2. Verifică în tareas_calendar (dacă e deja programat în calendar)
    const { data: existing } = await supabase
      .from('tareas_calendar')
      .select('id, data')
      .eq('referinta_ro', trimmed)
      .neq('id', tarea?.id ?? '00000000-0000-0000-0000-000000000000')
      .limit(1)

    if (existing && existing.length > 0) {
      const dataExistenta = existing[0].data
      setRefStatus('used_calendar')
      setRefMessage(
        `Această referință este deja programată în calendar pe data de ${dataExistenta}. Ești sigur că vrei să o adaugi din nou?`
      )
      return true // avertizăm dar nu blocăm
    }

    if (availability.status !== 'used_by_other') {
      setRefStatus('available')
      setRefMessage('Referință disponibilă — nu a fost folosită.')
    }

    return true
  }, [tarea?.id])

  if (!open) return null

  const handleSave = async () => {
    setError(null)
    if (!data) { setError('Selectează o dată.'); return }
    if (!referintaRo.trim()) { setError('Introdu o descriere sau referință biblică.'); return }

    // Verifică referința înainte de salvare
    if (isVerset) await checkRef(referintaRo)

    // Forțare: solo Admin, y el verset tiene que existir
    let versetFortat: string | null | undefined = undefined   // undefined = no se toca (no Admin)
    if (isAdmin) {
      if (forceOn) {
        if (!forceId.trim()) { setError('Scrie ID-ul versetului pe care vrei să-l forțezi (ex: V245).'); return }
        const ok = await verifyForce(forceId)
        if (!ok) { setError(`Versetul ${forceId.trim().toUpperCase()} nu există.`); return }
        versetFortat = forceId.trim().toUpperCase()
      } else {
        versetFortat = null
      }
    }

    setSaving(true)

    if (tarea) {
      const result = await updateTarea(supabase, tarea.id, {
        data,
        referinta_ro: referintaRo.trim(),
        coordonator_id: coordonatorId || null,
        nota: nota.trim() || null,
        ...(versetFortat !== undefined ? { verset_fortat: versetFortat } : {}),
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
        ...(versetFortat !== undefined ? { verset_fortat: versetFortat } : {}),
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
            <input
              type="text"
              value={referintaRo}
              onChange={e => { setReferintaRo(e.target.value); setRefStatus('idle'); setRefMessage(null) }}
              onBlur={() => isValidReference(referintaRo.trim()) && checkRef(referintaRo)}
              placeholder="ex: Isaia 5:1 sau Trimite emailuri traducători"
              className="w-full h-11 rounded-xl border border-[#e8e2de] px-3 text-sm text-[#111] outline-none focus:border-[#ce0100] transition-all bg-[#fcfbfa] placeholder:text-[#bbb]" />

            {/* Status referință */}
            {refStatus === 'checking' && (
              <p className="text-[11px] mt-1.5 text-[#999]">Se verifică disponibilitatea...</p>
            )}
            {refStatus === 'available' && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <CheckCircleIcon className="w-3.5 h-3.5 text-[#166534]" />
                <p className="text-[11px] text-[#166534] font-medium">Referință disponibilă</p>
              </div>
            )}
            {(refStatus === 'used_versete' || refStatus === 'used_calendar') && refMessage && (
              <div className="flex items-start gap-2 mt-1.5 px-3 py-2 rounded-xl bg-[#fff5eb] border border-[#ffd9a8]">
                <ExclamationTriangleIcon className="w-4 h-4 text-[#c05c00] flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-[#c05c00] font-medium leading-snug">{refMessage}</p>
              </div>
            )}
            {refStatus === 'idle' && referintaRo.trim() && !isVerset && (
              <p className="text-[11px] mt-1 text-[#999]">Sarcină generală — fără verificare biblică</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-[#444] block mb-1.5">Asignat lui (opțional)</label>
            <select value={coordonatorId} onChange={e => setCoordonatorId(e.target.value)}
              className="w-full h-11 rounded-xl border border-[#e8e2de] px-3 text-sm text-[#111] outline-none focus:border-[#ce0100] transition-all bg-[#fcfbfa]">
              <option value="">— Nimeni —</option>
              {coordonatori.some(c => c.role === 'Operator versete') && (
                <optgroup label="Operatori versete">
                  {coordonatori.filter(c => c.role === 'Operator versete').map(c => (
                    <option key={c.id} value={c.id}>{c.full_name}</option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Coordonatori">
                {coordonatori.filter(c => c.role !== 'Operator versete').map(c => (
                  <option key={c.id} value={c.id}>{c.full_name}</option>
                ))}
              </optgroup>
            </select>
            {coordonatori.find(c => c.id === coordonatorId)?.role === 'Operator versete' && !isVerset && referintaRo.trim() && (
              <p className="text-[11px] mt-1.5 text-[#c05c00]">Operatorul de versete vede în calendar doar sarcinile cu referință biblică.</p>
            )}
          </div>

          {/* Forțare verset — doar Admin */}
          {isAdmin && (
            <div className={`rounded-xl border px-3 py-3 ${forceOn ? 'border-[#bfe5cf] bg-[#f3fbf6]' : 'border-[#e8e2de] bg-[#fcfbfa]'}`}>
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input type="checkbox" checked={forceOn}
                  onChange={e => { setForceOn(e.target.checked); if (!e.target.checked) setForceCheck(null) }}
                  className="mt-0.5 w-4 h-4 accent-[#166534]" />
                <span>
                  <span className="block text-sm font-semibold text-[#111]">Forțează versetul ca existent</span>
                  <span className="block text-[11px] text-[#888]">Doar Admin · pentru când referința nu este recunoscută automat</span>
                </span>
              </label>
              {forceOn && (
                <div className="mt-3 pl-6">
                  <input type="text" value={forceId}
                    onChange={e => { setForceId(e.target.value.toUpperCase()); setForceCheck(null) }}
                    onBlur={() => verifyForce(forceId)}
                    placeholder="ID verset, ex: V245"
                    className="w-full h-10 rounded-xl border border-[#e8e2de] px-3 text-sm font-semibold text-[#111] outline-none focus:border-[#166534] transition-all bg-white placeholder:text-[#bbb] placeholder:font-normal uppercase" />
                  {forceChecking && <p className="text-[11px] mt-1.5 text-[#999]">Se verifică...</p>}
                  {!forceChecking && forceCheck?.ok && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <CheckCircleIcon className="w-3.5 h-3.5 text-[#166534]" />
                      <p className="text-[11px] text-[#166534] font-medium">
                        Verset găsit{forceCheck.ref ? `: ${forceCheck.ref}` : ''}
                      </p>
                    </div>
                  )}
                  {!forceChecking && forceCheck && !forceCheck.ok && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <ExclamationTriangleIcon className="w-3.5 h-3.5 text-[#991b1b]" />
                      <p className="text-[11px] text-[#991b1b] font-medium">Nu există niciun verset cu acest ID.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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