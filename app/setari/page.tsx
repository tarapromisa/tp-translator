'use client'

import { useEffect, useState, useRef } from 'react'
import Sidebar from '@/components/Sidebar'
import { supabase } from '@/lib/supabase'
import {
  UserIcon, EnvelopeIcon, LockClosedIcon,
  ExclamationTriangleIcon, CameraIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckSolid } from '@heroicons/react/24/solid'

type UserProfile = {
  id: string; full_name: string; email: string
  language: string; role: string; active: boolean
  avatar_url?: string | null
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const LANGUAGES = ['RO','ES','EN','DE','PT','FR','IT']

function Section({ title, sub, icon: Icon, children }: { title: string; sub: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#f0e9e5] rounded-[24px] p-7 shadow-sm">
      <div className="flex items-center gap-3 mb-6 pb-5 border-b border-[#f4ece9]">
        <div className="w-10 h-10 rounded-[12px] bg-[#fff4f4] flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-[#ce0100]" strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-[#111]">{title}</h2>
          <p className="text-xs text-[#888] font-light mt-0.5">{sub}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

function SaveBtn({ state, onClick, label = 'Salvează' }: { state: SaveState; onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick} disabled={state === 'saving' || state === 'saved'}
      className={`h-10 px-6 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all ${
        state === 'saved' ? 'bg-[#edfaf3] text-[#166534] border border-[#166534]' :
        state === 'error' ? 'bg-[#fff1f1] text-[#ce0100] border border-[#ffd3d3]' :
        'bg-[#ce0100] text-white shadow-[0_4px_12px_rgba(206,1,0,0.22)] hover:bg-[#a80000] disabled:opacity-50'
      }`}>
      {state === 'saving' ? 'Se salvează...' :
       state === 'saved' ? <><CheckSolid className="w-4 h-4" />Salvat!</> :
       state === 'error' ? 'Eroare' : label}
    </button>
  )
}

export default function SetariPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [language, setLanguage] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [profileState, setProfileState] = useState<SaveState>('idle')
  const [emailState, setEmailState] = useState<SaveState>('idle')
  const [passwordState, setPasswordState] = useState<SaveState>('idle')
  const [avatarState, setAvatarState] = useState<SaveState>('idle')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('users').select('*').eq('auth_user_id', user.id).single()
      if (p) {
        setProfile(p)
        setFullName(p.full_name || '')
        setEmail(p.email || '')
        setLanguage(p.language || '')
        setAvatarUrl(p.avatar_url || null)
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setAvatarPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleSaveAvatar = async () => {
    if (!avatarPreview || !profile) return
    setAvatarState('saving')
    try {
      const file = fileInputRef.current?.files?.[0]
      if (!file) return
      const ext = file.name.split('.').pop()
      const path = `avatars/${profile.id}.${ext}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (uploadError) { setAvatarState('error'); return }
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = urlData.publicUrl
      await supabase.from('users').update({ avatar_url: url }).eq('id', profile.id)
      setAvatarUrl(url); setAvatarState('saved')
      setTimeout(() => setAvatarState('idle'), 2000)
    } catch { setAvatarState('error') }
  }

  const handleSaveProfile = async () => {
    if (!profile) return
    setProfileState('saving')
    const { error } = await supabase.from('users').update({ full_name: fullName, language }).eq('id', profile.id)
    if (error) { setProfileState('error'); return }
    setProfileState('saved')
    setTimeout(() => setProfileState('idle'), 2000)
  }

  const handleSaveEmail = async () => {
    if (!profile) return
    setEmailState('saving')
    const { error: authError } = await supabase.auth.updateUser({ email })
    if (authError) { setEmailState('error'); return }
    await supabase.from('users').update({ email }).eq('id', profile.id)
    setEmailState('saved')
    setTimeout(() => setEmailState('idle'), 2000)
  }

  const handleSavePassword = async () => {
    setPasswordError(null)
    if (!newPassword || newPassword.length < 6) { setPasswordError('Parola trebuie sa aiba cel putin 6 caractere.'); return }
    if (newPassword !== confirmPassword) { setPasswordError('Parolele nu coincid.'); return }
    setPasswordState('saving')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) { setPasswordState('error'); setPasswordError(error.message); return }
    setPasswordState('saved')
    setNewPassword(''); setConfirmPassword('')
    setTimeout(() => setPasswordState('idle'), 2000)
  }

  const handleSignOutAll = async () => {
    await supabase.auth.signOut({ scope: 'global' })
    window.location.href = '/login'
  }

  const isAdmin = profile?.role === 'Admin' || profile?.role === 'Coordonator principal'
  const displayAvatar = avatarPreview || avatarUrl

  if (loading) return (
    <main className="flex min-h-screen bg-[#f9f7f5]">
      <Sidebar />
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-[#888]">Se incarca...</p>
      </div>
    </main>
  )

  return (
    <main className="flex min-h-screen bg-[#f9f7f5] overflow-hidden">
      <Sidebar />
      <div className="flex-1 min-w-0 px-10 py-8 overflow-y-auto">

        <div className="mb-8">
          <p className="text-[11px] font-semibold text-[#9c8e87] uppercase tracking-[0.15em] mb-2">Cont personal</p>
          <h1 className="text-[48px] leading-none tracking-tight font-light text-[#111] mb-3">Setari</h1>
          <div className="w-10 h-[3px] rounded-full bg-[#ce0100] mb-4" />
          <p className="text-sm font-light text-[#666]">Gestioneaza profilul si preferintele tale.</p>
        </div>

        <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 360px' }}>

          <div className="flex flex-col gap-5">

            <Section title="Profil" sub="Numele tau si limba de lucru" icon={UserIcon}>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-[#666] uppercase tracking-wide block mb-2">Nume complet</label>
                  <input value={fullName} onChange={e => setFullName(e.target.value)}
                    className="w-full h-11 rounded-[14px] border border-[#f0e9e5] px-4 text-sm text-[#111] outline-none focus:border-[#ce0100] transition-all" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#666] uppercase tracking-wide block mb-2">Limba de lucru</label>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGES.map(l => (
                      <button key={l} onClick={() => setLanguage(l)}
                        className={`h-9 px-4 rounded-xl border-2 text-sm font-bold transition-all ${
                          language === l ? 'border-[#ce0100] bg-[#ce0100] text-white' : 'border-[#f0e9e5] text-[#555] hover:border-[#ffd3d3]'
                        }`}>{l}</button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <SaveBtn state={profileState} onClick={handleSaveProfile} />
                </div>
              </div>
            </Section>

            <Section title="Adresa de email" sub="Adresa folosita pentru autentificare" icon={EnvelopeIcon}>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-[#666] uppercase tracking-wide block mb-2">Email</label>
                  <input value={email} onChange={e => setEmail(e.target.value)} type="email"
                    className="w-full h-11 rounded-[14px] border border-[#f0e9e5] px-4 text-sm text-[#111] outline-none focus:border-[#ce0100] transition-all" />
                  <p className="text-[11px] text-[#aaa] mt-2">Vei primi un email de confirmare la noua adresa.</p>
                </div>
                <div className="flex justify-end">
                  <SaveBtn state={emailState} onClick={handleSaveEmail} label="Actualizeaza emailul" />
                </div>
              </div>
            </Section>

            <Section title="Parola" sub="Schimba parola de acces" icon={LockClosedIcon}>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-[#666] uppercase tracking-wide block mb-2">Parola noua</label>
                  <input value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password" placeholder="Minimum 6 caractere"
                    className="w-full h-11 rounded-[14px] border border-[#f0e9e5] px-4 text-sm text-[#111] outline-none focus:border-[#ce0100] transition-all placeholder:text-[#ccc]" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#666] uppercase tracking-wide block mb-2">Confirma parola</label>
                  <input value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} type="password" placeholder="Repeta parola noua"
                    className={`w-full h-11 rounded-[14px] border px-4 text-sm text-[#111] outline-none focus:border-[#ce0100] transition-all placeholder:text-[#ccc] ${
                      confirmPassword && confirmPassword !== newPassword ? 'border-[#ffd3d3]' : 'border-[#f0e9e5]'
                    }`} />
                  {confirmPassword && confirmPassword !== newPassword && (
                    <p className="text-[11px] text-[#ce0100] mt-1">Parolele nu coincid.</p>
                  )}
                </div>
                {passwordError && <p className="text-[12px] text-[#ce0100] font-medium">{passwordError}</p>}
                <div className="flex justify-end">
                  <SaveBtn state={passwordState} onClick={handleSavePassword} label="Schimba parola" />
                </div>
              </div>
            </Section>

            <div className="bg-white border border-[#ffd3d3] rounded-[24px] p-7 shadow-sm">
              <div className="flex items-center gap-3 mb-6 pb-5 border-b border-[#ffeaea]">
                <div className="w-10 h-10 rounded-[12px] bg-[#fff1f1] flex items-center justify-center flex-shrink-0">
                  <ExclamationTriangleIcon className="w-5 h-5 text-[#ce0100]" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#ce0100]">Zona de pericol</h2>
                  <p className="text-xs text-[#888] font-light mt-0.5">Actiuni ireversibile</p>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between py-3 border-b border-[#ffeaea]">
                  <div>
                    <p className="text-sm font-semibold text-[#111]">Deconecteaza toate sesiunile</p>
                    <p className="text-xs text-[#888] mt-0.5 font-light">Inchide sesiunile active pe toate dispozitivele</p>
                  </div>
                  <button onClick={handleSignOutAll}
                    className="h-9 px-4 rounded-xl border border-[#ffd3d3] bg-white text-sm font-semibold text-[#ce0100] hover:bg-[#fff1f1] transition-all">
                    Deconecteaza
                  </button>
                </div>
                {!isAdmin && (
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-semibold text-[#111]">Sterge contul</p>
                      <p className="text-xs text-[#888] mt-0.5 font-light">Aceasta actiune este permanenta si ireversibila</p>
                    </div>
                    <button onClick={() => setShowDeleteConfirm(true)}
                      className="h-9 px-4 rounded-xl bg-[#ce0100] text-white text-sm font-semibold hover:bg-[#a80000] transition-all">
                      Sterge contul
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>

          <div className="flex flex-col gap-5">

            <div className="bg-white border border-[#f0e9e5] rounded-[24px] p-7 shadow-sm">
              <div className="flex items-center gap-3 mb-6 pb-5 border-b border-[#f4ece9]">
                <div className="w-10 h-10 rounded-[12px] bg-[#fff4f4] flex items-center justify-center flex-shrink-0">
                  <CameraIcon className="w-5 h-5 text-[#ce0100]" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#111]">Fotografie profil</h2>
                  <p className="text-xs text-[#888] font-light mt-0.5">JPG, PNG max 2MB</p>
                </div>
              </div>
              <div className="flex flex-col items-center gap-5">
                <div className="relative">
                  <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-[#f0e9e5] flex items-center justify-center"
                    style={{ background: displayAvatar ? 'transparent' : '#ce0100' }}>
                    {displayAvatar ? (
                      <img src={displayAvatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl font-bold text-white">
                        {profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                      </span>
                    )}
                  </div>
                  <button onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#ce0100] text-white flex items-center justify-center shadow-lg hover:bg-[#a80000] transition-all">
                    <CameraIcon className="w-4 h-4" />
                  </button>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                {avatarPreview && <SaveBtn state={avatarState} onClick={handleSaveAvatar} label="Salveaza fotografia" />}
                {!avatarPreview && displayAvatar && (
                  <button onClick={async () => {
                    await supabase.from('users').update({ avatar_url: null }).eq('id', profile!.id)
                    setAvatarUrl(null); setAvatarPreview(null)
                  }} className="text-xs text-[#ce0100] hover:underline">
                    Elimina fotografia
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white border border-[#f0e9e5] rounded-[24px] p-7 shadow-sm">
              <h3 className="text-sm font-semibold text-[#111] mb-4">Informatii cont</h3>
              <div className="flex flex-col gap-3">
                {[
                  { label: 'Rol', value: profile?.role || '' },
                  { label: 'Limba', value: profile?.language || '' },
                  { label: 'Stare', value: profile?.active ? 'Activ' : 'Inactiv' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-[#f4ece9] last:border-0">
                    <span className="text-xs text-[#888] uppercase tracking-wide font-medium">{label}</span>
                    <span className="text-sm font-semibold text-[#111]">{value}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4"
          style={{ background: 'rgba(10,6,4,0.65)', backdropFilter: 'blur(10px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowDeleteConfirm(false) }}>
          <div className="bg-white rounded-[28px] w-full max-w-[420px] overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.2)]">
            <div className="h-[4px] bg-[#ce0100]" />
            <div className="px-8 pt-8 pb-7">
              <div className="flex justify-center mb-5">
                <div className="w-14 h-14 rounded-full bg-[#fff1f1] border-2 border-[#f4d4d4] flex items-center justify-center">
                  <ExclamationTriangleIcon className="w-6 h-6 text-[#ce0100]" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-[#111] text-center mb-2">Stergi contul?</h3>
              <p className="text-sm text-[#666] text-center mb-5 leading-relaxed">
                Aceasta actiune este <strong>ireversibila</strong>. Scrie <strong className="text-[#ce0100]">STERGE</strong> pentru a confirma.
              </p>
              <input value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="STERGE" className="w-full h-11 rounded-[14px] border border-[#f0e9e5] px-4 text-sm text-center text-[#111] outline-none focus:border-[#ce0100] transition-all mb-5 placeholder:text-[#ccc]" />
              <div className="flex gap-3">
                <button onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText('') }}
                  className="flex-1 h-11 rounded-[14px] border border-[#e8e2de] bg-white text-sm font-semibold text-[#666] hover:bg-[#faf7f5] transition-all">
                  Anuleaza
                </button>
                <button disabled={deleteConfirmText !== 'STERGE'}
                  onClick={async () => {
                    if (!profile) return
                    await supabase.from('users').delete().eq('id', profile.id)
                    await supabase.auth.signOut()
                    window.location.href = '/login'
                  }}
                  className="flex-1 h-11 rounded-[14px] bg-[#ce0100] text-white text-sm font-bold hover:bg-[#a80000] disabled:opacity-40 transition-all">
                  Sterge definitiv
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}