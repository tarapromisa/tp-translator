'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeftIcon, ArrowRightIcon, XMarkIcon, CheckIcon, CalendarIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabase'

type Props = { open: boolean; onClose: () => void }

const QUOTE_TYPES = ['CT', 'SP', 'TXT', 'RE']

const LANG_KEYS = [
  { key: 'ro', label: 'Română',     code: 'RO' },
  { key: 'es', label: 'Spaniolă',   code: 'ES' },
  { key: 'en', label: 'Engleză',    code: 'EN' },
  { key: 'de', label: 'Germană',    code: 'DE' },
  { key: 'pt', label: 'Portugheză', code: 'PT' },
  { key: 'fr', label: 'Franceză',   code: 'FR' },
  { key: 'it', label: 'Italiană',   code: 'IT' },
]

const STEP_COPY = [
  { title: 'Ce tip de citat?',     sub: 'Alege prefixul potrivit pentru acest conținut.' },
  { title: 'Selectează citatul',   sub: 'Alege citatul original din română pe care îl traducem.' },
  { title: 'Data asignării',       sub: 'Când se asignează acest citat traducătorilor?' },
  { title: 'Atribuie traducători', sub: 'Cine va da viață acestui citat în fiecare limbă?' },
]

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function CreateCitatModal({ open, onClose }: Props) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [quoteType, setQuoteType] = useState('')
  const [availableQuotes, setAvailableQuotes] = useState<any[]>([])
  const [selectedQuoteId, setSelectedQuoteId] = useState('')
  const [selectedQuote, setSelectedQuote] = useState<any>(null)
  const [roTranslator, setRoTranslator] = useState<any>(null)
  const [translators, setTranslators] = useState<Record<string, string>>({})
  const [usersByLang, setUsersByLang] = useState<Record<string, any[]>>({})
  const [loadingQuotes, setLoadingQuotes] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [dataAsignarii, setDataAsignarii] = useState('')
  const [lastDate, setLastDate] = useState<string | null>(null)

  const reset = () => {
    setStep(1); setQuoteType(''); setAvailableQuotes([])
    setSelectedQuoteId(''); setSelectedQuote(null); setRoTranslator(null)
    setTranslators({}); setUsersByLang({}); setLoading(false)
    setDataAsignarii(''); setLastDate(null)
  }

  const handleClose = () => { reset(); onClose() }

  const fetchQuotes = async () => {
    setLoadingQuotes(true)
    try {
      const { data: allQuotes } = await supabase.from('citate_ro').select('*').eq('status', 'Completat')
      const { data: used } = await supabase.from('texts').select('public_ro_id')
      const usedIds = new Set((used || []).map((u: any) => u.public_ro_id).filter(Boolean))
      setAvailableQuotes((allQuotes || []).filter((q: any) => !usedIds.has(q.public_id)))
    } catch (err) { console.error(err) }
    setLoadingQuotes(false)
  }

  const fetchLastDate = async () => {
    // Get last data_asignarii used in texts
    const { data } = await supabase
      .from('texts')
      .select('data_asignarii')
      .not('data_asignarii', 'is', null)
      .order('data_asignarii', { ascending: false })
      .limit(1)

    if (data && data.length > 0 && data[0].data_asignarii) {
      const last = data[0].data_asignarii
      setLastDate(last)
      setDataAsignarii(addDays(last, 1))
    } else {
      setDataAsignarii(new Date().toISOString().split('T')[0])
      setLastDate(null)
    }
  }

  const fetchUsers = async () => {
    setLoadingUsers(true)
    const map: Record<string, any[]> = {}
    for (const lang of LANG_KEYS.filter(l => l.key !== 'ro')) {
      const { data } = await supabase.from('users').select('*').eq('language', lang.code).eq('active', true)
      map[lang.key] = data || []
    }
    setUsersByLang(map)
    setLoadingUsers(false)
  }

  const handleSelectQuote = async (q: any) => {
    setSelectedQuoteId(q.public_id)
    setSelectedQuote(q)
    if (q.traducator_ro) {
      const { data: user } = await supabase.from('users').select('id, full_name').eq('id', q.traducator_ro).single()
      setRoTranslator(user ?? null)
    } else {
      setRoTranslator(null)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      let profileId: string | null = null
      if (user) {
        const { data: profile } = await supabase.from('users').select('id').eq('auth_user_id', user.id).single()
        profileId = profile?.id ?? null
      }

      const { data: last } = await supabase.from('texts').select('public_id')
        .eq('type', quoteType).order('created_at', { ascending: false }).limit(1)
      let next = 1
      if (last?.length) next = parseInt(last[0].public_id.replace(/\D/g, '')) + 1
      const generatedId = `${quoteType}${String(next).padStart(3, '0')}`

      const payload = {
        public_id: generatedId, type: quoteType,
        ro_source_id: selectedQuote?.id,
        public_ro_id: selectedQuote?.public_id,
        citat_ro: selectedQuote?.text_original ?? selectedQuote?.citat_ro,
        autor_original: selectedQuote?.autor_original,
        traducator_ro: roTranslator?.id ?? null,
        traductor_es: translators.es || null,
        traductor_en: translators.en || null,
        traductor_de: translators.de || null,
        traductor_pt: translators.pt || null,
        traductor_fr: translators.fr || null,
        traductor_it: translators.it || null,
        created_by: profileId,
        status: 'Incomplet',
        data_asignarii: dataAsignarii || null,
      }

      const { data, error } = await supabase.from('texts').insert(payload).select()
      if (error) { alert(error.message); setLoading(false); return }

      if (profileId) await supabase.from('activity_logs').insert({
        user_id: profileId, action: 'create', entity_type: 'citat', entity_name: data?.[0]?.public_id,
      })

      reset(); onClose(); window.location.reload()
    } catch (err) { console.error(err); alert('A apărut o eroare.'); setLoading(false) }
  }

  if (!open) return null

  const copy = STEP_COPY[step - 1]

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4"
      style={{ background: 'rgba(10,6,4,0.65)', backdropFilter: 'blur(10px)' }}>
      <style>{`
        @keyframes modalIn {
          from { opacity:0; transform:scale(0.94) translateY(20px); }
          to   { opacity:1; transform:scale(1) translateY(0); }
        }
        .modal-in { animation: modalIn 0.3s cubic-bezier(0.22,1,0.36,1) forwards; }
      `}</style>

      <div className="modal-in bg-white rounded-[36px] w-full max-w-[680px] relative overflow-hidden shadow-[0_48px_120px_rgba(0,0,0,0.24)]">
        <div className="h-[4px] w-full bg-[#ce0100]" />

        {/* Header */}
        <div className="px-[48px] pt-[38px] pb-[28px] border-b border-[#f0e9e5]">
          <div className="flex items-start justify-between gap-[16px]">
            <div className="flex-1">
              <div className="flex items-center gap-[6px] mb-[14px]">
                {step > 1 && (
                  <button onClick={() => setStep(s => s - 1)}
                    className="w-[26px] h-[26px] rounded-full bg-[#faf7f5] border border-[#ece6e2] flex items-center justify-center hover:bg-[#ffe0e0] hover:border-[#ffd3d3] transition-all mr-[2px]">
                    <ArrowLeftIcon className="w-[12px] h-[12px] text-[#555]" />
                  </button>
                )}
                {[1,2,3,4].map((s) => (
                  <div key={s} className="flex items-center gap-[5px]">
                    <div className={`w-[20px] h-[20px] rounded-full flex items-center justify-center text-[9px] transition-all ${
                      s < step ? 'bg-[#1a8c4e] text-white' :
                      s === step ? 'bg-[#ce0100] text-white' :
                      'bg-[#f0e9e5] text-[#b0a39c]'
                    }`} style={{ fontWeight: 700 }}>
                      {s < step ? <CheckIcon className="w-[9px] h-[9px]" /> : s}
                    </div>
                    {s < 4 && <div className={`w-[14px] h-[1px] ${s < step ? 'bg-[#1a8c4e]' : 'bg-[#f0e9e5]'}`} />}
                  </div>
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div key={step}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                  <h2 className="text-[#111] tracking-[-0.04em] mb-[6px]" style={{ fontSize: '30px', fontWeight: 300 }}>
                    {copy.title}
                  </h2>
                  <p className="text-[14px] text-[#555]" style={{ fontWeight: 300 }}>{copy.sub}</p>
                </motion.div>
              </AnimatePresence>
            </div>
            <button onClick={handleClose}
              className="w-[36px] h-[36px] rounded-full bg-[#faf7f5] border border-[#ece6e2] flex items-center justify-center hover:bg-[#ffe0e0] transition-all flex-shrink-0 mt-[4px]">
              <XMarkIcon className="w-[15px] h-[15px] text-[#555]" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-[48px] py-[32px]">
          <AnimatePresence mode="wait">

            {/* STEP 1 — Tip */}
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-14 }}>
                <div className="grid grid-cols-4 gap-[12px] mb-[32px]">
                  {QUOTE_TYPES.map((t) => (
                    <button key={t} onClick={() => setQuoteType(t)}
                      className={`h-[100px] rounded-[20px] border-[2px] flex flex-col items-center justify-center gap-[8px] transition-all ${
                        quoteType === t
                          ? 'border-[#ce0100] bg-[#fff7f7] shadow-[0_4px_16px_rgba(206,1,0,0.14)]'
                          : 'border-[#f0e9e5] hover:border-[#ffd3d3] hover:bg-[#fffafa]'
                      }`}>
                      <span style={{ fontSize: '26px', fontWeight: 700, color: quoteType === t ? '#ce0100' : '#111' }}>{t}</span>
                      {quoteType === t && <span className="w-[5px] h-[5px] rounded-full bg-[#ce0100]" />}
                    </button>
                  ))}
                </div>
                <div className="flex justify-end">
                  <button disabled={!quoteType}
                    onClick={async () => { await fetchQuotes(); setStep(2) }}
                    className="h-[46px] px-[26px] rounded-[14px] bg-[#ce0100] text-white text-[14px] flex items-center gap-[8px] shadow-[0_6px_16px_rgba(206,1,0,0.25)] hover:bg-[#a80000] disabled:opacity-40 disabled:shadow-none transition-all"
                    style={{ fontWeight: 500 }}>
                    Continuă <ArrowRightIcon className="w-[14px] h-[14px]" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2 — Selectează citatul */}
            {step === 2 && (
              <motion.div key="s2" initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-14 }}>
                {loadingQuotes ? (
                  <p className="text-center py-[40px] text-[14px] text-[#888]">Se încarcă citatele...</p>
                ) : (
                  <>
                    <div className="border border-[#f0e9e5] rounded-[20px] overflow-hidden mb-[16px]"
                      style={{ maxHeight: '280px', overflowY: 'auto' }}>
                      {availableQuotes.length === 0 ? (
                        <p className="text-center py-[40px] text-[14px] text-[#888]">Niciun citat disponibil.</p>
                      ) : availableQuotes.map((q, i) => (
                        <button key={q.id} onClick={() => handleSelectQuote(q)}
                          className={`w-full flex items-start gap-[14px] px-[20px] py-[14px] text-left transition-colors ${
                            selectedQuoteId === q.public_id ? 'bg-[#fff7f7]' : 'hover:bg-[#faf7f5]'
                          } ${i > 0 ? 'border-t border-[#f8f3f0]' : ''}`}>
                          <div className={`w-[16px] h-[16px] rounded-full border-[2px] flex-shrink-0 mt-[3px] flex items-center justify-center transition-all ${
                            selectedQuoteId === q.public_id ? 'border-[#ce0100] bg-[#ce0100]' : 'border-[#d4c8c2]'
                          }`}>
                            {selectedQuoteId === q.public_id && <span className="w-[5px] h-[5px] rounded-full bg-white" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[12px] text-[#ce0100] block mb-[2px]" style={{ fontWeight: 700 }}>{q.public_id}</span>
                            <p className="text-[13px] text-[#333] line-clamp-1" style={{ fontWeight: 300 }}>
                              "{q.text_original ?? q.citat_ro}"
                            </p>
                            {q.autor_original && <p className="text-[12px] text-[#888] mt-[2px]">— {q.autor_original}</p>}
                          </div>
                        </button>
                      ))}
                    </div>

                    {selectedQuote && (
                      <div className="bg-[#faf7f5] border border-[#f0e9e5] rounded-[16px] px-[18px] py-[14px] mb-[24px]">
                        <div className="flex items-center justify-between mb-[6px]">
                          <span className="text-[12px] text-[#ce0100]" style={{ fontWeight: 700 }}>{selectedQuote.public_id}</span>
                          {roTranslator && (
                            <div className="inline-flex items-center gap-[6px] px-[10px] h-[24px] rounded-full bg-white border border-[#f0e9e5]">
                              <span className="w-[5px] h-[5px] rounded-full bg-[#1a8c4e]" />
                              <span className="text-[12px] text-[#444]" style={{ fontWeight: 500 }}>
                                Traducător RO: {roTranslator.full_name}
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="text-[13px] text-[#333] line-clamp-2" style={{ fontWeight: 300 }}>
                          "{selectedQuote.text_original ?? selectedQuote.citat_ro}"
                        </p>
                      </div>
                    )}
                  </>
                )}
                <div className="flex justify-end">
                  <button disabled={!selectedQuoteId}
                    onClick={async () => { await fetchLastDate(); setStep(3) }}
                    className="h-[46px] px-[26px] rounded-[14px] bg-[#ce0100] text-white text-[14px] flex items-center gap-[8px] shadow-[0_6px_16px_rgba(206,1,0,0.25)] hover:bg-[#a80000] disabled:opacity-40 disabled:shadow-none transition-all"
                    style={{ fontWeight: 500 }}>
                    Continuă <ArrowRightIcon className="w-[14px] h-[14px]" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3 — Data asignării */}
            {step === 3 && (
              <motion.div key="s3" initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-14 }}>

                {/* Date picker */}
                <div className="mb-[20px]">
                  <label className="text-[11px] font-semibold text-[#666] uppercase tracking-wide block mb-[8px]">
                    Data asignării <span className="text-[#ce0100]">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-[14px] top-1/2 -translate-y-1/2">
                      <CalendarIcon className="w-[18px] h-[18px] text-[#bbb]" />
                    </div>
                    <input type="date" value={dataAsignarii} onChange={e => setDataAsignarii(e.target.value)}
                      className="w-full h-[54px] rounded-[16px] border border-[#f0e9e5] pl-[44px] pr-[16px] text-[16px] text-[#111] outline-none focus:border-[#ce0100] focus:shadow-[0_0_0_3px_rgba(206,1,0,0.07)] transition-all"
                      style={{ fontWeight: 400 }} />
                  </div>
                </div>

                {/* Last date info */}
                {lastDate ? (
                  <div className="bg-[#faf7f5] border border-[#f0e9e5] rounded-[14px] px-[18px] py-[14px] mb-[28px]">
                    <div className="flex items-center gap-[8px] mb-[4px]">
                      <CalendarIcon className="w-[14px] h-[14px] text-[#ce0100]" />
                      <p className="text-[11px] font-semibold text-[#888] uppercase tracking-wide">Ultima dată folosită</p>
                    </div>
                    <p className="text-[15px] font-light text-[#111]">{formatDate(lastDate)}</p>
                    <p className="text-[12px] text-[#aaa] mt-[4px]">
                      Am pre-completat cu <strong className="text-[#ce0100]">{formatDate(dataAsignarii)}</strong> (ultima + 1 zi)
                    </p>
                    <button onClick={() => setDataAsignarii(lastDate)}
                      className="mt-[10px] text-[12px] text-[#ce0100] hover:underline font-medium">
                      Folosește aceeași dată
                    </button>
                  </div>
                ) : (
                  <div className="bg-[#faf7f5] border border-[#f0e9e5] rounded-[14px] px-[18px] py-[12px] mb-[28px]">
                    <p className="text-[12px] text-[#aaa]">Nu există citate anterioare. Am pre-completat cu data de astăzi.</p>
                  </div>
                )}

                <div className="flex justify-end">
                  <button disabled={!dataAsignarii}
                    onClick={async () => { await fetchUsers(); setStep(4) }}
                    className="h-[46px] px-[26px] rounded-[14px] bg-[#ce0100] text-white text-[14px] flex items-center gap-[8px] shadow-[0_6px_16px_rgba(206,1,0,0.25)] hover:bg-[#a80000] disabled:opacity-40 disabled:shadow-none transition-all"
                    style={{ fontWeight: 500 }}>
                    Continuă <ArrowRightIcon className="w-[14px] h-[14px]" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 4 — Traducători */}
            {step === 4 && (
              <motion.div key="s4" initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-14 }}>
                {loadingUsers ? (
                  <p className="text-center py-[40px] text-[14px] text-[#888]">Se încarcă traducătorii...</p>
                ) : (
                  <div className="grid grid-cols-2 gap-[10px] mb-[28px]" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                    {LANG_KEYS.map((lang) => {
                      const isRO = lang.key === 'ro'
                      return (
                        <div key={lang.key} className={`border rounded-[16px] p-[16px] ${
                          isRO ? 'border-[#f0e9e5] bg-[#faf7f5]' : 'border-[#f0e9e5]'
                        }`}>
                          <div className="flex items-center gap-[8px] mb-[10px]">
                            <span className="w-[26px] h-[26px] rounded-full bg-[#fff4f4] border border-[#ffd3d3] flex items-center justify-center text-[9px] text-[#ce0100]"
                              style={{ fontWeight: 700 }}>{lang.code}</span>
                            <span className="text-[13px] text-[#111]" style={{ fontWeight: 500 }}>{lang.label}</span>
                            {isRO && <span className="text-[11px] text-[#888] ml-auto">automat</span>}
                          </div>
                          {isRO ? (
                            <div className="w-full h-[40px] rounded-[12px] border border-[#f0e9e5] bg-white px-[12px] flex items-center gap-[8px]">
                              {roTranslator ? (
                                <>
                                  <span className="w-[6px] h-[6px] rounded-full bg-[#1a8c4e] flex-shrink-0" />
                                  <span className="text-[13px] text-[#333] truncate" style={{ fontWeight: 400 }}>
                                    {roTranslator.full_name}
                                  </span>
                                </>
                              ) : (
                                <span className="text-[13px] text-[#c0b0aa] italic">Nealocat</span>
                              )}
                            </div>
                          ) : (
                            <select value={translators[lang.key] || ''}
                              onChange={(e) => setTranslators(p => ({ ...p, [lang.key]: e.target.value }))}
                              className="w-full h-[40px] rounded-[12px] border border-[#f0e9e5] bg-[#faf7f5] px-[12px] text-[13px] text-[#111] outline-none focus:border-[#ce0100] transition-all"
                              style={{ fontWeight: 300 }}>
                              <option value="">-- Selecteaza --</option>
                              {(usersByLang[lang.key] || []).map((u: any) => (
                                <option key={u.id} value={u.id}>{u.full_name}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
                <div className="flex justify-end">
                  <button onClick={handleSave} disabled={loading}
                    className="h-[46px] px-[26px] rounded-[14px] bg-[#ce0100] text-white text-[14px] flex items-center gap-[8px] shadow-[0_6px_16px_rgba(206,1,0,0.25)] hover:bg-[#a80000] disabled:opacity-60 transition-all"
                    style={{ fontWeight: 500 }}>
                    {loading ? 'Se salvează...' : <>Salvează citatul <CheckIcon className="w-[14px] h-[14px]" /></>}
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}