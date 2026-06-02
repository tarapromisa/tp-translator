'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '@/context/UserContext'
import { supabase } from '@/lib/supabase'
import { Quote } from 'lucide-react'
import {
  HomeIcon, BookOpenIcon, UsersIcon,
  ShieldCheckIcon, ChartBarIcon, Cog8ToothIcon,
  EnvelopeIcon, DocumentTextIcon,
} from '@heroicons/react/24/outline'

const ALL_NAV = [
  { label: 'Dashboard',      href: '/',              Icon: HomeIcon,         roles: ['Admin','Coordonator principal','Coordonator','Traducător','Traducător_RO'] },
  { label: 'Citate',         href: '/citate',         Icon: Quote,            roles: ['Admin','Coordonator principal','Coordonator'] },
  { label: 'Versete',        href: '/versete',        Icon: BookOpenIcon,     roles: ['Admin','Coordonator principal','Coordonator'] },
  { label: 'Citate RO',      href: '/citate-ro',      Icon: DocumentTextIcon, roles: ['Admin','Coordonator principal','Coordonator','Traducător_RO'] },
  { label: 'Utilizatori',    href: '/utilizatori',    Icon: UsersIcon,        roles: ['Admin','Coordonator principal','Coordonator'] },
  { label: 'Validări',       href: '/validari',       Icon: ShieldCheckIcon,  roles: ['Admin','Coordonator principal'] },
  { label: 'Mail TLP',       href: '/mail-tlp',       Icon: EnvelopeIcon,     roles: ['Admin','Coordonator principal','Coordonator'] },
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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const effectiveRole = profile ? getEffectiveRole(profile.role, profile.language) : ''
  const visibleNav = loading
    ? ALL_NAV
    : ALL_NAV.filter(item => item.roles.includes(effectiveRole))

  return (
    <>
      <style>{`
        @keyframes sbIn {
          from { opacity:0; transform:translateX(-8px); }
          to   { opacity:1; transform:translateX(0); }
        }
        .sb-link { text-decoration: none; }
        .sb-item {
          animation: sbIn 0.22s ease both;
          display: flex; align-items: center; gap: 12px;
          height: 44px; padding: 0 12px; border-radius: 14px;
          cursor: pointer; transition: background 0.15s ease, transform 0.15s ease;
        }
        .sb-item:nth-child(1){animation-delay:.03s}
        .sb-item:nth-child(2){animation-delay:.06s}
        .sb-item:nth-child(3){animation-delay:.09s}
        .sb-item:nth-child(4){animation-delay:.12s}
        .sb-item:nth-child(5){animation-delay:.15s}
        .sb-item:nth-child(6){animation-delay:.18s}
        .sb-item:nth-child(7){animation-delay:.21s}
        .sb-item:nth-child(8){animation-delay:.24s}
        .sb-item:nth-child(9){animation-delay:.27s}
        .sb-item:not(.sb-active):hover { background: #f4ede9; transform: translateX(3px); }
        .sb-active { background: #fdf0ee; box-shadow: 0 4px 18px rgba(206,1,0,0.08); }
        .sb-icon { transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1); }
        .sb-item:hover .sb-icon { transform: scale(1.15); }
        .sb-logout {
          width:100%; height:38px; border-radius:12px;
          background:white; border:1px solid #e8e2de;
          color:#ce0100; font-size:13px; font-weight:600;
          cursor:pointer; display:flex; align-items:center;
          justify-content:center; gap:7px;
          transition:all 0.15s ease; font-family:var(--font-openSans);
        }
        .sb-logout:hover { background:#fff4f4; border-color:#ffc5c5; transform:translateY(-1px); box-shadow:0 4px 12px rgba(206,1,0,0.1); }
      `}</style>

      <aside style={{
        position:'sticky', top:0, height:'100vh', width:'220px', flexShrink:0,
        background:'rgba(252,251,250,0.94)', backdropFilter:'blur(24px)',
        borderRight:'1px solid #f3ece8', display:'flex', flexDirection:'column', zIndex:50,
      }}>

        {/* Logo */}
        <div style={{ padding:'28px 20px 22px' }}>
          <img src="/logo.png" alt="TP Translator" style={{ width:'110px' }} />
        </div>

        <div style={{ height:'1px', background:'linear-gradient(90deg, transparent, #e8e2de, transparent)', margin:'0 16px' }} />

        {/* Nav */}
        <nav style={{ flex:1, padding:'14px 10px', display:'flex', flexDirection:'column', gap:'2px', overflowY:'auto' }}>
          {visibleNav.map(({ label, href, Icon }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href))
            return (
              <Link href={href} key={href} className="sb-link">
                <div className={`sb-item ${active ? 'sb-active' : ''}`}>
                  <span className="sb-icon">
                    <Icon style={{ width:'20px', height:'20px', color: active ? '#ce0100' : '#7a6e69', flexShrink:0 }} strokeWidth={active ? 2 : 1.5} />
                  </span>
                  <span style={{
                    fontSize:'15px', fontWeight: active ? 600 : 300,
                    color: active ? '#111' : '#6e625d',
                    fontFamily:'var(--font-openSans)',
                    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                    letterSpacing: active ? '-0.01em' : '0',
                    transition:'all 0.15s ease',
                  }}>{label}</span>
                  {active && <div style={{ marginLeft:'auto', width:'4px', height:'4px', borderRadius:'50%', background:'#ce0100', flexShrink:0 }} />}
                </div>
              </Link>
            )
          })}
        </nav>

        <div style={{ height:'1px', background:'linear-gradient(90deg, transparent, #e8e2de, transparent)', margin:'0 16px' }} />

        {/* User card */}
        <div style={{ padding:'14px 10px 20px' }}>
          <div style={{ background:'#f7f3f0', borderRadius:'20px', padding:'14px 16px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'11px', marginBottom:'12px' }}>
              <div style={{
                width:'40px', height:'40px', borderRadius:'50%', flexShrink:0,
                background: profile?.avatar_url ? 'transparent' : '#ce0100',
                overflow:'hidden',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'14px', fontWeight:700, color:'white',
                fontFamily:'var(--font-montserrat)',
                boxShadow:'0 4px 12px rgba(206,1,0,0.28)',
              }}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  : <span>{loading ? '' : getInitials(profile?.full_name || 'U')}</span>
                }
              </div>
              <div style={{ minWidth:0, flex:1 }}>
                <p style={{
                  margin:0, fontSize:'13px', fontWeight:600, color:'#111',
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                  fontFamily:'var(--font-montserrat)',
                }}>
                  {loading ? '' : profile?.full_name || '—'}
                </p>
                <p style={{ margin:0, fontSize:'11px', color:'#9d918b', marginTop:'2px', fontFamily:'var(--font-openSans)' }}>
                  {loading ? '' : profile?.role || '—'}
                </p>
              </div>
            </div>
            <button onClick={handleLogout} className="sb-logout">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Sign out
            </button>
          </div>
        </div>

      </aside>
    </>
  )
}