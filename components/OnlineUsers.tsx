'use client'

// ── Usuarios conectados (estilo Google Drive) ─────────────────────
// Usa Supabase Realtime Presence: no necesita tablas ni migraciones.
// Cada pestaña abierta anuncia quién es y en qué página está; todos ven a los demás.

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/context/UserContext'

type Presence = {
  user_id: string
  full_name: string
  role: string
  avatar_url: string | null
  path: string
  online_at: string   // cuándo se conectó
  page_at: string     // cuándo entró en la página actual
}

const PAGE_LABELS: [RegExp, string][] = [
  [/^\/$/,                     'Dashboard'],
  [/^\/citate\/[^/]+/,         'Citate · detaliu citat'],
  [/^\/citate$/,               'Citate'],
  [/^\/versete\/[^/]+/,        'Versete · detaliu verset'],
  [/^\/versete$/,              'Versete'],
  [/^\/citate-ro/,             'Citate RO'],
  [/^\/calendar/,              'Calendar'],
  [/^\/cantari/,               'Cântări'],
  [/^\/utilizatori/,           'Utilizatori'],
  [/^\/validari/,              'Validări'],
  [/^\/mail-tlp/,              'Mail TLP / TLG'],
  [/^\/productivitate/,        'Productivitate'],
  [/^\/setari/,                'Setări'],
  [/^\/formulare/,             'Formulare'],
]
const pageLabel = (path: string) => PAGE_LABELS.find(([re]) => re.test(path))?.[1] ?? path

const COLORS = ['#ce0100', '#1e40af', '#166534', '#c05c00', '#7c3aed', '#be185d', '#0f766e', '#a16207']
const colorFor = (id: string) => COLORS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length]
const initials = (name: string) => name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()

function since(iso: string) {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (min < 1) return 'chiar acum'
  if (min < 60) return `de ${min} min`
  const h = Math.floor(min / 60)
  return `de ${h} h ${min % 60} min`
}

function Avatar({ p, size }: { p: Presence; size: number }) {
  return (
    <div className="rounded-full overflow-hidden flex items-center justify-center text-white font-bold flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38, background: p.avatar_url ? '#eee' : colorFor(p.user_id) }}>
      {p.avatar_url
        ? <img src={p.avatar_url} alt={p.full_name} className="w-full h-full object-cover" />
        : initials(p.full_name || '?')}
    </div>
  )
}

export default function OnlineUsers() {
  const { profile } = useUser() as any
  const pathname = usePathname()
  const router = useRouter()
  const [others, setOthers] = useState<Presence[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [, setTick] = useState(0)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const onlineAtRef = useRef(new Date().toISOString())
  const boxRef = useRef<HTMLDivElement>(null)

  const myId: string | undefined = profile?.id

  const myPresence = (): Presence => ({
    user_id: myId!,
    full_name: profile?.full_name ?? '—',
    role: profile?.role ?? '',
    avatar_url: profile?.avatar_url ?? null,
    path: pathname ?? '/',
    online_at: onlineAtRef.current,
    page_at: new Date().toISOString(),
  })

  // Conexión al canal (una vez por usuario)
  useEffect(() => {
    if (!myId) return
    const channel = supabase.channel('tp-online-users', { config: { presence: { key: myId } } })
    channelRef.current = channel

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState() as Record<string, Presence[]>
      const list = Object.entries(state)
        .filter(([key]) => key !== myId)
        .map(([, metas]) =>
          // si alguien tiene varias pestañas, mostramos la última página que abrió
          [...metas].sort((a, b) => (b.page_at ?? '').localeCompare(a.page_at ?? ''))[0])
        .filter(Boolean)
        .sort((a, b) => a.online_at.localeCompare(b.online_at))
      setOthers(list)
    })

    channel.subscribe(async status => {
      if (status === 'SUBSCRIBED') await channel.track(myPresence())
    })

    return () => { channel.untrack(); supabase.removeChannel(channel); channelRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId])

  // Al cambiar de página, actualizamos dónde estamos
  useEffect(() => {
    if (myId && channelRef.current) channelRef.current.track(myPresence())
    setOpenId(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, profile?.full_name, profile?.role, profile?.avatar_url])

  // Refresca los "de X min" cada minuto
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 60000)
    return () => clearInterval(t)
  }, [])

  // Cerrar la tarjeta al pulsar fuera
  useEffect(() => {
    if (!openId) return
    const onDown = (e: MouseEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpenId(null) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [openId])

  if (!myId || others.length === 0) return null

  const MAX = 5
  const shown = others.slice(0, MAX)
  const extra = others.length - shown.length
  const open = others.find(o => o.user_id === openId) ?? null

  return (
    <div ref={boxRef}
      className="fixed z-[45] right-3 md:right-6 top-[calc(4rem+env(safe-area-inset-top))] md:top-0">
      {/* Pestaña con avatares, "colgando" del borde superior */}
      <div className="flex items-center gap-2 pl-2.5 pr-1.5 h-[34px] rounded-b-2xl bg-white/95 backdrop-blur border border-t-0 border-[#ece6e2] shadow-[0_6px_18px_rgba(0,0,0,0.08)]">
        <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-semibold text-[#9c8e87] uppercase tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1a8c4e] animate-pulse" />
          Online
        </span>
        <div className="flex items-center">
          {shown.map((p, i) => (
            <button key={p.user_id} onClick={() => setOpenId(id => (id === p.user_id ? null : p.user_id))}
              title={`${p.full_name} · ${pageLabel(p.path)}`}
              className={`relative rounded-full ring-2 transition-transform hover:-translate-y-0.5 hover:z-10 ${openId === p.user_id ? 'ring-[#ce0100] z-10' : 'ring-white'}`}
              style={{ marginLeft: i === 0 ? 0 : -7 }}>
              <Avatar p={p} size={26} />
              <span className="absolute -right-0.5 -bottom-0.5 w-2.5 h-2.5 rounded-full bg-[#1a8c4e] border-2 border-white" />
            </button>
          ))}
          {extra > 0 && (
            <button onClick={() => setOpenId(others[MAX].user_id)}
              className="w-[26px] h-[26px] rounded-full bg-[#f0e9e5] text-[#6b5e57] text-[10px] font-bold flex items-center justify-center ring-2 ring-white"
              style={{ marginLeft: -7 }} title={others.slice(MAX).map(o => o.full_name).join(', ')}>
              +{extra}
            </button>
          )}
        </div>
      </div>

      {/* Tarjeta con los datos del usuario pulsado */}
      {open && (
        <div className="absolute right-0 mt-2 w-[270px] bg-white rounded-2xl border border-[#ece6e2] shadow-[0_20px_50px_rgba(0,0,0,0.16)] overflow-hidden">
          <div className="h-1 bg-[#ce0100]" />
          <div className="p-4">
            <div className="flex items-center gap-3">
              <Avatar p={open} size={44} />
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-[#111] truncate">{open.full_name}</p>
                <p className="text-[12px] text-[#ce0100] font-medium truncate">{open.role || '—'}</p>
              </div>
            </div>
            <div className="mt-3 rounded-xl bg-[#faf7f5] border border-[#f0e9e5] px-3 py-2.5">
              <p className="text-[10px] font-semibold text-[#9c8e87] uppercase tracking-wide mb-0.5">Se află pe</p>
              <p className="text-[13px] font-semibold text-[#111]">{pageLabel(open.path)}</p>
              <p className="text-[11px] text-[#9c8e87] mt-0.5">pe această pagină {since(open.page_at)} · online {since(open.online_at)}</p>
            </div>
            {open.path !== pathname && (
              <button onClick={() => { setOpenId(null); router.push(open.path) }}
                className="mt-3 w-full h-9 rounded-xl bg-[#ce0100] text-white text-[12px] font-semibold hover:bg-[#a80000] transition-all">
                Mergi pe aceeași pagină
              </button>
            )}
            {others.length > 1 && (
              <div className="mt-3 pt-3 border-t border-[#f4ece9] flex flex-wrap gap-1.5">
                {others.filter(o => o.user_id !== open.user_id).map(o => (
                  <button key={o.user_id} onClick={() => setOpenId(o.user_id)} title={o.full_name}
                    className="flex items-center gap-1.5 pl-0.5 pr-2 h-6 rounded-full bg-[#faf7f5] border border-[#f0e9e5] hover:border-[#ffd3d3] transition-all">
                    <Avatar p={o} size={20} />
                    <span className="text-[10px] text-[#555] max-w-[90px] truncate">{o.full_name.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
