'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabase'

type User = {
  id: string
  full_name: string
  email: string
  language: string
  role: string
  active: boolean
  created_at: string
}

type Props = { open: boolean; user: User | null; onClose: () => void; onSaved: (updated: User) => void }

const ROLES = ['Traducător', 'Coordonator', 'Coordonator principal', 'Admin']
const LANGUAGES = ['RO', 'ES', 'EN', 'DE', 'PT', 'FR', 'IT']

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export default function EditUserModal({ open, user, onClose, onSaved }: Props) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [language, setLanguage] = useState('')
  const [active, setActive] = useState(true)
  const [saveState, setSaveState] = useState<SaveState>('idle')

  useEffect(() => {
    if (user && open) {
      setFullName(user.full_name ?? '')
      setEmail(user.email ?? '')
      setRole(user.role ?? '')
      setLanguage(user.language ?? '')
      setActive(user.active ?? true)
      setSaveState('idle')
    }
  }, [user, open])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && saveState !== 'saving') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, saveState])

  const hasChanges = user && (
    fullName !== user.full_name ||
    email !== user.email ||
    role !== user.role ||
    language !== user.language ||
    active !== user.active
  )

  const handleSave = async () => {
    if (!user) return
    setSaveState('saving')
    const { data, error } = await supabase
      .from('users')
      .update({ full_name: fullName, email, role, language, active })
      .eq('id', user.id)
      .select()
      .single()

    if (error) { setSaveState('error'); setTimeout(() => setSaveState('idle'), 3000); return }
    setSaveState('saved')
    onSaved({ ...user, ...data })
    setTimeout(() => { setSaveState('idle'); onClose() }, 1200)
  }

  if (!open || !user) return null

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4"
      style={{ background: 'rgba(10,6,4,0.65)', backdropFilter: 'blur(10px)' }}
      onClick={(e) => { if (e.target === e.currentTarget && saveState !== 'saving') onClose() }}>
      <style>{`
        @keyframes modalIn {
          from { opacity:0; transform:scale(0.94) translateY(20px); }
          to   { opacity:1; transform:scale(1) translateY(0); }
        }
        .modal-in { animation: modalIn 0.3s cubic-bezier(0.22,1,0.36,1) forwards; }
        @keyframes spin { to { transform:rotate(360deg); } }
        .spin-anim { animation: spin 0.8s linear infinite; }
        @keyframes checkBounce { 0%{transform:scale(0);opacity:0;} 60%{transform:scale(1.2);opacity:1;} 100%{transform:scale(1);} }
        .check-anim { animation: checkBounce 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards; }
      `}</style>

      <div className="modal-in bg-white rounded-[36px] w-full max-w-[520px] overflow-hidden shadow-[0_48px_120px_rgba(0,0,0,0.24)]">
        <div className="h-[4px] bg-[#ce0100]" />

        {/* Header */}
        <div className="px-[44px] pt-[36px] pb-[24px] border-b border-[#f0e9e5] flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.14em] text-[#ce0100] uppercase mb-[8px]">Editează utilizator</p>
            <h2 className="text-[#111] tracking-[-0.04em]" style={{ fontSize:'28px', fontWeight:300 }}>{user.full_name}</h2>
            <p className="text-[13px] text-[#888] mt-[2px]">{user.email}</p>
          </div>
          <button onClick={onClose} disabled={saveState === 'saving'}
            className="w-[34px] h-[34px] rounded-full bg-[#faf7f5] border border-[#e8e2de] flex items-center justify-center hover:bg-[#ffe0e0] disabled:opacity-40 transition-all flex-shrink-0">
            <XMarkIcon className="w-[14px] h-[14px] text-[#555]" />
          </button>
        </div>

        {/* Body */}
        <div className="px-[44px] py-[28px] flex flex-col gap-[20px]">

          {/* Nombre */}
          <div>
            <label className="text-[11px] font-semibold text-[#666] uppercase tracking-wide block mb-[8px]">Nume complet</label>
            <input value={fullName} onChange={e => setFullName(e.target.value.toUpperCase())}
              className="w-full h-[48px] rounded-[14px] border border-[#f0e9e5] px-[14px] text-[14px] text-[#111] outline-none focus:border-[#ce0100] focus:shadow-[0_0_0_3px_rgba(206,1,0,0.07)] transition-all uppercase tracking-wide"
              style={{ fontWeight: 400 }} />
          </div>

          {/* Email */}
          <div>
            <label className="text-[11px] font-semibold text-[#666] uppercase tracking-wide block mb-[8px]">Email</label>
            <input value={email} onChange={e => setEmail(e.target.value.toLowerCase())}
              type="email"
              className="w-full h-[48px] rounded-[14px] border border-[#f0e9e5] px-[14px] text-[14px] text-[#111] outline-none focus:border-[#ce0100] focus:shadow-[0_0_0_3px_rgba(206,1,0,0.07)] transition-all"
              style={{ fontWeight: 300 }} />
          </div>

          {/* Rol */}
          <div>
            <label className="text-[11px] font-semibold text-[#666] uppercase tracking-wide block mb-[8px]">Rol</label>
            <div className="grid grid-cols-2 gap-[6px]">
              {ROLES.map(r => (
                <button key={r} onClick={() => setRole(r)}
                  className={`h-[40px] rounded-[12px] border-[2px] text-[12px] font-semibold transition-all ${
                    role === r ? 'border-[#ce0100] bg-[#fff7f7] text-[#ce0100]' : 'border-[#f0e9e5] text-[#444] hover:border-[#ffd3d3]'
                  }`}>{r}</button>
              ))}
            </div>
          </div>

          {/* Limbă */}
          <div>
            <label className="text-[11px] font-semibold text-[#666] uppercase tracking-wide block mb-[8px]">Limbă</label>
            <div className="flex flex-wrap gap-[6px]">
              {LANGUAGES.map(l => (
                <button key={l} onClick={() => setLanguage(l)}
                  className={`h-[34px] px-[12px] rounded-full border-[2px] text-[11px] font-bold transition-all ${
                    language === l ? 'border-[#ce0100] bg-[#ce0100] text-white' : 'border-[#f0e9e5] text-[#555] hover:border-[#ffd3d3]'
                  }`}>{l}</button>
              ))}
            </div>
          </div>

          {/* Stare */}
          <div>
            <label className="text-[11px] font-semibold text-[#666] uppercase tracking-wide block mb-[8px]">Stare</label>
            <div className="grid grid-cols-2 gap-[6px]">
              {[{ value: true, label: 'Activ', color: '#166534', bg: '#edfaf3' }, { value: false, label: 'Inactiv', color: '#888', bg: '#f4f4f4' }].map(s => (
                <button key={String(s.value)} onClick={() => setActive(s.value)}
                  className={`h-[44px] rounded-[12px] border-[2px] flex items-center justify-center gap-[8px] text-[13px] font-semibold transition-all ${
                    active === s.value ? 'border-[#ce0100] bg-[#fff7f7]' : 'border-[#f0e9e5] hover:border-[#ffd3d3]'
                  }`}>
                  <span className="w-[7px] h-[7px] rounded-full" style={{ background: s.color }} />
                  {s.label}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-[44px] py-[20px] border-t border-[#f0e9e5]">
          {saveState === 'error' && <p className="text-[12px] text-[#ce0100] text-center mb-[10px] font-medium">A apărut o eroare. Încearcă din nou.</p>}
          <div className="flex gap-[10px]">
            <button onClick={onClose} disabled={saveState === 'saving'}
              className="flex-1 h-[46px] rounded-[14px] border border-[#e8e2de] bg-white text-[13px] font-semibold text-[#666] hover:bg-[#faf7f5] disabled:opacity-40 transition-all">
              Anulează
            </button>
            <button onClick={handleSave} disabled={saveState === 'saving' || saveState === 'saved' || !hasChanges}
              className={`flex-1 h-[46px] rounded-[14px] text-[13px] font-bold flex items-center justify-center gap-[8px] transition-all ${
                saveState === 'saved'
                  ? 'bg-[#166534] text-white shadow-[0_6px_16px_rgba(22,101,52,0.3)]'
                  : 'bg-[#ce0100] text-white shadow-[0_6px_16px_rgba(206,1,0,0.25)] hover:bg-[#a80000] disabled:opacity-40 disabled:shadow-none'
              }`}>
              {saveState === 'saving' && <><svg className="spin-anim w-[14px] h-[14px]" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/><path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/></svg>Se salvează...</>}
              {saveState === 'saved' && <><CheckIcon className="check-anim w-[14px] h-[14px]" />Salvat!</>}
              {(saveState === 'idle' || saveState === 'error') && 'Salvează modificările'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
