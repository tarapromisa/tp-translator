'use client'

/**
 * components/ReferinteTab.tsx
 *
 * Tab "Referințe" în pagina /versete.
 * Afișează toate referințele biblice (carte > capitol > versicule) sub formă
 * de grid colorat: roșu = folosit, gri = disponibil.
 *
 * Acces: Admin, Coordonator, Coordonator principal (vezi roles check în page.tsx).
 * Toggle manual (folosit/nefolosit): doar Admin.
 *
 * Integrare: importă acest componenet în app/versete/page.tsx și randează-l
 * condiționat pe tab-ul "Referințe":
 *
 *   {mobileTab === 'referinte' && <ReferinteTab isAdmin={isAdmin} />}
 *   // sau ca tab desktop separat, vezi nota de la finalul fișierului.
 */

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { setManualUsage } from '@/lib/referinteBiblice'
import { BIBLE_BOOKS } from '@/lib/bibleReference'
import { MagnifyingGlassIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'

type ReferintaRow = {
  id: string
  carte: string
  ordine_carte: number
  capitol: number
  versicul: number
  folosit: boolean
  marcat_manual: boolean
  verset_id: string | null
  referinta_originala: string | null
  versete?: { public_id: string } | null
}

type Props = {
  isAdmin: boolean
}

export default function ReferinteTab({ isAdmin }: Props) {
  const [rows, setRows] = useState<ReferintaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedBook, setSelectedBook] = useState<string>(BIBLE_BOOKS[0])
  const [savingId, setSavingId] = useState<string | null>(null)

  const fetchData = async (book: string) => {
    setLoading(true)
    const { data, error } = await supabase
      .from('referinte_biblice')
      .select('id, carte, ordine_carte, capitol, versicul, folosit, marcat_manual, verset_id, referinta_originala')
      .eq('carte', book)
      .order('capitol', { ascending: true })
      .order('versicul', { ascending: true })
      .range(0, 1999)

    if (error) {
      console.error('referinte_biblice fetch error:', error)
      setLoading(false)
      return
    }

    let rowsData: ReferintaRow[] = (data as any) || []

    // Fetch public_id for rows that are linked to a verset (separate query,
    // avoids relying on a PostgREST relationship/foreign key being recognized)
    const versetIds = Array.from(new Set(rowsData.filter(r => r.verset_id).map(r => r.verset_id as string)))
    if (versetIds.length > 0) {
      const { data: versete, error: versetError } = await supabase
        .from('versete')
        .select('id, public_id')
        .in('id', versetIds)

      if (!versetError && versete) {
        const publicIdMap = new Map(versete.map((v: any) => [v.id, v.public_id]))
        rowsData = rowsData.map(r => ({
          ...r,
          versete: r.verset_id && publicIdMap.has(r.verset_id)
            ? { public_id: publicIdMap.get(r.verset_id) }
            : null,
        }))
      }
    }

    setRows(rowsData)
    setLoading(false)
  }

  useEffect(() => { fetchData(selectedBook) }, [selectedBook])

  // Filtrare după căutare (capitol:versicul sau referință completă)
  const filteredRows = useMemo(() => {
    let r = rows
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      r = r.filter(row =>
        `${row.capitol}:${row.versicul}`.includes(q) ||
        `${row.carte} ${row.capitol}:${row.versicul}`.toLowerCase().includes(q) ||
        row.versete?.public_id?.toLowerCase().includes(q)
      )
    }
    return r
  }, [rows, search])

  // Grupare pe capitole pentru afișare în grid
  const chaptersMap = useMemo(() => {
    const map = new Map<number, ReferintaRow[]>()
    for (const row of filteredRows) {
      if (!map.has(row.capitol)) map.set(row.capitol, [])
      map.get(row.capitol)!.push(row)
    }
    return map
  }, [filteredRows])

  const bookStats = useMemo(() => {
    const total = rows.length
    const folosite = rows.filter(r => r.folosit).length
    return { total, folosite, disponibile: total - folosite }
  }, [rows])

  const handleToggle = async (row: ReferintaRow) => {
    if (!isAdmin) return
    setSavingId(row.id)
    const result = await setManualUsage(supabase, row.id, !row.folosit)
    setSavingId(null)
    if (!result.success) {
      alert(result.error || 'Eroare la actualizare.')
      return
    }
    // Update optimist local
    setRows(prev => prev.map(r => r.id === row.id
      ? { ...r, folosit: !r.folosit, marcat_manual: true, verset_id: !r.folosit ? r.verset_id : null, versete: !r.folosit ? r.versete : null }
      : r
    ))
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Book selector + search */}
      <div className="bg-white border border-[#e8e2de] rounded-2xl px-4 md:px-5 py-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 min-w-0 flex items-center gap-3 bg-[#f9f7f5] border border-[#e8e2de] rounded-xl px-4 h-10">
            <MagnifyingGlassIcon className="w-4 h-4 text-[#999] flex-shrink-0" />
            <input type="text" placeholder="Caută capitol:versicul (ex: 3:16)..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="flex-1 min-w-0 bg-transparent outline-none text-sm text-[#111] placeholder:text-[#bbb]" />
            {search && <button onClick={() => setSearch('')} className="text-xs text-[#999] hover:text-[#ce0100] flex-shrink-0">✕</button>}
          </div>
        </div>

        {/* Book pills — scrollable */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {BIBLE_BOOKS.map(book => (
            <button key={book} onClick={() => setSelectedBook(book)}
              className={`h-8 px-3 rounded-xl text-[12px] font-semibold transition-all flex-shrink-0 whitespace-nowrap ${
                selectedBook === book ? 'bg-[#ce0100] text-white' : 'bg-[#f9f7f5] border border-[#e8e2de] text-[#666] hover:bg-[#fff7f7]'
              }`}>
              {book}
            </button>
          ))}
        </div>
      </div>

      {/* Stats for selected book */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-[#e8e2de] rounded-2xl px-4 py-3 shadow-sm">
          <p className="text-xs text-[#666]">Total versete</p>
          <p className="text-2xl font-light text-[#111] leading-none mt-1">{bookStats.total}</p>
        </div>
        <div className="bg-white border border-[#e8e2de] rounded-2xl px-4 py-3 shadow-sm">
          <p className="text-xs text-[#666]">Folosite</p>
          <p className="text-2xl font-light text-[#ce0100] leading-none mt-1">{bookStats.folosite}</p>
        </div>
        <div className="bg-white border border-[#e8e2de] rounded-2xl px-4 py-3 shadow-sm">
          <p className="text-xs text-[#666]">Disponibile</p>
          <p className="text-2xl font-light text-[#166534] leading-none mt-1">{bookStats.disponibile}</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-1">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-[4px] bg-[#ce0100] flex-shrink-0" />
          <span className="text-[11px] text-[#666]">Folosit</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-[4px] bg-[#f0e8e4] border border-[#e0d8d4] flex-shrink-0" />
          <span className="text-[11px] text-[#666]">Disponibil</span>
        </div>
        {isAdmin && (
          <p className="text-[11px] text-[#aaa] ml-auto">Apasă pe un versicul pentru a-l marca manual</p>
        )}
      </div>

      {/* Chapter grids */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-[#888]">Se încarcă...</p>
        </div>
      ) : chaptersMap.size === 0 ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-[#888]">Nicio referință găsită.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {Array.from(chaptersMap.entries()).map(([capitol, verses]) => (
            <div key={capitol} className="bg-white border border-[#e8e2de] rounded-2xl p-4 md:p-5 shadow-sm">
              <p className="text-[11px] font-semibold text-[#888] uppercase tracking-wide mb-3">
                {selectedBook} — Capitolul {capitol}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {verses.map(row => {
                  const isSaving = savingId === row.id
                  const cell = (
                    <div
                      key={row.id}
                      onClick={() => isAdmin && handleToggle(row)}
                      title={
                        row.folosit
                          ? `${row.carte} ${row.capitol}:${row.versicul} — folosit${row.versete?.public_id ? ` (${row.versete.public_id})` : ''}${row.marcat_manual ? ' · marcat manual' : ''}`
                          : `${row.carte} ${row.capitol}:${row.versicul} — disponibil`
                      }
                      className={`relative w-10 h-10 rounded-[10px] flex items-center justify-center text-[11px] font-semibold transition-all ${
                        row.folosit
                          ? 'bg-[#ce0100] text-white'
                          : 'bg-[#f0e8e4] text-[#999]'
                      } ${isAdmin ? 'cursor-pointer hover:opacity-80' : ''} ${isSaving ? 'opacity-50' : ''}`}
                    >
                      {row.versicul}
                      {row.marcat_manual && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-white border border-[#e8e2de] flex items-center justify-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#1e40af]" />
                        </span>
                      )}
                    </div>
                  )
                  return cell
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}