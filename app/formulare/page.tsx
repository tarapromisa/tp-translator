'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/context/UserContext'
import {
  PlusIcon, TrashIcon, XMarkIcon, ChevronUpIcon, ChevronDownIcon,
  DocumentTextIcon, EyeIcon, LinkIcon, ClipboardDocumentIcon,
  ClipboardDocumentCheckIcon, CheckCircleIcon, ExclamationTriangleIcon,
  MegaphoneIcon, UsersIcon, GlobeAltIcon, UserGroupIcon,
} from '@heroicons/react/24/outline'

// ── Types ─────────────────────────────────────────────────
type QType = 'short_text' | 'long_text' | 'radio' | 'checkbox' | 'dropdown'
type Visibility = 'public' | 'internal_all' | 'internal_specific'

type Question = {
  id: string
  type: QType
  label: string
  options: string[]
  required: boolean
  order_index: number
  prefill_field: 'full_name' | 'email' | null
}

type Form = {
  id: string
  titlu: string
  descriere: string | null
  visibility: Visibility
  public_slug: string | null
  expires_at: string | null
  created_by: string | null
  created_at: string
  created_by_user?: { full_name: string } | null
  _response_count?: number
}

type AppUser = { id: string; full_name: string; email: string; role: string }

const Q_TYPE_LABELS: Record<QType, string> = {
  short_text: 'Text scurt',
  long_text: 'Text lung',
  radio: 'Opțiune unică',
  checkbox: 'Casete multiple',
  dropdown: 'Listă derulantă',
}

const VIS_CONFIG: Record<Visibility, { label: string; icon: any; color: string }> = {
  public: { label: 'Public', icon: GlobeAltIcon, color: '#166534' },
  internal_all: { label: 'Tot echipa', icon: UsersIcon, color: '#1e40af' },
  internal_specific: { label: 'Persoane specifice', icon: UserGroupIcon, color: '#c05c00' },
}

function genId() { return Math.random().toString(36).slice(2) }
function genSlug() { return Math.random().toString(36).slice(2, 10) }

// ── Main Page ──────────────────────────────────────────────
export default function FormularePage() {
  const { profile } = useUser()
  const router = useRouter()
  const role = profile?.role ?? ''
  const canManage = ['Admin', 'Coordonator principal', 'Coordonator'].includes(role)
  const isTranslator = !canManage

  const [forms, setForms] = useState<Form[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'list' | 'create' | 'edit' | 'responses'>('list')
  const [editingForm, setEditingForm] = useState<Form | null>(null)
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null)
  const [copiedSlug, setCopiedSlug] = useState(false)

  const fetchForms = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('forms')
      .select('*, created_by_user:created_by(full_name)')
      .order('created_at', { ascending: false })

    if (data) {
      // Get response counts
      const counts: Record<string, number> = {}
      await Promise.all(data.map(async (f) => {
        const { count } = await supabase
          .from('form_responses')
          .select('*', { count: 'exact', head: true })
          .eq('form_id', f.id)
        counts[f.id] = count ?? 0
      }))
      setForms(data.map(f => ({ ...f, _response_count: counts[f.id] })))
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchForms() }, [fetchForms])

  const handleDelete = async (id: string) => {
    if (!confirm('Sigur vrei să ștergi acest formular?')) return
    await supabase.from('forms').delete().eq('id', id)
    setForms(prev => prev.filter(f => f.id !== id))
  }

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/f/${slug}`)
    setCopiedSlug(true)
    setTimeout(() => setCopiedSlug(false), 2000)
  }

  // Translator view — pending forms
  if (isTranslator) {
    return (
      <main className="flex h-screen overflow-hidden bg-[#f9f7f5]">
        <Sidebar />
        <div className="flex-1 min-w-0 px-4 py-6 md:px-10 md:py-8 overflow-y-auto">
          <h1 className="text-[40px] md:text-[52px] leading-none tracking-tight font-light text-[#111] mb-3">Formulare</h1>
          <div className="w-10 h-[3px] rounded-full bg-[#ce0100] mb-8" />
          {loading ? (
            <p className="text-[#888]">Se încarcă...</p>
          ) : forms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#edfaf3] flex items-center justify-center">
                <CheckCircleIcon className="w-8 h-8 text-[#166534]" />
              </div>
              <h2 className="text-xl font-semibold text-[#111]">Tot la zi!</h2>
              <p className="text-[#888] text-sm">Nu ai formulare de completat momentan.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 max-w-2xl">
              {forms.map(f => (
                <div key={f.id} className="bg-white border border-[#e8e2de] rounded-2xl overflow-hidden shadow-sm">
                  <div className="h-1 bg-[#ce0100]" />
                  <div className="p-5">
                    <h3 className="text-base font-semibold text-[#111] mb-1">{f.titlu}</h3>
                    {f.descriere && <p className="text-sm text-[#666] mb-3">{f.descriere}</p>}
                    {f.expires_at && (
                      <p className="text-[11px] text-[#c05c00] mb-3">
                        Expiră: {new Date(f.expires_at).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </p>
                    )}
                    <button onClick={() => router.push(`/formulare/${f.id}`)}
                      className="h-10 px-5 rounded-xl bg-[#ce0100] text-white text-sm font-semibold hover:bg-[#a80000] transition-all shadow-[0_4px_12px_rgba(206,1,0,0.2)]">
                      Completează formularul →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    )
  }

  // Manager view
  if (view === 'create' || view === 'edit') {
    return (
      <FormBuilder
        form={view === 'edit' ? editingForm : null}
        onSaved={() => { fetchForms(); setView('list') }}
        onCancel={() => setView('list')}
      />
    )
  }

  if (view === 'responses' && selectedFormId) {
    return (
      <ResponsesView
        formId={selectedFormId}
        onBack={() => setView('list')}
      />
    )
  }

  return (
    <main className="flex h-screen overflow-hidden bg-[#f9f7f5]">
      <Sidebar />
      <div className="flex-1 min-w-0 px-4 py-6 md:px-10 md:py-8 overflow-y-auto">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-[40px] md:text-[52px] leading-none tracking-tight font-light text-[#111] mb-3">Formulare</h1>
            <div className="w-10 h-[3px] rounded-full bg-[#ce0100] mb-4" />
            <p className="text-base text-[#666]">Creează și gestionează formulare interne.</p>
          </div>
          <button onClick={() => setView('create')}
            className="h-11 px-6 rounded-xl bg-[#ce0100] text-white text-sm font-semibold shadow-[0_6px_16px_rgba(206,1,0,0.22)] hover:bg-[#a80000] transition-all flex items-center gap-2">
            <PlusIcon className="w-4 h-4" /> Formular nou
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-[#888]">Se încarcă...</p>
          </div>
        ) : forms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#fff1f1] flex items-center justify-center">
              <DocumentTextIcon className="w-8 h-8 text-[#ce0100]" />
            </div>
            <h2 className="text-xl font-semibold text-[#111]">Niciun formular încă</h2>
            <p className="text-[#888] text-sm">Creează primul tău formular intern.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {forms.map(f => {
              const vis = VIS_CONFIG[f.visibility]
              const VisIcon = vis.icon
              const expired = f.expires_at && new Date(f.expires_at) < new Date()
              return (
                <div key={f.id} className="bg-white border border-[#e8e2de] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="h-1" style={{ background: expired ? '#aaa' : '#ce0100' }} />
                  <div className="p-5 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-base font-semibold text-[#111]">{f.titlu}</h3>
                        {expired && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f4f4f4] text-[#888]">EXPIRAT</span>
                        )}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                          style={{ background: vis.color + '18', color: vis.color }}>
                          <VisIcon className="w-3 h-3" /> {vis.label}
                        </span>
                      </div>
                      {f.descriere && <p className="text-sm text-[#666] mb-2 truncate">{f.descriere}</p>}
                      <div className="flex items-center gap-4 text-[11px] text-[#aaa]">
                        <span>{f._response_count ?? 0} răspuns{(f._response_count ?? 0) !== 1 ? 'uri' : ''}</span>
                        {f.expires_at && (
                          <span>Expiră {new Date(f.expires_at).toLocaleDateString('ro-RO')}</span>
                        )}
                        <span>de {(f.created_by_user as any)?.full_name ?? '—'}</span>
                      </div>
                      {f.visibility === 'public' && f.public_slug && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[11px] text-[#888] font-mono bg-[#f9f7f5] px-2 py-1 rounded-lg truncate max-w-[200px]">
                            /f/{f.public_slug}
                          </span>
                          <button onClick={() => copyLink(f.public_slug!)}
                            className="w-7 h-7 rounded-lg bg-[#f9f7f5] flex items-center justify-center hover:bg-[#f0e8e4] transition-all">
                            {copiedSlug
                              ? <ClipboardDocumentCheckIcon className="w-3.5 h-3.5 text-[#166534]" />
                              : <ClipboardDocumentIcon className="w-3.5 h-3.5 text-[#888]" />
                            }
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => { setSelectedFormId(f.id); setView('responses') }}
                        className="h-8 px-3 rounded-xl border border-[#e8e2de] text-[11px] font-semibold text-[#555] hover:bg-[#f9f7f5] transition-all flex items-center gap-1.5">
                        <EyeIcon className="w-3.5 h-3.5" /> Răspunsuri
                      </button>
                      <button onClick={() => { setEditingForm(f); setView('edit') }}
                        className="h-8 px-3 rounded-xl border border-[#e8e2de] text-[11px] font-semibold text-[#555] hover:bg-[#f9f7f5] transition-all">
                        Editează
                      </button>
                      <button onClick={() => handleDelete(f.id)}
                        className="h-8 w-8 rounded-xl bg-[#fff1f1] flex items-center justify-center hover:bg-[#ffe0e0] transition-all">
                        <TrashIcon className="w-4 h-4 text-[#ce0100]" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}

// ── Form Builder ───────────────────────────────────────────
function FormBuilder({ form, onSaved, onCancel }: {
  form: Form | null
  onSaved: () => void
  onCancel: () => void
}) {
  const { profile } = useUser()
  const isEdit = !!form

  const [titlu, setTitlu] = useState(form?.titlu ?? '')
  const [descriere, setDescriere] = useState(form?.descriere ?? '')
  const [visibility, setVisibility] = useState<Visibility>(form?.visibility ?? 'internal_all')
  const [expiresAt, setExpiresAt] = useState(form?.expires_at ? form.expires_at.slice(0, 16) : '')
  const [questions, setQuestions] = useState<Question[]>([])
  const [assignedUsers, setAssignedUsers] = useState<string[]>([])
  const [allUsers, setAllUsers] = useState<AppUser[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Fetch questions if editing
    if (isEdit && form?.id) {
      supabase.from('form_questions')
        .select('*')
        .eq('form_id', form.id)
        .order('order_index')
        .then(({ data }) => {
          if (data) setQuestions(data.map(q => ({
            ...q,
            options: Array.isArray(q.options) ? q.options : [],
          })))
        })
      // Fetch assignments
      supabase.from('form_assignments')
        .select('user_id')
        .eq('form_id', form.id)
        .then(({ data }) => {
          if (data) setAssignedUsers(data.map(a => a.user_id))
        })
    }
    // Fetch all users
    supabase.from('users').select('id, full_name, email, role').eq('active', true).order('full_name')
      .then(({ data }) => setAllUsers(data || []))
  }, [])

  useEffect(() => { setHasChanges(true) }, [titlu, descriere, visibility, expiresAt, questions, assignedUsers])

  const addQuestion = () => {
    const newQ: Question = {
      id: genId(),
      type: 'short_text',
      label: '',
      options: [],
      required: false,
      order_index: questions.length,
      prefill_field: null,
    }
    setQuestions(prev => [...prev, newQ])
  }

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q))
  }

  const removeQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id).map((q, i) => ({ ...q, order_index: i })))
  }

  const moveQuestion = (id: string, dir: 'up' | 'down') => {
    setQuestions(prev => {
      const idx = prev.findIndex(q => q.id === id)
      if (dir === 'up' && idx === 0) return prev
      if (dir === 'down' && idx === prev.length - 1) return prev
      const arr = [...prev]
      const swap = dir === 'up' ? idx - 1 : idx + 1
      ;[arr[idx], arr[swap]] = [arr[swap], arr[idx]]
      return arr.map((q, i) => ({ ...q, order_index: i }))
    })
  }

  const handleSave = async () => {
    if (!titlu.trim()) { setError('Titlul este obligatoriu.'); return }
    setSaving(true); setError(null)

    const slug = (form?.visibility === 'public' && form?.public_slug)
      ? form.public_slug
      : visibility === 'public' ? genSlug() : null

    const formData = {
      titlu: titlu.trim(),
      descriere: descriere.trim() || null,
      visibility,
      public_slug: slug,
      expires_at: expiresAt || null,
      created_by: profile?.id ?? null,
      updated_at: new Date().toISOString(),
    }

    let formId = form?.id
    if (isEdit) {
      await supabase.from('forms').update(formData).eq('id', form!.id)
    } else {
      const { data } = await supabase.from('forms').insert(formData).select('id').single()
      formId = data?.id
    }

    if (!formId) { setSaving(false); setError('Eroare la salvare.'); return }

    // Save questions
    if (isEdit) {
      await supabase.from('form_questions').delete().eq('form_id', formId)
    }
    if (questions.length > 0) {
      await supabase.from('form_questions').insert(
        questions.map((q, i) => ({
          form_id: formId,
          type: q.type,
          label: q.label,
          options: q.options,
          required: q.required,
          order_index: i,
          prefill_field: q.prefill_field,
        }))
      )
    }

    // Save assignments
    if (visibility === 'internal_specific') {
      if (isEdit) {
        await supabase.from('form_assignments').delete().eq('form_id', formId)
      }
      if (assignedUsers.length > 0) {
        await supabase.from('form_assignments').insert(
          assignedUsers.map(uid => ({ form_id: formId, user_id: uid }))
        )
      }
    }

    setSaving(false); setSaved(true); setHasChanges(false)
    setTimeout(() => { setSaved(false); onSaved() }, 1200)
  }

  return (
    <main className="flex h-screen overflow-hidden bg-[#f9f7f5]">
      <Sidebar />
      <div className="flex-1 min-w-0 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-[#f0e8e4] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onCancel} className="h-8 w-8 rounded-xl bg-[#f9f7f5] flex items-center justify-center hover:bg-[#f0e8e4] transition-all">
              <XMarkIcon className="w-4 h-4 text-[#555]" />
            </button>
            <div>
              <p className="text-[11px] text-[#888] uppercase tracking-wide font-semibold">{isEdit ? 'Editează' : 'Formular nou'}</p>
              <p className="text-sm font-semibold text-[#111]">{titlu || 'Fără titlu'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {hasChanges && !saved && (
              <span className="text-[11px] text-[#c05c00] flex items-center gap-1">
                <ExclamationTriangleIcon className="w-3.5 h-3.5" /> Modificări nesalvate
              </span>
            )}
            <button onClick={handleSave} disabled={saving}
              className={`h-9 px-5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
                saved ? 'bg-[#166534] text-white' :
                'bg-[#ce0100] text-white hover:bg-[#a80000] shadow-[0_4px_12px_rgba(206,1,0,0.22)] disabled:opacity-50'
              }`}>
              {saved ? <><CheckCircleIcon className="w-4 h-4" /> Salvat!</> :
               saving ? 'Se salvează...' : 'Salvează'}
            </button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
          {error && (
            <div className="bg-[#fff1f1] border border-[#ffd3d3] rounded-xl px-4 py-3 text-sm text-[#ce0100] font-medium">
              {error}
            </div>
          )}

          {/* Basic info */}
          <div className="bg-white rounded-2xl border border-[#e8e2de] p-6 space-y-4 shadow-sm"
            style={{ animation: 'fadeIn 0.2s ease-out' }}>
            <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
            <div>
              <label className="text-[11px] font-semibold text-[#888] uppercase tracking-wide block mb-2">Titlu *</label>
              <input value={titlu} onChange={e => setTitlu(e.target.value)}
                placeholder="Titlul formularului..."
                className="w-full h-11 rounded-[14px] border border-[#f0e9e5] px-4 text-sm text-[#111] outline-none focus:border-[#ce0100] transition-all" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#888] uppercase tracking-wide block mb-2">Descriere</label>
              <textarea value={descriere} onChange={e => setDescriere(e.target.value)} rows={2}
                placeholder="Descriere opțională..."
                className="w-full rounded-[14px] border border-[#f0e9e5] px-4 py-3 text-sm text-[#111] outline-none focus:border-[#ce0100] transition-all resize-none" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#888] uppercase tracking-wide block mb-2">Dată expirare (opțional)</label>
              <input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)}
                className="h-11 rounded-[14px] border border-[#f0e9e5] px-4 text-sm text-[#111] outline-none focus:border-[#ce0100] transition-all" />
            </div>
          </div>

          {/* Visibility */}
          <div className="bg-white rounded-2xl border border-[#e8e2de] p-6 shadow-sm" style={{ animation: 'fadeIn 0.25s ease-out' }}>
            <label className="text-[11px] font-semibold text-[#888] uppercase tracking-wide block mb-3">Vizibilitate</label>
            <div className="flex gap-2 mb-4">
              {(Object.entries(VIS_CONFIG) as [Visibility, typeof VIS_CONFIG[Visibility]][]).map(([v, cfg]) => {
                const Icon = cfg.icon
                return (
                  <button key={v} onClick={() => setVisibility(v)}
                    className={`flex-1 h-10 rounded-xl border-2 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      visibility === v
                        ? 'border-[#ce0100] bg-[#fff1f1] text-[#ce0100]'
                        : 'border-[#f0e9e5] text-[#666] hover:border-[#ffd3d3]'
                    }`}>
                    <Icon className="w-3.5 h-3.5" /> {cfg.label}
                  </button>
                )
              })}
            </div>

            {visibility === 'public' && (
              <div className="bg-[#f0fff4] border border-[#bbf0d4] rounded-xl px-4 py-3">
                <p className="text-[12px] text-[#166534]">Se va genera un link public unic. Oricine cu link-ul poate răspunde fără cont.</p>
              </div>
            )}

            {visibility === 'internal_specific' && (
              <div>
                <p className="text-[12px] text-[#666] mb-3">Selectează utilizatorii care pot vedea și completa acest formular:</p>
                <div className="max-h-48 overflow-y-auto flex flex-col gap-1.5 border border-[#f0e9e5] rounded-xl p-3">
                  {allUsers.map(u => (
                    <label key={u.id} className="flex items-center gap-3 cursor-pointer hover:bg-[#faf7f5] rounded-lg px-2 py-1.5 transition-all">
                      <input type="checkbox"
                        checked={assignedUsers.includes(u.id)}
                        onChange={e => setAssignedUsers(prev =>
                          e.target.checked ? [...prev, u.id] : prev.filter(id => id !== u.id)
                        )}
                        className="w-4 h-4 accent-[#ce0100]" />
                      <div>
                        <p className="text-[13px] font-medium text-[#111]">{u.full_name}</p>
                        <p className="text-[10px] text-[#aaa]">{u.role}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <p className="text-[11px] text-[#aaa] mt-2">{assignedUsers.length} selectați</p>
              </div>
            )}
          </div>

          {/* Questions */}
          <div className="space-y-3">
            {questions.map((q, idx) => (
              <QuestionCard
                key={q.id}
                question={q}
                index={idx}
                total={questions.length}
                onChange={updates => updateQuestion(q.id, updates)}
                onDelete={() => removeQuestion(q.id)}
                onMove={dir => moveQuestion(q.id, dir)}
              />
            ))}
            <button onClick={addQuestion}
              className="w-full h-12 rounded-2xl border-2 border-dashed border-[#e8e2de] text-sm font-semibold text-[#aaa] hover:border-[#ce0100] hover:text-[#ce0100] transition-all flex items-center justify-center gap-2">
              <PlusIcon className="w-4 h-4" /> Adaugă întrebare
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}

// ── Question Card ──────────────────────────────────────────
function QuestionCard({ question, index, total, onChange, onDelete, onMove }: {
  question: Question
  index: number
  total: number
  onChange: (u: Partial<Question>) => void
  onDelete: () => void
  onMove: (dir: 'up' | 'down') => void
}) {
  const hasOptions = ['radio', 'checkbox', 'dropdown'].includes(question.type)

  const addOption = () => onChange({ options: [...question.options, ''] })
  const updateOption = (i: number, val: string) => {
    const opts = [...question.options]; opts[i] = val; onChange({ options: opts })
  }
  const removeOption = (i: number) => onChange({ options: question.options.filter((_, j) => j !== i) })

  return (
    <div className="bg-white rounded-2xl border border-[#e8e2de] p-5 shadow-sm"
      style={{ animation: 'fadeIn 0.2s ease-out' }}>
      <div className="flex items-start gap-3 mb-4">
        <div className="flex flex-col gap-1 pt-1">
          <button onClick={() => onMove('up')} disabled={index === 0}
            className="w-6 h-6 rounded-lg bg-[#f9f7f5] flex items-center justify-center disabled:opacity-30 hover:bg-[#f0e8e4] transition-all">
            <ChevronUpIcon className="w-3 h-3 text-[#666]" />
          </button>
          <button onClick={() => onMove('down')} disabled={index === total - 1}
            className="w-6 h-6 rounded-lg bg-[#f9f7f5] flex items-center justify-center disabled:opacity-30 hover:bg-[#f0e8e4] transition-all">
            <ChevronDownIcon className="w-3 h-3 text-[#666]" />
          </button>
        </div>

        <div className="flex-1 space-y-3">
          <input value={question.label} onChange={e => onChange({ label: e.target.value })}
            placeholder="Întrebarea ta..."
            className="w-full h-10 rounded-[12px] border border-[#f0e9e5] px-4 text-sm text-[#111] outline-none focus:border-[#ce0100] transition-all" />

          <div className="flex gap-2 flex-wrap">
            <select value={question.type} onChange={e => onChange({ type: e.target.value as QType, options: [] })}
              className="h-8 px-3 rounded-xl border border-[#f0e9e5] text-[12px] text-[#555] outline-none bg-white cursor-pointer">
              {Object.entries(Q_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>

            {question.type === 'short_text' && (
              <select value={question.prefill_field ?? ''}
                onChange={e => onChange({ prefill_field: e.target.value as any || null })}
                className="h-8 px-3 rounded-xl border border-[#f0e9e5] text-[12px] text-[#555] outline-none bg-white cursor-pointer">
                <option value="">Fără auto-completare</option>
                <option value="full_name">Nume complet</option>
                <option value="email">Email</option>
              </select>
            )}

            <label className="flex items-center gap-2 h-8 px-3 rounded-xl border border-[#f0e9e5] text-[12px] text-[#555] cursor-pointer">
              <input type="checkbox" checked={question.required}
                onChange={e => onChange({ required: e.target.checked })}
                className="w-3.5 h-3.5 accent-[#ce0100]" />
              Obligatoriu
            </label>
          </div>

          {hasOptions && (
            <div className="space-y-2 pl-1">
              {question.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-${question.type === 'checkbox' ? 'sm' : 'full'} border-2 border-[#e8e2de] flex-shrink-0`} />
                  <input value={opt} onChange={e => updateOption(i, e.target.value)}
                    placeholder={`Opțiunea ${i + 1}`}
                    className="flex-1 h-8 rounded-xl border border-[#f0e9e5] px-3 text-[12px] text-[#111] outline-none focus:border-[#ce0100] transition-all" />
                  <button onClick={() => removeOption(i)} className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-[#fff1f1] transition-all">
                    <XMarkIcon className="w-3 h-3 text-[#ce0100]" />
                  </button>
                </div>
              ))}
              <button onClick={addOption}
                className="text-[11px] text-[#ce0100] font-semibold hover:underline flex items-center gap-1">
                <PlusIcon className="w-3 h-3" /> Adaugă opțiune
              </button>
            </div>
          )}
        </div>

        <button onClick={onDelete}
          className="w-8 h-8 rounded-xl bg-[#fff1f1] flex items-center justify-center hover:bg-[#ffe0e0] transition-all flex-shrink-0">
          <TrashIcon className="w-4 h-4 text-[#ce0100]" />
        </button>
      </div>
    </div>
  )
}

// ── Responses View ─────────────────────────────────────────
function ResponsesView({ formId, onBack }: { formId: string; onBack: () => void }) {
  const [form, setForm] = useState<Form | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [responses, setResponses] = useState<any[]>([])
  const [answers, setAnswers] = useState<any[]>([])
  const [mode, setMode] = useState<'summary' | 'individual'>('summary')
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const [{ data: f }, { data: q }, { data: r }, { data: a }] = await Promise.all([
        supabase.from('forms').select('*, created_by_user:created_by(full_name)').eq('id', formId).single(),
        supabase.from('form_questions').select('*').eq('form_id', formId).order('order_index'),
        supabase.from('form_responses').select('*, submitted_by_user:submitted_by(full_name)').eq('form_id', formId).order('submitted_at', { ascending: false }),
        supabase.from('form_answers').select('*').in('response_id',
          (await supabase.from('form_responses').select('id').eq('form_id', formId)).data?.map(r => r.id) ?? []
        ),
      ])
      setForm(f); setQuestions(q || []); setResponses(r || []); setAnswers(a || [])
      setLoading(false)
    }
    load()
  }, [formId])

  const exportCSV = () => {
    const headers = ['Data răspuns', 'Utilizator', ...questions.map(q => q.label)]
    const rows = responses.map(r => {
      const userAnswers = answers.filter(a => a.response_id === r.id)
      return [
        new Date(r.submitted_at).toLocaleString('ro-RO'),
        r.is_anonymous ? 'Anonim' : (r.submitted_by_user?.full_name ?? '—'),
        ...questions.map(q => {
          const ans = userAnswers.find(a => a.question_id === q.id)
          if (!ans) return ''
          const v = ans.value
          if (Array.isArray(v)) return v.join(', ')
          return v ?? ''
        })
      ]
    })
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `${form?.titlu ?? 'formulare'}_raspunsuri.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  if (loading) return (
    <main className="flex h-screen overflow-hidden bg-[#f9f7f5]">
      <Sidebar />
      <div className="flex-1 flex items-center justify-center"><p className="text-[#888]">Se încarcă...</p></div>
    </main>
  )

  return (
    <main className="flex h-screen overflow-hidden bg-[#f9f7f5]">
      <Sidebar />
      <div className="flex-1 min-w-0 overflow-y-auto">
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-[#f0e8e4] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="h-8 w-8 rounded-xl bg-[#f9f7f5] flex items-center justify-center hover:bg-[#f0e8e4] transition-all">
              <XMarkIcon className="w-4 h-4 text-[#555]" />
            </button>
            <div>
              <p className="text-[11px] text-[#888] uppercase tracking-wide font-semibold">Răspunsuri</p>
              <p className="text-sm font-semibold text-[#111]">{form?.titlu}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-[#f9f7f5] border border-[#e8e2de] rounded-xl p-1 gap-1">
              {(['summary', 'individual'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className={`h-7 px-3 rounded-lg text-[11px] font-semibold transition-all ${
                    mode === m ? 'bg-white shadow-sm text-[#ce0100]' : 'text-[#aaa]'
                  }`}>
                  {m === 'summary' ? 'Rezumat' : 'Individual'}
                </button>
              ))}
            </div>
            <button onClick={exportCSV}
              className="h-8 px-4 rounded-xl border border-[#e8e2de] text-[11px] font-semibold text-[#555] hover:bg-[#f9f7f5] transition-all">
              Exportă CSV
            </button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-[#fff1f1] rounded-xl px-4 py-2">
              <p className="text-2xl font-bold text-[#ce0100]">{responses.length}</p>
              <p className="text-[11px] text-[#888]">răspunsuri totale</p>
            </div>
          </div>

          {mode === 'summary' ? (
            <div className="space-y-4">
              {questions.map(q => {
                const qAnswers = answers.filter(a => a.question_id === q.id)
                const hasOptions = ['radio', 'checkbox', 'dropdown'].includes(q.type)

                if (hasOptions) {
                  const counts: Record<string, number> = {}
                  qAnswers.forEach(a => {
                    const vals = Array.isArray(a.value) ? a.value : [a.value]
                    vals.forEach((v: string) => { counts[v] = (counts[v] ?? 0) + 1 })
                  })
                  return (
                    <div key={q.id} className="bg-white rounded-2xl border border-[#e8e2de] p-5 shadow-sm">
                      <p className="text-sm font-semibold text-[#111] mb-4">{q.label}</p>
                      <div className="space-y-2.5">
                        {q.options.map(opt => {
                          const count = counts[opt] ?? 0
                          const pct = qAnswers.length > 0 ? Math.round(count / qAnswers.length * 100) : 0
                          return (
                            <div key={opt}>
                              <div className="flex justify-between text-[12px] mb-1">
                                <span className="text-[#444]">{opt}</span>
                                <span className="text-[#888]">{count} ({pct}%)</span>
                              </div>
                              <div className="h-2 bg-[#f5efec] rounded-full overflow-hidden">
                                <div className="h-full bg-[#ce0100] rounded-full transition-all"
                                  style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <p className="text-[10px] text-[#aaa] mt-3">{qAnswers.length} răspunsuri</p>
                    </div>
                  )
                }

                return (
                  <div key={q.id} className="bg-white rounded-2xl border border-[#e8e2de] p-5 shadow-sm">
                    <p className="text-sm font-semibold text-[#111] mb-3">{q.label}</p>
                    <div className="space-y-2">
                      {qAnswers.map(a => (
                        <div key={a.id} className="bg-[#faf7f5] rounded-xl px-3 py-2 text-sm text-[#444]">
                          {String(a.value ?? '')}
                        </div>
                      ))}
                      {qAnswers.length === 0 && <p className="text-[12px] text-[#bbb]">Niciun răspuns</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {responses.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-[#aaa]">Niciun răspuns încă.</p>
                </div>
              ) : responses.map((r, idx) => {
                const rAnswers = answers.filter(a => a.response_id === r.id)
                const isExp = expandedId === r.id
                return (
                  <div key={r.id} className="bg-white rounded-2xl border border-[#e8e2de] overflow-hidden shadow-sm">
                    <button onClick={() => setExpandedId(isExp ? null : r.id)}
                      className="w-full flex items-center justify-between px-5 py-4 text-left">
                      <div>
                        <p className="text-sm font-semibold text-[#111]">
                          {r.is_anonymous ? 'Anonim' : ((r.submitted_by_user as any)?.full_name ?? '—')}
                        </p>
                        <p className="text-[11px] text-[#aaa]">
                          {new Date(r.submitted_at).toLocaleString('ro-RO')}
                        </p>
                      </div>
                      <ChevronDownIcon className={`w-4 h-4 text-[#888] transition-transform ${isExp ? 'rotate-180' : ''}`} />
                    </button>
                    {isExp && (
                      <div className="px-5 pb-5 border-t border-[#f5efec] pt-4 space-y-3">
                        {questions.map(q => {
                          const ans = rAnswers.find(a => a.question_id === q.id)
                          const val = ans?.value
                          return (
                            <div key={q.id}>
                              <p className="text-[11px] font-semibold text-[#888] uppercase tracking-wide mb-1">{q.label}</p>
                              <p className="text-sm text-[#444]">
                                {Array.isArray(val) ? val.join(', ') : (val ?? <em className="text-[#bbb]">—</em>)}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
