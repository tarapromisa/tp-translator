'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { supabase } from '@/lib/supabase'
import DeleteModal from '@/components/DeleteModal'
import EditDrawer from '@/components/EditDrawer'
import {
  ArrowLeftIcon,
  PencilSquareIcon,
  TrashIcon,
  EnvelopeIcon,
  CalendarIcon,
  ClockIcon,
  UserIcon,
  ShieldCheckIcon,
  HashtagIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid'
import { FaWhatsapp } from 'react-icons/fa'

// ── Language config ──────────────────────────────────────────────
const LANGUAGES: {
  code: string
  label: string
  name: string
  flag: string
  field: string
  translatorField: string
}[] = [
  { code: 'RO', label: 'RO', name: 'Română',    flag: '🇷🇴', field: 'citat_ro', translatorField: 'translator_ro' },
  { code: 'ES', label: 'ES', name: 'Español',   flag: '🇪🇸', field: 'citat_es', translatorField: 'translator_es' },
  { code: 'EN', label: 'EN', name: 'English',   flag: '🇬🇧', field: 'citat_en', translatorField: 'translator_en' },
  { code: 'DE', label: 'DE', name: 'Deutsch',   flag: '🇩🇪', field: 'citat_de', translatorField: 'translator_de' },
  { code: 'PT', label: 'PT', name: 'Português', flag: '🇵🇹', field: 'citat_pt', translatorField: 'translator_pt' },
  { code: 'FR', label: 'FR', name: 'Français',  flag: '🇫🇷', field: 'citat_fr', translatorField: 'translator_fr' },
  { code: 'IT', label: 'IT', name: 'Italiano',  flag: '🇮🇹', field: 'citat_it', translatorField: 'translator_it' },
]

// ── Circular progress ────────────────────────────────────────────
function CircularProgress({ percentage }: { percentage: number }) {
  const r = 52
  const circ = 2 * Math.PI * r
  const dash = (percentage / 100) * circ

  return (
    <div className="relative w-[136px] h-[136px] flex-shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 136 136">
        <circle
          cx="68" cy="68" r={r}
          fill="none"
          stroke="#f4dede"
          strokeWidth="12"
        />
        <circle
          cx="68" cy="68" r={r}
          fill="none"
          stroke="#ce0100"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[30px] font-[800] text-[#111] leading-none">{percentage}%</span>
        <span className="text-[13px] text-[#9c8e87] mt-[3px]">Completat</span>
      </div>
    </div>
  )
}

// ── Stare citat badge (Incomplet / Completat) ───────────────────
function CitationStatusBadge({ status }: { status: string }) {
  const isComplete = status === 'Completat'
  return (
    <span className={`inline-flex items-center gap-[6px] px-[12px] h-[30px] rounded-full text-[12px] font-[600] ${
      isComplete
        ? 'bg-[#edfaf3] text-[#1a8c4e]'
        : 'bg-[#fff5eb] text-[#e87b00]'
    }`}>
      <ClockIcon className="w-[13px] h-[13px]" />
      {status ?? 'Incomplet'}
    </span>
  )
}

// ── Stare validare badge (În așteptare / Validat / Refuzat / —) ──
function ValidationBadge({ validation, citationStatus }: { validation: string | null, citationStatus: string }) {
  // Only show if citation is Completat
  if (citationStatus !== 'Completat' || !validation) {
    return <span className="text-[13px] text-[#c0b0aa] italic">—</span>
  }
  const map: Record<string, { bg: string; text: string }> = {
    'În așteptare': { bg: 'bg-[#eef3ff]', text: 'text-[#3b5bdb]' },
    'Validat':      { bg: 'bg-[#edfaf3]', text: 'text-[#1a8c4e]' },
    'Refuzat':      { bg: 'bg-[#fff1f1]', text: 'text-[#ce0100]' },
  }
  const s = map[validation] ?? { bg: 'bg-[#eef3ff]', text: 'text-[#3b5bdb]' }
  return (
    <span className={`inline-flex items-center gap-[6px] px-[12px] h-[30px] rounded-full text-[12px] font-[600] ${s.bg} ${s.text}`}>
      <ShieldCheckIcon className="w-[13px] h-[13px]" />
      {validation}
    </span>
  )
}

// ── Main page ────────────────────────────────────────────────────
export default function CitationDetailPage() {
  const params = useParams()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [citation, setCitation] = useState<any>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showEditDrawer, setShowEditDrawer] = useState(false)

  useEffect(() => {
    const fetchCitation = async () => {
      const { data } = await supabase
        .from('texts')
        .select(`
          *,
          translator_ro:traducator_ro ( full_name, role, active ),
          translator_es:traductor_es ( full_name, role, active ),
          translator_en:traductor_en ( full_name, role, active ),
          translator_de:traductor_de ( full_name, role, active ),
          translator_pt:traductor_pt ( full_name, role, active ),
          translator_fr:traductor_fr ( full_name, role, active ),
          translator_it:traductor_it ( full_name, role, active ),
          created_by_user:created_by ( full_name, role )
        `)
        .eq('id', params.id)
        .single()

      setCitation(data)
      setLoading(false)
    }
    fetchCitation()
  }, [params.id])

  if (loading) {
    return (
      <main className="flex min-h-screen bg-[#fcfbfa]">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[#8f8179] text-[18px]">Se încarcă...</p>
        </div>
      </main>
    )
  }

  if (!citation) return null

  // ── Derived data ───────────────────────────────────────────────
  const translationCards = LANGUAGES.map((lang) => ({
    ...lang,
    text:       citation[lang.field] as string | null,
    translator: lang.translatorField
      ? (citation[lang.translatorField]?.full_name ?? '')
      : null,
    email: lang.translatorField
      ? (citation[lang.translatorField]?.email ?? '')
      : null,
  }))

  // Count all 7 languages (RO + 6 translations)
  const completedCount = translationCards
    .filter((c) => c.text && c.text.trim() !== '').length

  const completionPct = Math.round((completedCount / 7) * 100)

  const translatorCards = translationCards

  const emails = translatorCards.map((c) => c.email).filter(Boolean).join(',')

  const whatsappText = encodeURIComponent(
    `*CITAT ${citation.public_id || ''}*\n\n${citation.citat_ro || ''}\n\n_${citation.autor_original || ''}_`
  )
  const whatsappUrl = `https://api.whatsapp.com/send?text=${whatsappText}`
  const mailUrl = `https://echipatp.github.io/tptranslator/mailcitatect.html?numarCitat=${encodeURIComponent(citation.public_id || '')}&citatRO=${encodeURIComponent(citation.citat_ro || '')}&autorRO=${encodeURIComponent(citation.autor_original || '')}&emails=${encodeURIComponent(emails)}`

  const handleDeleteConfirm = async () => {
    setIsDeleting(true)
    await supabase.from('texts').delete().eq('id', citation.id)
    setIsDeleting(false)
    setShowDeleteModal(false)
    router.push('/citate')
  }

  const handleEdited = (updated: any) => {
    setCitation(updated)
  }

  const formattedDate = citation.created_at
    ? new Date(citation.created_at).toLocaleDateString('ro-RO', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : '—'

  // ── Render ─────────────────────────────────────────────────────
  return (
    <main className="flex min-h-screen bg-[#fcfbfa]">
      <Sidebar />

      <div className="flex-1 px-[36px] py-[30px] overflow-y-auto">

        {/* ── TOP BAR ── */}
        <div className="flex items-center justify-between mb-[28px]">
          <button
            onClick={() => router.push('/citate')}
            className="flex items-center gap-[8px] text-[14px] text-[#8f8179] hover:text-[#111] transition-colors"
          >
            <ArrowLeftIcon className="w-[18px] h-[18px]" />
            Înapoi la citate
          </button>

          <div className="flex items-center gap-[10px]">
            <a
              href={whatsappUrl}
              target="_blank"
              className="h-[42px] px-[18px] rounded-[12px] bg-[#25D366] text-white flex items-center gap-[8px] text-[14px] font-[600] shadow-[0_8px_20px_rgba(37,211,102,0.25)] hover:brightness-105 transition-all"
            >
              <FaWhatsapp className="w-[17px] h-[17px]" />
              WhatsApp
            </a>

            <a
              href={mailUrl}
              target="_blank"
              className="h-[42px] px-[18px] rounded-[12px] bg-[#111] text-white flex items-center gap-[8px] text-[14px] font-[600] hover:bg-[#2a2a2a] transition-all"
            >
              <EnvelopeIcon className="w-[17px] h-[17px]" />
              Email
            </a>

            <button
              onClick={() => setShowEditDrawer(true)}
              className="h-[42px] px-[18px] rounded-[12px] border border-[#ece6e2] bg-white flex items-center gap-[8px] text-[14px] font-[500] hover:bg-[#faf7f5] transition-all"
            >
              <PencilSquareIcon className="w-[17px] h-[17px]" />
              Editează
            </button>

            <button
              onClick={() => setShowDeleteModal(true)}
              className="h-[42px] w-[42px] rounded-[12px] bg-[#fff1f1] text-[#ce0100] flex items-center justify-center hover:bg-[#ffe0e0] transition-all"
            >
              <TrashIcon className="w-[17px] h-[17px]" />
            </button>
          </div>
        </div>

        {/* ── MAIN GRID ── */}
        <div className="grid grid-cols-[1fr_360px] gap-[20px]">

          {/* ══ LEFT COLUMN ══ */}
          <div className="flex flex-col gap-[20px]">

            {/* Hero card */}
            <div className="bg-white border border-[#f0e9e5] rounded-[28px] px-[40px] py-[36px] shadow-[0_4px_24px_rgba(0,0,0,0.04)]">

              {/* ID row */}
              <div className="flex items-start justify-between mb-[24px]">
                <div>
                  <p className="text-[11px] font-[700] tracking-[0.2em] text-[#ce0100] uppercase mb-[6px]">
                    ID CITAT (RO)
                  </p>
                  <h1 className="text-[52px] leading-none font-[800] text-[#ce0100] mb-[14px]">
                    {citation.public_id}
                  </h1>
                  <div className="inline-flex items-center gap-[8px] px-[12px] h-[32px] rounded-full border border-[#f0d8d6] bg-[#fff7f7]">
                    <span className="text-[11px] font-[700] uppercase tracking-[0.08em] text-[#ce0100]">TEXT RO</span>
                    <span className="text-[14px] font-[700] text-[#222]">{citation.public_ro_id}</span>
                  </div>
                </div>
                <CircularProgress percentage={completionPct} />
              </div>

              {/* Quote */}
              <blockquote className="text-[42px] leading-[52px] tracking-[-0.03em] text-[#111] font-[300] mb-[14px]">
                "{citation.citat_ro}"
              </blockquote>
              <p className="text-[22px] text-[#b6a49c] font-[300] mb-[28px]">
                — {citation.autor_original}
              </p>

              {/* Meta row */}
              <div className="flex items-center gap-[10px] flex-wrap mb-[24px]">
                <span className="inline-flex items-center gap-[6px] px-[12px] h-[30px] rounded-full border border-[#ece6e2] bg-[#faf7f5] text-[12px] text-[#6b5e57]">
                  <CalendarIcon className="w-[13px] h-[13px]" />
                  {formattedDate}
                </span>
                <CitationStatusBadge status={citation.status ?? 'Incomplet'} />
                <span className="inline-flex items-center gap-[6px] px-[12px] h-[30px] rounded-full border border-[#ece6e2] bg-[#faf7f5] text-[12px] text-[#6b5e57]">
                  <UserIcon className="w-[13px] h-[13px]" />
                  Creat de: <strong className="font-[600] text-[#111]">{citation.created_by_user?.full_name ?? '—'}</strong>
                </span>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex items-center justify-between mb-[8px]">
                  <span className="text-[13px] font-[600] text-[#111]">Progres traduceri</span>
                  <span className="text-[13px] text-[#8f8179]">{completedCount} / 7 traduceri complete</span>
                </div>
                <div className="h-[8px] bg-[#f4ece9] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#ce0100] rounded-full transition-all duration-700"
                    style={{ width: `${completionPct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* ── TRANSLATIONS — unified card ── */}
            <div className="bg-white border border-[#f0e9e5] rounded-[28px] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
              <div className="px-[32px] py-[22px] border-b border-[#f4ece9]">
                <h2 className="text-[19px] font-[700] text-[#111]">Traduceri pe limbi</h2>
              </div>
              <div className="divide-y divide-[#f8f3f0]">
                {translationCards.map((item) => {
                  const isDone = item.text && item.text.trim() !== ''
                  const isRO   = item.code === 'RO'
                  return (
                    <div key={item.code} className={`px-[32px] py-[20px] ${isDone ? '' : 'bg-[#fffafa]'}`}>
                      {/* Top row: lang + translator + status */}
                      <div className="flex items-center gap-[12px] mb-[isDone ? 14px : 0px]">
                        <div className="w-[38px] h-[38px] rounded-[11px] bg-[#fff4f4] border border-[#ffd3d3] flex items-center justify-center text-[11px] font-[700] text-[#ce0100] flex-shrink-0">
                          {item.label}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-[6px]">
                            <span className="text-[13px] font-[600] text-[#111]">{item.name}</span>
                            {isRO && (
                              <span className="text-[10px] font-[600] px-[7px] h-[18px] inline-flex items-center rounded-full bg-[#fff4f4] text-[#ce0100] border border-[#f4d4d4]">
                                Original
                              </span>
                            )}
                          </div>
                          {!isRO && (
                            <p className="text-[11px] text-[#9c8e87] mt-[1px]">
                              {item.translator || <span className="italic text-[#c0b0aa]">Nealocat</span>}
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          {isDone ? (
                            <div className="flex items-center gap-[5px]">
                              <CheckCircleSolid className="w-[14px] h-[14px] text-[#1a8c4e]" />
                              <span className="text-[12px] font-[600] text-[#1a8c4e]">Completat</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-[5px]">
                              <ClockIcon className="w-[13px] h-[13px] text-[#e87b00]" />
                              <span className="text-[12px] font-[600] text-[#e87b00]">În așteptare</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Translation text — shown directly below */}
                      {isDone && (
                        <p className="text-[16px] leading-[26px] font-[300] text-[#222] mt-[12px] ml-[50px]">
                          {isRO ? `"${item.text}"` : item.text}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

          </div>

          {/* ══ RIGHT COLUMN ══ */}
          <div className="flex flex-col gap-[16px]">

            {/* Translators card */}
            <div className="bg-white border border-[#f0e9e5] rounded-[28px] p-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
              <h3 className="text-[17px] font-[700] text-[#111] mb-[16px]">Traducători implicați</h3>
              <div className="flex flex-col gap-[8px]">
                {translatorCards.map((item) => {
                  const translatorObj = item.translatorField ? citation[item.translatorField] : null
                  const role = translatorObj?.role ?? null
                  const active = translatorObj?.active ?? null
                  return (
                    <div key={item.code} className="flex items-center gap-[12px] rounded-[14px] bg-[#faf7f5] px-[14px] py-[11px]">
                      {/* Lang badge */}
                      <div className="w-[34px] h-[34px] rounded-[10px] bg-[#fff4f4] border border-[#ffd3d3] flex items-center justify-center text-[11px] font-[700] text-[#ce0100] flex-shrink-0">
                        {item.label}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-[500] text-[#111] truncate">
                          {item.translator || <span className="text-[#c0b0aa] font-[400] italic">Nealocat</span>}
                        </p>
                        {role && (
                          <p className="text-[11px] text-[#8f8179] truncate">{role}</p>
                        )}
                      </div>
                      {/* Active indicator */}
                      {item.translator && (
                        <div className={`w-[7px] h-[7px] rounded-full flex-shrink-0 ${active ? 'bg-[#1a8c4e]' : 'bg-[#d4c8c2]'}`}
                          title={active ? 'Activ' : 'Inactiv'} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Citation details card */}
            <div className="bg-white border border-[#f0e9e5] rounded-[28px] p-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
              <h3 className="text-[17px] font-[700] text-[#111] mb-[16px]">Detalii citat</h3>
              <div className="flex flex-col gap-[12px]">

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-[8px] text-[13px] text-[#8f8179]">
                    <CalendarIcon className="w-[15px] h-[15px]" />
                    Data creării
                  </div>
                  <span className="text-[13px] font-[600] text-[#111]">{formattedDate}</span>
                </div>

                <div className="h-px bg-[#f4ece9]" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-[8px] text-[13px] text-[#8f8179]">
                    <UserIcon className="w-[15px] h-[15px]" />
                    Creat de
                  </div>
                  <span className="text-[13px] font-[600] text-[#111]">
                    {citation.created_by_user?.full_name ?? '—'}
                  </span>
                </div>

                <div className="h-px bg-[#f4ece9]" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-[8px] text-[13px] text-[#8f8179]">
                    <ClockIcon className="w-[15px] h-[15px]" />
                    Stare citat
                  </div>
                  <CitationStatusBadge status={citation.status ?? 'Incomplet'} />
                </div>

                <div className="h-px bg-[#f4ece9]" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-[8px] text-[13px] text-[#8f8179]">
                    <ShieldCheckIcon className="w-[15px] h-[15px]" />
                    Stare validării
                  </div>
                  <ValidationBadge
                    validation={citation.validation}
                    citationStatus={citation.status ?? 'Incomplet'}
                  />
                </div>

                <div className="h-px bg-[#f4ece9]" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-[8px] text-[13px] text-[#8f8179]">
                    <HashtagIcon className="w-[15px] h-[15px]" />
                    ID citat (RO)
                  </div>
                  <span className="text-[13px] font-[600] text-[#ce0100]">{citation.public_id}</span>
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>
      <DeleteModal
        isOpen={showDeleteModal}
        citationId={citation.public_id}
        citationText={citation.citat_ro}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteModal(false)}
        isDeleting={isDeleting}
      />

      <EditDrawer
        isOpen={showEditDrawer}
        citation={citation}
        onClose={() => setShowEditDrawer(false)}
        onSaved={handleEdited}
      />
    </main>
  )
}