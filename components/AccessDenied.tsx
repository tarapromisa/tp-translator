'use client'

import { useRouter } from 'next/navigation'
import { ShieldExclamationIcon } from '@heroicons/react/24/outline'

export default function AccessDenied() {
  const router = useRouter()
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-[#fff1f1] flex items-center justify-center mx-auto mb-4">
          <ShieldExclamationIcon className="w-8 h-8 text-[#ce0100]" />
        </div>
        <h2 className="text-xl font-semibold text-[#111] mb-2">Acces restricționat</h2>
        <p className="text-sm text-[#888] mb-6 leading-relaxed">
          Nu ai permisiunea să accesezi această pagină. Contactează un coordonator dacă crezi că este o eroare.
        </p>
        <button onClick={() => router.push('/')}
          className="h-10 px-6 rounded-xl bg-[#ce0100] text-white text-sm font-semibold hover:bg-[#a80000] transition-all">
          Înapoi la Dashboard
        </button>
      </div>
    </div>
  )
}