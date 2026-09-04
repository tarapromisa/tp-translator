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
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        .q-card { animation: fadeUp 0.25s ease-out both; }
      `}</style>

      <div className="max-w-[560px] mx-auto">

        {/* Header */}
        <div className="bg-white rounded-2xl border border-[#e8e2de] overflow-hidden shadow-sm mb-5 q-card">
          <div className="h-1.5 bg-[#ce0100]" />
          <div className="p-6 md:p-8">
            <div className="flex items-center gap-3 mb-5">
              <img src="https://res.cloudinary.com/dlgqpbpwu/image/upload/v1780344170/new_tpt_1_sxiu3b.png"
                alt="TP Translator" className="h-7 w-auto" />
              <div className="h-4 w-px bg-[#e8e2de]" />
              <span className="text-[10px] font-semibold text-[#aaa] uppercase tracking-widest">Formular</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold text-[#111] leading-tight mb-2">{form.titlu}</h1>
            {form.descriere && (
              <p className="text-sm text-[#666] leading-relaxed mt-2">{form.descriere}</p>
            )}
            {form.expires_at && (
              <div className="inline-flex items-center gap-1.5 mt-3 bg-[#fff5eb] border border-[#ffd9a8] rounded-full px-3 py-1">
                <span className="text-[11px] font-medium text-[#c05c00]">
                  Expiră {new Date(form.expires_at).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Questions */}
        <div className="flex flex-col gap-3 mb-5">
          {questions.map((q, idx) => (
            <div key={q.id} className="q-card bg-white rounded-2xl border border-[#e8e2de] p-5 md:p-6 shadow-sm"
              style={{ animationDelay: `${idx * 0.04}s` }}>
              <label className="block text-sm font-semibold text-[#111] mb-3 leading-snug">
                {q.label}
                {q.required && <span className="text-[#ce0100] ml-1">*</span>}
              </label>

              {q.type === 'short_text' && (
                <input value={answers[q.id] ?? ''} onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  className="w-full h-11 rounded-[14px] border border-[#f0e9e5] px-4 text-sm text-[#111] outline-none focus:border-[#ce0100] focus:shadow-[0_0_0_3px_rgba(206,1,0,0.07)] transition-all placeholder:text-[#ccc]" />
              )}

              {q.type === 'long_text' && (
                <textarea value={answers[q.id] ?? ''} onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))} rows={4}
                  className="w-full rounded-[14px] border border-[#f0e9e5] px-4 py-3 text-sm text-[#111] outline-none focus:border-[#ce0100] focus:shadow-[0_0_0_3px_rgba(206,1,0,0.07)] transition-all resize-none" />
              )}

              {q.type === 'radio' && (
                <div className="flex flex-col gap-2">
                  {q.options.map(opt => (
                    <label key={opt} className={`flex items-center gap-3 cursor-pointer px-4 py-3 rounded-xl border-2 transition-all ${
                      answers[q.id] === opt ? 'border-[#ce0100] bg-[#fff7f7]' : 'border-[#f0e9e5] hover:border-[#ffd3d3]'
                    }`}>
                      <input type="radio" name={q.id} value={opt} checked={answers[q.id] === opt}
                        onChange={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                        className="w-4 h-4 accent-[#ce0100]" />
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
                      <label key={opt} className={`flex items-center gap-3 cursor-pointer px-4 py-3 rounded-xl border-2 transition-all ${
                        checked ? 'border-[#ce0100] bg-[#fff7f7]' : 'border-[#f0e9e5] hover:border-[#ffd3d3]'
                      }`}>
                        <input type="checkbox" value={opt} checked={checked}
                          onChange={e => {
                            const arr = Array.isArray(answers[q.id]) ? [...answers[q.id]] : []
                            setAnswers(prev => ({ ...prev, [q.id]: e.target.checked ? [...arr, opt] : arr.filter(v => v !== opt) }))
                          }}
                          className="w-4 h-4 accent-[#ce0100]" />
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
          {creator && (
            <p className="text-[11px] text-[#bbb] mb-1">
              Creat de <span className="text-[#999]">{creator}</span>
            </p>
          )}
          <p className="text-[11px] text-[#ccc]">
            © TP Translator ·{' '}
            <a href="https://tptranslator.com" className="text-[#ce0100] hover:underline">tptranslator.com</a>
          </p>
        </div>
      </div>
    </div>
  )
}

  if (notFound) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a0a0a 0%, #2d0f0f 40%, #1a0505 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ textAlign: 'center', color: 'white' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
        <h1 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>Formularul nu este disponibil</h1>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>A expirat sau nu mai acceptă răspunsuri.</p>
      </div>
    </div>
  )

  if (submitted) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a0a0a 0%, #2d0f0f 40%, #1a0505 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: 'rgba(22,101,52,0.3)', border: '1px solid rgba(22,101,52,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <svg style={{ width: '36px', height: '36px', color: '#4ade80' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'white', marginBottom: '8px' }}>Răspuns trimis!</h1>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>Mulțumim pentru completarea formularului.</p>
      </div>
    </div>
  )

  const creator = (form as any).created_by_user?.full_name

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a0a0a 0%, #2d0f0f 40%, #1a0505 100%)', padding: '40px 16px 60px' }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        .form-card { animation: fadeUp 0.3s ease-out both; }
        .form-card:nth-child(2) { animation-delay: 0.05s }
        .form-card:nth-child(3) { animation-delay: 0.1s }
        .form-card:nth-child(4) { animation-delay: 0.15s }
        .form-input { background: rgba(255,255,255,0.06) !important; border: 1px solid rgba(255,255,255,0.1) !important; color: white !important; transition: all 0.2s; }
        .form-input:focus { border-color: #ce0100 !important; background: rgba(206,1,0,0.08) !important; outline: none !important; }
        .form-input::placeholder { color: rgba(255,255,255,0.3) !important; }
      `}</style>

      <div style={{ maxWidth: '560px', margin: '0 auto' }}>

        {/* Header card */}
        <div className="form-card" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', overflow: 'hidden', marginBottom: '16px', backdropFilter: 'blur(20px)' }}>
          <div style={{ height: '4px', background: 'linear-gradient(90deg, #ce0100, #ff4444)' }} />
          <div style={{ padding: '28px 28px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <img src="https://res.cloudinary.com/dlgqpbpwu/image/upload/v1780344170/new_tpt_1_sxiu3b.png"
                alt="TP Translator" style={{ height: '32px', width: 'auto' }} />
              <div style={{ height: '20px', width: '1px', background: 'rgba(255,255,255,0.15)' }} />
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Formular intern</span>
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 600, color: 'white', lineHeight: 1.2, marginBottom: form.descriere ? '10px' : '0' }}>
              {form.titlu}
            </h1>
            {form.descriere && (
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>{form.descriere}</p>
            )}
            {form.expires_at && (
              <div style={{ marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(192,92,0,0.2)', border: '1px solid rgba(192,92,0,0.3)', borderRadius: '100px', padding: '4px 12px' }}>
                <span style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 500 }}>
                  Expiră {new Date(form.expires_at).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Questions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
          {questions.map((q, idx) => (
            <div key={q.id} className="form-card" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '22px 24px', backdropFilter: 'blur(20px)', animationDelay: `${idx * 0.05}s` }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'white', marginBottom: '12px', lineHeight: 1.4 }}>
                {q.label}
                {q.required && <span style={{ color: '#ce0100', marginLeft: '4px' }}>*</span>}
              </label>

              {q.type === 'short_text' && (
                <input value={answers[q.id] ?? ''} onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  className="form-input"
                  style={{ width: '100%', height: '44px', borderRadius: '12px', padding: '0 14px', fontSize: '14px', boxSizing: 'border-box' }} />
              )}

              {q.type === 'long_text' && (
                <textarea value={answers[q.id] ?? ''} onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))} rows={4}
                  className="form-input"
                  style={{ width: '100%', borderRadius: '12px', padding: '12px 14px', fontSize: '14px', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
              )}

              {q.type === 'radio' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {q.options.map(opt => (
                    <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '10px 14px', borderRadius: '12px', border: `1px solid ${answers[q.id] === opt ? '#ce0100' : 'rgba(255,255,255,0.08)'}`, background: answers[q.id] === opt ? 'rgba(206,1,0,0.12)' : 'rgba(255,255,255,0.02)', transition: 'all 0.15s' }}>
                      <input type="radio" name={q.id} value={opt} checked={answers[q.id] === opt} onChange={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                        style={{ accentColor: '#ce0100', width: '16px', height: '16px' }} />
                      <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)' }}>{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.type === 'checkbox' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {q.options.map(opt => {
                    const checked = Array.isArray(answers[q.id]) && answers[q.id].includes(opt)
                    return (
                      <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '10px 14px', borderRadius: '12px', border: `1px solid ${checked ? '#ce0100' : 'rgba(255,255,255,0.08)'}`, background: checked ? 'rgba(206,1,0,0.12)' : 'rgba(255,255,255,0.02)', transition: 'all 0.15s' }}>
                        <input type="checkbox" value={opt} checked={checked}
                          onChange={e => {
                            const arr = Array.isArray(answers[q.id]) ? [...answers[q.id]] : []
                            setAnswers(prev => ({ ...prev, [q.id]: e.target.checked ? [...arr, opt] : arr.filter(v => v !== opt) }))
                          }}
                          style={{ accentColor: '#ce0100', width: '16px', height: '16px' }} />
                        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)' }}>{opt}</span>
                      </label>
                    )
                  })}
                </div>
              )}

              {q.type === 'dropdown' && (
                <select value={answers[q.id] ?? ''} onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  className="form-input"
                  style={{ width: '100%', height: '44px', borderRadius: '12px', padding: '0 14px', fontSize: '14px', boxSizing: 'border-box', cursor: 'pointer' }}>
                  <option value="" style={{ background: '#1a0a0a' }}>— Selectează —</option>
                  {q.options.map(opt => <option key={opt} value={opt} style={{ background: '#1a0a0a' }}>{opt}</option>)}
                </select>
              )}
            </div>
          ))}
        </div>

        {error && (
          <div style={{ background: 'rgba(206,1,0,0.15)', border: '1px solid rgba(206,1,0,0.3)', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', color: '#fca5a5', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <button onClick={handleSubmit} disabled={submitting}
          style={{ width: '100%', height: '52px', borderRadius: '16px', background: submitting ? 'rgba(206,1,0,0.5)' : 'linear-gradient(135deg, #ce0100, #a80000)', border: 'none', color: 'white', fontSize: '15px', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', boxShadow: '0 8px 24px rgba(206,1,0,0.35)', transition: 'all 0.2s', letterSpacing: '0.02em' }}>
          {submitting ? 'Se trimite...' : 'Trimite răspunsul →'}
        </button>

        {/* Footer - creator */}
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          {creator && (
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginBottom: '4px' }}>
              Creat de <span style={{ color: 'rgba(255,255,255,0.4)' }}>{creator}</span>
            </p>
          )}
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>
            © TP Translator · <a href="https://tptranslator.com" style={{ color: 'rgba(206,1,0,0.6)', textDecoration: 'none' }}>tptranslator.com</a>
          </p>
        </div>
      </div>
    </div>
  )
}