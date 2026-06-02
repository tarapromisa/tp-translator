'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import AnimatedCounter from '@/components/AnimatedCounter'
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
    <main className="flex min-h-screen bg-[#fcfbfa]" style={{ fontFamily: 'var(--font-openSans)' }}>
      <Sidebar />
      <div className="flex-1 min-w-0 px-10 py-8 overflow-y-auto">

        {/* ── HERO ── */}
        <div className="relative mb-10">

          {/* Watermark */}
          <img src="/logo.png" alt="" className="absolute right-0 top-0 w-[200px] opacity-[0.04] pointer-events-none select-none" />

          {/* Greeting */}
          <p style={{ fontSize:'14px', fontWeight:300, color:'#9c8e87', marginBottom:'8px', letterSpacing:'0.02em' }}>{greeting}</p>

          {/* Name */}
          <h1 style={{ fontSize:'52px', fontWeight:300, color:'#111', lineHeight:1, letterSpacing:'-0.04em', marginBottom:'16px' }}>
            {userName || '...'}
          </h1>

          {/* Line */}
          <div style={{ width:'52px', height:'3px', background:'#ce0100', borderRadius:'2px', marginBottom:'20px' }} />

          {/* Phrase */}
          <div style={{ transition:'opacity 0.4s ease', opacity: phraseVisible ? 1 : 0 }}>
            <p style={{ fontSize:'32px', fontWeight:300, color:'#111', letterSpacing:'-0.03em', lineHeight:1.2 }}>
              {phrase.bold}<span style={{ color:'#ce0100', textDecoration:'underline', textDecorationThickness:'2px', textUnderlineOffset:'4px' }}>{phrase.italic}</span>
            </p>
            <p style={{ fontSize:'15px', fontWeight:300, color:'#9c8e87', marginTop:'8px' }}>{phrase.sub}</p>
          </div>

          {/* Role badge */}
          <div style={{
            position:'absolute', top:0, right:0,
            display:'flex', alignItems:'center', gap:'6px',
            background:'#ce0100', borderRadius:'100px',
            padding:'6px 16px',
          }}>
            <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:'rgba(255,255,255,0.5)', display:'inline-block' }} />
            <span style={{ fontSize:'13px', fontWeight:500, color:'white' }}>{userRole}</span>
          </div>
        </div>

        {/* ── STAT CARDS ── */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Citate',     sub: `${stats?.citateInTraducere ?? 0} în traducere`, value: stats?.totalCitate ?? 0,    Icon: ChatBubbleBottomCenterTextIcon, href: '/citate'     },
            { label: 'Versete',    sub: `${stats?.versetInTraducere ?? 0} în traducere`, value: stats?.totalVersete ?? 0,    Icon: BookOpenIcon,                   href: '/versete'    },
            { label: 'Traducători',sub: 'activi în sistem',                               value: stats?.totalUsers ?? 0,      Icon: UsersIcon,                      href: '/utilizatori'},
            { label: 'Citate RO',  sub: 'texte originale',                                value: stats?.totalCitateRO ?? 0,   Icon: DocumentTextIcon,               href: '/citate-ro'  },
          ].map(({ label, sub, value, Icon, href }) => (
            <div key={label} onClick={() => router.push(href)}
              className="group bg-white border border-[#f0e9e5] rounded-[24px] p-6 cursor-pointer hover:border-[#e0d8d2] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all duration-300">
              <div className="flex items-start justify-between mb-5">
                <div className="w-10 h-10 rounded-[14px] bg-[#fff4f4] flex items-center justify-center">
                  <Icon className="w-5 h-5 text-[#ce0100]" strokeWidth={1.5} />
                </div>
                <ArrowUpRightIcon className="w-4 h-4 text-[#ccc] group-hover:text-[#ce0100] transition-colors" />
              </div>
              <p style={{ fontSize:'36px', fontWeight:300, color:'#111', lineHeight:1, marginBottom:'6px' }}>
                <AnimatedCounter value={value} />
              </p>
              <p style={{ fontSize:'14px', fontWeight:400, color:'#111', marginBottom:'3px' }}>{label}</p>
              <p style={{ fontSize:'12px', fontWeight:300, color:'#9c8e87' }}>{sub}</p>
            </div>
          ))}
        </div>

        {/* ── MIDDLE ROW ── */}
        <div className="grid gap-4 mb-8" style={{ gridTemplateColumns: isCoordinator ? "1fr 1fr 320px" : "1fr 1fr" }}>

          {/* Progres general */}
          <div className="bg-white border border-[#f0e9e5] rounded-[24px] p-7 col-span-1">
            <p style={{ fontSize:'11px', fontWeight:400, color:'#9c8e87', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'4px' }}>Progres general</p>
            <p style={{ fontSize:'22px', fontWeight:300, color:'#111', marginBottom:'24px' }}>Citate & Versete</p>
            <div className="flex items-center gap-8">
              <DonutChart
                validat={stats?.citateValidate ?? 0}
                validare={stats?.citateInValidare ?? 0}
                traducere={stats?.citateInTraducere ?? 0}
                refuzat={stats?.citateRefuzate ?? 0}
                total={stats?.totalCitate ?? 0}
              />
              <div className="flex flex-col gap-3 flex-1">
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
          <div className="bg-white border border-[#f0e9e5] rounded-[24px] p-7">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p style={{ fontSize:'11px', fontWeight:400, color:'#9c8e87', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'4px' }}>Detaliu</p>
                <p style={{ fontSize:'22px', fontWeight:300, color:'#111' }}>Versete</p>
              </div>
              <button onClick={() => router.push('/versete')} style={{ fontSize:'12px', color:'#ce0100', fontWeight:400, background:'none', border:'none', cursor:'pointer' }}>
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
          {isCoordinator && <div style={{ background:'#ce0100', borderRadius:'24px', padding:'28px', display:'flex', flexDirection:'column', justifyContent:'space-between', boxShadow:'0 8px 28px rgba(206,1,0,0.2)' }}>
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
        <div className="grid grid-cols-[1fr_340px] gap-4">

          {/* Recent */}
          <div className="bg-white border border-[#f0e9e5] rounded-[24px] overflow-hidden">
            <div className="flex items-center justify-between px-7 py-5 border-b border-[#f4ece9]">
              <div>
                <p style={{ fontSize:'11px', fontWeight:400, color:'#9c8e87', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'3px' }}>Ultimele adăugate</p>
                <p style={{ fontSize:'18px', fontWeight:300, color:'#111' }}>Activitate recentă</p>
              </div>
            </div>
            <div>
              {recent.length === 0 && !loading ? (
                <p style={{ textAlign:'center', padding:'32px', fontSize:'13px', color:'#bbb', fontWeight:300 }}>Nicio activitate recentă.</p>
              ) : recent.map((item, i) => {
                const ds = getDisplayStatus(item.validation, item.progress)
                const color = STATUS_COLOR[ds] ?? '#d97706'
                return (
                  <div key={item.id} onClick={() => router.push(`/${item.type === 'citat' ? 'citate' : 'versete'}/${item.id}`)}
                    className="flex items-center gap-4 px-7 py-4 cursor-pointer hover:bg-[#faf7f5] transition-colors"
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
            <div className="px-6 py-5 border-b border-[#f4ece9]">
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
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}