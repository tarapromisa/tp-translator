'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/context/UserContext'

type Question = {
  id: string; type: string; label: string
  options: string[]; required: boolean; prefill_field: string | null
}

export default function PublicFormPage() {
  const params = useParams()
  const slug = params?.slug as string
  const { profile } = useUser()
  const router = useRouter()

  const [form, setForm] = useState<any>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const load = async () => {
      // Fetch form by slug via API route (uses service role)
      const res = await fetch(`/api/formulare/public/${slug}`)
      if (!res.ok) { setNotFound(true); setLoading(false); return }
      const { form: f, questions: q } = await res.json()

      // Check if expired
      if (f.expires_at && new Date(f.expires_at) < new Date()) {
        setNotFound(true); setLoading(false); return
      }

      setForm(f); setQuestions(q)

      // Prefill from profile
      const prefilled: Record<string, any> = {}
      q.forEach((quest: Question) => {
        if (quest.prefill_field === 'full_name' && profile?.full_name)
          prefilled[quest.id] = profile.full_name
        if (quest.prefill_field === 'email' && profile?.email)
          prefilled[quest.id] = profile.email
      })
      setAnswers(prefilled)
      setLoading(false)
    }
    load()
  }, [slug, profile])

  const handleSubmit = async () => {
    // Validate required
    for (const q of questions) {
      if (q.required && !answers[q.id]) {
        setError(`Câmpul "${q.label}" este obligatoriu.`); return
      }
    }
    setSubmitting(true); setError(null)

    const res = await fetch(`/api/formulare/public/${slug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submitted_by: profile?.id ?? null,
        is_anonymous: !profile,
        answers: questions.map(q => ({ question_id: q.id, value: answers[q.id] ?? null })),
      }),
    })

    if (!res.ok) { setError('Eroare la trimitere. Încearcă din nou.'); setSubmitting(false); return }
    setSubmitted(true)
  }

  if (loading) return (
    <div className="min-h-screen bg-[#f9f7f5] flex items-center justify-center">
      <div style={{ width: '28px', height: '28px', border: '3px solid #f0e8e4', borderTopColor: '#ce0100', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen bg-[#f9f7f5] flex items-center justify-center p-4">
      <div className="text-center">
        <div className="text-5xl mb-4">📋</div>
        <h1 className="text-xl font-semibold text-[#111] mb-2">Formularul nu este disponibil</h1>
        <p className="text-sm text-[#888]">A expirat sau nu mai acceptă răspunsuri.</p>
      </div>
    </div>
  )

  if (submitted) return (
    <div className="min-h-screen bg-[#f9f7f5] flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-[#edfaf3] border border-[#bbf0d4] flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-[#166534]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-[#111] mb-2">Răspuns trimis!</h1>
        <p className="text-sm text-[#888]">Mulțumim pentru completarea formularului.</p>
      </div>
    </div>
  )

  const creator = (form as any).created_by_user?.full_name

  return (
    <div className="min-h-screen bg-[#f9f7f5] py-10 px-4">
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}.q-card{animation:fadeUp 0.25s ease-out both}`}</style>
      <div className="max-w-[560px] mx-auto">

        {/* Header */}
        <div className="q-card bg-white rounded-2xl border border-[#e8e2de] overflow-hidden shadow-sm mb-5">
          <div className="h-1.5 bg-[#ce0100]" />
          <div className="p-6 md:p-8">
            <div className="flex items-center gap-3 mb-5">
              <img src="https://res.cloudinary.com/dlgqpbpwu/image/upload/v1780344170/new_tpt_1_sxiu3b.png" alt="TP Translator" className="h-7 w-auto" />
              <div className="h-4 w-px bg-[#e8e2de]" />
              <span className="text-[10px] font-semibold text-[#aaa] uppercase tracking-widest">Formular</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold text-[#111] leading-tight mb-2">{form.titlu}</h1>
            {form.descriere && <p className="text-sm text-[#666] leading-relaxed mt-2">{form.descriere}</p>}
            {form.expires_at && (
              <div className="inline-flex items-center gap-1.5 mt-3 bg-[#fff5eb] border border-[#ffd9a8] rounded-full px-3 py-1">
                <span className="text-[11px] font-medium text-[#c05c00]">Expiră {new Date(form.expires_at).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
              </div>
            )}
          </div>
        </div>

        {/* Questions */}
        <div className="flex flex-col gap-3 mb-5">
          {questions.map((q, idx) => (
            <div key={q.id} className="q-card bg-white rounded-2xl border border-[#e8e2de] p-5 md:p-6 shadow-sm" style={{ animationDelay: `${idx * 0.04}s` }}>
              <label className="block text-sm font-semibold text-[#111] mb-3 leading-snug">
                {q.label}{q.required && <span className="text-[#ce0100] ml-1">*</span>}
              </label>

              {q.type === 'short_text' && (
                <input value={answers[q.id] ?? ''} onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  className="w-full h-11 rounded-[14px] border border-[#f0e9e5] px-4 text-sm text-[#111] outline-none focus:border-[#ce0100] focus:shadow-[0_0_0_3px_rgba(206,1,0,0.07)] transition-all" />
              )}

              {q.type === 'long_text' && (
                <textarea value={answers[q.id] ?? ''} onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))} rows={4}
                  className="w-full rounded-[14px] border border-[#f0e9e5] px-4 py-3 text-sm text-[#111] outline-none focus:border-[#ce0100] focus:shadow-[0_0_0_3px_rgba(206,1,0,0.07)] transition-all resize-none" />
              )}

              {q.type === 'radio' && (
                <div className="flex flex-col gap-2">
                  {q.options.map(opt => (
                    <label key={opt} className={`flex items-center gap-3 cursor-pointer px-4 py-3 rounded-xl border-2 transition-all ${answers[q.id] === opt ? 'border-[#ce0100] bg-[#fff7f7]' : 'border-[#f0e9e5] hover:border-[#ffd3d3]'}`}>
                      <input type="radio" name={q.id} value={opt} checked={answers[q.id] === opt} onChange={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))} className="w-4 h-4 accent-[#ce0100]" />
                      <span className="text-sm text-[#444]">{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.type === 'checkbox' && (
                <div className="flex flex-col gap-2">
                  {q.options.map(opt => {
                    const checked = Array.isArray(answers[q.id]) && answers[q.id].includes(opt)
                    return (
                      <label key={opt} className={`flex items-center gap-3 cursor-pointer px-4 py-3 rounded-xl border-2 transition-all ${checked ? 'border-[#ce0100] bg-[#fff7f7]' : 'border-[#f0e9e5] hover:border-[#ffd3d3]'}`}>
                        <input type="checkbox" value={opt} checked={checked}
                          onChange={e => {
                            const arr = Array.isArray(answers[q.id]) ? [...answers[q.id]] : []
                            setAnswers(prev => ({ ...prev, [q.id]: e.target.checked ? [...arr, opt] : arr.filter((v: string) => v !== opt) }))
                          }} className="w-4 h-4 accent-[#ce0100]" />
                        <span className="text-sm text-[#444]">{opt}</span>
                      </label>
                    )
                  })}
                </div>
              )}

              {q.type === 'dropdown' && (
                <select value={answers[q.id] ?? ''} onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  className="w-full h-11 rounded-[14px] border border-[#f0e9e5] px-4 text-sm text-[#111] outline-none focus:border-[#ce0100] transition-all bg-white cursor-pointer">
                  <option value="">— Selectează —</option>
                  {q.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-[#fff1f1] border border-[#ffd3d3] rounded-xl px-4 py-3 text-sm text-[#ce0100] font-medium mb-4">
            {error}
          </div>
        )}

        <button onClick={handleSubmit} disabled={submitting}
          className="w-full h-12 rounded-xl bg-[#ce0100] text-white text-sm font-bold hover:bg-[#a80000] transition-all shadow-[0_6px_16px_rgba(206,1,0,0.22)] disabled:opacity-50">
          {submitting ? 'Se trimite...' : 'Trimite răspunsul →'}
        </button>

        {/* Footer */}
        <div className="text-center mt-6">
          {creator && <p className="text-[11px] text-[#bbb] mb-1">Creat de <span className="text-[#999]">{creator}</span></p>}
          <p className="text-[11px] text-[#ccc]">© TP Translator · <a href="https://tptranslator.com" className="text-[#ce0100] hover:underline">tptranslator.com</a></p>
        </div>
      </div>
    </div>
  )
}