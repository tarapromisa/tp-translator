'use client'

import { useEffect, useRef } from 'react'
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface DeleteModalProps {
  isOpen: boolean
  citationId: string
  citationText: string
  onConfirm: () => void
  onCancel: () => void
  isDeleting: boolean
}

export default function DeleteModal({
  isOpen,
  citationId,
  citationText,
  onConfirm,
  onCancel,
  isDeleting,
}: DeleteModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isDeleting) onCancel()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, isDeleting, onCancel])

  // Lock body scroll
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      <style>{`
        @keyframes overlayIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.92) translateY(16px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes iconPulse {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.12); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .delete-overlay   { animation: overlayIn 0.2s ease forwards; }
        .delete-modal     { animation: modalIn  0.25s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .icon-pulse       { animation: iconPulse 2s ease-in-out infinite; }
        .spinner          { animation: spin 0.8s linear infinite; }
      `}</style>

      {/* Overlay */}
      <div
        ref={overlayRef}
        onClick={(e) => { if (e.target === overlayRef.current && !isDeleting) onCancel() }}
        className="delete-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(10,6,4,0.55)', backdropFilter: 'blur(6px)' }}
      >
        {/* Modal */}
        <div className="delete-modal relative bg-white rounded-[28px] w-full max-w-[420px] overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.18)]">

          {/* Red top accent bar */}
          <div className="h-[5px] w-full bg-gradient-to-r from-[#ce0100] via-[#ff4444] to-[#ce0100]" />

          {/* Close button */}
          {!isDeleting && (
            <button
              onClick={onCancel}
              className="absolute top-[18px] right-[18px] w-[32px] h-[32px] rounded-full bg-[#f4ece9] flex items-center justify-center text-[#8f8179] hover:bg-[#ffe0e0] hover:text-[#ce0100] transition-all"
            >
              <XMarkIcon className="w-[16px] h-[16px]" />
            </button>
          )}

          <div className="px-[36px] pt-[36px] pb-[32px]">

            {/* Icon */}
            <div className="flex justify-center mb-[24px]">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-[#ce0100] opacity-10 scale-150" />
                <div className="relative w-[72px] h-[72px] rounded-full bg-[#fff1f1] border-[2px] border-[#f4d4d4] flex items-center justify-center icon-pulse">
                  <ExclamationTriangleIcon className="w-[32px] h-[32px] text-[#ce0100]" />
                </div>
              </div>
            </div>

            {/* Title */}
            <h2 className="text-[22px] font-[800] text-[#111] text-center mb-[8px] tracking-[-0.02em]">
              Ștergi citatul?
            </h2>
            <p className="text-[14px] text-[#8f8179] text-center mb-[24px] leading-[22px]">
              Această acțiune este <strong className="text-[#111] font-[600]">ireversibilă</strong>. Citatul și toate traducerile asociate vor fi șterse permanent.
            </p>

            {/* Citation preview chip */}
            <div className="bg-[#faf7f5] border border-[#f0e9e5] rounded-[16px] px-[18px] py-[14px] mb-[28px]">
              <p className="text-[11px] font-[700] uppercase tracking-[0.14em] text-[#ce0100] mb-[4px]">
                {citationId}
              </p>
              <p className="text-[14px] text-[#444] leading-[20px] line-clamp-2 font-[300]">
                "{citationText}"
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-[10px]">
              <button
                onClick={onCancel}
                disabled={isDeleting}
                className="flex-1 h-[48px] rounded-[14px] border border-[#ece6e2] bg-white text-[14px] font-[600] text-[#8f8179] hover:bg-[#faf7f5] disabled:opacity-40 transition-all"
              >
                Anulează
              </button>

              <button
                onClick={onConfirm}
                disabled={isDeleting}
                className="flex-1 h-[48px] rounded-[14px] bg-[#ce0100] text-white text-[14px] font-[700] flex items-center justify-center gap-[8px] shadow-[0_8px_20px_rgba(206,1,0,0.3)] hover:bg-[#a80000] hover:shadow-[0_8px_20px_rgba(206,1,0,0.45)] disabled:opacity-70 transition-all"
              >
                {isDeleting ? (
                  <>
                    <svg className="spinner w-[16px] h-[16px]" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Se șterge...
                  </>
                ) : (
                  'Da, șterge'
                )}
              </button>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}
