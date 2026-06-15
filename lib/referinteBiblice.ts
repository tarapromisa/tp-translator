/**
 * lib/referinteBiblice.ts
 *
 * Funcții pentru verificarea și marcarea referințelor biblice din tabela
 * `referinte_biblice`, folosite la crearea/editarea unui verset.
 *
 * Flux tipic în UI (CreateVersetModal / EditVersetModal):
 *
 *   1. Utilizatorul introduce referinta_ro (ex: "Isaia 1:1a") și apasă "Salvează".
 *   2. Înainte de a salva, apelăm `checkReferenceAvailability(referintaRo, versetIdCurent)`.
 *      - Dacă rezultatul `status === 'used_by_other'`, afișăm un mesaj de avertizare
 *        ("Această referință a fost deja folosită — alege alta.") și blocăm salvarea
 *        (sau o lăsăm la latitudinea coordonatorului, vezi UI).
 *      - Dacă `status === 'invalid'`, referința nu a putut fi parsată (carte necunoscută
 *        sau format greșit) — afișăm un mesaj diferit.
 *      - Dacă `status === 'available'` sau `status === 'used_by_self'`, putem salva.
 *   3. După salvarea cu succes a versetului, apelăm `markReferenceAsUsed(...)` pentru
 *      a marca rândul corespunzător din referinte_biblice ca folosit=true și a-l lega
 *      la verset_id.
 *   4. Dacă referinta_ro a unui verset existent se schimbă, apelăm și
 *      `unmarkPreviousReference(...)` pentru vechea referință, ca să nu rămână blocată.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { parseReference, ParsedReference, BIBLE_BOOKS } from './bibleReference'

export type ReferenceAvailability =
  | { status: 'available'; parsed: ParsedReference }
  | { status: 'used_by_self'; parsed: ParsedReference }
  | { status: 'used_by_other'; parsed: ParsedReference; folositDe: { verset_id: string | null; public_id?: string | null } }
  | { status: 'invalid'; parsed: null }

/**
 * Verifică dacă o referință biblică (ex: "Isaia 1:1a") este disponibilă pentru
 * un verset nou sau pentru editarea unui verset existent.
 *
 * @param referintaRo - referința introdusă de utilizator
 * @param versetIdCurent - id-ul versetului curent (la editare), pentru a permite
 *                          ca un verset să-și păstreze propria referință fără a se
 *                          auto-bloca. La creare, se trimite `null`.
 */
export async function checkReferenceAvailability(
  supabase: SupabaseClient,
  referintaRo: string,
  versetIdCurent: string | null = null
): Promise<ReferenceAvailability> {
  const parsed = parseReference(referintaRo)
  if (!parsed) {
    return { status: 'invalid', parsed: null }
  }

  const { data, error } = await supabase
    .from('referinte_biblice')
    .select('folosit, verset_id')
    .eq('carte', parsed.carte)
    .eq('capitol', parsed.capitol)
    .eq('versicul', parsed.versicul)
    .maybeSingle()

  if (error) {
    console.error('checkReferenceAvailability error:', error)
    // În caz de eroare de rețea/DB, nu blocăm utilizatorul — tratăm ca disponibilă
    // dar logăm eroarea. Alternativ, se poate trata ca 'invalid' pentru a forța retry.
    return { status: 'available', parsed }
  }

  if (!data || !data.folosit) {
    return { status: 'available', parsed }
  }

  // E folosită — verificăm daca de către versetul curent (editare) sau de altul
  if (versetIdCurent && data.verset_id === versetIdCurent) {
    return { status: 'used_by_self', parsed }
  }

  // Obținem public_id separat (query simplă, fără join)
  let publicId: string | null = null
  if (data.verset_id) {
    const { data: versetData } = await supabase
      .from('versete')
      .select('public_id')
      .eq('id', data.verset_id)
      .maybeSingle()
    publicId = versetData?.public_id ?? null
  }

  return {
    status: 'used_by_other',
    parsed,
    folositDe: {
      verset_id: data.verset_id,
      public_id: publicId,
    },
  }
}

/**
 * Marchează o referință biblică ca folosită, legând-o la un verset.
 * Apelată după salvarea cu succes a unui verset nou sau editat.
 *
 * Setează `marcat_manual = false` întotdeauna — marcarea automată nu trebuie
 * să suprascrie un toggle manual de admin în sens invers (acela se face separat,
 * vezi `setManualUsage`).
 */
export async function markReferenceAsUsed(
  supabase: SupabaseClient,
  referintaRo: string,
  versetId: string
): Promise<{ success: boolean; error?: string }> {
  const parsed = parseReference(referintaRo)
  if (!parsed) {
    // Referința nu a putut fi parsată — nu marcăm nimic, dar nu e o eroare blocantă
    return { success: true }
  }

  // Verificăm dacă rândul există deja
  const { data: existing, error: fetchErr } = await supabase
    .from('referinte_biblice')
    .select('id, marcat_manual, verset_id')
    .eq('carte', parsed.carte)
    .eq('capitol', parsed.capitol)
    .eq('versicul', parsed.versicul)
    .maybeSingle()

  if (fetchErr) {
    console.error('markReferenceAsUsed fetch error:', fetchErr)
    return { success: false, error: fetchErr.message }
  }

  if (!existing) {
    // Rândul nu există în referinte_biblice (posibil din cauza unor inexactități
    // în structura biblică generată inițial) — îl creăm pe loc, marcat ca folosit.
    // ordine_carte se calculează din BIBLE_BOOKS pentru a păstra sortarea corectă.
    const ordineCarte = BIBLE_BOOKS.indexOf(parsed.carte as any) + 1
    const { error: insertErr } = await supabase
      .from('referinte_biblice')
      .insert({
        carte: parsed.carte,
        ordine_carte: ordineCarte > 0 ? ordineCarte : 0,
        capitol: parsed.capitol,
        versicul: parsed.versicul,
        folosit: true,
        marcat_manual: false,
        verset_id: versetId,
        referinta_originala: parsed.referintaOriginala,
      })

    if (insertErr) {
      console.error('markReferenceAsUsed insert error:', insertErr)
      return { success: false, error: insertErr.message }
    }
    return { success: true }
  }

  // Nu suprascriem un rând marcat manual de admin care indică o altă stare,
  // decât dacă acel rând e deja legat de acest verset (re-salvare).
  if (existing.marcat_manual && existing.verset_id !== versetId) {
    return { success: true }
  }

  const { error } = await supabase
    .from('referinte_biblice')
    .update({
      folosit: true,
      verset_id: versetId,
      referinta_originala: parsed.referintaOriginala,
      updated_at: new Date().toISOString(),
    })
    .eq('id', existing.id)

  if (error) {
    console.error('markReferenceAsUsed error:', error)
    return { success: false, error: error.message }
  }
  return { success: true }
}

/**
 * Eliberează o referință biblică anterioară (folosit=false, verset_id=null),
 * folosit atunci când un verset existent își schimbă referinta_ro la editare
 * sau este șters.
 *
 * Nu modifică rândurile marcate manual de admin (marcat_manual=true) — acelea
 * rămân așa cum au fost setate manual, indiferent de schimbările din versete.
 */
export async function unmarkPreviousReference(
  supabase: SupabaseClient,
  referintaRoVeche: string,
  versetId: string
): Promise<{ success: boolean; error?: string }> {
  const parsed = parseReference(referintaRoVeche)
  if (!parsed) return { success: true }

  const { error } = await supabase
    .from('referinte_biblice')
    .update({
      folosit: false,
      verset_id: null,
      referinta_originala: null,
      updated_at: new Date().toISOString(),
    })
    .eq('carte', parsed.carte)
    .eq('capitol', parsed.capitol)
    .eq('versicul', parsed.versicul)
    .eq('verset_id', versetId)
    .eq('marcat_manual', false)

  if (error) {
    console.error('unmarkPreviousReference error:', error)
    return { success: false, error: error.message }
  }
  return { success: true }
}

/**
 * Helper combinat: actualizează referința biblică atunci când referinta_ro
 * a unui verset se schimbă la editare. Eliberează referința veche (dacă diferă)
 * și marchează noua referință ca folosită.
 *
 * Apelat după salvarea cu succes a editării unui verset existent.
 */
export async function updateReferenceOnEdit(
  supabase: SupabaseClient,
  versetId: string,
  referintaRoVeche: string | null,
  referintaRoNoua: string
): Promise<{ success: boolean; error?: string }> {
  // Dacă referința nu s-a schimbat, doar (re)marchează ca folosită (idempotent)
  if (referintaRoVeche === referintaRoNoua) {
    return markReferenceAsUsed(supabase, referintaRoNoua, versetId)
  }

  if (referintaRoVeche) {
    const unmarkResult = await unmarkPreviousReference(supabase, referintaRoVeche, versetId)
    if (!unmarkResult.success) return unmarkResult
  }

  return markReferenceAsUsed(supabase, referintaRoNoua, versetId)
}

/**
 * Setare manuală a stării "folosit" pentru o referință — disponibilă DOAR pentru Admin.
 * Verificarea rolului trebuie făcută în UI/server înainte de a apela această funcție
 * (sau printr-o policy RLS care permite update doar rolului Admin).
 *
 * Setează marcat_manual=true, astfel încât auto-marcarea ulterioară (la crearea altor
 * versete) să nu suprascrie această decizie — cu excepția cazului în care un verset
 * chiar corespunde acelei referințe (verset_id se păstrează în acel caz).
 */
export async function setManualUsage(
  supabase: SupabaseClient,
  referintaId: string,
  folosit: boolean
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('referinte_biblice')
    .update({
      folosit,
      marcat_manual: true,
      updated_at: new Date().toISOString(),
      // Dacă admin marchează manual ca neutilizat, eliberăm și legătura cu versetul
      ...(folosit ? {} : { verset_id: null, referinta_originala: null }),
    })
    .eq('id', referintaId)

  if (error) {
    console.error('setManualUsage error:', error)
    return { success: false, error: error.message }
  }
  return { success: true }
}