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
      <p className="text-[#888]">Se încarcă...</p>
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen bg-[#f9f7f5] flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-4xl mb-4">📋</p>
        <h1 className="text-xl font-semibold text-[#111] mb-2">Formularul nu este disponibil</h1>
        <p className="text-[#888] text-sm">Formularul nu există, a expirat sau nu mai acceptă răspunsuri.</p>
      </div>
    </div>
  )

  if (submitted) return (
    <div className="min-h-screen bg-[#f9f7f5] flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-[#edfaf3] flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-[#166534]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-[#111] mb-2">Răspuns trimis!</h1>
        <p className="text-[#888] text-sm">Mulțumim pentru completarea formularului.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f9f7f5] py-10 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-[#e8e2de] overflow-hidden shadow-sm mb-6">
          <div className="h-2 bg-[#ce0100]" />
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <img src="https://res.cloudinary.com/dlgqpbpwu/image/upload/v1780344170/new_tpt_1_sxiu3b.png"
                alt="TP Translator" className="h-8 w-auto" />
            </div>
            <h1 className="text-2xl font-semibold text-[#111] mb-2">{form.titlu}</h1>
            {form.descriere && <p className="text-sm text-[#666]">{form.descriere}</p>}
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-4 mb-6">
          {questions.map(q => (
            <QuestionInput
              key={q.id}
              question={q}
              value={answers[q.id]}
              onChange={val => setAnswers(prev => ({ ...prev, [q.id]: val }))}
            />
          ))}
        </div>

        {error && (
          <div className="bg-[#fff1f1] border border-[#ffd3d3] rounded-xl px-4 py-3 text-sm text-[#ce0100] font-medium mb-4">
            {error}
          </div>
        )}

        <button onClick={handleSubmit} disabled={submitting}
          className="w-full h-12 rounded-xl bg-[#ce0100] text-white text-sm font-bold hover:bg-[#a80000] transition-all shadow-[0_6px_16px_rgba(206,1,0,0.22)] disabled:opacity-50">
          {submitting ? 'Se trimite...' : 'Trimite răspunsul'}
        </button>
      </div>
    </div>
  )
}

function QuestionInput({ question, value, onChange }: {
  question: Question; value: any; onChange: (v: any) => void
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#e8e2de] p-5 shadow-sm">
      <label className="block text-sm font-semibold text-[#111] mb-3">
        {question.label}
        {question.required && <span className="text-[#ce0100] ml-1">*</span>}
      </label>

      {question.type === 'short_text' && (
        <input value={value ?? ''} onChange={e => onChange(e.target.value)}
          className="w-full h-11 rounded-[14px] border border-[#f0e9e5] px-4 text-sm text-[#111] outline-none focus:border-[#ce0100] transition-all" />
      )}

      {question.type === 'long_text' && (
        <textarea value={value ?? ''} onChange={e => onChange(e.target.value)} rows={4}
          className="w-full rounded-[14px] border border-[#f0e9e5] px-4 py-3 text-sm text-[#111] outline-none focus:border-[#ce0100] transition-all resize-none" />
      )}

      {question.type === 'radio' && (
        <div className="space-y-2">
          {question.options.map(opt => (
            <label key={opt} className="flex items-center gap-3 cursor-pointer">
              <input type="radio" name={question.id} value={opt}
                checked={value === opt} onChange={() => onChange(opt)}
                className="w-4 h-4 accent-[#ce0100]" />
              <span className="text-sm text-[#444]">{opt}</span>
            </label>
          ))}
        </div>
      )}

      {question.type === 'checkbox' && (
        <div className="space-y-2">
          {question.options.map(opt => (
            <label key={opt} className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" value={opt}
                checked={Array.isArray(value) && value.includes(opt)}
                onChange={e => {
                  const arr = Array.isArray(value) ? [...value] : []
                  onChange(e.target.checked ? [...arr, opt] : arr.filter(v => v !== opt))
                }}
                className="w-4 h-4 accent-[#ce0100]" />
              <span className="text-sm text-[#444]">{opt}</span>
            </label>
          ))}
        </div>
      )}

      {question.type === 'dropdown' && (
        <select value={value ?? ''} onChange={e => onChange(e.target.value)}
          className="w-full h-11 rounded-[14px] border border-[#f0e9e5] px-4 text-sm text-[#111] outline-none focus:border-[#ce0100] transition-all bg-white">
          <option value="">— Selectează —</option>
          {question.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      )}
    </div>
  )
}
