'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeftIcon, ArrowRightIcon, XMarkIcon, CheckIcon, UserIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabase'

type Props = { open: boolean; onClose: () => void; onCreated: () => void }

const ROLES = ['Traducător', 'Coordonator', 'Coordonator principal', 'Admin']
const LANGUAGES = ['RO', 'ES', 'EN', 'DE', 'PT', 'FR', 'IT']
const STATUSES = [
  { value: true,  label: 'Activ',   color: '#166534', bg: '#edfaf3' },
  { value: false, label: 'Inactiv', color: '#888',    bg: '#f4f4f4' },
]

const STEP_COPY = [
  { title: 'Cum îl cheamă?',        sub: 'Numele complet al noului membru.' },
  { title: 'Date de contact',        sub: 'Adresa de email a traducătorului.' },
  { title: 'Rol și limbă',           sub: 'Definește rolul și limba de lucru.' },
  { title: 'Stare cont',             sub: 'Contul este activ de la început?' },
  { title: 'Rezumat și opțiuni',     sub: 'Verifică datele înainte de a salva.' },
]

export default function CreateUserModal({ open, onClose, onCreated }: Props) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [language, setLanguage] = useState('')
  const [active, setActive] = useState(true)
  const [sendWelcome, setSendWelcome] = useState(true)
  const [createAuth, setCreateAuth] = useState(false)
  const [authPassword, setAuthPassword] = useState('')

  const reset = () => {
    setStep(1); setFullName(''); setEmail(''); setRole('')
    setLanguage(''); setActive(true); setSendWelcome(true)
    setCreateAuth(false); setAuthPassword(''); setLoading(false)
  }
  const handleClose = () => { reset(); onClose() }

  const canNext = () => {
    if (step === 1) return fullName.trim().length >= 2
    if (step === 2) return email.includes('@') && email.includes('.')
    if (step === 3) return role !== '' && language !== ''
    if (step === 4) return true
    return true
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      // 1. Create user in users table
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({ full_name: fullName, email, role, language, active })
        .select()
        .single()

      if (error) { alert(error.message); setLoading(false); return }

      // 2. Create auth user if requested
      if (createAuth && authPassword) {
        const res = await fetch('/api/create-auth-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: authPassword, fullName }),
        })
        if (!res.ok) console.error('Auth user creation failed')
      }

      // 3. Send welcome email if requested
      if (sendWelcome) {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: email, toName: fullName, type: 'welcome' }),
        })
      }

      reset()
      onClose()
      onCreated()
    } catch (err) {
      console.error(err)
      alert('A apărut o eroare.')
      setLoading(false)
    }
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

      <div className="modal-in bg-white rounded-[36px] w-full max-w-[560px] relative overflow-hidden shadow-[0_48px_120px_rgba(0,0,0,0.24)]">
        <div className="h-[4px] w-full bg-[#ce0100]" />

        {/* Header */}
        <div className="px-[44px] pt-[36px] pb-[26px] border-b border-[#f0e9e5]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {/* Stepper */}
              <div className="flex items-center gap-[5px] mb-[14px]">
                {step > 1 && (
                  <button onClick={() => setStep(s => s - 1)}
                    className="w-[26px] h-[26px] rounded-full bg-[#faf7f5] border border-[#e8e2de] flex items-center justify-center hover:bg-[#ffe0e0] transition-all mr-[2px]">
                    <ArrowLeftIcon className="w-[12px] h-[12px] text-[#555]" />
                  </button>
                )}
                {[1,2,3,4,5].map((s) => (
                  <div key={s} className="flex items-center gap-[4px]">
                    <div className={`w-[18px] h-[18px] rounded-full flex items-center justify-center text-[8px] transition-all ${
                      s < step ? 'bg-[#1a8c4e] text-white' :
                      s === step ? 'bg-[#ce0100] text-white' :
                      'bg-[#f0e9e5] text-[#b0a39c]'
                    }`} style={{ fontWeight: 700 }}>
                      {s < step ? <CheckIcon className="w-[8px] h-[8px]" /> : s}
                    </div>
                    {s < 5 && <div className={`w-[12px] h-[1px] ${s < step ? 'bg-[#1a8c4e]' : 'bg-[#f0e9e5]'}`} />}
                  </div>
                ))}
              </div>
              <AnimatePresence mode="wait">
                <motion.div key={step}
                  initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
                  exit={{ opacity:0, y:-8 }} transition={{ duration: 0.18 }}>
                  <h2 className="text-[#111] tracking-[-0.04em] mb-[4px]" style={{ fontSize:'28px', fontWeight:300 }}>
                    {copy.title}
                  </h2>
                  <p className="text-[14px] text-[#666]" style={{ fontWeight:300 }}>{copy.sub}</p>
                </motion.div>
              </AnimatePresence>
            </div>
            <button onClick={handleClose}
              className="w-[34px] h-[34px] rounded-full bg-[#faf7f5] border border-[#e8e2de] flex items-center justify-center hover:bg-[#ffe0e0] transition-all flex-shrink-0">
              <XMarkIcon className="w-[14px] h-[14px] text-[#555]" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-[44px] py-[30px]">
          <AnimatePresence mode="wait">

            {/* STEP 1 — Nume */}
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity:0, x:16 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-16 }}>
                <div className="relative mb-[28px]">
                  <div className="absolute left-[14px] top-1/2 -translate-y-1/2">
                    <UserIcon className="w-[18px] h-[18px] text-[#bbb]" />
                  </div>
                  <input
                    value={fullName}
                    onChange={e => setFullName(e.target.value.toUpperCase())}
                    placeholder="EX: ION POPESCU"
                    autoFocus
                    className="w-full h-[54px] rounded-[16px] border border-[#f0e9e5] pl-[44px] pr-[16px] text-[16px] text-[#111] outline-none focus:border-[#ce0100] focus:shadow-[0_0_0_3px_rgba(206,1,0,0.07)] transition-all placeholder:text-[#ccc] uppercase tracking-wide"
                    style={{ fontWeight: 400 }}
                  />
                </div>
                <p className="text-[12px] text-[#aaa]">Se convertește automat în majuscule.</p>
              </motion.div>
            )}

            {/* STEP 2 — Email */}
            {step === 2 && (
              <motion.div key="s2" initial={{ opacity:0, x:16 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-16 }}>
                <input
                  value={email}
                  onChange={e => setEmail(e.target.value.toLowerCase())}
                  placeholder="ion.popescu@tptranslator.tarapromisa.org"
                  autoFocus
                  type="email"
                  className="w-full h-[54px] rounded-[16px] border border-[#f0e9e5] px-[16px] text-[15px] text-[#111] outline-none focus:border-[#ce0100] focus:shadow-[0_0_0_3px_rgba(206,1,0,0.07)] transition-all mb-[28px] placeholder:text-[#ccc]"
                  style={{ fontWeight: 300 }}
                />
                <p className="text-[12px] text-[#aaa]">Se convertește automat în minuscule.</p>
              </motion.div>
            )}

            {/* STEP 3 — Rol + Limbă */}
            {step === 3 && (
              <motion.div key="s3" initial={{ opacity:0, x:16 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-16 }}>
                <p className="text-[12px] font-semibold text-[#666] uppercase tracking-wide mb-[10px]">Rol</p>
                <div className="grid grid-cols-2 gap-[8px] mb-[22px]">
                  {ROLES.map(r => (
                    <button key={r} onClick={() => setRole(r)}
                      className={`h-[44px] rounded-[14px] border-[2px] text-[13px] font-semibold transition-all ${
                        role === r
                          ? 'border-[#ce0100] bg-[#fff7f7] text-[#ce0100]'
                          : 'border-[#f0e9e5] text-[#444] hover:border-[#ffd3d3]'
                      }`}>{r}</button>
                  ))}
                </div>
                <p className="text-[12px] font-semibold text-[#666] uppercase tracking-wide mb-[10px]">Limbă</p>
                <div className="flex flex-wrap gap-[8px]">
                  {LANGUAGES.map(l => (
                    <button key={l} onClick={() => setLanguage(l)}
                      className={`h-[38px] px-[14px] rounded-full border-[2px] text-[12px] font-bold transition-all ${
                        language === l
                          ? 'border-[#ce0100] bg-[#ce0100] text-white'
                          : 'border-[#f0e9e5] text-[#555] hover:border-[#ffd3d3]'
                      }`}>{l}</button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* STEP 4 — Stare */}
            {step === 4 && (
              <motion.div key="s4" initial={{ opacity:0, x:16 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-16 }}>
                <div className="grid grid-cols-2 gap-[12px] mb-[28px]">
                  {STATUSES.map(s => (
                    <button key={String(s.value)} onClick={() => setActive(s.value)}
                      className={`h-[80px] rounded-[20px] border-[2px] flex flex-col items-center justify-center gap-[6px] transition-all ${
                        active === s.value
                          ? 'border-[#ce0100] bg-[#fff7f7] shadow-[0_4px_16px_rgba(206,1,0,0.1)]'
                          : 'border-[#f0e9e5] hover:border-[#ffd3d3]'
                      }`}>
                      <span className={`w-[10px] h-[10px] rounded-full`} style={{ background: s.color }} />
                      <span className="text-[14px] font-semibold text-[#111]">{s.label}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* STEP 5 — Rezumat */}
            {step === 5 && (
              <motion.div key="s5" initial={{ opacity:0, x:16 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-16 }}>

                {/* Summary card */}
                <div className="bg-[#faf7f5] border border-[#f0e9e5] rounded-[18px] p-[18px] mb-[22px]">
                  <div className="flex items-center gap-[12px] mb-[14px]">
                    <div className="w-[44px] h-[44px] rounded-full bg-[#ce0100] flex items-center justify-center text-white text-[14px] font-bold flex-shrink-0">
                      {fullName.split(' ').map(n => n[0]).join('').slice(0,2)}
                    </div>
                    <div>
                      <p className="text-[15px] font-semibold text-[#111]">{fullName}</p>
                      <p className="text-[12px] text-[#888]">{email}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-[6px]">
                    <span className="text-[11px] font-semibold px-[10px] h-[24px] inline-flex items-center rounded-full bg-[#fff4f4] text-[#ce0100] border border-[#ffd3d3]">{role}</span>
                    <span className="text-[11px] font-semibold px-[10px] h-[24px] inline-flex items-center rounded-full bg-[#f0e9e5] text-[#555]">{language}</span>
                    <span className={`text-[11px] font-semibold px-[10px] h-[24px] inline-flex items-center rounded-full ${active ? 'bg-[#edfaf3] text-[#166534]' : 'bg-[#f4f4f4] text-[#888]'}`}>
                      {active ? 'Activ' : 'Inactiv'}
                    </span>
                  </div>
                </div>

                {/* Options */}
                <div className="flex flex-col gap-[10px] mb-[4px]">
                  {/* Send welcome email */}
                  <label className="flex items-center gap-[12px] p-[14px] rounded-[14px] border border-[#f0e9e5] cursor-pointer hover:bg-[#faf7f5] transition-all">
                    <div onClick={() => setSendWelcome(!sendWelcome)}
                      className={`w-[20px] h-[20px] rounded-[6px] border-[2px] flex items-center justify-center flex-shrink-0 transition-all ${
                        sendWelcome ? 'bg-[#ce0100] border-[#ce0100]' : 'border-[#d4c8c2]'
                      }`}>
                      {sendWelcome && <CheckIcon className="w-[11px] h-[11px] text-white" />}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-[#111]">Trimite email de bun venit</p>
                      <p className="text-[11px] text-[#888]">Se va trimite la {email || '—'}</p>
                    </div>
                  </label>

                  {/* Create auth user */}
                  <label className="flex items-start gap-[12px] p-[14px] rounded-[14px] border border-[#f0e9e5] cursor-pointer hover:bg-[#faf7f5] transition-all">
                    <div onClick={() => setCreateAuth(!createAuth)}
                      className={`w-[20px] h-[20px] rounded-[6px] border-[2px] flex items-center justify-center flex-shrink-0 mt-[1px] transition-all ${
                        createAuth ? 'bg-[#ce0100] border-[#ce0100]' : 'border-[#d4c8c2]'
                      }`}>
                      {createAuth && <CheckIcon className="w-[11px] h-[11px] text-white" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] font-semibold text-[#111]">Creează cont pentru autentificare</p>
                      <p className="text-[11px] text-[#888] mb-[8px]">Permite utilizatorului să se logheze în aplicație</p>
                      {createAuth && (
                        <input
                          value={authPassword}
                          onChange={e => setAuthPassword(e.target.value)}
                          placeholder="Parolă temporară..."
                          type="password"
                          className="w-full h-[38px] rounded-[10px] border border-[#f0e9e5] px-[12px] text-[13px] text-[#111] outline-none focus:border-[#ce0100] transition-all placeholder:text-[#ccc]"
                          onClick={e => e.stopPropagation()}
                        />
                      )}
                    </div>
                  </label>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-[44px] py-[20px] border-t border-[#f0e9e5]">
          <div className="flex gap-[10px]">
            <button onClick={handleClose}
              className="flex-1 h-[46px] rounded-[14px] border border-[#e8e2de] bg-white text-[13px] font-semibold text-[#666] hover:bg-[#faf7f5] transition-all">
              Anulează
            </button>
            <button
              disabled={!canNext() || loading}
              onClick={() => { if (step < 5) setStep(s => s + 1); else handleSave() }}
              className="flex-1 h-[46px] rounded-[14px] bg-[#ce0100] text-white text-[13px] font-bold flex items-center justify-center gap-[8px] shadow-[0_6px_16px_rgba(206,1,0,0.25)] hover:bg-[#a80000] disabled:opacity-40 disabled:shadow-none transition-all">
              {loading ? 'Se salvează...' :
               step === 5 ? <><CheckIcon className="w-[14px] h-[14px]" /> Salvează utilizatorul</> :
               <>Continuă <ArrowRightIcon className="w-[14px] h-[14px]" /></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
