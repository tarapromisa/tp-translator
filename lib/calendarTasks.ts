/**
 * lib/calendarTasks.ts
 *
 * Funcții pentru gestionarea sarcinilor din calendar (tareas_calendar) și
 * verificarea dacă referința țintă a unei sarcini a fost deja introdusă
 * ca verset (tick/cross).
 *
 * Matching: o sarcină este "găsită" (✓) dacă există un verset al cărui
 * referinta_ro, parsat cu parseReference, are aceeași carte/capitol/versicul
 * ca referinta_ro a sarcinii (litera și intervalele/listele sunt ignorate,
 * la fel ca în restul sistemului de referințe).
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { parseReference } from './bibleReference'

export type TareaCalendar = {
  id: string
  data: string                 // 'YYYY-MM-DD'
  referinta_ro: string
  coordonator_id: string | null
  nota: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type TareaCalendarWithStatus = TareaCalendar & {
  gasit: boolean                 // true = ✓ (verset existent cu referința corespunzătoare)
  verset_public_id: string | null
  coordonator_nume: string | null
}

/**
 * Încarcă sarcinile dintr-un interval de date (inclusiv) și calculează
 * statusul ✓/✗ pentru fiecare, comparând cu versetele existente.
 *
 * @param from - data de start (YYYY-MM-DD)
 * @param to   - data de final (YYYY-MM-DD)
 */
export async function fetchTareasWithStatus(
  supabase: SupabaseClient,
  from: string,
  to: string
): Promise<TareaCalendarWithStatus[]> {
  const { data: tareas, error } = await supabase
    .from('tareas_calendar')
    .select('*')
    .gte('data', from)
    .lte('data', to)
    .order('data', { ascending: true })

  if (error) {
    console.error('fetchTareasWithStatus error:', error)
    return []
  }

  if (!tareas || tareas.length === 0) return []

  // Încarcă toate versetele o singură dată și construiește un index
  // carte|capitol|versicul -> public_id, pentru matching rapid.
  const { data: versete, error: versetError } = await supabase
    .from('versete')
    .select('public_id, referinta_ro')

  const versetIndex = new Map<string, string>()
  if (!versetError && versete) {
    for (const v of versete) {
      if (!v.referinta_ro) continue
      const parsed = parseReference(v.referinta_ro)
      if (!parsed) continue
      const key = `${parsed.carte}|${parsed.capitol}|${parsed.versicul}`
      // Nu suprascrie dacă deja există (primul găsit câștigă)
      if (!versetIndex.has(key)) versetIndex.set(key, v.public_id)
    }
  }

  // Încarcă numele coordonatorilor asignați
  const coordonatorIds = Array.from(new Set(tareas.filter(t => t.coordonator_id).map(t => t.coordonator_id as string)))
  const coordonatorMap = new Map<string, string>()
  if (coordonatorIds.length > 0) {
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, full_name')
      .in('id', coordonatorIds)
    if (!usersError && users) {
      for (const u of users) coordonatorMap.set(u.id, u.full_name)
    }
  }

  return tareas.map(t => {
    const parsed = parseReference(t.referinta_ro)
    let gasit = false
    let verset_public_id: string | null = null

    if (parsed) {
      const key = `${parsed.carte}|${parsed.capitol}|${parsed.versicul}`
      if (versetIndex.has(key)) {
        gasit = true
        verset_public_id = versetIndex.get(key) ?? null
      }
    }

    return {
      ...t,
      gasit,
      verset_public_id,
      coordonator_nume: t.coordonator_id ? coordonatorMap.get(t.coordonator_id) ?? null : null,
    }
  })
}

/**
 * Creează o sarcină nouă în calendar. Doar Admin (verificat prin RLS).
 */
export async function createTarea(
  supabase: SupabaseClient,
  input: { data: string; referinta_ro: string; coordonator_id?: string | null; nota?: string | null; created_by: string }
): Promise<{ success: boolean; error?: string; id?: string }> {
  const { data, error } = await supabase
    .from('tareas_calendar')
    .insert({
      data: input.data,
      referinta_ro: input.referinta_ro,
      coordonator_id: input.coordonator_id ?? null,
      nota: input.nota ?? null,
      created_by: input.created_by,
    })
    .select('id')
    .single()

  if (error) {
    console.error('createTarea error:', error)
    return { success: false, error: error.message }
  }
  return { success: true, id: data.id }
}

/**
 * Actualizează o sarcină existentă (reprogramare dată, schimbare referință,
 * reasignare coordonator, notă). Doar Admin.
 */
export async function updateTarea(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<{ data: string; referinta_ro: string; coordonator_id: string | null; nota: string | null }>
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('tareas_calendar')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('updateTarea error:', error)
    return { success: false, error: error.message }
  }
  return { success: true }
}

/**
 * Șterge o sarcină. Doar Admin.
 */
export async function deleteTarea(
  supabase: SupabaseClient,
  id: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('tareas_calendar')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('deleteTarea error:', error)
    return { success: false, error: error.message }
  }
  return { success: true }
}

/**
 * Reprogramează o sarcină la o nouă dată (shortcut pentru drag & drop în calendar).
 */
export async function rescheduleTarea(
  supabase: SupabaseClient,
  id: string,
  newDate: string
): Promise<{ success: boolean; error?: string }> {
  return updateTarea(supabase, id, { data: newDate })
}
