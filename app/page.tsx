'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import AnimatedCounter from '@/components/AnimatedCounter'
import { useUser } from '@/context/UserContext'
import { supabase } from '@/lib/supabase'
import {
  ArrowUpRightIcon,
  ChatBubbleBottomCenterTextIcon,
  BookOpenIcon,
  UsersIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  ClockIcon,
  CheckCircleIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
  MegaphoneIcon,
  EnvelopeIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'

// ── Types ─────────────────────────────────────────────────────────
type Stats = {
  totalCitate: number; totalVersete: number; totalUsers: number; totalCitateRO: number
  citateInTraducere: number; citateInValidare: number; citateValidate: number; citateRefuzate: number
  versetInTraducere: number; versetInValidare: number; versetValidate: number
}
type ActivityLog = {
  id: string; user_id: string; action: string; entity_type: string; entity_name: string; created_at: string
  user?: { full_name: string }
}
type RecentItem = {
  id: string; public_id: string; type: 'citat' | 'verset'; text: string
  status: string; validation: string | null; created_at: string; progress: number
}
type Anunt = {
  id: string; titlu: string; corp: string; created_at: string
  created_by_user?: { full_name: string; email: string } | null
}

const LANG_FIELDS_CITATE  = ['citat_es','citat_en','citat_de','citat_pt','citat_fr','citat_it','citat_ro']
const LANG_FIELDS_VERSETE = ['verset_es','verset_en','verset_de','verset_pt','verset_fr','verset_it','verset_ro']
const ACTION_LABELS: Record<string,string> = { create:'a creat', update:'a actualizat', delete:'a șters', validate:'a validat', refuse:'a refuzat' }
const ENTITY_LABELS: Record<string,string> = { citat:'citat', verset:'verset', user:'utilizator', citat_ro:'citat RO' }

const STATUS_COLOR: Record<string,string> = {
  'În traducere': '#d97706', 'În așteptare': '#3b5bdb', 'Validat': '#1a8c4e', 'Refuzat': '#ce0100'
}

const PHRASES = [
  { bold: 'Traducem ', italic: 'idei.', sub: 'Fiecare cuvânt contează.' },
  { bold: 'Claritate în ', italic: '7 limbi.', sub: 'Precizie la fiecare traducere.' },
  { bold: 'Cuvinte fără ', italic: 'frontiere.', sub: 'O platformă pentru traducători de elită.' },
  { bold: 'Validăm ', italic: 'excelența.', sub: 'Calitate înainte de orice.' },
  { bold: 'Misiunea ', italic: 'noastră.', sub: 'Să ducem mesajul mai departe.' },
]

function getProgress(row: any, fields: string[]) { return fields.filter(f => row[f]?.trim()).length }
function getDisplayStatus(validation: string | null, progress: number) {
  if (progress < 7) return 'În traducere'
  return validation ?? 'În așteptare'
}

// ── Donut ─────────────────────────────────────────────────────────
function DonutChart({ validat, validare, traducere, refuzat, total }: { validat:number; validare:number; traducere:number; refuzat:number; total:number }) {
  const r = 54; const circ = 2 * Math.PI * r
  const pct = (n: number) => total > 0 ? (n / total) * circ : 0
  const segs = [
    { val: validat,  color: '#1a8c4e', offset: 0 },
    { val: validare, color: '#3b5bdb', offset: pct(validat) },
    { val: traducere,color: '#d97706', offset: pct(validat+validare) },
    { val: refuzat,  color: '#ce0100', offset: pct(validat+validare+traducere) },
  ]
  const finPct = total > 0 ? Math.round(((validat+validare)/total)*100) : 0
  return (
    <div className="relative w-[130px] h-[130px] flex-shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 136 136">
        <circle cx="68" cy="68" r={r} fill="none" stroke="#f0eae7" strokeWidth="12" />
        {segs.map((s,i) => s.val > 0 && (
          <circle key={i} cx="68" cy="68" r={r} fill="none" stroke={s.color} strokeWidth="12"
            strokeDasharray={`${pct(s.val)} ${circ}`} strokeDashoffset={-s.offset} />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span style={{ fontSize:'24px', fontWeight:300, color:'#111', lineHeight:1 }}>{finPct}%</span>
        <span style={{ fontSize:'10px', color:'#9c8e87', marginTop:'3px' }}>finalizate</span>
      </div>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter()
  const { profile } = useUser()
  const [stats, setStats]     = useState<Stats|null>(null)
  const [activity, setActivity] = useState<ActivityLog[]>([])
  const [recent, setRecent]   = useState<RecentItem[]>([])
  const [userName, setUserName] = useState('')
  const [userRole, setUserRole] = useState('')
  const [userLanguage, setUserLanguage] = useState('')
  const [loading, setLoading] = useState(true)
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [phraseVisible, setPhraseVisible] = useState(true)
  const [greeting, setGreeting] = useState('')
  const [anunturi, setAnunturi] = useState<Anunt[]>([])
  const [showAnuntModal, setShowAnuntModal] = useState(false)
  const [confirmDeleteAnuntId, setConfirmDeleteAnuntId] = useState<string | null>(null)

  const canManageAnunturi = ['Admin', 'Coordonator principal', 'Coordonator'].includes(userRole)

  const fetchAnunturi = useCallback(async () => {
    const { data } = await supabase
      .from('anunturi')
      .select('*, created_by_user:created_by(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(20)
    setAnunturi(data || [])
  }, [])

  useEffect(() => { fetchAnunturi() }, [fetchAnunturi])

  useEffect(() => {
    const h = new Date().getHours()
    setGreeting(h < 12 ? 'Bună dimineața,' : h < 18 ? 'Bună ziua,' : 'Bună seara,')
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setPhraseVisible(false)
      setTimeout(() => { setPhraseIndex(i => (i+1) % PHRASES.length); setPhraseVisible(true) }, 400)
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: p } = await supabase.from('users').select('full_name, role, language').eq('auth_user_id', user.id).single()
        setUserName(p?.full_name || '')
        setUserRole(p?.role || '')
        setUserLanguage(p?.language || '')
      }

      const [c, v, u, ro, logs, rc, rv] = await Promise.all([
        supabase.from('texts').select('*'),
        supabase.from('versete').select('*'),
        supabase.from('users').select('id').eq('active', true),
        supabase.from('citate_ro').select('id'),
        supabase.from('activity_logs').select('*, user:user_id(full_name)').order('created_at',{ascending:false}).limit(12),
        supabase.from('texts').select('*').order('created_at',{ascending:false}).limit(6),
        supabase.from('versete').select('*').order('created_at',{ascending:false}).limit(4),
      ])

      const cData = c.data || []
      const vData = v.data || []

      setStats({
        totalCitate:       cData.length,
        totalVersete:      vData.length,
        totalUsers:        (u.data||[]).length,
        totalCitateRO:     (ro.data||[]).length,
        citateInTraducere: cData.filter(x => getProgress(x, LANG_FIELDS_CITATE) < 7).length,
        citateInValidare:  cData.filter(x => x.validation === 'În așteptare').length,
        citateValidate:    cData.filter(x => x.validation === 'Validat').length,
        citateRefuzate:    cData.filter(x => x.validation === 'Refuzat').length,
        versetInTraducere: vData.filter(x => getProgress(x, LANG_FIELDS_VERSETE) < 7).length,
        versetInValidare:  vData.filter(x => x.validation === 'În așteptare').length,
        versetValidate:    vData.filter(x => x.validation === 'Validat').length,
      })

      setActivity(logs.data || [])

      const recentItems: RecentItem[] = [
        ...(rc.data||[]).map((x: any) => ({
          id: x.id, public_id: x.public_id, type: 'citat' as const,
          text: x.citat_ro || x.citat_es || '',
          status: x.status, validation: x.validation,
          created_at: x.created_at, progress: getProgress(x, LANG_FIELDS_CITATE),
        })),
        ...(rv.data||[]).map((x: any) => ({
          id: x.id, public_id: x.public_id, type: 'verset' as const,
          text: x.verset_ro || '',
          status: x.status, validation: x.validation,
          created_at: x.created_at, progress: getProgress(x, LANG_FIELDS_VERSETE),
        })),
      ].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0,8)

      setRecent(recentItems)
      setLoading(false)
    }
    load()
  }, [])

  const phrase = PHRASES[phraseIndex]
  const isTranslator = userRole === 'Traducător'
  const isCoordinator = userRole === 'Coordonator' || userRole === 'Coordonator principal' || userRole === 'Admin'

  return (
    <>
    <main className="flex min-h-screen bg-[#fcfbfa]" style={{ fontFamily: 'var(--font-openSans)' }}>
      <Sidebar />
      <div className="flex-1 min-w-0 px-4 md:px-10 py-6 md:py-8 overflow-y-auto overflow-x-hidden">

        {/* ── HERO ── */}
        <div className="relative mb-10 overflow-hidden rounded-[8px]">

          {/* Watermark */}
          <img src="/logo.png" alt="" className="absolute right-0 top-0 w-[120px] sm:w-[160px] md:w-[200px] opacity-[0.04] pointer-events-none select-none" />

          {/* Role badge */}
          <div style={{
            display:'inline-flex', alignItems:'center', gap:'6px',
            background:'#ce0100', borderRadius:'100px',
            padding:'6px 16px', marginBottom:'16px',
          }} className="sm:absolute sm:top-0 sm:right-0 sm:mb-0">
            <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:'rgba(255,255,255,0.5)', display:'inline-block' }} />
            <span style={{ fontSize:'13px', fontWeight:500, color:'white' }}>{userRole}</span>
          </div>

          {/* Greeting */}
          <p style={{ fontSize:'14px', fontWeight:300, color:'#9c8e87', marginBottom:'8px', letterSpacing:'0.02em' }}>{greeting}</p>

          {/* Name */}
          <h1 style={{ fontSize:'clamp(28px, 8vw, 52px)', fontWeight:300, color:'#111', lineHeight:1, letterSpacing:'-0.04em', marginBottom:'16px' }}
            className="pr-0 sm:pr-[180px] md:pr-[220px]">
            {userName || '...'}
          </h1>

          {/* Line */}
          <div style={{ width:'52px', height:'3px', background:'#ce0100', borderRadius:'2px', marginBottom:'20px' }} />

          {/* Phrase */}
          <div style={{ transition:'opacity 0.4s ease', opacity: phraseVisible ? 1 : 0 }}>
            <p style={{ fontSize:'clamp(22px, 5vw, 32px)', fontWeight:300, color:'#111', letterSpacing:'-0.03em', lineHeight:1.2 }}>
              {phrase.bold}<span style={{ color:'#ce0100', textDecoration:'underline', textDecorationThickness:'2px', textUnderlineOffset:'4px' }}>{phrase.italic}</span>
            </p>
            <p style={{ fontSize:'15px', fontWeight:300, color:'#9c8e87', marginTop:'8px' }}>{phrase.sub}</p>
          </div>
        </div>

        {/* ── STAT CARDS ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
          {[
            { label: 'Citate',     sub: `${stats?.citateInTraducere ?? 0} în traducere`, value: stats?.totalCitate ?? 0,    Icon: ChatBubbleBottomCenterTextIcon, href: '/citate'     },
            { label: 'Versete',    sub: `${stats?.versetInTraducere ?? 0} în traducere`, value: stats?.totalVersete ?? 0,    Icon: BookOpenIcon,                   href: '/versete'    },
            { label: 'Traducători',sub: 'activi în sistem',                               value: stats?.totalUsers ?? 0,      Icon: UsersIcon,                      href: '/utilizatori'},
            { label: 'Citate RO',  sub: 'texte originale',                                value: stats?.totalCitateRO ?? 0,   Icon: DocumentTextIcon,               href: '/citate-ro'  },
          ].map(({ label, sub, value, Icon, href }) => (
            <div key={label} onClick={() => router.push(href)}
              className="group bg-white border border-[#f0e9e5] rounded-[24px] p-4 md:p-6 cursor-pointer hover:border-[#e0d8d2] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all duration-300">
              <div className="flex items-start justify-between mb-4 md:mb-5">
                <div className="w-10 h-10 rounded-[14px] bg-[#fff4f4] flex items-center justify-center">
                  <Icon className="w-5 h-5 text-[#ce0100]" strokeWidth={1.5} />
                </div>
                <ArrowUpRightIcon className="w-4 h-4 text-[#ccc] group-hover:text-[#ce0100] transition-colors" />
              </div>
              <p style={{ fontSize:'28px', fontWeight:300, color:'#111', lineHeight:1, marginBottom:'6px' }} className="md:text-[36px]">
                <AnimatedCounter value={value} />
              </p>
              <p style={{ fontSize:'14px', fontWeight:400, color:'#111', marginBottom:'3px' }}>{label}</p>
              <p style={{ fontSize:'12px', fontWeight:300, color:'#9c8e87' }}>{sub}</p>
            </div>
          ))}
        </div>

        {/* ── MIDDLE ROW ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">

          {/* Progres general */}
          <div className="bg-white border border-[#f0e9e5] rounded-[24px] p-5 md:p-7 col-span-1">
            <p style={{ fontSize:'11px', fontWeight:400, color:'#9c8e87', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'4px' }}>Progres general</p>
            <p style={{ fontSize:'22px', fontWeight:300, color:'#111', marginBottom:'24px' }}>Citate & Versete</p>
            <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
              <DonutChart
                validat={stats?.citateValidate ?? 0}
                validare={stats?.citateInValidare ?? 0}
                traducere={stats?.citateInTraducere ?? 0}
                refuzat={stats?.citateRefuzate ?? 0}
                total={stats?.totalCitate ?? 0}
              />
              <div className="flex flex-col gap-3 flex-1 w-full">
                {[
                  { label:'Validate',    val: stats?.citateValidate ?? 0,   color:'#1a8c4e' },
                  { label:'În validare', val: stats?.citateInValidare ?? 0,  color:'#3b5bdb' },
                  { label:'În traducere',val: stats?.citateInTraducere ?? 0, color:'#d97706' },
                  { label:'Refuzate',    val: stats?.citateRefuzate ?? 0,    color:'#ce0100' },
                ].map(({ label, val, color }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span style={{ width:'7px', height:'7px', borderRadius:'50%', background:color, flexShrink:0 }} />
                    <span style={{ flex:1, fontSize:'13px', fontWeight:300, color:'#555' }}>{label}</span>
                    <div style={{ flex:2, height:'3px', background:'#f0eae7', borderRadius:'2px', overflow:'hidden' }}>
                      <div style={{ height:'100%', background:color, borderRadius:'2px', width:`${stats?.totalCitate ? (val/stats.totalCitate)*100 : 0}%`, transition:'width 0.8s ease' }} />
                    </div>
                    <span style={{ fontSize:'13px', fontWeight:600, color:'#111', width:'24px', textAlign:'right' }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Versete breakdown */}
          <div className="bg-white border border-[#f0e9e5] rounded-[24px] p-5 md:p-7">
            <div className="flex items-start justify-between mb-6 gap-2">
              <div>
                <p style={{ fontSize:'11px', fontWeight:400, color:'#9c8e87', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'4px' }}>Detaliu</p>
                <p style={{ fontSize:'22px', fontWeight:300, color:'#111' }}>Versete</p>
              </div>
              <button onClick={() => router.push('/versete')} style={{ fontSize:'12px', color:'#ce0100', fontWeight:400, background:'none', border:'none', cursor:'pointer', flexShrink:0 }}>
                Vezi toate →
              </button>
            </div>
            <div className="flex flex-col gap-4">
              {[
                { label:'În traducere', val: stats?.versetInTraducere ?? 0, color:'#d97706' },
                { label:'În validare',  val: stats?.versetInValidare ?? 0,  color:'#3b5bdb' },
                { label:'Validate',     val: stats?.versetValidate ?? 0,    color:'#1a8c4e' },
              ].map(({ label, val, color }) => (
                <div key={label} className="flex items-center gap-3">
                  <span style={{ width:'7px', height:'7px', borderRadius:'50%', background:color, flexShrink:0 }} />
                  <span style={{ flex:1, fontSize:'13px', fontWeight:300, color:'#555' }}>{label}</span>
                  <div style={{ flex:2, height:'3px', background:'#f0eae7', borderRadius:'2px', overflow:'hidden' }}>
                    <div style={{ height:'100%', background:color, borderRadius:'2px', width:`${stats?.totalVersete ? (val/stats.totalVersete)*100 : 0}%`, transition:'width 0.8s ease' }} />
                  </div>
                  <span style={{ fontSize:'13px', fontWeight:600, color:'#111', width:'24px', textAlign:'right' }}>{val}</span>
                </div>
              ))}
            </div>

            {/* Validări pending */}
            <div style={{ marginTop:'28px', paddingTop:'20px', borderTop:'1px solid #f4ece9' }}>
              <p style={{ fontSize:'11px', fontWeight:400, color:'#9c8e87', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'12px' }}>Validări în așteptare</p>
              <div className="flex items-center gap-4">
                <div>
                  <p style={{ fontSize:'28px', fontWeight:300, color:'#ce0100', lineHeight:1 }}>{(stats?.citateInValidare ?? 0) + (stats?.versetInValidare ?? 0)}</p>
                  <p style={{ fontSize:'12px', fontWeight:300, color:'#9c8e87', marginTop:'3px' }}>de revizuit</p>
                </div>
                <button onClick={() => router.push('/validari')}
                  style={{ marginLeft:'auto', height:'36px', padding:'0 18px', borderRadius:'12px', background:'#ce0100', color:'white', border:'none', fontSize:'13px', fontWeight:500, cursor:'pointer', boxShadow:'0 4px 12px rgba(206,1,0,0.2)' }}>
                  Validează →
                </button>
              </div>
            </div>
          </div>

          {/* Quick actions — only for coordinators */}
          {isCoordinator && <div style={{ background:'#ce0100', borderRadius:'24px', padding:'20px', display:'flex', flexDirection:'column', justifyContent:'space-between', boxShadow:'0 8px 28px rgba(206,1,0,0.2)' }} className="md:p-7">
            <div>
              <p style={{ fontSize:'11px', fontWeight:400, color:'rgba(255,255,255,0.55)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'6px' }}>Acțiuni rapide</p>
              <p style={{ fontSize:'22px', fontWeight:300, color:'white', lineHeight:1.2 }}>Ce faci azi?</p>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginTop:'24px' }}>
              {[
                { label:'+ Citat nou',    path:'/citate'      },
                { label:'+ Verset nou',   path:'/versete'     },
                { label:'Validări',       path:'/validari'    },
                { label:'Mail TLP',       path:'/mail-tlp'    },
                { label:'Productivitate', path:'/productivitate' },
              ].map(({ label, path }) => (
                <button key={label} onClick={() => router.push(path)}
                  style={{
                    height:'40px', borderRadius:'13px', padding:'0 16px', textAlign:'left',
                    background:'rgba(255,255,255,0.15)', color:'white',
                    border:'1px solid rgba(255,255,255,0.1)', fontSize:'14px', fontWeight:300,
                    cursor:'pointer', transition:'all 0.15s ease',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.25)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.15)' }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>}
        </div>

        {/* ── BOTTOM ROW ── */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_340px] gap-4">

          {/* Recent */}
          <div className="bg-white border border-[#f0e9e5] rounded-[24px] overflow-hidden">
            <div className="flex items-center justify-between px-5 md:px-7 py-5 border-b border-[#f4ece9]">
              <div>
                <p style={{ fontSize:'11px', fontWeight:400, color:'#9c8e87', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'3px' }}>Ultimele adăugate</p>
                <p style={{ fontSize:'18px', fontWeight:300, color:'#111' }}>Activitate recentă</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              {recent.length === 0 && !loading ? (
                <p style={{ textAlign:'center', padding:'32px', fontSize:'13px', color:'#bbb', fontWeight:300 }}>Nicio activitate recentă.</p>
              ) : recent.map((item, i) => {
                const ds = getDisplayStatus(item.validation, item.progress)
                const color = STATUS_COLOR[ds] ?? '#d97706'
                return (
                  <div key={item.id} onClick={() => router.push(`/${item.type === 'citat' ? 'citate' : 'versete'}/${item.id}`)}
                    className="flex items-center gap-4 px-5 md:px-7 py-4 cursor-pointer hover:bg-[#faf7f5] transition-colors min-w-[480px]"
                    style={{ borderBottom: i < recent.length-1 ? '1px solid #f8f3f0' : 'none' }}>
                    <div style={{
                      width:'32px', height:'32px', borderRadius:'10px', flexShrink:0,
                      background: item.type === 'citat' ? '#fff4f4' : '#f0f4ff',
                      display:'flex', alignItems:'center', justifyContent:'center',
                    }}>
                      {item.type === 'citat'
                        ? <ChatBubbleBottomCenterTextIcon style={{ width:'15px', height:'15px', color:'#ce0100' }} />
                        : <BookOpenIcon style={{ width:'15px', height:'15px', color:'#3b5bdb' }} />
                      }
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'2px' }}>
                        <span style={{ fontSize:'12px', fontWeight:600, color: item.type === 'citat' ? '#ce0100' : '#3b5bdb' }}>{item.public_id}</span>
                        <span style={{ fontSize:'10px', fontWeight:300, color:'#c0b0aa' }}>
                          {item.created_at ? new Date(item.created_at).toLocaleDateString('ro-RO',{day:'2-digit',month:'short'}) : ''}
                        </span>
                      </div>
                      <p style={{ fontSize:'12px', fontWeight:300, color:'#666', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        "{item.text}"
                      </p>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:'6px', flexShrink:0, width:'80px' }}>
                      <div style={{ flex:1, height:'2px', background:'#f0eae7', borderRadius:'2px', overflow:'hidden' }}>
                        <div style={{ height:'100%', background: item.progress === 7 ? '#1a8c4e' : '#ce0100', width:`${(item.progress/7)*100}%` }} />
                      </div>
                      <span style={{ fontSize:'10px', fontWeight:600, color:'#111' }}>{item.progress}/7</span>
                    </div>
                    <span style={{
                      display:'inline-flex', alignItems:'center', gap:'5px',
                      padding:'0 10px', height:'22px', borderRadius:'100px',
                      background:`${color}18`, color, fontSize:'10px', fontWeight:500, flexShrink:0,
                    }}>
                      <span style={{ width:'4px', height:'4px', borderRadius:'50%', background:color }} />
                      {ds}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Activity log */}
          <div className="bg-white border border-[#f0e9e5] rounded-[24px] overflow-hidden">
            <div className="px-5 md:px-6 py-5 border-b border-[#f4ece9]">
              <p style={{ fontSize:'11px', fontWeight:400, color:'#9c8e87', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'3px' }}>Istoric</p>
              <p style={{ fontSize:'18px', fontWeight:300, color:'#111' }}>Jurnal activitate</p>
            </div>
            <div style={{ maxHeight:'380px', overflowY:'auto' }}>
              {activity.length === 0 && !loading ? (
                <p style={{ textAlign:'center', padding:'32px', fontSize:'13px', color:'#bbb', fontWeight:300 }}>Nicio activitate.</p>
              ) : activity.map((log, i) => (
                <div key={log.id} style={{
                  display:'flex', gap:'12px', padding:'12px 20px',
                  borderBottom: i < activity.length-1 ? '1px solid #f8f3f0' : 'none',
                }}>
                  <div style={{
                    width:'28px', height:'28px', borderRadius:'50%', flexShrink:0,
                    background:'#fff4f4', border:'1px solid #f4d4d4',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'9px', fontWeight:700, color:'#ce0100', marginTop:'2px',
                  }}>
                    {(log.user as any)?.full_name?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase() || '?'}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:'12px', fontWeight:300, color:'#333', lineHeight:'18px' }}>
                      <strong style={{ fontWeight:600 }}>{(log.user as any)?.full_name || 'Utilizator'}</strong>
                      {' '}{ACTION_LABELS[log.action] || log.action}{' '}
                      <span style={{ color:'#ce0100' }}>{ENTITY_LABELS[log.entity_type] || log.entity_type}</span>
                      {log.entity_name && <span style={{ color:'#b0a39c' }}> · {log.entity_name}</span>}
                    </p>
                    <p style={{ fontSize:'10px', fontWeight:300, color:'#b0a39c', marginTop:'2px' }}>
                      {log.created_at ? new Date(log.created_at).toLocaleDateString('ro-RO',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : ''}
                    </p>
                  </div>
                </div>
              ))}
        {/* ── ANUNȚURI ── */}
        <div style={{ marginTop: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#fff1f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MegaphoneIcon style={{ width: '16px', height: '16px', color: '#ce0100' }} />
              </div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#111' }}>Anunțuri</h2>
              {anunturi.length > 0 && (
                <span style={{ background: '#ce0100', color: 'white', borderRadius: '100px', padding: '1px 8px', fontSize: '11px', fontWeight: 700 }}>
                  {anunturi.length}
                </span>
              )}
            </div>
            {canManageAnunturi && (
              <button onClick={() => setShowAnuntModal(true)}
                style={{
                  height: '36px', padding: '0 16px', borderRadius: '12px',
                  background: '#ce0100', color: 'white', border: 'none',
                  fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  boxShadow: '0 4px 12px rgba(206,1,0,0.22)',
                }}>
                <PlusIcon style={{ width: '14px', height: '14px' }} />
                Anunț nou
              </button>
            )}
          </div>

          {anunturi.length === 0 ? (
            <div style={{ background: 'white', border: '1px solid #f0e8e4', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
              <MegaphoneIcon style={{ width: '32px', height: '32px', color: '#ddd', margin: '0 auto 8px' }} />
              <p style={{ fontSize: '13px', color: '#aaa' }}>Niciun anunț momentan.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {anunturi.map(a => (
                <div key={a.id} style={{
                  background: 'white', border: '1px solid #f0e8e4', borderRadius: '16px',
                  overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}>
                  <div style={{ height: '3px', background: '#ce0100' }} />
                  <div style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '15px', fontWeight: 700, color: '#111', marginBottom: '6px' }}>{a.titlu}</p>
                        <p style={{ fontSize: '13px', color: '#555', lineHeight: '1.65', whiteSpace: 'pre-wrap' }}>{a.corp}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
                          {a.created_by_user?.full_name && (
                            <span style={{ fontSize: '11px', color: '#888', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <UserGroupIcon style={{ width: '12px', height: '12px' }} />
                              {a.created_by_user.full_name}
                            </span>
                          )}
                          <span style={{ fontSize: '11px', color: '#bbb' }}>
                            {new Date(a.created_at).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      {canManageAnunturi && (
                        <button
                          onClick={() => setConfirmDeleteAnuntId(a.id)}
                          style={{
                            width: '32px', height: '32px', borderRadius: '10px',
                            background: '#fff1f1', border: '1px solid #ffd3d3',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', flexShrink: 0,
                          }}>
                          <TrashIcon style={{ width: '14px', height: '14px', color: '#ce0100' }} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>

    {/* Modal creare anunț */}
    {showAnuntModal && (
      <AnuntModal
        onClose={() => setShowAnuntModal(false)}
        onSaved={() => { setShowAnuntModal(false); fetchAnunturi() }}
        userRole={userRole}
        userEmail={profile?.email ?? ''}
        userName={userName}
      />
    )}

    {/* Confirm delete */}
    {confirmDeleteAnuntId && (
      <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }} onClick={() => setConfirmDeleteAnuntId(null)} />
        <div style={{ position: 'relative', background: 'white', borderRadius: '20px', padding: '28px', maxWidth: '400px', width: '100%', boxShadow: '0 30px 80px rgba(0,0,0,0.15)' }}>
          <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#111', marginBottom: '10px' }}>Șterge anunțul</h3>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px', lineHeight: '1.6' }}>Sigur vrei să ștergi acest anunț? Acțiunea nu poate fi anulată.</p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setConfirmDeleteAnuntId(null)}
              style={{ flex: 1, height: '44px', borderRadius: '12px', border: '1px solid #e8e2de', background: 'white', fontSize: '14px', fontWeight: 600, color: '#666', cursor: 'pointer' }}>
              Anulează
            </button>
            <button onClick={async () => {
              await supabase.from('anunturi').delete().eq('id', confirmDeleteAnuntId)
              setConfirmDeleteAnuntId(null)
              fetchAnunturi()
            }}
              style={{ flex: 1, height: '44px', borderRadius: '12px', background: '#ce0100', border: 'none', fontSize: '14px', fontWeight: 600, color: 'white', cursor: 'pointer' }}>
              Șterge
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  )
}
// ── Modal creare anunț ────────────────────────────────────────────
function AnuntModal({ onClose, onSaved, userRole, userEmail, userName }: {
  onClose: () => void
  onSaved: () => void
  userRole: string
  userEmail: string
  userName: string
}) {
  const [titlu, setTitlu] = useState('')
  const [corp, setCorp] = useState('')
  const [sendEmail, setSendEmail] = useState(false)
  const [toAll, setToAll] = useState(true)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [users, setUsers] = useState<{ id: string; full_name: string; email: string; role: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { profile } = useUser()

  useEffect(() => {
    supabase.from('users').select('id, full_name, email, role').eq('active', true).order('full_name')
      .then(({ data }) => setUsers(data || []))
  }, [])

  const handleSave = async () => {
    if (!titlu.trim()) { setError('Titlul este obligatoriu.'); return }
    if (!corp.trim()) { setError('Corpul anunțului este obligatoriu.'); return }
    setSaving(true)

    // Insert anunt
    const { error: insertError } = await supabase.from('anunturi').insert({
      titlu: titlu.trim(),
      corp: corp.trim(),
      created_by: profile?.id ?? null,
    })

    if (insertError) { setError(insertError.message); setSaving(false); return }

    // Send email if checked
    if (sendEmail) {
      const recipients = toAll
        ? users.filter(u => u.email).map(u => u.email)
        : selectedUsers.map(id => users.find(u => u.id === id)?.email).filter(Boolean) as string[]

      for (const email of recipients) {
        const user = users.find(u => u.email === email)
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: email,
            toName: user?.full_name ?? email,
            type: 'custom',
            fromEmail: userEmail,
            fromName: userName,
            subject: `[Anunț TP Translator] ${titlu.trim()}`,
            htmlBody: `<!DOCTYPE html><html><body style="font-family:Helvetica,Arial,sans-serif;background:#f9f7f5;margin:0;padding:0">
<div style="max-width:600px;margin:0 auto;padding:24px 16px">
  <div style="background:#ce0100;border-radius:16px 16px 0 0;padding:28px 32px">
    <img src="https://res.cloudinary.com/dlgqpbpwu/image/upload/v1780344170/new_tpt_1_sxiu3b.png" alt="TP Translator" style="height:32px;width:auto;display:block;margin-bottom:20px" />
    <h1 style="margin:0;font-size:28px;font-weight:300;color:#fff;line-height:1.2">Anunț nou<br><span style="font-style:italic;color:rgba(255,255,255,0.85);font-family:'Times New Roman',serif">${titlu.trim()}</span></h1>
  </div>
  <div style="height:4px;background:#a80000"></div>
  <div style="background:white;padding:32px;border:1px solid #f0e9e5;border-top:none;border-radius:0 0 16px 16px">
    <p style="font-size:14px;line-height:1.75;color:#444;white-space:pre-wrap">${corp.trim()}</p>
    <p style="font-size:13px;color:#888;margin-top:24px">— ${userName}, TP Translator</p>
  </div>
</div>
</body></html>`,
          }),
        })
      }
    }

    setSaving(false)
    onSaved()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: 'white', borderRadius: '22px', width: '100%', maxWidth: '520px', boxShadow: '0 30px 80px rgba(0,0,0,0.15)', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: '4px', background: '#ce0100' }} />
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f0e8e4', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <p style={{ fontSize: '10px', fontWeight: 700, color: '#ce0100', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '4px' }}>Anunț nou</p>
            <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#111' }}>Creează un anunț</h2>
          </div>
          <button onClick={onClose} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #e8e2de', background: '#f9f7f5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <XMarkIcon style={{ width: '14px', height: '14px', color: '#666' }} />
          </button>
        </div>

        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Titlu */}
          <div>
            <label style={{ fontSize: '10px', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '7px' }}>Titlu *</label>
            <input value={titlu} onChange={e => setTitlu(e.target.value)}
              placeholder="Titlul anunțului..."
              style={{ width: '100%', border: '1px solid #e8e2de', borderRadius: '12px', padding: '11px 14px', fontSize: '14px', color: '#111', background: '#faf7f5', outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = '#ce0100'}
              onBlur={e => e.target.style.borderColor = '#e8e2de'} />
          </div>

          {/* Corp */}
          <div>
            <label style={{ fontSize: '10px', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '7px' }}>Mesaj *</label>
            <textarea value={corp} onChange={e => setCorp(e.target.value)} rows={5}
              placeholder="Scrie anunțul aici..."
              style={{ width: '100%', border: '1px solid #e8e2de', borderRadius: '12px', padding: '11px 14px', fontSize: '14px', color: '#111', background: '#faf7f5', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
              onFocus={e => e.target.style.borderColor = '#ce0100'}
              onBlur={e => e.target.style.borderColor = '#e8e2de'} />
          </div>

          {/* Email option */}
          <div style={{ background: '#faf7f5', border: '1px solid #f0e8e4', borderRadius: '14px', padding: '14px 16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#ce0100', cursor: 'pointer' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <EnvelopeIcon style={{ width: '14px', height: '14px', color: '#ce0100' }} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#111' }}>Trimite și prin email</span>
              </div>
            </label>

            {sendEmail && (
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f0e8e4' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '10px' }}>
                  <input type="checkbox" checked={toAll} onChange={e => setToAll(e.target.checked)}
                    style={{ width: '14px', height: '14px', accentColor: '#ce0100', cursor: 'pointer' }} />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#444' }}>Trimite la toți utilizatorii</span>
                </label>

                {!toAll && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                    {users.map(u => (
                      <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input type="checkbox"
                          checked={selectedUsers.includes(u.id)}
                          onChange={e => setSelectedUsers(prev => e.target.checked ? [...prev, u.id] : prev.filter(id => id !== u.id))}
                          style={{ width: '14px', height: '14px', accentColor: '#ce0100', cursor: 'pointer' }} />
                        <span style={{ fontSize: '12px', color: '#444' }}>{u.full_name}</span>
                        <span style={{ fontSize: '11px', color: '#aaa' }}>{u.role}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {error && <p style={{ fontSize: '12px', color: '#ce0100', fontWeight: 600 }}>{error}</p>}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #f0e8e4', display: 'flex', gap: '10px', flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, height: '44px', borderRadius: '12px', border: '1px solid #e8e2de', background: 'white', fontSize: '14px', fontWeight: 600, color: '#666', cursor: 'pointer' }}>
            Anulează
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 1, height: '44px', borderRadius: '12px', background: '#ce0100', border: 'none', fontSize: '14px', fontWeight: 600, color: 'white', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Se salvează...' : 'Publică anunțul'}
          </button>
        </div>
      </div>
    </div>
  )
}