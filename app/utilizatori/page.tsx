'use client'

import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import CreateUserModal from '@/components/CreateUserModal'
import EditUserModal from '@/components/EditUserModal'
import { supabase } from '@/lib/supabase'
import {
  MagnifyingGlassIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserIcon,
  KeyIcon,
  TrashIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckSolid } from '@heroicons/react/24/solid'

// ── Types ─────────────────────────────────────────────────────────
type User = {
  id: string
  full_name: string
  email: string
  language: string
  role: string
  active: boolean
  created_at: string
  auth_user_id?: string
}

// ── Helpers ───────────────────────────────────────────────────────
const ROLE_STYLE: Record<string, { bg: string; text: string }> = {
  'Admin':                { bg: 'bg-[#fff1f1]', text: 'text-[#991b1b]' },
  'Coordonator principal':{ bg: 'bg-[#fff5eb]', text: 'text-[#c05c00]' },
  'Coordonator':          { bg: 'bg-[#eef3ff]', text: 'text-[#1e40af]' },
  'Traducător':           { bg: 'bg-[#edfaf3]', text: 'text-[#166534]' },
}

function timeAgo(dateStr: string): string {
  const now  = new Date()
  const date = new Date(dateStr)
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diff < 60)   return 'chiar acum'
  if (diff < 3600) return `${Math.floor(diff/60)} min`
  if (diff < 86400)return `${Math.floor(diff/3600)}h`
  const days = Math.floor(diff / 86400)
  if (days < 30)   return `${days} zile`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} luni`
  const years = Math.floor(months / 12)
  return `${years} ${years === 1 ? 'an' : 'ani'}`
}

function formatJoinDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ro-RO', {
    day: '2-digit', month: 'long', year: 'numeric'
  })
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

// Avatar colors based on role
const AVATAR_COLOR: Record<string, string> = {
  'Admin':                '#991b1b',
  'Coordonator principal':'#c05c00',
  'Coordonator':          '#1e40af',
  'Traducător':           '#166534',
}

// ── Zepto Mail ────────────────────────────────────────────────────
async function sendZeptoEmail(
  to: string, toName: string,
  type: 'welcome' | 'goodbye',
  fromEmail: string, fromName: string
) {
  const res = await fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, toName, type, fromEmail, fromName }),
  })
  return res.ok
}

// ── Main ──────────────────────────────────────────────────────────
export default function UtilizatoriPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<User | null>(null)
  const [sendingEmail, setSendingEmail] = useState<'welcome' | 'goodbye' | null>(null)
  const [emailSent, setEmailSent] = useState<string | null>(null)
  const [openCreateModal, setOpenCreateModal] = useState(false)
  const [openEditModal, setOpenEditModal] = useState(false)
  const [showCredentialsModal, setShowCredentialsModal] = useState(false)
  const [credentialsPassword, setCredentialsPassword] = useState('')
  const [sendingCredentials, setSendingCredentials] = useState(false)
  const [credentialsSent, setCredentialsSent] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [roleFilter, setRoleFilter] = useState<string[]>([])

  useEffect(() => {
    const load = async () => {
      // Get logged in user
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('users').select('*').eq('auth_user_id', user.id).single()
        if (profile) setCurrentUser(profile)
      }
      // Get all users
      const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false })
      setUsers(data || [])
      if (data && data.length > 0) setSelected(data[0])
      setLoading(false)
    }
    load()
  }, [])

  const handleSendCredentials = async () => {
    if (!selected || !credentialsPassword) return
    setSendingCredentials(true)
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: selected.email, toName: selected.full_name,
        type: 'credentials', password: credentialsPassword,
      }),
    })
    setSendingCredentials(false)
    if (res.ok) { setCredentialsSent(true); setTimeout(() => { setCredentialsSent(false); setShowCredentialsModal(false); setCredentialsPassword('') }, 2000) }
    else alert('Eroare la trimiterea emailului.')
  }

  const handleDeleteUser = async () => {
    if (!selected) return
    setIsDeleting(true)
    await supabase.from('users').delete().eq('id', selected.id)
    setUsers(prev => prev.filter(u => u.id !== selected.id))
    setSelected(null)
    setIsDeleting(false)
    setShowDeleteModal(false)
  }

  const handleUserSaved = (updated: User) => {
    setUsers(prev => prev.map(u => u.id === updated.id ? updated : u))
    setSelected(updated)
  }

  const handleUserCreated = () => {
    supabase.from('users').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setUsers(data || []) })
  }

  const ROLES = [...new Set(users.map(u => u.role).filter(Boolean))]

  const filtered = users.filter(u => {
    if (search) {
      const q = search.toLowerCase()
      if (!u.full_name?.toLowerCase().includes(q) &&
          !u.email?.toLowerCase().includes(q) &&
          !u.role?.toLowerCase().includes(q)) return false
    }
    if (roleFilter.length > 0 && !roleFilter.includes(u.role)) return false
    return true
  })

  const handleSendEmail = async (type: 'welcome' | 'goodbye') => {
    if (!selected) return
    setSendingEmail(type)
    const fromEmail = currentUser?.email ?? 'echipa@tptranslator.tarapromisa.org'
    const fromName  = currentUser?.full_name ?? 'TP Translator'
    const ok = await sendZeptoEmail(selected.email, selected.full_name, type, fromEmail, fromName)
    setSendingEmail(null)
    if (ok) {
      setEmailSent(type)
      setTimeout(() => setEmailSent(null), 3000)
    } else {
      alert('Eroare la trimiterea emailului.')
    }
  }

  return (
    <main className="flex min-h-screen bg-[#f9f7f5] overflow-x-hidden">
      <Sidebar />
      <div className="flex-1 w-0 px-10 py-8 overflow-y-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-[52px] leading-none tracking-tight font-light text-[#111] mb-3">Utilizatori</h1>
            <div className="w-10 h-[3px] rounded-full bg-[#ce0100] mb-4" />
            <p className="text-base text-[#666]">Gestionează membrii echipei TP Translator.</p>
          </div>
          <button onClick={() => setOpenCreateModal(true)}
            className="mt-2 h-11 px-6 rounded-xl bg-[#ce0100] text-white text-sm font-semibold shadow-[0_6px_16px_rgba(206,1,0,0.22)] hover:bg-[#a80000] transition-all">
            + Utilizator nou
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total',      value: users.length,                         color: '#ce0100' },
            { label: 'Activi',     value: users.filter(u => u.active).length,   color: '#166534' },
            { label: 'Inactivi',   value: users.filter(u => !u.active).length,  color: '#888'    },
            { label: 'Traducători',value: users.filter(u => u.role === 'Traducător').length, color: '#1e40af' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border border-[#e8e2de] rounded-2xl px-5 h-20 flex items-center gap-4 shadow-sm">
              <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ background: color }} />
              <div>
                <p className="text-sm text-[#666]">{label}</p>
                <p className="text-2xl font-light text-[#111] leading-none">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Main layout */}
        <div className="grid grid-cols-[1fr_380px] gap-5">

          {/* Left — user list */}
          <div className="flex flex-col gap-4">

            {/* Search + filter */}
            <div className="bg-white border border-[#e8e2de] rounded-2xl px-5 py-4 shadow-sm">
              <div className="flex items-center gap-3 bg-[#f9f7f5] border border-[#e8e2de] rounded-xl px-4 h-10 mb-4">
                <MagnifyingGlassIcon className="w-4 h-4 text-[#999] flex-shrink-0" />
                <input type="text" placeholder="Caută după nume, email sau rol..."
                  value={search} onChange={e => setSearch(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-sm text-[#111] placeholder:text-[#bbb]" />
                {search && <button onClick={() => setSearch('')} className="text-xs text-[#999] hover:text-[#ce0100]">✕</button>}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-[#666] mr-1">Rol:</span>
                {ROLES.map(role => {
                  const s = ROLE_STYLE[role] ?? { bg: 'bg-[#f0e8e4]', text: 'text-[#555]' }
                  return (
                    <button key={role}
                      onClick={() => setRoleFilter(p => p.includes(role) ? p.filter(x => x !== role) : [...p, role])}
                      className={`h-7 px-3 rounded-full text-xs font-semibold border transition-all ${
                        roleFilter.includes(role) ? `${s.bg} ${s.text} border-transparent` : 'bg-white text-[#444] border-[#e8e2de] hover:border-[#ddd]'
                      }`}>{role}</button>
                  )
                })}
                {roleFilter.length > 0 && (
                  <button onClick={() => setRoleFilter([])}
                    className="h-7 px-3 rounded-full text-xs text-[#ce0100] border border-[#ffd3d3] bg-[#fff7f7] ml-1">
                    Șterge
                  </button>
                )}
              </div>
            </div>

            {/* User list */}
            <div className="bg-white border border-[#e8e2de] rounded-2xl overflow-x-hidden shadow-sm">
              {loading ? (
                <p className="text-center py-12 text-sm text-[#888]">Se încarcă...</p>
              ) : filtered.length === 0 ? (
                <p className="text-center py-12 text-sm text-[#888]">Niciun utilizator găsit.</p>
              ) : filtered.map((user, i) => {
                const isSelected = selected?.id === user.id
                const roleStyle = ROLE_STYLE[user.role] ?? { bg: 'bg-[#f0e8e4]', text: 'text-[#555]' }
                const avatarColor = AVATAR_COLOR[user.role] ?? '#888'
                return (
                  <div key={user.id}
                    onClick={() => setSelected(user)}
                    className={`flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#fff7f7] border-l-[3px] border-l-[#ce0100]' : 'hover:bg-[#faf7f5] border-l-[3px] border-l-transparent'
                    } ${i < filtered.length - 1 ? 'border-b border-[#f8f3f0]' : ''}`}>

                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                      style={{ background: avatarColor }}>
                      {getInitials(user.full_name)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-[#111] truncate">{user.full_name}</p>
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${user.active ? 'bg-[#166534]' : 'bg-[#ccc]'}`} />
                      </div>
                      <p className="text-xs text-[#888] truncate">{user.email}</p>
                    </div>

                    {/* Role + lang */}
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className={`text-[10px] font-bold px-2 h-5 inline-flex items-center rounded-full ${roleStyle.bg} ${roleStyle.text}`}>
                        {user.role}
                      </span>
                      {user.language && (
                        <span className="text-[10px] text-[#aaa] font-medium">{user.language}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <p className="text-xs text-[#aaa] pl-1">{filtered.length} utilizatori</p>
          </div>

          {/* Right — detail panel */}
          {selected ? (
            <div className="flex flex-col gap-4">

              {/* Profile card */}
              <div className="bg-white border border-[#e8e2de] rounded-2xl p-6 shadow-sm">
                {/* Avatar + name */}
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white mb-4 shadow-lg"
                    style={{ background: AVATAR_COLOR[selected.role] ?? '#888' }}>
                    {getInitials(selected.full_name)}
                  </div>
                  <h2 className="text-xl font-semibold text-[#111] mb-1">{selected.full_name}</h2>
                  <p className="text-sm text-[#888] mb-3">{selected.email}</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-3 h-6 inline-flex items-center rounded-full ${
                      (ROLE_STYLE[selected.role] ?? { bg: 'bg-[#f0e8e4]', text: 'text-[#555]' }).bg
                    } ${(ROLE_STYLE[selected.role] ?? { bg: '', text: 'text-[#555]' }).text}`}>
                      {selected.role}
                    </span>
                    <span className={`text-xs font-semibold px-3 h-6 inline-flex items-center rounded-full gap-1 ${
                      selected.active ? 'bg-[#edfaf3] text-[#166534]' : 'bg-[#f4f4f4] text-[#888]'
                    }`}>
                      {selected.active
                        ? <><CheckSolid className="w-3 h-3" /> Activ</>
                        : <><XCircleIcon className="w-3 h-3" /> Inactiv</>
                      }
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <button onClick={() => setOpenEditModal(true)}
                      className="flex-1 h-9 px-4 rounded-xl border border-[#e8e2de] bg-white text-sm font-semibold text-[#444] hover:bg-[#faf7f5] transition-all flex items-center justify-center gap-2">
                      Editează
                    </button>
                    <button onClick={() => setShowCredentialsModal(true)}
                      className="h-9 w-9 rounded-xl border border-[#e8e2de] bg-white flex items-center justify-center text-[#444] hover:bg-[#faf7f5] transition-all" title="Trimite credențiale">
                      <KeyIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => setShowDeleteModal(true)}
                      className="h-9 w-9 rounded-xl bg-[#fff1f1] flex items-center justify-center text-[#ce0100] hover:bg-[#ffe0e0] transition-all" title="Șterge utilizator">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Details */}
                <div className="flex flex-col gap-3 border-t border-[#f4ece9] pt-5">
                  {[
                    { icon: UserIcon,  label: 'Limbă',       value: selected.language || '—' },
                    { icon: ClockIcon, label: 'Membru de',    value: formatJoinDate(selected.created_at) },
                    { icon: ClockIcon, label: 'Timp în echipă', value: `${timeAgo(selected.created_at)} în echipă` },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-[#666]">
                        <Icon className="w-4 h-4" /> {label}
                      </div>
                      <span className="text-sm font-semibold text-[#111]">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Email actions */}
              <div className="bg-white border border-[#e8e2de] rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-[#111] mb-1">Trimite email</h3>
                <p className="text-xs text-[#888] mb-5">Emailul va fi trimis către <strong className="text-[#111]">{selected.email}</strong></p>

                <div className="flex flex-col gap-3">
                  {/* Welcome */}
                  <button
                    onClick={() => handleSendEmail('welcome')}
                    disabled={!!sendingEmail}
                    className={`w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all ${
                      emailSent === 'welcome'
                        ? 'bg-[#edfaf3] text-[#166534] border border-[#166534]'
                        : 'bg-[#ce0100] text-white shadow-[0_4px_12px_rgba(206,1,0,0.22)] hover:bg-[#a80000] disabled:opacity-50'
                    }`}>
                    {sendingEmail === 'welcome' ? (
                      <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                      </svg>Se trimite...</>
                    ) : emailSent === 'welcome' ? (
                      <><CheckSolid className="w-4 h-4" /> Trimis!</>
                    ) : (
                      <><EnvelopeIcon className="w-4 h-4" /> Email de bun venit</>
                    )}
                  </button>

                  {/* Goodbye */}
                  <button
                    onClick={() => handleSendEmail('goodbye')}
                    disabled={!!sendingEmail}
                    className={`w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold border transition-all ${
                      emailSent === 'goodbye'
                        ? 'bg-[#edfaf3] text-[#166534] border-[#166534]'
                        : 'bg-white text-[#444] border-[#e8e2de] hover:bg-[#faf7f5] disabled:opacity-50'
                    }`}>
                    {sendingEmail === 'goodbye' ? (
                      <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="rgba(0,0,0,0.1)" strokeWidth="3"/>
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="#444" strokeWidth="3" strokeLinecap="round"/>
                      </svg>Se trimite...</>
                    ) : emailSent === 'goodbye' ? (
                      <><CheckSolid className="w-4 h-4" /> Trimis!</>
                    ) : (
                      <><EnvelopeIcon className="w-4 h-4" /> Email de la revedere</>
                    )}
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white border border-[#e8e2de] rounded-2xl p-6 shadow-sm flex items-center justify-center h-48">
              <p className="text-sm text-[#aaa]">Selectează un utilizator</p>
            </div>
          )}
        </div>
      </div>
      <CreateUserModal
        open={openCreateModal}
        onClose={() => setOpenCreateModal(false)}
        onCreated={handleUserCreated}
      />
      <EditUserModal
        open={openEditModal}
        user={selected}
        onClose={() => setOpenEditModal(false)}
        onSaved={handleUserSaved}
      />

      {/* Credentials Modal */}
      {showCredentialsModal && selected && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4"
          style={{ background: 'rgba(10,6,4,0.65)', backdropFilter: 'blur(10px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowCredentialsModal(false) }}>
          <div className="bg-white rounded-[28px] w-full max-w-[420px] overflow-x-hidden shadow-[0_32px_80px_rgba(0,0,0,0.2)]">
            <div className="h-[4px] bg-[#ce0100]" />
            <div className="px-[36px] pt-[32px] pb-[28px]">
              <div className="flex items-center gap-3 mb-[20px]">
                <div className="w-[42px] h-[42px] rounded-full bg-[#fff4f4] border border-[#ffd3d3] flex items-center justify-center flex-shrink-0">
                  <KeyIcon className="w-[18px] h-[18px] text-[#ce0100]" />
                </div>
                <div>
                  <h3 className="text-[18px] font-semibold text-[#111]">Trimite credențiale</h3>
                  <p className="text-[12px] text-[#888]">{selected.full_name} · {selected.email}</p>
                </div>
              </div>
              <label className="text-[11px] font-semibold text-[#666] uppercase tracking-wide block mb-[8px]">Parolă temporară</label>
              <input
                value={credentialsPassword}
                onChange={e => setCredentialsPassword(e.target.value)}
                placeholder="Introdu o parolă temporară..."
                type="text"
                className="w-full h-[48px] rounded-[14px] border border-[#f0e9e5] px-[14px] text-[14px] text-[#111] outline-none focus:border-[#ce0100] focus:shadow-[0_0_0_3px_rgba(206,1,0,0.07)] transition-all mb-[20px] placeholder:text-[#ccc]"
              />
              <div className="flex gap-[10px]">
                <button onClick={() => { setShowCredentialsModal(false); setCredentialsPassword('') }}
                  className="flex-1 h-[46px] rounded-[14px] border border-[#e8e2de] bg-white text-[13px] font-semibold text-[#666] hover:bg-[#faf7f5] transition-all">
                  Anulează
                </button>
                <button onClick={handleSendCredentials} disabled={!credentialsPassword || sendingCredentials}
                  className={`flex-1 h-[46px] rounded-[14px] text-[13px] font-bold flex items-center justify-center gap-2 transition-all ${
                    credentialsSent
                      ? 'bg-[#166534] text-white'
                      : 'bg-[#ce0100] text-white shadow-[0_6px_16px_rgba(206,1,0,0.25)] hover:bg-[#a80000] disabled:opacity-40 disabled:shadow-none'
                  }`}>
                  {sendingCredentials ? 'Se trimite...' : credentialsSent ? <><CheckCircleIcon className="w-4 h-4" /> Trimis!</> : <><EnvelopeIcon className="w-4 h-4" /> Trimite</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selected && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4"
          style={{ background: 'rgba(10,6,4,0.65)', backdropFilter: 'blur(10px)' }}
          onClick={(e) => { if (e.target === e.currentTarget && !isDeleting) setShowDeleteModal(false) }}>
          <div className="bg-white rounded-[28px] w-full max-w-[400px] overflow-x-hidden shadow-[0_32px_80px_rgba(0,0,0,0.2)]">
            <div className="h-[4px] bg-[#ce0100]" />
            <div className="px-[36px] pt-[36px] pb-[28px]">
              <div className="flex justify-center mb-[20px]">
                <div className="w-[64px] h-[64px] rounded-full bg-[#fff1f1] border-[2px] border-[#f4d4d4] flex items-center justify-center">
                  <ExclamationTriangleIcon className="w-[28px] h-[28px] text-[#ce0100]" />
                </div>
              </div>
              <h3 className="text-[20px] font-semibold text-[#111] text-center mb-[8px]">Ștergi utilizatorul?</h3>
              <p className="text-[13px] text-[#666] text-center mb-[20px] leading-relaxed">
                <strong className="text-[#111]">{selected.full_name}</strong> va fi eliminat permanent din sistem.
              </p>
              <div className="flex gap-[10px]">
                <button onClick={() => setShowDeleteModal(false)} disabled={isDeleting}
                  className="flex-1 h-[46px] rounded-[14px] border border-[#e8e2de] bg-white text-[13px] font-semibold text-[#666] hover:bg-[#faf7f5] disabled:opacity-40 transition-all">
                  Anulează
                </button>
                <button onClick={handleDeleteUser} disabled={isDeleting}
                  className="flex-1 h-[46px] rounded-[14px] bg-[#ce0100] text-white text-[13px] font-bold flex items-center justify-center gap-2 shadow-[0_6px_16px_rgba(206,1,0,0.3)] hover:bg-[#a80000] disabled:opacity-70 transition-all">
                  {isDeleting ? 'Se șterge...' : 'Da, șterge'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}