'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRightIcon, XMarkIcon, CheckIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabase'

type Props = { open: boolean; onClose: () => void }

const LANGS = [
  { key: 'ro', label: 'Română',     code: 'RO' },
  { key: 'es', label: 'Spaniolă',   code: 'ES' },
  { key: 'en', label: 'Engleză',    code: 'EN' },
  { key: 'de', label: 'Germană',    code: 'DE' },
  { key: 'pt', label: 'Portugheză', code: 'PT' },
  { key: 'fr', label: 'Franceză',   code: 'FR' },
  { key: 'it', label: 'Italiană',   code: 'IT' },
]

// Fraze motivaționale per limbă
const LANG_COPY: Record<string, { q: string; hint: string }> = {
  ro: { q: 'Ești pregătit să traduci?',           hint: 'Începem cu limba inimii — româna.' },
  es: { q: '¿Lista para el español?',             hint: 'El español te espera con los brazos abiertos.' },
  en: { q: 'Time for English!',                   hint: 'Keep it clear, keep it beautiful.' },
  de: { q: 'Deutsch ist dran.',                   hint: 'Präzision und Tiefe — das ist Deutsch.' },
  pt: { q: 'Chegou a vez do português.',          hint: 'Deixa as palavras fluírem naturalmente.' },
  fr: { q: 'Place au français.',                  hint: 'La langue de la lumière t\'attend.' },
  it: { q: 'Tocca all\'italiano!',                hint: 'L\'ultima lingua — e non è la meno bella.' },
}

export default function CreateVersetModal({ open, onClose }: Props) {
  // Phase 0 = referinta RO, Phase 1-7 = each language
  const [phase, setPhase] = useState<'ref' | number>('ref')
  const [loading, setLoading] = useState(false)
  const [referenceRO, setReferenceRO] = useState('')
  const [versets, setVersets] = useState<Record<string, string>>(
    Object.fromEntries(LANGS.map(l => [l.key, '']))
  )
  const [references, setReferences] = useState<Record<string, string>>(
    Object.fromEntries(LANGS.map(l => [l.key, '']))
  )

  const gateway1 = useMemo(() =>
    `https://www.biblegateway.com/passage/?search=${encodeURIComponent(referenceRO)}&version=RMNN;RVR1960;NKJV;LUTH1545`,
    [referenceRO]
  )
  const gateway2 = useMemo(() =>
    `https://www.biblegateway.com/passage/?search=${encodeURIComponent(referenceRO)}&version=ARC;LSG;LND`,
    [referenceRO]
  )

  const reset = () => {
    setPhase('ref'); setLoading(false); setReferenceRO('')
    setVersets(Object.fromEntries(LANGS.map(l => [l.key, ''])))
    setReferences(Object.fromEntries(LANGS.map(l => [l.key, ''])))
  }
  const handleClose = () => { reset(); onClose() }

  const handleSave = async () => {
    setLoading(true)
    try {
      const payload = Object.fromEntries([
        ...LANGS.map(l => [`verset_${l.key}`, versets[l.key]]),
        ...LANGS.map(l => [`referinta_${l.key}`, l.key === 'ro' ? referenceRO : references[l.key]]),
      ])

      const { data: { user: u } } = await supabase.auth.getUser()
      let createdBy = null
      if (u) { const { data: pr } = await supabase.from("users").select("id").eq("auth_user_id", u.id).single(); createdBy = pr?.id ?? null }
      const { data, error } = await supabase.from("versete").insert({ ...payload, created_by: createdBy }).select()
      if (error) { alert(error.message); setLoading(false); return }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('users').select('id').eq('auth_user_id', user.id).single()
        if (profile) await supabase.from('activity_logs').insert({
          user_id: profile.id, action: 'create', entity_type: 'verset',
          entity_name: referenceRO,
        })
      }
      reset(); onClose(); window.location.reload()
    } catch (err) { console.error(err); alert('A apărut o eroare.'); setLoading(false) }
  }

  if (!open) return null

  const completedCount = LANGS.filter(l => versets[l.key]?.trim()).length
  const isLangPhase = typeof phase === 'number'
  const currentLang = isLangPhase ? LANGS[phase as number] : null
  const isLastLang = isLangPhase && phase === LANGS.length - 1
  const copy = currentLang ? LANG_COPY[currentLang.key] : null

  const canProceedRef = referenceRO.trim().length >= 2
  const canProceedLang = currentLang
    ? versets[currentLang.key]?.trim() !== '' && references[currentLang.key]?.trim() !== ''
    : false

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

              {/* Back + lang progress */}
              <div className="flex items-center gap-[10px] mb-[14px]">
                {(isLangPhase && (phase as number) > 0) && (
                  <button
                    onClick={() => setPhase(p => typeof p === 'number' ? p - 1 : 'ref')}
                    className="w-[26px] h-[26px] rounded-full bg-[#faf7f5] border border-[#ece6e2] flex items-center justify-center hover:bg-[#ffe0e0] transition-all">
                    <ArrowLeftIcon className="w-[12px] h-[12px] text-[#555]" />
                  </button>
                )}
                {isLangPhase && (
                  <button
                    onClick={() => setPhase('ref')}
                    className="w-[26px] h-[26px] rounded-full bg-[#faf7f5] border border-[#ece6e2] flex items-center justify-center hover:bg-[#ffe0e0] transition-all">
                    <ArrowLeftIcon className="w-[12px] h-[12px] text-[#555]" />
                  </button>
                )}

                {/* Language dots */}
                {isLangPhase && (
                  <div className="flex items-center gap-[5px]">
                    {LANGS.map((l, i) => {
                      const done = versets[l.key]?.trim() !== ''
                      const active = i === (phase as number)
                      return (
                        <button key={l.key} onClick={() => setPhase(i)}
                          title={l.label}
                          className="transition-all duration-300"
                          style={{
                            width: active ? '22px' : '8px',
                            height: '6px',
                            borderRadius: '999px',
                            background: active ? '#ce0100' : done ? '#1a8c4e' : '#f0e9e5',
                          }} />
                      )
                    })}
                    <span className="text-[11px] text-[#b0a39c] ml-[4px]" style={{ fontWeight: 300 }}>
                      {completedCount}/7
                    </span>
                  </div>
                )}

                {phase === 'ref' && (
                  <span className="text-[11px] text-[#9c8e87]" style={{ fontWeight: 300 }}>
                    Pasul 1 — Referința de bază
                  </span>
                )}
              </div>

              {/* Animated heading */}
              <AnimatePresence mode="wait">
                <motion.div key={String(phase)}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.22 }}>
                  {phase === 'ref' ? (
                    <>
                      <h2 className="text-[#111] tracking-[-0.04em] mb-[6px]" style={{ fontSize: '30px', fontWeight: 300 }}>
                        Care este referința în română?
                      </h2>
                      <p className="text-[14px] text-[#555]" style={{ fontWeight: 300 }}>
                        Aceasta va fi ancora pentru toate cele 7 limbi.
                      </p>
                    </>
                  ) : (
                    <>
                      <h2 className="text-[#111] tracking-[-0.04em] mb-[6px]" style={{ fontSize: '30px', fontWeight: 300 }}>
                        {copy!.q}
                      </h2>
                      <p className="text-[14px] text-[#555]" style={{ fontWeight: 300 }}>{copy!.hint}</p>
                    </>
                  )}
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

            {/* ── PHASE: REF ── */}
            {phase === 'ref' && (
              <motion.div key="ref" initial={{ opacity:0, x:16 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-16 }}>
                <input
                  value={referenceRO}
                  onChange={(e) => setReferenceRO(e.target.value)}
                  placeholder="Ex: Ioan 3:16"
                  autoFocus
                  className="w-full h-[56px] rounded-[16px] border border-[#f0e9e5] px-[18px] text-[16px] text-[#111] outline-none focus:border-[#ce0100] focus:shadow-[0_0_0_3px_rgba(206,1,0,0.07)] transition-all mb-[20px] placeholder:text-[#c0b0aa]"
                  style={{ fontWeight: 300 }}
                />

                {/* Gateway links — only active if referenceRO filled */}
                <div className="flex gap-[10px] mb-[32px]">
                  {[
                    { href: gateway1, label: 'RO · ES · EN · DE' },
                    { href: gateway2, label: 'PT · FR · IT' },
                  ].map(({ href, label }) => (
                    <a key={label} href={href} target="_blank"
                      className={`h-[38px] px-[16px] rounded-[12px] border text-[12px] flex items-center transition-all ${
                        canProceedRef
                          ? 'border-[#f0e9e5] bg-[#faf7f5] text-[#555] hover:bg-[#fff4f4] hover:border-[#ffd3d3] hover:text-[#ce0100]'
                          : 'border-[#f0e9e5] bg-[#faf7f5] text-[#c0b0aa] pointer-events-none'
                      }`}
                      style={{ fontWeight: 400 }}>
                      {label}
                    </a>
                  ))}
                </div>

                <div className="flex justify-end">
                  <button disabled={!canProceedRef}
                    onClick={() => {
                      setReferences(prev => ({ ...prev, ro: referenceRO }))
                      setPhase(0)
                    }}
                    className="h-[46px] px-[26px] rounded-[14px] bg-[#ce0100] text-white text-[14px] flex items-center gap-[8px] shadow-[0_6px_16px_rgba(206,1,0,0.25)] hover:bg-[#a80000] disabled:opacity-40 disabled:shadow-none transition-all"
                    style={{ fontWeight: 500 }}>
                    Începem! <ArrowRightIcon className="w-[14px] h-[14px]" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── PHASE: LANG ── */}
            {isLangPhase && currentLang && (
              <motion.div key={`lang-${phase}`} initial={{ opacity:0, x:16 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-16 }}>

                {/* Gateway links */}
                <div className="flex gap-[10px] mb-[16px]">
                  {[
                    { href: gateway1, label: 'RO · ES · EN · DE' },
                    { href: gateway2, label: 'PT · FR · IT' },
                  ].map(({ href, label }) => (
                    <a key={label} href={href} target="_blank"
                      className="h-[34px] px-[14px] rounded-[10px] bg-[#faf7f5] border border-[#f0e9e5] text-[11px] text-[#555] flex items-center hover:bg-[#fff4f4] hover:border-[#ffd3d3] hover:text-[#ce0100] transition-all"
                      style={{ fontWeight: 400 }}>
                      {label}
                    </a>
                  ))}
                </div>

                {/* Verset textarea */}
                <textarea
                  value={versets[currentLang.key]}
                  onChange={(e) => setVersets(p => ({ ...p, [currentLang.key]: e.target.value }))}
                  placeholder={`Textul versetului în ${currentLang.label}...`}
                  rows={5}
                  autoFocus
                  className="w-full rounded-[18px] border border-[#f0e9e5] px-[18px] py-[14px] text-[15px] text-[#111] resize-none outline-none focus:border-[#ce0100] focus:shadow-[0_0_0_3px_rgba(206,1,0,0.07)] transition-all mb-[12px] placeholder:text-[#c0b0aa]"
                  style={{ fontWeight: 300 }}
                />

                {/* Reference — autocompletata cu referinta RO, editabila */}
                <div className="relative">
                  <input
                    value={currentLang.key === 'ro' ? (references.ro || referenceRO) : (references[currentLang.key] || referenceRO)}
                    onChange={(e) => {
                      const val = e.target.value
                      setReferences(p => ({ ...p, [currentLang.key]: val }))
                      if (currentLang.key === 'ro') setReferenceRO(val)
                    }}
                    placeholder="Referință"
                    className="w-full h-[46px] rounded-[14px] border border-[#f0e9e5] px-[16px] pr-[80px] text-[14px] text-[#111] outline-none focus:border-[#ce0100] focus:shadow-[0_0_0_3px_rgba(206,1,0,0.07)] transition-all placeholder:text-[#c0b0aa]"
                    style={{ fontWeight: 300 }}
                  />
                  {currentLang.key !== 'ro' && references[currentLang.key] === '' && referenceRO && (
                    <button
                      onClick={() => setReferences(p => ({ ...p, [currentLang.key]: referenceRO }))}
                      className="absolute right-[10px] top-1/2 -translate-y-1/2 h-[26px] px-[10px] rounded-[8px] bg-[#faf7f5] border border-[#f0e9e5] text-[10px] text-[#ce0100] hover:bg-[#fff4f4] transition-all"
                      style={{ fontWeight: 600 }}>
                      Copiază RO
                    </button>
                  )}
                </div>

                {/* Lang pills + CTA */}
                <div className="flex items-center justify-between mt-[24px]">
                  <div className="flex gap-[5px] flex-wrap">
                    {LANGS.map((l, i) => {
                      const done = versets[l.key]?.trim() !== ''
                      const active = i === (phase as number)
                      return (
                        <span key={l.key} onClick={() => setPhase(i)}
                          className={`inline-flex items-center justify-center h-[24px] px-[9px] rounded-full text-[10px] leading-none cursor-pointer transition-all ${
                            active ? 'bg-[#ce0100] text-white' :
                            done   ? 'bg-[#1a8c4e] text-white' :
                                     'bg-[#f0eae7] text-[#b0a39c]'
                          }`}
                          style={{ fontWeight: 700 }}>
                          {l.code}
                        </span>
                      )
                    })}
                  </div>

                  <button
                    disabled={!canProceedLang || loading}
                    onClick={() => {
                      // Auto-fill reference if empty
                      if (!references[currentLang.key]?.trim()) {
                        setReferences(p => ({ ...p, [currentLang.key]: referenceRO }))
                      }
                      if (!isLastLang) setPhase(p => (p as number) + 1)
                      else handleSave()
                    }}
                    className="h-[46px] px-[26px] rounded-[14px] bg-[#ce0100] text-white text-[14px] flex items-center gap-[8px] shadow-[0_6px_16px_rgba(206,1,0,0.25)] hover:bg-[#a80000] disabled:opacity-40 disabled:shadow-none transition-all"
                    style={{ fontWeight: 500 }}>
                    {loading ? 'Se salvează...' :
                     isLastLang ? <>Salvează <CheckIcon className="w-[14px] h-[14px]" /></> :
                     <>Continuă <ArrowRightIcon className="w-[14px] h-[14px]" /></>}
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
