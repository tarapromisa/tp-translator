'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { supabase } from '@/lib/supabase'
import {
  ArrowLeftIcon, PencilSquareIcon, TrashIcon,
  CalendarIcon, ClockIcon, UserIcon, ShieldCheckIcon,
  HashtagIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid'
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import EditVersetDrawer from '@/components/EditVersetDrawer'

// ── Language config ───────────────────────────────────────────────
const LANGUAGES = [
  { code: 'RO', label: 'RO', name: 'Română',    versetField: 'verset_ro', refField: 'referinta_ro' },
  { code: 'ES', label: 'ES', name: 'Español',   versetField: 'verset_es', refField: 'referinta_es' },
  { code: 'EN', label: 'EN', name: 'English',   versetField: 'verset_en', refField: 'referinta_en' },
  { code: 'DE', label: 'DE', name: 'Deutsch',   versetField: 'verset_de', refField: 'referinta_de' },
  { code: 'PT', label: 'PT', name: 'Português', versetField: 'verset_pt', refField: 'referinta_pt' },
  { code: 'FR', label: 'FR', name: 'Français',  versetField: 'verset_fr', refField: 'referinta_fr' },
  { code: 'IT', label: 'IT', name: 'Italiano',  versetField: 'verset_it', refField: 'referinta_it' },
]

// ── Circular progress ─────────────────────────────────────────────
function CircularProgress({ percentage }: { percentage: number }) {
  const r = 52; const circ = 2 * Math.PI * r
  const dash = (percentage / 100) * circ
  return (
    <div className="relative w-[136px] h-[136px] flex-shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 136 136">
        <circle cx="68" cy="68" r={r} fill="none" stroke="#f0e8e4" strokeWidth="12" />
        <circle cx="68" cy="68" r={r} fill="none" stroke="#ce0100" strokeWidth="12"
          strokeLinecap="round" strokeDasharray={`${dash} ${circ}`}
          style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[30px] font-light text-[#111] leading-none">{percentage}%</span>
        <span className="text-[13px] text-[#888] mt-[3px]">Completat</span>
      </div>
    </div>
  )
}

// ── Status badges ─────────────────────────────────────────────────
function CitationStatusBadge({ status }: { status: string }) {
  const isComplete = status === 'Completat'
  return (
    <span className={`inline-flex items-center gap-[6px] px-[12px] h-[28px] rounded-full text-[12px] font-semibold ${
      isComplete ? 'bg-[#edfaf3] text-[#166534]' : 'bg-[#fff5eb] text-[#c05c00]'
    }`}>
      <ClockIcon className="w-[12px] h-[12px]" />
      {status ?? 'Incomplet'}
    </span>
  )
}

function ValidationBadge({ validation, status }: { validation: string | null, status: string }) {
  if (status !== 'Completat' || !validation) return <span className="text-sm text-[#aaa] italic">—</span>
  const map: Record<string, { bg: string; text: string }> = {
    'În așteptare': { bg: 'bg-[#eef3ff]', text: 'text-[#1e40af]' },
    'Validat':      { bg: 'bg-[#edfaf3]', text: 'text-[#166534]' },
    'Refuzat':      { bg: 'bg-[#fff1f1]', text: 'text-[#991b1b]' },
  }
  const s = map[validation] ?? map['În așteptare']
  return (
    <span className={`inline-flex items-center gap-[6px] px-[12px] h-[28px] rounded-full text-[12px] font-semibold ${s.bg} ${s.text}`}>
      <ShieldCheckIcon className="w-[12px] h-[12px]" />
      {validation}
    </span>
  )
}

// ── Delete Modal ──────────────────────────────────────────────────
function DeleteModal({ isOpen, versetRef, onConfirm, onCancel, isDeleting }: {
  isOpen: boolean; versetRef: string; onConfirm: () => void; onCancel: () => void; isDeleting: boolean
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && !isDeleting) onCancel() }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [isOpen, isDeleting])
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(10,6,4,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget && !isDeleting) onCancel() }}>
      <div className="bg-white rounded-[28px] w-full max-w-[420px] overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.18)]">
        <div className="h-[5px] bg-[#ce0100]" />
        {!isDeleting && (
          <button onClick={onCancel} className="absolute top-[18px] right-[18px] w-[32px] h-[32px] rounded-full bg-[#f4ece9] flex items-center justify-center hover:bg-[#ffe0e0] transition-all">
            <XMarkIcon className="w-[16px] h-[16px]" />
          </button>
        )}
        <div className="px-[36px] pt-[36px] pb-[32px]">
          <div className="flex justify-center mb-[24px]">
            <div className="w-[72px] h-[72px] rounded-full bg-[#fff1f1] border-[2px] border-[#f4d4d4] flex items-center justify-center">
              <ExclamationTriangleIcon className="w-[32px] h-[32px] text-[#ce0100]" />
            </div>
          </div>
          <h2 className="text-[22px] font-semibold text-[#111] text-center mb-[8px]">Ștergi versetul?</h2>
          <p className="text-sm text-[#666] text-center mb-[24px] leading-relaxed">
            Această acțiune este <strong className="text-[#111]">ireversibilă</strong>. Versetul și toate traducerile vor fi șterse permanent.
          </p>
          <div className="bg-[#faf7f5] border border-[#f0e9e5] rounded-[16px] px-[18px] py-[14px] mb-[28px]">
            <p className="text-sm font-semibold text-[#ce0100] mb-[4px]">{versetRef}</p>
          </div>
          <div className="flex gap-[10px]">
            <button onClick={onCancel} disabled={isDeleting}
              className="flex-1 h-[48px] rounded-[14px] border border-[#e8e2de] bg-white text-sm font-semibold text-[#666] hover:bg-[#faf7f5] disabled:opacity-40 transition-all">
              Anulează
            </button>
            <button onClick={onConfirm} disabled={isDeleting}
              className="flex-1 h-[48px] rounded-[14px] bg-[#ce0100] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(206,1,0,0.3)] hover:bg-[#a80000] disabled:opacity-70 transition-all">
              {isDeleting ? 'Se șterge...' : 'Da, șterge'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────
export default function VersetDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [verset, setVerset] = useState<any>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showEditDrawer, setShowEditDrawer] = useState(false)

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('versete')
        .select('*, created_by_user:created_by(full_name, role)')
        .eq('id', params.id)
        .single()
      setVerset(data); setLoading(false)
    }
    fetch()
  }, [params.id])

  if (loading) return (
    <main className="flex min-h-screen bg-[#f9f7f5]">
      <Sidebar />
      <div className="flex-1 flex items-center justify-center">
        <p className="text-base text-[#888]">Se încarcă...</p>
      </div>
    </main>
  )

  if (!verset) return null

  // ── Derived ───────────────────────────────────────────────────
  const langCards = LANGUAGES.map(lang => ({
    ...lang,
    text:      verset[lang.versetField] as string | null,
    reference: verset[lang.refField] as string | null,
  }))

  const completedCount = langCards.filter(c => c.text && c.text.trim() !== '').length
  const completionPct  = Math.round((completedCount / 7) * 100)

  const formattedDate = verset.created_at
    ? new Date(verset.created_at).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'

  const handleEdited = (updated: any) => { setVerset(updated) }

  const handleDeleteConfirm = async () => {
    setIsDeleting(true)
    await supabase.from('versete').delete().eq('id', verset.id)
    setIsDeleting(false); setShowDeleteModal(false)
    router.push('/versete')
  }

  return (
    <main className="flex min-h-screen bg-[#f9f7f5]">
      <Sidebar />

      <div className="flex-1 px-10 py-8 overflow-y-auto">

        {/* ── TOP BAR ── */}
        <div className="flex items-center justify-between mb-7">
          <button onClick={() => router.push('/versete')}
            className="flex items-center gap-2 text-sm text-[#666] hover:text-[#111] transition-colors">
            <ArrowLeftIcon className="w-4 h-4" /> Înapoi la versete
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowEditDrawer(true)}
              className="h-10 px-4 rounded-xl border border-[#e8e2de] bg-white flex items-center gap-2 text-sm text-[#444] hover:bg-[#faf7f5] transition-all">
              <PencilSquareIcon className="w-4 h-4" /> Editează
            </button>
            <button onClick={() => setShowDeleteModal(true)}
              className="h-10 w-10 rounded-xl bg-[#fff1f1] text-[#ce0100] flex items-center justify-center hover:bg-[#ffe0e0] transition-all">
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── MAIN GRID ── */}
        <div className="grid grid-cols-[1fr_360px] gap-5">

          {/* ══ LEFT ══ */}
          <div className="flex flex-col gap-5">

            {/* Hero card */}
            <div className="bg-white border border-[#e8e2de] rounded-[28px] px-10 py-9 shadow-sm">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-xs font-bold tracking-[0.18em] text-[#ce0100] uppercase mb-2">Verset biblic</p>
                  <h1 className="text-[44px] leading-none font-light text-[#ce0100] mb-3 tracking-tight">{verset.public_id}</h1>
                  <h2 className="text-2xl font-semibold text-[#111] mb-1">{verset.referinta_ro}</h2>
                </div>
                <CircularProgress percentage={completionPct} />
              </div>

              {/* Verset text */}
              <blockquote className="text-xl leading-relaxed font-light text-[#222] mb-4 border-l-[3px] border-[#ce0100] pl-5 italic">
                {verset.verset_ro || '—'}
              </blockquote>

              {/* Meta */}
              <div className="flex items-center gap-2 flex-wrap mb-6">
                <span className="inline-flex items-center gap-1.5 px-3 h-7 rounded-full border border-[#e8e2de] bg-[#faf7f5] text-xs text-[#555]">
                  <CalendarIcon className="w-3 h-3" /> {formattedDate}
                </span>
                <CitationStatusBadge status={verset.status ?? 'Incomplet'} />
                <span className="inline-flex items-center gap-1.5 px-3 h-7 rounded-full border border-[#e8e2de] bg-[#faf7f5] text-xs text-[#555]">
                  <UserIcon className="w-3 h-3" />
                  Creat de: <strong className="font-semibold text-[#111] ml-1">{verset.created_by_user?.full_name ?? '—'}</strong>
                </span>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-[#111]">Progres traduceri</span>
                  <span className="text-sm text-[#666]">{completedCount} / 7 traduceri complete</span>
                </div>
                <div className="h-2 bg-[#f0e8e4] rounded-full overflow-hidden">
                  <div className="h-full bg-[#ce0100] rounded-full transition-all duration-700" style={{ width: `${completionPct}%` }} />
                </div>
              </div>
            </div>

            {/* ── TRANSLATIONS unified card ── */}
            <div className="bg-white border border-[#e8e2de] rounded-[28px] overflow-hidden shadow-sm">
              <div className="px-8 py-5 border-b border-[#f0e8e4]">
                <h2 className="text-lg font-semibold text-[#111]">Traduceri pe limbi</h2>
              </div>
              <div className="divide-y divide-[#f8f3f0]">
                {langCards.map((item) => {
                  const isDone = item.text && item.text.trim() !== ''
                  const isRO   = item.code === 'RO'
                  return (
                    <div key={item.code} className={`px-8 py-5 ${!isDone ? 'bg-[#fffafa]' : ''}`}>
                      <div className="flex items-center gap-3 mb-3">
                        {/* Lang badge */}
                        <div className="w-10 h-10 rounded-[11px] bg-[#fff4f4] border border-[#ffd3d3] flex items-center justify-center text-[11px] font-bold text-[#ce0100] flex-shrink-0">
                          {item.label}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-[#111]">{item.name}</span>
                            {isRO && <span className="text-[10px] font-semibold px-2 h-[18px] inline-flex items-center rounded-full bg-[#fff4f4] text-[#ce0100] border border-[#f4d4d4]">Original</span>}
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {isDone ? (
                            <div className="flex items-center gap-1.5">
                              <CheckCircleSolid className="w-[14px] h-[14px] text-[#166534]" />
                              <span className="text-xs font-semibold text-[#166534]">Completat</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <ClockIcon className="w-[13px] h-[13px] text-[#c05c00]" />
                              <span className="text-xs font-semibold text-[#c05c00]">În așteptare</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Reference */}
                      {item.reference && (
                        <p className="text-xs text-[#ce0100] font-semibold mb-2 ml-[52px]">{item.reference}</p>
                      )}

                      {/* Text */}
                      {isDone && (
                        <p className="text-base leading-relaxed font-light text-[#222] ml-[52px] italic">
                          "{item.text}"
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

          </div>

          {/* ══ RIGHT ══ */}
          <div className="flex flex-col gap-4">

            {/* Details */}
            <div className="bg-white border border-[#e8e2de] rounded-[22px] p-6 shadow-sm">
              <h3 className="text-base font-semibold text-[#111] mb-4">Detalii verset</h3>
              <div className="flex flex-col gap-3">
                {[
                  { icon: CalendarIcon,    label: 'Data creării',   value: formattedDate,                                          valueClass: 'text-[#111] font-semibold' },
                  { icon: UserIcon,        label: 'Creat de',       value: verset.created_by_user?.full_name ?? '—',               valueClass: 'text-[#111] font-semibold' },
                  { icon: HashtagIcon,     label: 'ID verset',      value: verset.public_id,                                       valueClass: 'text-[#ce0100] font-semibold' },
                ].map(({ icon: Icon, label, value, valueClass }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-[#666]">
                        <Icon className="w-4 h-4" /> {label}
                      </div>
                      <span className={`text-sm ${valueClass}`}>{value}</span>
                    </div>
                    <div className="h-px bg-[#f4ece9] mt-3" />
                  </div>
                ))}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-[#666]">
                    <ClockIcon className="w-4 h-4" /> Stare citat
                  </div>
                  <CitationStatusBadge status={verset.status ?? 'Incomplet'} />
                </div>

                <div className="h-px bg-[#f4ece9]" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-[#666]">
                    <ShieldCheckIcon className="w-4 h-4" /> Stare validării
                  </div>
                  <ValidationBadge validation={verset.validation} status={verset.status ?? 'Incomplet'} />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <DeleteModal
        isOpen={showDeleteModal}
        versetRef={verset.referinta_ro ?? verset.public_id}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteModal(false)}
        isDeleting={isDeleting}
      />
      <EditVersetDrawer
        isOpen={showEditDrawer}
        verset={verset}
        onClose={() => setShowEditDrawer(false)}
        onSaved={handleEdited}
      />
    </main>
  )
}