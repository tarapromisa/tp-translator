'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/context/UserContext'
import { useRouter } from 'next/navigation'
import { BellIcon, CheckIcon, XMarkIcon, CalendarDaysIcon, ShieldCheckIcon, BookOpenIcon, ClockIcon } from '@heroicons/react/24/outline'
import { BellAlertIcon } from '@heroicons/react/24/solid'

type Notificare = {
  id: string
  titlu: string
  mesaj: string | null
  tip: 'validare' | 'calendar' | 'traducere' | 'deadline'
  citit: boolean
  link: string | null
  created_at: string
}

const TIP_CONFIG: Record<string, { bg: string; text: string; border: string; icon: any; label: string }> = {
  validare:  { bg: '#eef3ff', text: '#1e40af', border: '#c7d8ff', icon: ShieldCheckIcon, label: 'Validare' },
  calendar:  { bg: '#fff5eb', text: '#c05c00', border: '#ffd9a8', icon: CalendarDaysIcon, label: 'Calendar' },
  traducere: { bg: '#edfaf3', text: '#166534', border: '#bbf0d4', icon: BookOpenIcon,     label: 'Traducere' },
  deadline:  { bg: '#fff1f1', text: '#ce0100', border: '#ffd3d3', icon: ClockIcon,        label: 'Deadline' },
}

function timeAgo(date: string) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (diff < 60) return 'Acum'
  if (diff < 3600) return `${Math.floor(diff / 60)} min`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `${Math.floor(diff / 86400)}z`
  return new Date(date).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' })
}

export default function NotificationBell() {
  const { profile } = useUser()
  const router = useRouter()
  const [notificari, setNotificari] = useState<Notificare[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [shake, setShake] = useState(false)
  const [newNotif, setNewNotif] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const isFirstLoad = useRef(true)

  const unread = notificari.filter(n => !n.citit).length

  const fetchNotificari = async () => {
    if (!profile?.id) return
    const { data } = await supabase
      .from('notificari')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(40)
    setNotificari(data || [])
    setLoading(false)
  }

  useEffect(() => {
    if (!profile?.id) return
    fetchNotificari()

    const channel = supabase
      .channel(`notificari:${profile.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notificari',
        filter: `user_id=eq.${profile.id}`,
      }, (payload) => {
        setNotificari(prev => [payload.new as Notificare, ...prev])
        if (!isFirstLoad.current) {
          setShake(true)
          setNewNotif(true)
          setTimeout(() => setShake(false), 600)
          setTimeout(() => setNewNotif(false), 3000)
        }
      })
      .subscribe()

    setTimeout(() => { isFirstLoad.current = false }, 2000)
    return () => { supabase.removeChannel(channel) }
  }, [profile?.id])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false)
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
    <>
      <style>{`
        @keyframes bellShake {
          0%,100% { transform: rotate(0deg); }
          15% { transform: rotate(-18deg); }
          30% { transform: rotate(18deg); }
          45% { transform: rotate(-12deg); }
          60% { transform: rotate(12deg); }
          75% { transform: rotate(-6deg); }
          90% { transform: rotate(6deg); }
        }
        @keyframes badgePulse {
          0%,100% { transform: scale(1); }
          50% { transform: scale(1.25); }
        }
        @keyframes notifSlideIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes dropdownIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes newPing {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        .notif-item:hover { background: #faf7f5 !important; }
      `}</style>

      <div ref={dropdownRef} style={{ position: 'relative' }}>
        {/* Bell button */}
        <button
          onClick={() => { setOpen(o => !o); setNewNotif(false) }}
          style={{
            width: '34px', height: '34px', borderRadius: '10px',
            background: open ? '#fdf0ee' : newNotif ? '#fff1f1' : 'transparent',
            border: 'none', cursor: 'pointer', position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.2s',
          }}
        >
          {/* Ping ring when new notif */}
          {newNotif && (
            <span style={{
              position: 'absolute', inset: 0, borderRadius: '10px',
              background: '#ce0100', opacity: 0,
              animation: 'newPing 1s ease-out infinite',
            }} />
          )}

          <BellIcon style={{
            width: '18px', height: '18px',
            color: unread > 0 ? '#ce0100' : '#7a6e69',
            animation: shake ? 'bellShake 0.6s ease-in-out' : 'none',
            transition: 'color 0.2s',
          }} />

          {/* Badge */}
          {unread > 0 && (
            <span style={{
              position: 'absolute', top: '3px', right: '3px',
              minWidth: '15px', height: '15px', borderRadius: '100px',
              background: '#ce0100', color: 'white',
              fontSize: '8px', fontWeight: 800, padding: '0 3px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1.5px solid white',
              animation: newNotif ? 'badgePulse 0.6s ease-in-out 2' : 'none',
            }}>
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        {/* Dropdown */}
        {open && (
          <div style={{
            position: 'fixed',
            top: '70px',
            left: '16px',
            width: '320px',
            background: 'white',
            borderRadius: '18px',
            border: '1px solid #f0e8e4',
            boxShadow: '0 24px 60px rgba(0,0,0,0.13), 0 4px 16px rgba(0,0,0,0.06)',
            zIndex: 300,
            overflow: 'hidden',
            maxHeight: '460px',
            display: 'flex',
            flexDirection: 'column',
            animation: 'dropdownIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}>
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px 12px', borderBottom: '1px solid #f5efec', flexShrink: 0,
              background: 'linear-gradient(135deg, #fffefe, #fff8f7)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '8px',
                  background: '#fff1f1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <BellAlertIcon style={{ width: '14px', height: '14px', color: '#ce0100' }} />
                </div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#111' }}>Notificări</span>
                {unread > 0 && (
                  <span style={{
                    background: '#ce0100', color: 'white', borderRadius: '100px',
                    padding: '1px 7px', fontSize: '10px', fontWeight: 800,
                  }}>{unread}</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {unread > 0 && (
                  <button onClick={markAllAsRead} style={{
                    fontSize: '11px', color: '#ce0100', fontWeight: 600,
                    background: '#fff1f1', border: '1px solid #ffd3d3',
                    borderRadius: '8px', padding: '4px 8px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px',
                  }}>
                    <CheckIcon style={{ width: '10px', height: '10px' }} />
                    Toate citite
                  </button>
                )}
                <button onClick={() => setOpen(false)} style={{
                  width: '24px', height: '24px', borderRadius: '6px',
                  background: '#f5efec', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <XMarkIcon style={{ width: '12px', height: '12px', color: '#888' }} />
                </button>
              </div>
            </div>

            {/* List */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {loading ? (
                <div style={{ padding: '32px', textAlign: 'center' }}>
                  <div style={{ width: '20px', height: '20px', border: '2px solid #f0e8e4', borderTopColor: '#ce0100', borderRadius: '50%', margin: '0 auto', animation: 'spin 0.8s linear infinite' }} />
                </div>
              ) : notificari.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 16px' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '14px',
                    background: '#f5efec', margin: '0 auto 12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <BellIcon style={{ width: '22px', height: '22px', color: '#d4c8c2' }} />
                  </div>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#888', marginBottom: '4px' }}>Nicio notificare</p>
                  <p style={{ fontSize: '11px', color: '#bbb' }}>Vei fi notificat când apar actualizări</p>
                </div>
              ) : notificari.map((n, idx) => {
                const cfg = TIP_CONFIG[n.tip] ?? TIP_CONFIG['validare']
                const IconComp = cfg.icon
                return (
                  <div
                    key={n.id}
                    className="notif-item"
                    onClick={() => handleClick(n)}
                    style={{
                      display: 'flex', gap: '10px', padding: '12px 14px',
                      cursor: 'pointer',
                      borderBottom: idx < notificari.length - 1 ? '1px solid #faf7f5' : 'none',
                      background: n.citit ? 'white' : '#fffcfc',
                      transition: 'background 0.15s',
                      animation: idx === 0 && !n.citit ? 'notifSlideIn 0.3s ease-out' : 'none',
                      position: 'relative',
                    }}
                  >
                    {/* Unread indicator */}
                    {!n.citit && (
                      <div style={{
                        position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                        width: '3px', height: '60%', borderRadius: '0 2px 2px 0',
                        background: '#ce0100',
                      }} />
                    )}

                    {/* Icon */}
                    <div style={{
                      width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0,
                      background: cfg.bg, border: `1px solid ${cfg.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <IconComp style={{ width: '15px', height: '15px', color: cfg.text }} />
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <span style={{
                          fontSize: '10px', fontWeight: 700, color: cfg.text,
                          textTransform: 'uppercase', letterSpacing: '0.06em',
                        }}>{cfg.label}</span>
                        <span style={{ fontSize: '10px', color: '#bbb', flexShrink: 0 }}>{timeAgo(n.created_at)}</span>
                      </div>
                      <p style={{
                        fontSize: '12px', fontWeight: n.citit ? 500 : 700,
                        color: '#111', marginBottom: '2px', lineHeight: '1.3',
                      }}>{n.titlu}</p>
                      {n.mesaj && (
                        <p style={{
                          fontSize: '11px', color: '#888', lineHeight: '1.4',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{n.mesaj}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer */}
            {notificari.length > 0 && (
              <div style={{
                padding: '10px 14px', borderTop: '1px solid #f5efec', flexShrink: 0,
                background: '#fdfcfb', textAlign: 'center',
              }}>
                <p style={{ fontSize: '11px', color: '#bbb' }}>{notificari.length} notificări · Ultimele 40</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}