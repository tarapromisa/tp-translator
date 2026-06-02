'use client'

import { useEffect, useState } from 'react'
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabase'

const LANGS = [
  { key: 'ro', label: 'RO', name: 'Română',    versetField: 'verset_ro', refField: 'referinta_ro', readOnly: true  },
  { key: 'es', label: 'ES', name: 'Español',   versetField: 'verset_es', refField: 'referinta_es', readOnly: false },
  { key: 'en', label: 'EN', name: 'English',   versetField: 'verset_en', refField: 'referinta_en', readOnly: false },
  { key: 'de', label: 'DE', name: 'Deutsch',   versetField: 'verset_de', refField: 'referinta_de', readOnly: false },
  { key: 'pt', label: 'PT', name: 'Português', versetField: 'verset_pt', refField: 'referinta_pt', readOnly: false },
  { key: 'fr', label: 'FR', name: 'Français',  versetField: 'verset_fr', refField: 'referinta_fr', readOnly: false },
  { key: 'it', label: 'IT', name: 'Italiano',  versetField: 'verset_it', refField: 'referinta_it', readOnly: false },
]

interface Props {
  isOpen: boolean
  verset: any
  onClose: () => void
  onSaved: (updated: any) => void
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export default function EditVersetDrawer({ isOpen, verset, onClose, onSaved }: Props) {
  const [activeTab, setActiveTab] = useState('ro')
  const [fields, setFields] = useState<Record<string, string>>({})
  const [saveState, setSaveState] = useState<SaveState>('idle')

  useEffect(() => {
    if (verset && isOpen) {
      const init: Record<string, string> = {}
      LANGS.forEach(l => {
        init[l.versetField] = verset[l.versetField] ?? ''
        init[l.refField]   = verset[l.refField] ?? ''
      })
      setFields(init)
      setSaveState('idle')
      setActiveTab('ro')
    }
  }, [verset, isOpen])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen && saveState !== 'saving') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [isOpen, saveState])

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const handleSave = async () => {
    setSaveState('saving')
    const { data, error } = await supabase
      .from('versete').update(fields).eq('id', verset.id).select().single()
    if (error) { setSaveState('error'); setTimeout(() => setSaveState('idle'), 3000); return }
    setSaveState('saved')
    onSaved({ ...verset, ...data })
    setTimeout(() => { setSaveState('idle'); onClose() }, 1200)
  }

  const hasChanges = verset ? LANGS.some(l =>
    (verset[l.versetField] ?? '') !== fields[l.versetField] ||
    (verset[l.refField] ?? '') !== fields[l.refField]
  ) : false

  const activeLang = LANGS.find(l => l.key === activeTab) ?? LANGS[0]

  return (
    <>
      <style>{`
        @keyframes drawerIn { from { transform:translateX(100%); } to { transform:translateX(0); } }
        @keyframes overlayIn { from { opacity:0; } to { opacity:1; } }
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes checkBounce { 0%{transform:scale(0);opacity:0;} 60%{transform:scale(1.2);opacity:1;} 100%{transform:scale(1);} }
        .drawer-in { animation: drawerIn 0.32s cubic-bezier(0.22,1,0.36,1) forwards; }
        .overlay-in { animation: overlayIn 0.2s ease forwards; }
        .spin-anim { animation: spin 0.8s linear infinite; }
        .check-anim { animation: checkBounce 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards; }
      `}</style>

      {isOpen && (
        <div className="overlay-in fixed inset-0 z-40"
          style={{ background: 'rgba(10,6,4,0.4)', backdropFilter: 'blur(4px)' }}
          onClick={() => saveState !== 'saving' && onClose()} />
      )}

      <div className={`fixed top-0 right-0 z-50 h-full bg-white shadow-[-20px_0_60px_rgba(0,0,0,0.12)] flex flex-col ${isOpen ? 'drawer-in' : 'hidden'}`}
        style={{ width: 'min(560px, 100vw)' }}>
        <div className="h-[4px] bg-[#ce0100] flex-shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-[#f0e9e5] flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-[#111]">Editează verset</h2>
            <p className="text-xs text-[#888] mt-0.5">{verset?.public_id} · {verset?.referinta_ro}</p>
          </div>
          <button onClick={onClose} disabled={saveState === 'saving'}
            className="w-9 h-9 rounded-full bg-[#faf7f5] border border-[#e8e2de] flex items-center justify-center hover:bg-[#ffe0e0] disabled:opacity-40 transition-all">
            <XMarkIcon className="w-4 h-4 text-[#555]" />
          </button>
        </div>

        {/* Lang tabs */}
        <div className="flex gap-1.5 px-7 py-4 border-b border-[#f0e9e5] flex-shrink-0 overflow-x-auto">
          {LANGS.map(lang => {
            const hasVerset = fields[lang.versetField]?.trim() !== ''
            const isActive  = activeTab === lang.key
            return (
              <button key={lang.key} onClick={() => setActiveTab(lang.key)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 h-8 rounded-full text-sm font-semibold transition-all border ${
                  isActive
                    ? 'bg-[#ce0100] text-white border-[#ce0100] shadow-[0_4px_12px_rgba(206,1,0,0.25)]'
                    : 'bg-white text-[#444] border-[#e8e2de] hover:border-[#ffd3d3]'
                }`}>
                {lang.label}
                {hasVerset && !isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#166534]" />}
              </button>
            )
          })}
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-y-auto px-7 py-6">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-lg font-semibold text-[#111]">{activeLang.name}</span>
            {activeLang.readOnly && <span className="text-xs text-[#888] bg-[#faf7f5] border border-[#e8e2de] px-2 h-5 inline-flex items-center rounded-full">original</span>}
          </div>

          {/* Reference */}
          <label className="block text-xs font-semibold text-[#666] uppercase tracking-wide mb-2">Referință</label>
          <input
            value={fields[activeLang.refField] ?? ''}
            onChange={e => !activeLang.readOnly && setFields(p => ({ ...p, [activeLang.refField]: e.target.value }))}
            readOnly={activeLang.readOnly}
            placeholder={`Referință în ${activeLang.name}...`}
            className={`w-full h-11 rounded-xl border px-4 text-sm text-[#111] outline-none transition-all mb-5 placeholder:text-[#ccc] ${
              activeLang.readOnly
                ? 'bg-[#faf7f5] border-[#f0e9e5] cursor-default'
                : 'bg-white border-[#e8e2de] focus:border-[#ce0100] focus:shadow-[0_0_0_3px_rgba(206,1,0,0.07)]'
            }`} />

          {/* Verset text */}
          <label className="block text-xs font-semibold text-[#666] uppercase tracking-wide mb-2">Text verset</label>
          <textarea
            value={fields[activeLang.versetField] ?? ''}
            onChange={e => !activeLang.readOnly && setFields(p => ({ ...p, [activeLang.versetField]: e.target.value }))}
            readOnly={activeLang.readOnly}
            placeholder={activeLang.readOnly ? '' : `Textul versetului în ${activeLang.name}...`}
            rows={7}
            className={`w-full rounded-xl border px-4 py-3 text-sm leading-relaxed text-[#111] resize-none outline-none transition-all placeholder:text-[#ccc] ${
              activeLang.readOnly
                ? 'bg-[#faf7f5] border-[#f0e9e5] cursor-default'
                : 'bg-white border-[#e8e2de] focus:border-[#ce0100] focus:shadow-[0_0_0_3px_rgba(206,1,0,0.07)]'
            }`} />

          {/* Overview */}
          <div className="mt-6">
            <p className="text-xs font-semibold text-[#888] uppercase tracking-wide mb-3">Toate limbile</p>
            <div className="flex flex-col gap-2">
              {LANGS.map(lang => {
                const hasV = fields[lang.versetField]?.trim() !== ''
                return (
                  <button key={lang.key} onClick={() => setActiveTab(lang.key)}
                    className={`flex items-start gap-3 rounded-xl px-3.5 py-2.5 border text-left transition-all ${
                      activeTab === lang.key ? 'border-[#ffd3d3] bg-[#fff7f7]' : 'border-transparent hover:border-[#f0e9e5] hover:bg-[#faf7f5]'
                    }`}>
                    <span className="w-8 h-8 rounded-lg bg-[#fff4f4] border border-[#ffd3d3] flex items-center justify-center text-[10px] font-bold text-[#ce0100] flex-shrink-0 mt-0.5">
                      {lang.label}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-semibold text-[#111]">{lang.name}</span>
                        <span className={`text-[10px] font-semibold ${hasV ? 'text-[#166534]' : 'text-[#c05c00]'}`}>
                          {hasV ? '✓ Completat' : 'În așteptare'}
                        </span>
                      </div>
                      <p className="text-xs text-[#777] truncate">
                        {fields[lang.refField] ? `${fields[lang.refField]} — ` : ''}{fields[lang.versetField] || '—'}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-7 py-5 border-t border-[#f0e9e5] flex-shrink-0">
          {saveState === 'error' && (
            <p className="text-xs text-[#ce0100] text-center mb-3 font-medium">A apărut o eroare. Încearcă din nou.</p>
          )}
          <div className="flex gap-3">
            <button onClick={onClose} disabled={saveState === 'saving'}
              className="flex-1 h-11 rounded-xl border border-[#e8e2de] bg-white text-sm font-semibold text-[#666] hover:bg-[#faf7f5] disabled:opacity-40 transition-all">
              Anulează
            </button>
            <button onClick={handleSave} disabled={saveState === 'saving' || saveState === 'saved' || !hasChanges}
              className={`flex-1 h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                saveState === 'saved'
                  ? 'bg-[#166534] text-white shadow-[0_6px_16px_rgba(22,101,52,0.3)]'
                  : 'bg-[#ce0100] text-white shadow-[0_6px_16px_rgba(206,1,0,0.25)] hover:bg-[#a80000] disabled:opacity-40 disabled:shadow-none'
              }`}>
              {saveState === 'saving' && (
                <><svg className="spin-anim w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                </svg>Se salvează...</>
              )}
              {saveState === 'saved' && (
                <><CheckIcon className="check-anim w-4 h-4" />Salvat!</>
              )}
              {(saveState === 'idle' || saveState === 'error') && 'Salvează modificările'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}