'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '@/context/UserContext'
import { supabase } from '@/lib/supabase'
import { useState } from 'react'
import { Quote } from 'lucide-react'
import {
  HomeIcon, BookOpenIcon, UsersIcon,
  ShieldCheckIcon, ChartBarIcon, Cog8ToothIcon,
  EnvelopeIcon, DocumentTextIcon, Bars3Icon, XMarkIcon,
  CalendarDaysIcon, MusicalNoteIcon,
} from '@heroicons/react/24/outline'

const ALL_NAV = [
  { label: 'Dashboard',      href: '/',              Icon: HomeIcon,         roles: ['Admin','Coordonator principal','Coordonator','Traducător','Traducător_RO'] },
  { label: 'Citate',         href: '/citate',         Icon: Quote,            roles: ['Admin','Coordonator principal','Coordonator'] },
  { label: 'Versete',        href: '/versete',        Icon: BookOpenIcon,     roles: ['Admin','Coordonator principal','Coordonator'] },
  { label: 'Citate RO',      href: '/citate-ro',      Icon: DocumentTextIcon, roles: ['Admin','Coordonator principal','Coordonator','Traducător_RO'] },
  { label: 'Calendar',       href: '/calendar',       Icon: CalendarDaysIcon, roles: ['Admin','Coordonator principal','Coordonator'] },
  { label: 'Cântări',        href: '/cantari',         Icon: MusicalNoteIcon,  roles: ['Admin','Coordonator principal','Coordonator'] },
  { label: 'Utilizatori',    href: '/utilizatori',    Icon: UsersIcon,        roles: ['Admin','Coordonator principal','Coordonator'] },
  { label: 'Validări',       href: '/validari',       Icon: ShieldCheckIcon,  roles: ['Admin','Coordonator principal'] },
  { label: 'Mail TLP / TLG',       href: '/mail-tlp',       Icon: EnvelopeIcon,     roles: ['Admin','Coordonator principal','Coordonator'] },
  { label: 'Productivitate', href: '/productivitate', Icon: ChartBarIcon,     roles: ['Admin','Coordonator principal','Coordonator'] },
  { label: 'Setări',         href: '/setari',         Icon: Cog8ToothIcon,    roles: ['Admin','Coordonator principal','Coordonator','Traducător','Traducător_RO'] },
]

function getEffectiveRole(role: string, language: string): string {
  if (role === 'Traducător' && language === 'RO') return 'Traducător_RO'
  return role
}

function getInitials(name: string) {
  return name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
}

export default function Sidebar() {
  const pathname = usePathname()
  const { profile, loading } = useUser()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const effectiveRole = profile ? getEffectiveRole(profile.role, profile.language) : ''
  const visibleNav = loading
    ? ALL_NAV
    : ALL_NAV.filter(item => item.roles.includes(effectiveRole))

  const sidebarContent = (
    <>
      {/* Logo */}
      <div style={{ padding: '24px 20px 18px', flexShrink: 0 }}>
        <div className="flex items-center justify-between">
          <img src="/logo.png" alt="TP Translator" style={{ height: '52px', width: 'auto', objectFit: 'contain' }} />
          <button onClick={() => setMobileOpen(false)} className="md:hidden w-8 h-8 rounded-full bg-[#f0e9e5] flex items-center justify-center">
            <XMarkIcon className="w-4 h-4 text-[#555]" />
          </button>
        </div>
      </div>

      <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, #e8e2de, transparent)', margin: '0 16px', flexShrink: 0 }} />

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
        {visibleNav.map(({ label, href, Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link href={href} key={href} style={{ textDecoration: 'none' }} onClick={() => setMobileOpen(false)}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                height: '42px', padding: '0 12px', borderRadius: '14px',
                cursor: 'pointer',
                background: active ? '#fdf0ee' : 'transparent',
                boxShadow: active ? '0 4px 18px rgba(206,1,0,0.08)' : 'none',
                transition: 'all 0.15s ease',
              }}>
                <Icon style={{ width: '19px', height: '19px', color: active ? '#ce0100' : '#7a6e69', flexShrink: 0 }} strokeWidth={active ? 2 : 1.5} />
                <span style={{
                  fontSize: '14px', fontWeight: active ? 600 : 300,
                  color: active ? '#111' : '#6e625d',
                  fontFamily: 'var(--font-openSans)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{label}</span>
                {active && <div style={{ marginLeft: 'auto', width: '4px', height: '4px', borderRadius: '50%', background: '#ce0100', flexShrink: 0 }} />}
              </div>
            </Link>
          )
        })}
      </nav>

      <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, #e8e2de, transparent)', margin: '0 16px', flexShrink: 0 }} />

      {/* User */}
      <div style={{ padding: '12px 10px 18px', flexShrink: 0 }}>
        <div style={{ background: '#f7f3f0', borderRadius: '18px', padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
              background: profile?.avatar_url ? 'transparent' : '#ce0100',
              overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', fontWeight: 700, color: 'white',
              boxShadow: '0 3px 10px rgba(206,1,0,0.25)',
            }}>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span>{loading ? '' : getInitials(profile?.full_name || 'U')}</span>
              }
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {loading ? '' : profile?.full_name || '—'}
              </p>
              <p style={{ margin: 0, fontSize: '11px', color: '#9d918b', marginTop: '1px' }}>
                {loading ? '' : profile?.role || '—'}
              </p>
            </div>
          </div>
          <button onClick={handleLogout} style={{
            width: '100%', height: '36px', borderRadius: '11px',
            background: 'white', border: '1px solid #e8e2de',
            color: '#ce0100', fontSize: '12px', fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '6px', transition: 'all 0.15s ease',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign out
          </button>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-16"
        style={{ background: 'rgba(252,251,250,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #f3ece8' }}>
        <img src="/logo.png" alt="TP Translator" style={{ height: '44px', width: 'auto', objectFit: 'contain' }} />
        <div className="flex items-center gap-3">
          {/* Current page avatar */}
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: profile?.avatar_url ? 'transparent' : '#ce0100',
            overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', fontWeight: 700, color: 'white',
          }}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span>{getInitials(profile?.full_name || 'U')}</span>
            }
          </div>
          <button onClick={() => setMobileOpen(true)}
            className="w-9 h-9 rounded-xl bg-[#f7f3f0] flex items-center justify-center">
            <Bars3Icon className="w-5 h-5 text-[#444]" />
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative w-[280px] h-full flex flex-col"
            style={{ background: 'rgba(252,251,250,0.98)', borderRight: '1px solid #f3ece8' }}>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col flex-shrink-0"
        style={{
          position: 'sticky', top: 0, height: '100vh', width: '220px',
          background: 'rgba(252,251,250,0.94)', backdropFilter: 'blur(24px)',
          borderRight: '1px solid #f3ece8',
        }}>
        {sidebarContent}
      </aside>
    </>
  )
}