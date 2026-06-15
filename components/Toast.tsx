'use client'

/**
 * components/Toast.tsx
 *
 * Sistem simplu de notificări tip "toast" — apar în colțul ecranului,
 * dispar automat după câteva secunde. Înlocuiește alert()/confirm() pentru
 * feedback de succes/eroare.
 *
 * Utilizare:
 *
 *   import { useToast, ToastContainer } from '@/components/Toast'
 *
 *   function MyComponent() {
 *     const { toasts, showToast } = useToast()
 *
 *     const handleSave = async () => {
 *       const ok = await doSomething()
 *       if (ok) showToast('Salvat cu succes!', 'success')
 *       else showToast('Eroare la salvare.', 'error')
 *     }
 *
 *     return (
 *       <>
 *         ...
 *         <ToastContainer toasts={toasts} />
 *       </>
 *     )
 *   }
 *
 * Pentru confirmări (înlocuiește confirm()), folosește ConfirmDialog separat
 * (vezi components/ConfirmDialog.tsx).
 */

import { useState, useCallback } from 'react'
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline'

export type ToastType = 'success' | 'error' | 'info'

export type ToastItem = {
  id: string
  message: string
  type: ToastType
}

const TOAST_DURATION = 3500 // ms

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, TOAST_DURATION)
  }, [])

  return { toasts, showToast }
}

const TOAST_STYLES: Record<ToastType, { bg: string; border: string; text: string; Icon: any }> = {
  success: { bg: '#edfaf3', border: '#bbf0d4', text: '#166534', Icon: CheckCircleIcon },
  error:   { bg: '#fff1f1', border: '#ffd3d3', text: '#991b1b', Icon: XCircleIcon },
  info:    { bg: '#eef3ff', border: '#c7d8ff', text: '#1e40af', Icon: InformationCircleIcon },
}

export function ToastContainer({ toasts }: { toasts: ToastItem[] }) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map(t => {
        const s = TOAST_STYLES[t.type]
        return (
          <div key={t.id}
            className="pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-[0_12px_30px_rgba(0,0,0,0.1)] border animate-toast-in max-w-[360px]"
            style={{ background: s.bg, borderColor: s.border }}>
            <s.Icon className="w-5 h-5 flex-shrink-0" style={{ color: s.text }} />
            <p className="text-[13px] font-semibold leading-snug" style={{ color: s.text }}>{t.message}</p>
          </div>
        )
      })}

      <style jsx>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(12px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-toast-in {
          animation: toast-in 0.25s ease-out;
        }
      `}</style>
    </div>
  )
}
