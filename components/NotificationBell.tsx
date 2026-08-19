'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/context/UserContext'
import { useRouter } from 'next/navigation'
import { BellIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { BellIcon as BellSolid } from '@heroicons/react/24/solid'

type Notificare = {
  id: string
  titlu: string
  mesaj: string | null
  tip: 'validare' | 'calendar' | 'traducere' | 'deadline'
  citit: boolean
  link: string | null
  created_at: string
}

const TIP_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  validare:  { bg: 'bg-[#eef3ff]', text: 'text-[#1e40af]', dot: 'bg-[#1e40af]' },
  calendar:  { bg: 'bg-[#fff5eb]', text: 'text-[#c05c00]', dot: 'bg-[#c05c00]' },
  traducere: { bg: 'bg-[#f0fff4]', text: 'text-[#166534]', dot: 'bg-[#166534]' },
  deadline:  { bg: 'bg-[#fff1f1]', text: 'text-[#ce0100]', dot: 'bg-[#ce0100]' },
}

const TIP_LABEL: Record<string, string> = {
  validare:  'Validare',
  calendar:  'Calendar',
  traducere: 'Traducere',
  deadline:  'Deadline',
}

function timeAgo(date: string) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (diff < 60) return 'Acum'
  if (diff < 3600) return `${Math.floor(diff / 60)} min`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}z`
}

export default function NotificationBell() {
  const { profile } = useUser()
  const router = useRouter()
  const [notificari, setNotificari] = useState<Notificare[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const unread = notificari.filter(n => !n.citit).length

  // Fetch notificări
  const fetchNotificari = async () => {
    if (!profile?.id) return
    const { data } = await supabase
      .from('notificari')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(30)
    setNotificari(data || [])
    setLoading(false)
  }

  // Realtime subscription
  useEffect(() => {
    if (!profile?.id) return
    fetchNotificari()

    const channel = supabase
      .channel(`notificari:${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificari',
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          setNotificari(prev => [payload.new as Notificare, ...prev])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile?.id])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const markAsRead = async (id: string) => {
    await supabase.from('notificari').update({ citit: true }).eq('id', id)
    setNotificari(prev => prev.map(n => n.id === id ? { ...n, citit: true } : n))
  }

  const markAllAsRead = async () => {
    if (!profile?.id) return
    await supabase.from('notificari').update({ citit: true }).eq('user_id', profile.id).eq('citit', false)
    setNotificari(prev => prev.map(n => ({ ...n, citit: true })))
  }

  const handleClick = async (n: Notificare) => {
    await markAsRead(n.id)
    setOpen(false)
    if (n.link) router.push(n.link)
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '36px', height: '36px', borderRadius: '10px',
          background: open ? '#fdf0ee' : 'transparent',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', transition: 'background 0.15s',
        }}
      >
        {unread > 0
          ? <BellSolid style={{ width: '18px', height: '18px', color: '#ce0100' }} />
          : <BellIcon style={{ width: '18px', height: '18px', color: '#7a6e69' }} />
        }
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: '4px', right: '4px',
            width: '16px', height: '16px', borderRadius: '50%',
            background: '#ce0100', color: 'white',
            fontSize: '9px', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid white',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'fixed', top: 'auto', left: '220px', marginTop: '4px',
          width: '340px', background: 'white',
          borderRadius: '16px', border: '1px solid #f0e8e4',
          boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
          zIndex: 200, overflow: 'hidden',
          maxHeight: '480px', display: 'flex', flexDirection: 'column',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', borderBottom: '1px solid #f5efec', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BellSolid style={{ width: '15px', height: '15px', color: '#ce0100' }} />
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#111' }}>Notificări</span>
              {unread > 0 && (
                <span style={{
                  background: '#ce0100', color: 'white', borderRadius: '100px',
                  padding: '1px 7px', fontSize: '11px', fontWeight: 700,
                }}>{unread}</span>
              )}
            </div>
            {unread > 0 && (
              <button onClick={markAllAsRead} style={{
                fontSize: '11px', color: '#ce0100', fontWeight: 600,
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '4px',
              }}>
                <CheckIcon style={{ width: '12px', height: '12px' }} />
                Toate citite
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <p style={{ textAlign: 'center', padding: '24px', color: '#aaa', fontSize: '13px' }}>Se încarcă...</p>
            ) : notificari.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                <BellIcon style={{ width: '32px', height: '32px', color: '#e0d8d4', margin: '0 auto 8px' }} />
                <p style={{ fontSize: '13px', color: '#aaa' }}>Nicio notificare</p>
              </div>
            ) : notificari.map(n => {
              const s = TIP_STYLE[n.tip] ?? TIP_STYLE['validare']
              return (
                <div
                  key={n.id}
                  onClick={() => handleClick(n)}
                  style={{
                    display: 'flex', gap: '10px', padding: '12px 16px',
                    cursor: 'pointer', borderBottom: '1px solid #faf7f5',
                    background: n.citit ? 'white' : '#fffbfb',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#faf7f5')}
                  onMouseLeave={e => (e.currentTarget.style.background = n.citit ? 'white' : '#fffbfb')}
                >
                  {/* Dot */}
                  <div style={{ paddingTop: '4px', flexShrink: 0 }}>
                    <div style={{
                      width: '7px', height: '7px', borderRadius: '50%',
                      background: n.citit ? '#e0d8d4' : '#ce0100',
                    }} />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                      <span style={{
                        fontSize: '10px', fontWeight: 700, padding: '1px 6px',
                        borderRadius: '100px', flexShrink: 0,
                      }} className={`${s.bg} ${s.text}`}>
                        {TIP_LABEL[n.tip]}
                      </span>
                      <span style={{ fontSize: '10px', color: '#bbb', marginLeft: 'auto', flexShrink: 0 }}>
                        {timeAgo(n.created_at)}
                      </span>
                    </div>
                    <p style={{ fontSize: '13px', fontWeight: n.citit ? 400 : 600, color: '#111', marginBottom: '2px' }}>
                      {n.titlu}
                    </p>
                    {n.mesaj && (
                      <p style={{ fontSize: '12px', color: '#888', lineHeight: '1.4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {n.mesaj}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
