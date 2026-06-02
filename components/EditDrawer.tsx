'use client'

import { useEffect, useState } from 'react'
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabase'

const LANGUAGES = [
  { code: 'RO', label: 'RO', name: 'Română',    flag: '🇷🇴', field: 'citat_ro', readOnly: true  },
  { code: 'ES', label: 'ES', name: 'Español',   flag: '🇪🇸', field: 'citat_es', readOnly: false },
  { code: 'EN', label: 'EN', name: 'English',   flag: '🇬🇧', field: 'citat_en', readOnly: false },
  { code: 'DE', label: 'DE', name: 'Deutsch',   flag: '🇩🇪', field: 'citat_de', readOnly: false },
  { code: 'PT', label: 'PT', name: 'Português', flag: '🇵🇹', field: 'citat_pt', readOnly: false },
  { code: 'FR', label: 'FR', name: 'Français',  flag: '🇫🇷', field: 'citat_fr', readOnly: false },
  { code: 'IT', label: 'IT', name: 'Italiano',  flag: '🇮🇹', field: 'citat_it', readOnly: false },
]

interface EditDrawerProps {
  isOpen: boolean
  citation: any
  onClose: () => void
  onSaved: (updated: any) => void
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export default function EditDrawer({ isOpen, citation, onClose, onSaved }: EditDrawerProps) {
  const [fields, setFields] = useState<Record<string, string>>({})
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [activeTab, setActiveTab] = useState('RO')

  // Init fields from citation
  useEffect(() => {
    if (citation) {
      const init: Record<string, string> = {}
      LANGUAGES.forEach((l) => { init[l.field] = citation[l.field] ?? '' })
      setFields(init)
      setSaveState('idle')
      setActiveTab('RO')
    }
  }, [citation, isOpen])

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && saveState !== 'saving') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, saveState, onClose])

  // Lock body scroll
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const handleSave = async () => {
    setSaveState('saving')
    const { data, error } = await supabase
      .from('texts')
      .update(fields)
      .eq('id', citation.id)
      .select()
      .single()

    if (error) {
      setSaveState('error')
      setTimeout(() => setSaveState('idle'), 3000)
      return
    }

    setSaveState('saved')
    onSaved({ ...citation, ...data })
    setTimeout(() => {
      setSaveState('idle')
      onClose()
    }, 1200)
  }

  const activeLang = LANGUAGES.find((l) => l.code === activeTab) ?? LANGUAGES[0]
  const hasChanges = citation
    ? LANGUAGES.some((l) => (citation[l.field] ?? '') !== fields[l.field])
    : false

  return (
    <>
      <style>{`
        @keyframes drawerIn {
          from { transform: translateX(100%); opacity: 0.6; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes drawerOut {
          from { transform: translateX(0);    opacity: 1; }
          to   { transform: translateX(100%); opacity: 0; }
        }
        @keyframes overlayFadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes checkBounce {
          0%   { transform: scale(0); opacity: 0; }
          60%  { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); }
        }
        @keyframes spinLoader { to { transform: rotate(360deg); } }

        .drawer-panel   { animation: drawerIn 0.32s cubic-bezier(0.22,1,0.36,1) forwards; }
        .drawer-overlay { animation: overlayFadeIn 0.2s ease forwards; }
        .check-bounce   { animation: checkBounce 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .spin-loader    { animation: spinLoader 0.8s linear infinite; }
      `}</style>

      {/* Overlay */}
      {isOpen && (
        <div
          onClick={() => saveState !== 'saving' && onClose()}
          className="drawer-overlay fixed inset-0 z-40"
          style={{ background: 'rgba(10,6,4,0.4)', backdropFilter: 'blur(4px)' }}
        />
      )}

      {/* Drawer */}
      <div
        className={`
          drawer-panel fixed top-0 right-0 z-50 h-full
          bg-white shadow-[-20px_0_60px_rgba(0,0,0,0.12)]
          flex flex-col
          ${isOpen ? '' : 'hidden'}
        `}
        style={{ width: 'min(540px, 100vw)' }}
      >
        {/* Red accent top */}
        <div className="h-[4px] w-full bg-gradient-to-r from-[#ce0100] via-[#ff4444] to-[#ce0100] flex-shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-[28px] py-[22px] border-b border-[#f0e9e5] flex-shrink-0">
          <div>
            <h2 className="text-[19px] font-[800] text-[#111] tracking-[-0.02em]">
              Editează citat
            </h2>
            <p className="text-[12px] text-[#9c8e87] mt-[2px]">
              {citation?.public_id} · {citation?.autor_original}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={saveState === 'saving'}
            className="w-[36px] h-[36px] rounded-full bg-[#f4ece9] flex items-center justify-center text-[#8f8179] hover:bg-[#ffe0e0] hover:text-[#ce0100] disabled:opacity-40 transition-all"
          >
            <XMarkIcon className="w-[16px] h-[16px]" />
          </button>
        </div>

        {/* Language tabs */}
        <div className="flex gap-[6px] px-[28px] py-[16px] border-b border-[#f0e9e5] flex-shrink-0 overflow-x-auto">
          {LANGUAGES.map((lang) => {
            const isDone = fields[lang.field]?.trim() !== ''
            const isActive = activeTab === lang.code
            return (
              <button
                key={lang.code}
                onClick={() => setActiveTab(lang.code)}
                className={`
                  flex-shrink-0 flex items-center gap-[6px]
                  px-[12px] h-[34px] rounded-full text-[13px] font-[600]
                  transition-all border
                  ${isActive
                    ? 'bg-[#ce0100] text-white border-[#ce0100] shadow-[0_4px_12px_rgba(206,1,0,0.25)]'
                    : 'bg-white text-[#444] border-[#ece6e2] hover:border-[#f4d4d4] hover:bg-[#fff7f7]'
                  }
                `}
              >
                <span>{lang.flag}</span>
                <span>{lang.label}</span>
                {isDone && !isActive && (
                  <span className="w-[6px] h-[6px] rounded-full bg-[#1a8c4e] flex-shrink-0" />
                )}
              </button>
            )
          })}
        </div>

        {/* Active language editor */}
        <div className="flex-1 overflow-y-auto px-[28px] py-[24px]">
          <div className="flex items-center gap-[10px] mb-[14px]">
            <span className="text-[24px]">{activeLang.flag}</span>
            <div>
              <p className="text-[15px] font-[700] text-[#111]">{activeLang.name}</p>
              {activeLang.readOnly && (
                <p className="text-[11px] text-[#9c8e87]">Texto original · solo lectura</p>
              )}
            </div>
          </div>

          <textarea
            value={fields[activeLang.field] ?? ''}
            onChange={(e) =>
              !activeLang.readOnly &&
              setFields((prev) => ({ ...prev, [activeLang.field]: e.target.value }))
            }
            readOnly={activeLang.readOnly}
            placeholder={activeLang.readOnly ? '' : `Introduceti traducerea în ${activeLang.name}...`}
            rows={8}
            className={`
              w-full rounded-[18px] border px-[18px] py-[16px]
              text-[17px] leading-[28px] font-[300] text-[#111]
              resize-none outline-none transition-all
              placeholder:text-[#c0b0aa]
              ${activeLang.readOnly
                ? 'bg-[#faf7f5] border-[#f0e9e5] text-[#6b5e57] cursor-default'
                : 'bg-white border-[#ece6e2] focus:border-[#ce0100] focus:shadow-[0_0_0_3px_rgba(206,1,0,0.08)]'
              }
            `}
          />

          {/* All languages overview */}
          <div className="mt-[24px]">
            <p className="text-[11px] font-[700] uppercase tracking-[0.14em] text-[#9c8e87] mb-[12px]">
              Toate limbile
            </p>
            <div className="flex flex-col gap-[8px]">
              {LANGUAGES.map((lang) => {
                const val = fields[lang.field]?.trim()
                const isDone = !!val
                return (
                  <button
                    key={lang.code}
                    onClick={() => setActiveTab(lang.code)}
                    className={`
                      flex items-start gap-[10px] rounded-[14px] px-[14px] py-[10px]
                      border text-left transition-all
                      ${activeTab === lang.code
                        ? 'border-[#f4d4d4] bg-[#fff7f7]'
                        : 'border-transparent hover:border-[#f0e9e5] hover:bg-[#faf7f5]'
                      }
                    `}
                  >
                    <span className="text-[16px] mt-[1px] flex-shrink-0">{lang.flag}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between mb-[2px]">
                        <span className="text-[12px] font-[700] text-[#111]">{lang.label}</span>
                        <span className={`text-[11px] font-[600] ${isDone ? 'text-[#1a8c4e]' : 'text-[#e87b00]'}`}>
                          {isDone ? '✓ Completat' : 'În așteptare'}
                        </span>
                      </div>
                      <p className="text-[12px] text-[#8f8179] truncate">
                        {val ? `"${val}"` : '—'}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-[28px] py-[20px] border-t border-[#f0e9e5] flex-shrink-0">
          {saveState === 'error' && (
            <p className="text-[12px] text-[#ce0100] text-center mb-[12px] font-[500]">
              A apărut o eroare. Încearcă din nou.
            </p>
          )}
          <div className="flex gap-[10px]">
            <button
              onClick={onClose}
              disabled={saveState === 'saving'}
              className="flex-1 h-[48px] rounded-[14px] border border-[#ece6e2] bg-white text-[14px] font-[600] text-[#8f8179] hover:bg-[#faf7f5] disabled:opacity-40 transition-all"
            >
              Anulează
            </button>
            <button
              onClick={handleSave}
              disabled={saveState === 'saving' || saveState === 'saved' || !hasChanges}
              className={`
                flex-1 h-[48px] rounded-[14px] text-[14px] font-[700]
                flex items-center justify-center gap-[8px]
                transition-all
                ${saveState === 'saved'
                  ? 'bg-[#1a8c4e] text-white shadow-[0_8px_20px_rgba(26,140,78,0.3)]'
                  : 'bg-[#ce0100] text-white shadow-[0_8px_20px_rgba(206,1,0,0.25)] hover:bg-[#a80000] disabled:opacity-40 disabled:shadow-none'
                }
              `}
            >
              {saveState === 'saving' && (
                <>
                  <svg className="spin-loader w-[16px] h-[16px]" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Se salvează...
                </>
              )}
              {saveState === 'saved' && (
                <>
                  <CheckIcon className="check-bounce w-[16px] h-[16px]" />
                  Salvat!
                </>
              )}
              {(saveState === 'idle' || saveState === 'error') && 'Salvează modificările'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
