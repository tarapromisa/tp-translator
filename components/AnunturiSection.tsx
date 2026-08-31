'use client'

import { useState, useEffect } from 'react'
import { createIlustratorClient } from '@/lib/supabase/ilustrator'
import { Megaphone, Plus, X, PaperPlaneTilt, Check, EnvelopeSimple, Trash, PencilSimple } from '@phosphor-icons/react'

interface Profile {
  id: string
  full_name: string
  email: string
  role: string
}

interface Announcement {
  id: string
  title: string
  body: string
  created_at: string
  created_by: { id: string; full_name: string; role: string } | null
}

interface Props {
  currentProfile: Profile
  isAdmin: boolean
}

function fmt(d: string) {
  const date = new Date(d)
  return date.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function toTitleCase(str: string) {
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

export default function AnunturiSection({ currentProfile, isAdmin }: Props) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [sendEmail, setSendEmail] = useState(false)
  const [sendToAll, setSendToAll] = useState(true)
  const [selectedEmails, setSelectedEmails] = useState<string[]>([])
  const [allUsers, setAllUsers] = useState<Profile[]>([])
  const [saving, setSaving] = useState(false)
  const [emailConfirm, setEmailConfirm] = useState(false)
  const supabase = createIlustratorClient()

  useEffect(() => {
    fetchAnnouncements()
    if (isAdmin) fetchUsers()
  }, [])

  async function fetchAnnouncements() {
    const res = await fetch('/api/announcements')
    const data = await res.json()
    setAnnouncements(data.announcements ?? [])
  }

  async function fetchUsers() {
    const { data } = await supabase.from('profiles').select('id, full_name, email, role').eq('is_active', true)
    setAllUsers(data ?? [])
  }

  function openNew() {
    setEditingId(null)
    setTitle('')
    setBody('')
    setSendEmail(false)
    setSendToAll(true)
    setSelectedEmails([])
    setShowModal(true)
  }

  function openEdit(a: Announcement) {
    setEditingId(a.id)
    setTitle(a.title)
    setBody(a.body)
    setSendEmail(false)
    setSendToAll(true)
    setSelectedEmails([])
    setShowModal(true)
  }

  async function submit() {
    if (!title.trim() || !body.trim()) return
    setSaving(true)

    if (editingId) {
      // Update existing
      await fetch('/api/announcements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, title, body }),
      })
    } else {
      // Create new
      let recipients: string[] = []
      if (sendEmail) {
        recipients = sendToAll ? allUsers.map(u => u.email).filter(Boolean) : selectedEmails
      }

      await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, body,
          createdBy: currentProfile.id,
          sendEmail,
          recipients,
          fromName: currentProfile.full_name,
          fromEmail: currentProfile.email,
          fromRole: currentProfile.role === 'admin' ? 'Admin' : 'Coordonator',
        }),
      })

      if (sendEmail && (sendToAll ? allUsers.length > 0 : selectedEmails.length > 0)) {
        setEmailConfirm(true)
      }
    }

    await fetchAnnouncements()
    setSaving(false)
    setShowModal(false)
    setEditingId(null)
    setTitle('')
    setBody('')
  }

  async function deleteAnnouncement(id: string) {
    await fetch('/api/announcements', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setAnnouncements(prev => prev.filter(a => a.id !== id))
  }

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '0.5px solid #e8e4de', padding: '24px', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f2f5e8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Megaphone size={18} weight="duotone" color="#7c8f4b" />
          </div>
          <div>
            <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 16, color: '#2a1f1a', fontStyle: 'italic' }}>Anunțuri</div>
            <div style={{ fontSize: 11, color: '#9a9a96', marginTop: 1 }}>{announcements.length} anunț{announcements.length !== 1 ? 'uri' : ''}</div>
          </div>
        </div>
        {isAdmin && (
          <button onClick={openNew} style={{ height: 36, padding: '0 14px', background: '#7c8f4b', borderRadius: 10, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, color: '#fff', fontFamily: "'DM Sans', sans-serif" }}>
            <Plus size={14} weight="bold" /> Anunț nou
          </button>
        )}
      </div>

      {announcements.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#b8b8b4', fontSize: 13 }}>Nu există anunțuri.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {announcements.map(a => (
            <div key={a.id} style={{ background: '#fafaf8', borderRadius: 12, border: '0.5px solid #ebebeb', padding: '14px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 14, color: '#2a1f1a', fontStyle: 'italic', fontWeight: 700 }}>{a.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 12 }}>
                  <span style={{ fontSize: 10, color: '#9a9a96' }}>{fmt(a.created_at)}</span>
                  {isAdmin && (
                    <>
                      <button onClick={() => openEdit(a)} style={{ width: 26, height: 26, borderRadius: 7, background: '#f2f5e8', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <PencilSimple size={13} weight="duotone" color="#7c8f4b" />
                      </button>
                      <button onClick={() => deleteAnnouncement(a.id)} style={{ width: 26, height: 26, borderRadius: 7, background: '#faeaea', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Trash size={13} weight="duotone" color="#a03030" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div style={{ fontSize: 13, color: '#6a6a50', lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 8 }}>{a.body}</div>
              {a.created_by && (
                <div style={{ fontSize: 11, color: '#b8b8b4' }}>— {toTitleCase(a.created_by.full_name)}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 520, padding: '28px 32px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 18, color: '#2a1f1a', fontStyle: 'italic' }}>{editingId ? 'Editează anunțul' : 'Anunț nou'}</div>
              <button onClick={() => setShowModal(false)} style={{ width: 32, height: 32, borderRadius: 8, background: '#f5f5f5', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={14} color="#6a6a50" />
              </button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: '#6a6a50', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '1px' }}>Titlu</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titlul anunțului..." style={{ width: '100%', height: 42, border: '1.5px solid #e8e8e8', borderRadius: 10, padding: '0 14px', fontSize: 14, fontFamily: "'DM Sans', sans-serif", color: '#2a1f1a', background: '#fafaf8', outline: 'none' }} />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: '#6a6a50', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '1px' }}>Conținut</label>
              <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Scrie anunțul aici..." rows={5} style={{ width: '100%', border: '1.5px solid #e8e8e8', borderRadius: 10, padding: '12px 14px', fontSize: 14, fontFamily: "'DM Sans', sans-serif", color: '#2a1f1a', background: '#fafaf8', outline: 'none', resize: 'vertical' }} />
            </div>

            {!editingId && (
              <div style={{ background: '#f5f7ee', borderRadius: 12, border: '0.5px solid #d4e0a8', padding: '14px 16px', marginBottom: 20 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: sendEmail ? 12 : 0 }}>
                  <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} style={{ width: 16, height: 16, accentColor: '#7c8f4b' }} />
                  <span style={{ fontSize: 13, color: '#2a1f1a', fontWeight: 500 }}>Trimite și pe email</span>
                  <PaperPlaneTilt size={15} color="#7c8f4b" weight="duotone" />
                </label>
                {sendEmail && (
                  <div style={{ marginTop: 10 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8 }}>
                      <input type="radio" checked={sendToAll} onChange={() => setSendToAll(true)} style={{ accentColor: '#7c8f4b' }} />
                      <span style={{ fontSize: 13, color: '#2a1f1a' }}>Trimite tuturor ({allUsers.length} utilizatori activi)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="radio" checked={!sendToAll} onChange={() => setSendToAll(false)} style={{ accentColor: '#7c8f4b' }} />
                      <span style={{ fontSize: 13, color: '#2a1f1a' }}>Alege destinatarii</span>
                    </label>
                    {!sendToAll && (
                      <div style={{ marginTop: 10, maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {allUsers.map(u => (
                          <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '6px 8px', borderRadius: 8, background: selectedEmails.includes(u.email) ? '#f2f5e8' : 'transparent' }}>
                            <input type="checkbox" checked={selectedEmails.includes(u.email)} onChange={e => {
                              if (e.target.checked) setSelectedEmails(prev => [...prev, u.email])
                              else setSelectedEmails(prev => prev.filter(em => em !== u.email))
                            }} style={{ accentColor: '#7c8f4b' }} />
                            <span style={{ fontSize: 13, color: '#2a1f1a' }}>{toTitleCase(u.full_name)}</span>
                            <span style={{ fontSize: 10, color: '#9a9a96', marginLeft: 'auto' }}>{u.role}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, height: 44, background: '#f5f5f5', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 13, color: '#6a6a50', fontFamily: "'DM Sans', sans-serif" }}>Anulează</button>
              <button onClick={submit} disabled={saving || !title.trim() || !body.trim()} style={{ flex: 2, height: 44, background: title.trim() && body.trim() ? '#7c8f4b' : '#d4e0a8', borderRadius: 12, border: 'none', cursor: title.trim() && body.trim() ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 600, color: '#fff', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {saving ? 'Se salvează...' : <><Check size={14} weight="bold" /> {editingId ? 'Salvează modificările' : 'Publică anunțul'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {emailConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 400, padding: '28px 32px', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#f2f5e8', border: '1.5px solid #d4e0a8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <EnvelopeSimple size={24} weight="duotone" color="#7c8f4b" />
            </div>
            <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 17, color: '#2a1f1a', fontStyle: 'italic', marginBottom: 10 }}>Emailuri trimise</div>
            <p style={{ fontSize: 13, color: '#6a6a50', lineHeight: 1.7, marginBottom: 8 }}>Verifică în <strong>Zoho Mail</strong> dacă ai primit emailul.</p>
            <p style={{ fontSize: 12, color: '#9a9a96', marginBottom: 24 }}>Dacă nu, folosește opțiunea <strong>Șablon</strong> pentru a trimite manual.</p>
            <button onClick={() => setEmailConfirm(false)} style={{ width: '100%', height: 44, background: '#7c8f4b', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#fff', fontFamily: "'DM Sans', sans-serif" }}>OK, am înțeles</button>
          </div>
        </div>
      )}
    </div>
  )
}

interface Profile {
  id: string
  full_name: string
  email: string
  role: string
}

interface Announcement {
  id: string
  title: string
  body: string
  created_at: string
  created_by: { id: string; full_name: string; role: string } | null
}

interface Props {
  currentProfile: Profile
  isAdmin: boolean
}

function fmt(d: string) {
  const date = new Date(d)
  return date.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function toTitleCase(str: string) {
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

export default function AnunturiSection({ currentProfile, isAdmin }: Props) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [showModal, setShowModal] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [sendEmail, setSendEmail] = useState(false)
  const [sendToAll, setSendToAll] = useState(true)
  const [selectedEmails, setSelectedEmails] = useState<string[]>([])
  const [allUsers, setAllUsers] = useState<Profile[]>([])
  const [saving, setSaving] = useState(false)
  const [emailConfirm, setEmailConfirm] = useState(false)
  const supabase = createIlustratorClient()

  useEffect(() => {
    fetchAnnouncements()
    if (isAdmin) fetchUsers()
  }, [])

  async function fetchAnnouncements() {
    const res = await fetch('/api/announcements')
    const data = await res.json()
    setAnnouncements(data.announcements ?? [])
  }

  async function fetchUsers() {
    const { data } = await supabase.from('profiles').select('id, full_name, email, role').eq('is_active', true)
    setAllUsers(data ?? [])
  }

  async function submit() {
    if (!title.trim() || !body.trim()) return
    setSaving(true)

    let recipients: string[] = []
    if (sendEmail) {
      if (sendToAll) {
        recipients = allUsers.map(u => u.email).filter(Boolean)
      } else {
        recipients = selectedEmails
      }
    }

    await fetch('/api/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        body,
        createdBy: currentProfile.id,
        sendEmail,
        recipients,
        fromName: currentProfile.full_name,
        fromEmail: currentProfile.email,
        fromRole: currentProfile.role === 'admin' ? 'Admin' : 'Coordonator',
      }),
    })

    await fetchAnnouncements()
    setSaving(false)
    setShowModal(false)
    setTitle('')
    setBody('')
    setSendEmail(false)
    setSendToAll(true)
    setSelectedEmails([])
    if (sendEmail && recipients.length > 0) setEmailConfirm(true)
  }

  async function deleteAnnouncement(id: string) {
    await fetch('/api/announcements', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setAnnouncements(prev => prev.filter(a => a.id !== id))
  }

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '0.5px solid #e8e8e8', padding: '24px', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f2f5e8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Megaphone size={18} weight="duotone" color="#7c8f4b" />
          </div>
          <div>
            <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 16, color: '#2a1f1a', fontStyle: 'italic' }}>Anunțuri</div>
            <div style={{ fontSize: 11, color: '#9a9a96', marginTop: 1 }}>{announcements.length} anunț{announcements.length !== 1 ? 'uri' : ''}</div>
          </div>
        </div>
        {isAdmin && (
          <button onClick={() => setShowModal(true)} style={{ height: 36, padding: '0 14px', background: '#7c8f4b', borderRadius: 10, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, color: '#fff', fontFamily: "'DM Sans', sans-serif" }}>
            <Plus size={14} weight="bold" /> Anunț nou
          </button>
        )}
      </div>

      {announcements.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#b8b8b4', fontSize: 13 }}>Nu există anunțuri.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {announcements.map(a => (
            <div key={a.id} style={{ background: '#fafaf8', borderRadius: 12, border: '0.5px solid #ebebeb', padding: '14px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 14, color: '#2a1f1a', fontStyle: 'italic', fontWeight: 700 }}>{a.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 12 }}>
                  <span style={{ fontSize: 10, color: '#9a9a96' }}>{fmt(a.created_at)}</span>
                  {isAdmin && (
                    <button onClick={() => deleteAnnouncement(a.id)} style={{ width: 26, height: 26, borderRadius: 7, background: '#faeaea', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Trash size={13} weight="duotone" color="#a03030" />
                    </button>
                  )}
                </div>
              </div>
              <div style={{ fontSize: 13, color: '#6a6a50', lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 8 }}>{a.body}</div>
              {a.created_by && (
                <div style={{ fontSize: 11, color: '#b8b8b4' }}>
                  — {toTitleCase(a.created_by.full_name)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New announcement modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 520, padding: '28px 32px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 18, color: '#2a1f1a', fontStyle: 'italic' }}>Anunț nou</div>
              <button onClick={() => setShowModal(false)} style={{ width: 32, height: 32, borderRadius: 8, background: '#f5f5f5', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={14} color="#6a6a50" />
              </button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: '#6a6a50', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '1px' }}>Titlu</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titlul anunțului..." style={{ width: '100%', height: 42, border: '1.5px solid #e8e8e8', borderRadius: 10, padding: '0 14px', fontSize: 14, fontFamily: "'DM Sans', sans-serif", color: '#2a1f1a', background: '#fafaf8', outline: 'none' }} />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: '#6a6a50', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '1px' }}>Conținut</label>
              <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Scrie anunțul aici..." rows={5} style={{ width: '100%', border: '1.5px solid #e8e8e8', borderRadius: 10, padding: '12px 14px', fontSize: 14, fontFamily: "'DM Sans', sans-serif", color: '#2a1f1a', background: '#fafaf8', outline: 'none', resize: 'vertical' }} />
            </div>

            {/* Email option */}
            <div style={{ background: '#f5f7ee', borderRadius: 12, border: '0.5px solid #d4e0a8', padding: '14px 16px', marginBottom: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: sendEmail ? 12 : 0 }}>
                <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} style={{ width: 16, height: 16, accentColor: '#7c8f4b' }} />
                <span style={{ fontSize: 13, color: '#2a1f1a', fontWeight: 500 }}>Trimite și pe email</span>
                <PaperPlaneTilt size={15} color="#7c8f4b" weight="duotone" />
              </label>

              {sendEmail && (
                <div style={{ marginTop: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8 }}>
                    <input type="radio" checked={sendToAll} onChange={() => setSendToAll(true)} style={{ accentColor: '#7c8f4b' }} />
                    <span style={{ fontSize: 13, color: '#2a1f1a' }}>Trimite tuturor ({allUsers.length} utilizatori activi)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="radio" checked={!sendToAll} onChange={() => setSendToAll(false)} style={{ accentColor: '#7c8f4b' }} />
                    <span style={{ fontSize: 13, color: '#2a1f1a' }}>Alege destinatarii</span>
                  </label>

                  {!sendToAll && (
                    <div style={{ marginTop: 10, maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {allUsers.map(u => (
                        <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '6px 8px', borderRadius: 8, background: selectedEmails.includes(u.email) ? '#f2f5e8' : 'transparent' }}>
                          <input type="checkbox" checked={selectedEmails.includes(u.email)} onChange={e => {
                            if (e.target.checked) setSelectedEmails(prev => [...prev, u.email])
                            else setSelectedEmails(prev => prev.filter(em => em !== u.email))
                          }} style={{ accentColor: '#7c8f4b' }} />
                          <span style={{ fontSize: 13, color: '#2a1f1a' }}>{toTitleCase(u.full_name)}</span>
                          <span style={{ fontSize: 10, color: '#9a9a96', marginLeft: 'auto' }}>{u.role}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, height: 44, background: '#f5f5f5', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 13, color: '#6a6a50', fontFamily: "'DM Sans', sans-serif" }}>Anulează</button>
              <button onClick={submit} disabled={saving || !title.trim() || !body.trim()} style={{ flex: 2, height: 44, background: title.trim() && body.trim() ? '#7c8f4b' : '#d4e0a8', borderRadius: 12, border: 'none', cursor: title.trim() && body.trim() ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 600, color: '#fff', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {saving ? 'Se trimite...' : <><Check size={14} weight="bold" /> Publică anunțul</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email confirm modal */}
      {emailConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 400, padding: '28px 32px', textAlign: 'center' }}>

            <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 17, color: '#2a1f1a', fontStyle: 'italic', marginBottom: 10 }}>Emailuri trimise</div>
            <p style={{ fontSize: 13, color: '#6a6a50', lineHeight: 1.7, marginBottom: 8 }}>Verifică în <strong>Zoho Mail</strong> dacă ai primit emailul.</p>
            <p style={{ fontSize: 12, color: '#9a9a96', marginBottom: 24 }}>Dacă nu, folosește opțiunea <strong>Șablon</strong> pentru a trimite manual.</p>
            <button onClick={() => setEmailConfirm(false)} style={{ width: '100%', height: 44, background: '#7c8f4b', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#fff', fontFamily: "'DM Sans', sans-serif" }}>OK, am înțeles</button>
          </div>
        </div>
      )}
    </div>
  )
}
