'use client'

import { CheckCircleIcon, ExclamationTriangleIcon, EnvelopeIcon, XMarkIcon } from '@heroicons/react/24/outline'

type Props = {
  recipientName: string
  recipientEmail: string
  senderEmail: string
  onClose: () => void
}

export default function EmailSentAlert({ recipientName, recipientEmail, senderEmail, onClose }: Props) {
  const zohoUrl = 'https://mail.tptranslator.com'

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(10,6,4,0.65)', backdropFilter: 'blur(10px)' }}>
      <div className="bg-white rounded-[28px] w-full max-w-[460px] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.2)]"
        style={{ animation: 'alertIn 0.3s cubic-bezier(0.22,1,0.36,1)' }}>
        <style>{`@keyframes alertIn{from{opacity:0;transform:scale(0.94) translateY(16px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>

        <div className="h-[4px] bg-[#166534]" />

        <div className="px-7 pt-7 pb-6">
          {/* Icon + title */}
          <div className="flex items-start gap-4 mb-5">
            <div className="w-12 h-12 rounded-[14px] bg-[#edfaf3] flex items-center justify-center flex-shrink-0">
              <CheckCircleIcon className="w-6 h-6 text-[#166534]" />
            </div>
            <div>
              <h2 className="text-[18px] font-semibold text-[#111] mb-1">Email trimis cu succes!</h2>
              <p className="text-[13px] text-[#666] leading-relaxed">
                Emailul a fost trimis către <span className="font-semibold text-[#111]">{recipientName}</span>
                {' '}(<span className="text-[#ce0100]">{recipientEmail}</span>).
              </p>
            </div>
          </div>

          {/* Verify copy box */}
          <div className="bg-[#fff5eb] border border-[#ffd9a8] rounded-[16px] p-4 mb-5">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-[#c05c00] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[13px] font-semibold text-[#c05c00] mb-1">Verifică copia în Zoho Mail</p>
                <p className="text-[12px] text-[#7a4a00] leading-relaxed mb-3">
                  Intră în contul tău Zoho Mail (<span className="font-semibold">{senderEmail}</span>) și verifică dacă emailul trimis apare în folderul <span className="font-semibold">Trimise</span>.
                  Dacă nu apare, trimite-l manual folosind șablonul.
                </p>
                <a href={zohoUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 h-8 px-4 rounded-xl bg-[#c05c00] text-white text-[12px] font-semibold hover:bg-[#a84e00] transition-all">
                  <EnvelopeIcon className="w-3.5 h-3.5" />
                  Deschide Zoho Mail
                </a>
              </div>
            </div>
          </div>

          {/* OK button */}
          <button onClick={onClose}
            className="w-full h-[46px] rounded-[14px] bg-[#ce0100] text-white text-[14px] font-bold hover:bg-[#a80000] transition-all shadow-[0_6px_16px_rgba(206,1,0,0.22)] flex items-center justify-center gap-2">
            <CheckCircleIcon className="w-4 h-4" />
            OK, am verificat
          </button>
        </div>
      </div>
    </div>
  )
}
