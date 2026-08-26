'use client'

import { useEffect, useState, useMemo } from 'react'
import Sidebar from '@/components/Sidebar'
import { useUser } from '@/context/UserContext'
import { supabase } from '@/lib/supabase'
import { fetchTareasWithStatus, TareaCalendarWithStatus, deleteTarea } from '@/lib/calendarTasks'
import { isValidReference } from '@/lib/bibleReference'
import TareaModal from '@/components/TareaModal'
import { useToast, ToastContainer } from '@/components/Toast'
import ConfirmDialog from '@/components/ConfirmDialog'
import {
  ChevronLeftIcon, ChevronRightIcon, CalendarDaysIcon, ListBulletIcon,
  CheckCircleIcon, XCircleIcon, PlusIcon, PencilIcon, TrashIcon, XMarkIcon,
} from '@heroicons/react/24/outline'

type ViewMode = 'month' | 'list'

type CitatROEvent = {
  id: string
  public_id: string
  text_original: string
  autor_original: string
  data_asignarii: string | null
  data_limita: string | null
  traducator_ro: string | null
  traducator_ro_user?: { full_name: string }[] | null
}

const WEEKDAYS = ['Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm', 'Dum']
const MONTHS = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie']

function pad(n: number) { return n.toString().padStart(2, '0') }
function toDateStr(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
function todayStr() { return toDateStr(new Date()) }

// ── Detail Modal for Coordonator (read-only) ──────────────
function TareaDetailModal({ tarea, onClose }: { tarea: TareaCalendarWithStatus; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[440px] bg-white rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.15)] overflow-hidden">
        <div className="h-1 bg-[#ce0100]" />
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#111]">Detalii sarcină</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#f9f7f5] flex items-center justify-center hover:bg-[#f0e8e4] transition-all">
              <XMarkIcon className="w-4 h-4 text-[#666]" />
            </button>
          </div>
          <div className="flex flex-col gap-3">
            <div className="bg-[#faf7f5] rounded-xl p-4">
              <p className="text-[11px] font-semibold text-[#999] uppercase tracking-wide mb-1">Referință / Descriere</p>
              <p className="text-[15px] font-semibold text-[#111]">{tarea.referinta_ro}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] font-semibold text-[#999] uppercase tracking-wide mb-1">Data</p>
                <p className="text-sm text-[#111]">{new Date(tarea.data + 'T00:00:00').toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
              </div>
              {tarea.coordonator_nume && (
                <div>
                  <p className="text-[11px] font-semibold text-[#999] uppercase tracking-wide mb-1">Asignat</p>
                  <p className="text-sm text-[#111]">{tarea.coordonator_nume}</p>
                </div>
              )}
            </div>
            {tarea.nota && (
              <div>
                <p className="text-[11px] font-semibold text-[#999] uppercase tracking-wide mb-1">Notă</p>
                <p className="text-sm text-[#555]">{tarea.nota}</p>
              </div>
            )}
            {isValidReference(tarea.referinta_ro) && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${tarea.gasit ? 'bg-[#edfaf3]' : 'bg-[#fff1f1]'}`}>
                {tarea.gasit
                  ? <CheckCircleIcon className="w-4 h-4 text-[#166534]" />
                  : <XCircleIcon className="w-4 h-4 text-[#991b1b]" />
                }
                <p className={`text-[12px] font-semibold ${tarea.gasit ? 'text-[#166534]' : 'text-[#991b1b]'}`}>
                  {tarea.gasit ? `Verset existent (${tarea.verset_public_id ?? ''})` : 'Verset neprogramat'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── CitatRO Detail Modal ────────────────────────────────
function CitatRODetailModal({ citat, onClose }: { citat: CitatROEvent; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[440px] bg-white rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.15)] overflow-hidden">
        <div className="h-1 bg-[#7c3aed]" />
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] font-bold text-[#7c3aed] tracking-widest uppercase mb-1">Citat RO</p>
              <h2 className="text-lg font-semibold text-[#111]">{citat.public_id}</h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#f9f7f5] flex items-center justify-center hover:bg-[#f0e8e4] transition-all">
              <XMarkIcon className="w-4 h-4 text-[#666]" />
            </button>
          </div>
          <div className="flex flex-col gap-3">
            <div className="bg-[#faf7f5] rounded-xl p-4">
              <p className="text-[13px] text-[#444] italic leading-relaxed">"{citat.text_original}"</p>
              <p className="text-[11px] text-[#888] mt-2">— {citat.autor_original}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] font-semibold text-[#999] uppercase tracking-wide mb-1">Data asignării</p>
                <p className="text-sm text-[#111]">{citat.data_asignarii ? new Date(citat.data_asignarii + 'T00:00:00').toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-[#999] uppercase tracking-wide mb-1">Dată limită</p>
                <p className="text-sm text-[#111]">{citat.data_limita ? new Date(citat.data_limita + 'T00:00:00').toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</p>
              </div>
            </div>
            {citat.traducator_ro_user?.[0]?.full_name && (
              <div>
                <p className="text-[11px] font-semibold text-[#999] uppercase tracking-wide mb-1">Traducător RO</p>
                <p className="text-sm text-[#111]">{citat.traducator_ro_user.full_name}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CalendarPage() {
  const { profile } = useUser()
  const role = profile?.role
  const isAdmin = role === 'Admin'
  const canManage = isAdmin || role === 'Coordonator principal'
  const isCoordinator = role === 'Coordonator'
  const canSeeCalendar = ['Admin', 'Coordonator', 'Coordonator principal'].includes(role ?? '')
  const isTraducatorRO = role === 'Traducător' && profile?.language === 'RO'
  const canSeeCitatRO = canSeeCalendar || isTraducatorRO

  const [view, setView] = useState<ViewMode>('month')
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [tareas, setTareas] = useState<TareaCalendarWithStatus[]>([])
  const [citateRO, setCitateRO] = useState<CitatROEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTarea, setEditingTarea] = useState<TareaCalendarWithStatus | null>(null)
  const [modalDate, setModalDate] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [detailTarea, setDetailTarea] = useState<TareaCalendarWithStatus | null>(null)
  const [detailCitat, setDetailCitat] = useState<CitatROEvent | null>(null)
  const { toasts, showToast } = useToast()

  const range = useMemo(() => {
    if (view === 'month') {
      const first = new Date(currentMonth.year, currentMonth.month, 1)
      const last = new Date(currentMonth.year, currentMonth.month + 1, 0)
      const startPad = (first.getDay() + 6) % 7
      const endPad = (7 - ((last.getDay() + 6) % 7 + 1)) % 7
      const start = new Date(first); start.setDate(first.getDate() - startPad)
      const end = new Date(last); end.setDate(last.getDate() + endPad)
      return { from: toDateStr(start), to: toDateStr(end) }
    } else {
      const today = new Date()
      const end = new Date(today); end.setDate(today.getDate() + 60)
      const start = new Date(today); start.setDate(today.getDate() - 7)
      return { from: toDateStr(start), to: toDateStr(end) }
    }
  }, [view, currentMonth])

  const fetchData = async () => {
    setLoading(true)

    // Fetch tareas (only for coordinators)
    if (canSeeCalendar) {
      const data = await fetchTareasWithStatus(supabase, range.from, range.to)
      setTareas(data)
    }

    // Fetch citate RO with dates in range
    if (canSeeCitatRO) {
      let q = supabase
        .from('citate_ro')
        .select('id, public_id, text_original, autor_original, data_asignarii, data_limita, traducator_ro, traducator_ro_user:traducator_ro(full_name)')
        .not('data_asignarii', 'is', null)

      // Traducator RO sees only their own
      if (isTraducatorRO && profile?.id) {
        q = q.eq('traducator_ro', profile.id)
      }

      const { data: cr } = await q
      setCitateRO(cr || [])
    }

    setLoading(false)
  }

  useEffect(() => { fetchData() }, [range.from, range.to])

  const tareasByDate = useMemo(() => {
    const map = new Map<string, TareaCalendarWithStatus[]>()
    for (const t of tareas) {
      if (!map.has(t.data)) map.set(t.data, [])
      map.get(t.data)!.push(t)
    }
    return map
  }, [tareas])

  // For each calendar day, find citate RO that span that day
  const citatROByDate = useMemo(() => {
    const map = new Map<string, CitatROEvent[]>()
    for (const c of citateRO) {
      if (!c.data_asignarii) continue
      const start = c.data_asignarii
      const end = c.data_limita ?? c.data_asignarii
      // Add to each day in range
      let cur = new Date(start + 'T00:00:00')
      const endDate = new Date(end + 'T00:00:00')
      while (cur <= endDate) {
        const ds = toDateStr(cur)
        if (!map.has(ds)) map.set(ds, [])
        map.get(ds)!.push(c)
        cur.setDate(cur.getDate() + 1)
      }
    }
    return map
  }, [citateRO])

  const handleDeleteConfirmed = async () => {
    if (!confirmDeleteId) return
    const result = await deleteTarea(supabase, confirmDeleteId)
    setConfirmDeleteId(null)
    if (!result.success) { showToast(result.error ?? 'Eroare la ștergere.', 'error'); return }
    showToast('Sarcina a fost ștearsă.', 'success')
    fetchData()
  }

  const openCreateModal = (date?: string) => {
    setEditingTarea(null)
    setModalDate(date ?? todayStr())
    setModalOpen(true)
  }

  const openEditModal = (tarea: TareaCalendarWithStatus) => {
    if (canManage) {
      setEditingTarea(tarea)
      setModalDate(tarea.data)
      setModalOpen(true)
    } else {
      setDetailTarea(tarea)
    }
  }

  const monthGrid = useMemo(() => {
    if (view !== 'month') return []
    const first = new Date(currentMonth.year, currentMonth.month, 1)
    const startPad = (first.getDay() + 6) % 7
    const start = new Date(first); start.setDate(first.getDate() - startPad)
    const days: { date: Date; inMonth: boolean }[] = []
    for (let i = 0; i < 42; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i)
      days.push({ date: d, inMonth: d.getMonth() === currentMonth.month })
      if (days.length >= 35 && d.getMonth() !== currentMonth.month && i % 7 === 6) break
    }
    return days
  }, [view, currentMonth])

  if (!canSeeCalendar && !isTraducatorRO) {
    return (
      <main className="flex h-screen overflow-hidden bg-[#f9f7f5]">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-base text-[#888]">Nu ai acces la această pagină.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex h-screen overflow-hidden bg-[#f9f7f5]">
      <Sidebar />
      <div className="flex-1 min-w-0 px-4 py-6 md:px-10 md:py-8 overflow-y-auto overflow-x-hidden">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
          <div>
            <h1 className="text-[40px] md:text-[52px] leading-none tracking-tight font-light text-[#111] mb-3">Calendar</h1>
            <div className="w-10 h-[3px] rounded-full bg-[#ce0100] mb-4" />
            <p className="text-base text-[#666]">Sarcini zilnice — referințe biblice și alte activități.</p>
          </div>
          {canManage && (
            <button onClick={() => openCreateModal()}
              className="h-11 px-6 rounded-xl bg-[#ce0100] text-white text-sm font-semibold shadow-[0_6px_16px_rgba(206,1,0,0.22)] hover:bg-[#a80000] transition-all flex items-center gap-2">
              <PlusIcon className="w-4 h-4" /> Sarcină nouă
            </button>
          )}
        </div>

        <div className="bg-white border border-[#e8e2de] rounded-2xl px-4 md:px-5 py-3 mb-4 shadow-sm flex items-center justify-between gap-3 flex-wrap">
          {view === 'month' ? (
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentMonth(m => m.month === 0 ? { year: m.year - 1, month: 11 } : { year: m.year, month: m.month - 1 })}
                className="w-9 h-9 rounded-xl bg-[#f9f7f5] border border-[#e8e2de] flex items-center justify-center hover:bg-[#f0e8e4] transition-all">
                <ChevronLeftIcon className="w-4 h-4 text-[#666]" />
              </button>
              <span className="text-base font-semibold text-[#111] min-w-[160px] text-center">
                {MONTHS[currentMonth.month]} {currentMonth.year}
              </span>
              <button onClick={() => setCurrentMonth(m => m.month === 11 ? { year: m.year + 1, month: 0 } : { year: m.year, month: m.month + 1 })}
                className="w-9 h-9 rounded-xl bg-[#f9f7f5] border border-[#e8e2de] flex items-center justify-center hover:bg-[#f0e8e4] transition-all">
                <ChevronRightIcon className="w-4 h-4 text-[#666]" />
              </button>
              <button onClick={() => { const now = new Date(); setCurrentMonth({ year: now.getFullYear(), month: now.getMonth() }) }}
                className="h-9 px-3 rounded-xl border border-[#e8e2de] text-sm text-[#666] hover:bg-[#f9f7f5] transition-all ml-1">
                Astăzi
              </button>
            </div>
          ) : (
            <span className="text-base font-semibold text-[#111]">Următoarele sarcini</span>
          )}
          <div className="flex items-center gap-2">
            {/* Legend */}
            <div className="hidden md:flex items-center gap-3 mr-2">
              <span className="flex items-center gap-1.5 text-[11px] text-[#888]">
                <span className="w-3 h-3 rounded-sm bg-[#edfaf3] border border-[#166534]" /> Sarcină cu verset
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-[#888]">
                <span className="w-3 h-3 rounded-sm bg-[#ede9fe] border border-[#7c3aed]" /> Citat RO
              </span>
            </div>
            <div className="flex items-center gap-1 bg-[#f9f7f5] border border-[#e8e2de] rounded-xl p-1">
              {([['month', CalendarDaysIcon], ['list', ListBulletIcon]] as [ViewMode, any][]).map(([v, Icon]) => (
                <button key={v} onClick={() => setView(v)}
                  className={`h-8 px-3 rounded-lg flex items-center gap-1.5 text-sm font-medium transition-all ${
                    view === v ? 'bg-white shadow-sm text-[#ce0100]' : 'text-[#aaa] hover:text-[#444]'
                  }`}>
                  <Icon className="w-4 h-4" /> {v === 'month' ? 'Lună' : 'Listă'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-base text-[#888]">Se încarcă...</p>
          </div>
        ) : view === 'month' ? (
          <div className="bg-white border border-[#e8e2de] rounded-2xl overflow-hidden shadow-sm">
            <div className="grid grid-cols-7 border-b border-[#f0e8e4]">
              {WEEKDAYS.map(w => (
                <div key={w} className="px-2 py-2 text-center text-[11px] font-semibold text-[#999] uppercase tracking-wide">{w}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {monthGrid.map(({ date, inMonth }, i) => {
                const dateStr = toDateStr(date)
                const dayTareas = tareasByDate.get(dateStr) ?? []
                const dayCitateRO = citatROByDate.get(dateStr) ?? []
                const isToday = dateStr === todayStr()
                return (
                  <div key={i}
                    onClick={() => canManage && openCreateModal(dateStr)}
                    className={`min-h-[80px] md:min-h-[120px] border-b border-r border-[#f5efec] p-1 md:p-2 flex flex-col gap-0.5 ${
                      !inMonth ? 'bg-[#fbfaf9]' : 'bg-white'
                    } ${canManage ? 'cursor-pointer hover:bg-[#fff7f7]' : ''}`}>
                    <span className={`text-[11px] md:text-[12px] font-semibold mb-0.5 ${
                      isToday ? 'inline-flex items-center justify-center w-5 h-5 md:w-6 md:h-6 rounded-full bg-[#ce0100] text-white' :
                      inMonth ? 'text-[#444]' : 'text-[#ccc]'
                    }`}>{date.getDate()}</span>

                    {/* Citate RO bars — purple */}
                    {dayCitateRO.map(c => (
                      <div key={c.id}
                        onClick={e => { e.stopPropagation(); setDetailCitat(c) }}
                        className="flex items-center px-1 py-0.5 rounded-sm text-[9px] md:text-[10px] font-semibold leading-tight bg-[#ede9fe] text-[#5b21b6] cursor-pointer hover:opacity-80 truncate"
                        title={`${c.public_id} — ${c.traducator_ro_user?.[0]?.full_name ?? ''}`}>
                        <span className="truncate">{c.public_id}</span>
                      </div>
                    ))}

                    {/* Tareas */}
                    {dayTareas.map(t => {
                      const isBible = isValidReference(t.referinta_ro)
                      return (
                        <div key={t.id}
                          onClick={(e) => { e.stopPropagation(); openEditModal(t) }}
                          className={`flex items-center gap-1 px-1 py-0.5 rounded-md text-[9px] md:text-[10px] font-semibold leading-tight cursor-pointer ${
                            isBible
                              ? t.gasit ? 'bg-[#edfaf3] text-[#166534]' : 'bg-[#fff1f1] text-[#991b1b]'
                              : 'bg-[#f4f0ed] text-[#555]'
                          } hover:opacity-80`}>
                          {isBible && (t.gasit
                            ? <CheckCircleIcon className="w-2.5 h-2.5 flex-shrink-0" />
                            : <XCircleIcon className="w-2.5 h-2.5 flex-shrink-0" />
                          )}
                          <span className="truncate">{t.referinta_ro}</span>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white border border-[#e8e2de] rounded-2xl overflow-hidden shadow-sm">
            {tareas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <p className="text-3xl">📅</p>
                <p className="text-base text-[#888]">Nicio sarcină programată.</p>
              </div>
            ) : (
              tareas.map((t, i) => {
                const d = new Date(t.data + 'T00:00:00')
                const isBible = isValidReference(t.referinta_ro)
                return (
                  <div key={t.id}
                    className={`flex items-center gap-3 md:gap-4 px-4 md:px-5 py-3 ${i < tareas.length - 1 ? 'border-b border-[#f8f3f0]' : ''}`}>
                    <div className="w-12 md:w-16 flex-shrink-0 text-center">
                      <p className="text-[10px] text-[#999] uppercase">{WEEKDAYS[(d.getDay() + 6) % 7]}</p>
                      <p className={`text-base md:text-lg font-bold ${t.data === todayStr() ? 'text-[#ce0100]' : 'text-[#111]'}`}>{d.getDate()}</p>
                      <p className="text-[10px] text-[#bbb]">{MONTHS[d.getMonth()].slice(0, 3)}</p>
                    </div>
                    {isBible && (
                      t.gasit
                        ? <CheckCircleIcon className="w-5 h-5 md:w-6 md:h-6 text-[#166534] flex-shrink-0" />
                        : <XCircleIcon className="w-5 h-5 md:w-6 md:h-6 text-[#991b1b] flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#111]">{t.referinta_ro}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {t.coordonator_nume && (
                          <span className="text-[11px] text-[#666] bg-[#f9f7f5] border border-[#e8e2de] rounded-full px-2 py-0.5">
                            {t.coordonator_nume}
                          </span>
                        )}
                        {isBible && t.gasit && t.verset_public_id && (
                          <span className="text-[11px] text-[#166534] bg-[#edfaf3] rounded-full px-2 py-0.5 font-semibold">
                            {t.verset_public_id}
                          </span>
                        )}
                        {t.nota && <span className="text-[11px] text-[#999]">{t.nota}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {canManage ? (
                        <>
                          <button onClick={() => openEditModal(t)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#f9f7f5] transition-all">
                            <PencilIcon className="w-4 h-4 text-[#999]" />
                          </button>
                          <button onClick={() => setConfirmDeleteId(t.id)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#fff1f1] transition-all">
                            <TrashIcon className="w-4 h-4 text-[#ce0100]" />
                          </button>
                        </>
                      ) : (
                        <button onClick={() => setDetailTarea(t)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#f9f7f5] transition-all">
                          <ChevronRightIcon className="w-4 h-4 text-[#999]" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {modalOpen && (
        <TareaModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); fetchData() }}
          tarea={editingTarea}
          defaultDate={modalDate}
        />
      )}

      {detailTarea && (
        <TareaDetailModal tarea={detailTarea} onClose={() => setDetailTarea(null)} />
      )}

      {detailCitat && (
        <CitatRODetailModal citat={detailCitat} onClose={() => setDetailCitat(null)} />
      )}

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Șterge sarcina"
        message="Sigur vrei să ștergi această sarcină? Acțiunea nu poate fi anulată."
        confirmLabel="Șterge"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmDeleteId(null)}
      />

      <ToastContainer toasts={toasts} />
    </main>
  )
}