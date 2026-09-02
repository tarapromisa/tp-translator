'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/context/UserContext'
import { CheckCircleIcon } from '@heroicons/react/24/outline'

type Question = {
  id: string; type: string; label: string
  options: string[]; required: boolean; prefill_field: string | null
}

export default function FormularInternPage() {
  const params = useParams()
  const formId = params?.id as string
  const { profile } = useUser()
  const router = useRouter()

  const [form, setForm] = useState<any>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const [{ data: f }, { data: q }] = await Promise.all([
        supabase.from('forms').select('*').eq('id', formId).single(),
        supabase.from('form_questions').select('*').eq('form_id', formId).order('order_index'),
      ])
      if (!f) { router.push('/formulare'); return }
      setForm(f)
      setQuestions(q || [])

      // Prefill from profile
      const prefilled: Record<string, any> = {}
      ;(q || []).forEach((quest: Question) => {
        if (quest.prefill_field === 'full_name' && profile?.full_name)
          prefilled[quest.id] = profile.full_name
        if (quest.prefill_field === 'email' && profile?.email)
          prefilled[quest.id] = profile.email
      })
      setAnswers(prefilled)
      setLoading(false)
    }
    if (profile) load()
  }, [formId, profile])

  const handleSubmit = async () => {
    for (const q of questions) {
      if (q.required && !answers[q.id]) {
        setError(`Câmpul "${q.label}" este obligatoriu.`); return
      }
    }
    setSubmitting(true); setError(null)

    const { data: response, error: respErr } = await supabase
      .from('form_responses')
      .insert({ form_id: formId, submitted_by: profile?.id, is_anonymous: false })
      .select('id').single()

    if (respErr || !response) {
      setError('Eroare la trimitere.'); setSubmitting(false); return
    }

    if (questions.length > 0) {
      await supabase.from('form_answers').insert(
        questions.map(q => ({
          response_id: response.id,
          question_id: q.id,
          value: answers[q.id] ?? null,
        }))
      )
    }
    setSubmitted(true)
  }

  if (loading) return (
    <main className="flex h-screen overflow-hidden bg-[#f9f7f5]">
      <Sidebar />
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[#888]">Se încarcă...</p>
      </div>
    </main>
  )

  if (submitted) return (
    <main className="flex h-screen overflow-hidden bg-[#f9f7f5]">
      <Sidebar />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-[#edfaf3] flex items-center justify-center mx-auto mb-4">
            <CheckCircleIcon className="w-8 h-8 text-[#166534]" />
          </div>
          <h1 className="text-xl font-semibold text-[#111] mb-2">Răspuns trimis!</h1>
          <p className="text-[#888] text-sm mb-6">Mulțumim pentru completarea formularului.</p>
          <button onClick={() => router.push('/formulare')}
            className="h-10 px-6 rounded-xl bg-[#ce0100] text-white text-sm font-semibold hover:bg-[#a80000] transition-all">
            Înapoi la formulare
          </button>
        </div>
      </div>
    </main>
  )

  return (
    <main className="flex h-screen overflow-hidden bg-[#f9f7f5]">
      <Sidebar />
      <div className="flex-1 min-w-0 overflow-y-auto px-4 py-8">
        <div className="max-w-xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-2xl border border-[#e8e2de] overflow-hidden shadow-sm mb-6">
            <div className="h-2 bg-[#ce0100]" />
            <div className="p-6">
              <h1 className="text-2xl font-semibold text-[#111] mb-2">{form.titlu}</h1>
              {form.descriere && <p className="text-sm text-[#666]">{form.descriere}</p>}
              {form.expires_at && (
                <p className="text-[11px] text-[#c05c00] mt-2">
                  Expiră: {new Date(form.expires_at).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              )}
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
    </main>
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
