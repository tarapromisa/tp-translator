/**
 * scripts/backfill-referinte-biblice.mjs
 *
 * Backfill robusto: parsea referinta_ro de fiecare verset existent folosind
 * EXACT aceeași logică din lib/bibleReference.ts, și marchează rândurile
 * corespunzătoare din referinte_biblice ca folosit=true.
 *
 * Rulare:
 *   node scripts/backfill-referinte-biblice.mjs
 *
 * Variabile de mediu necesare (din .env.local sau exportate în shell):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (necesar pentru a face update fără RLS — NU folosi anon key)
 *
 * Output: pentru fiecare verset, afișează dacă referința a fost parsată cu succes
 * și dacă a fost marcată. La final, afișează un sumar și o listă cu referințele
 * care NU au putut fi parsate (pentru a le corecta manual).
 */

import { createClient } from '@supabase/supabase-js'

// ── Config ──
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Lipsesc variabilele de mediu NEXT_PUBLIC_SUPABASE_URL și/sau SUPABASE_SERVICE_ROLE_KEY.')
  console.error('   Rulează cu: NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/backfill-referinte-biblice.mjs')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

// ── Parsing logic (copie din lib/bibleReference.ts) ──
const BIBLE_BOOKS = [
  'Geneza','Exodul','Leviticul','Numeri','Deuteronomul','Iosua','Judecători','Rut',
  '1 Samuel','2 Samuel','1 Împărați','2 Împărați','1 Cronici','2 Cronici','Ezra','Neemia',
  'Estera','Iov','Psalmi','Proverbe','Eclesiastul','Cântarea Cântărilor','Isaia','Ieremia',
  'Plângerile lui Ieremia','Ezechiel','Daniel','Osea','Ioel','Amos','Avdia','Iona','Mica',
  'Naum','Habacuc','Țefania','Hagai','Zaharia','Maleahi',
  'Matei','Marcu','Luca','Ioan','Faptele Apostolilor','Romani','1 Corinteni','2 Corinteni',
  'Galateni','Efeseni','Filipeni','Coloseni','1 Tesaloniceni','2 Tesaloniceni','1 Timotei',
  '2 Timotei','Tit','Filimon','Evrei','Iacov','1 Petru','2 Petru','1 Ioan','2 Ioan','3 Ioan',
  'Iuda','Apocalipsa',
]

const BOOK_ALIASES = {
  'proverbele': 'Proverbe',
  'judecatorii': 'Judecători',
  'judecătorii': 'Judecători',
  '1 imparatilor': '1 Împărați',
  '1 împărăților': '1 Împărați',
  '1 împăraţilor': '1 Împărați',
  '2 imparatilor': '2 Împărați',
  '2 împărăților': '2 Împărați',
  '2 împăraţilor': '2 Împărați',
  'plangerile lui ieremia': 'Plângerile lui Ieremia',
  'cantarea cantarilor': 'Cântarea Cântărilor',
  'tefania': 'Țefania',
  'ţefania': 'Țefania',
  'faptele apostolilor': 'Faptele Apostolilor',
  'fapte': 'Faptele Apostolilor',
  'apocalipsa lui ioan': 'Apocalipsa',
}

function normalizeBookName(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/ţ/g, 'ț')
    .replace(/ş/g, 'ș')
}

const NORMALIZED_BOOK_MAP = new Map(BIBLE_BOOKS.map(b => [normalizeBookName(b), b]))
const NORMALIZED_ALIAS_MAP = new Map(Object.entries(BOOK_ALIASES).map(([k, v]) => [normalizeBookName(k), v]))

function resolveBookName(carteRaw) {
  const n = normalizeBookName(carteRaw)
  return NORMALIZED_BOOK_MAP.get(n) ?? NORMALIZED_ALIAS_MAP.get(n) ?? null
}

function parseReference(raw) {
  if (!raw) return null
  const trimmed = raw.trim().replace(/\s+/g, ' ')
  // Acceptă liste/intervale opționale după primul versicul: "8:60,61" sau "7:6-7"
  const match = trimmed.match(/^(.+?)\s+(\d+):(\d+)(?:[,\-]\d+[a-zA-Z]?)*\s*([a-zA-Z]?)\s*$/)
  if (!match) return null
  const [, carteRaw, capitolStr, versiculStr, litera] = match
  const carteCanonica = resolveBookName(carteRaw)
  if (!carteCanonica) return null
  const capitol = parseInt(capitolStr, 10)
  const versicul = parseInt(versiculStr, 10)
  if (!Number.isFinite(capitol) || !Number.isFinite(versicul) || capitol < 1 || versicul < 1) return null
  return { carte: carteCanonica, capitol, versicul, litera: litera ? litera.toLowerCase() : null, referintaOriginala: trimmed }
}

// ── Main ──
async function main() {
  console.log('📖 Se încarcă versetele din Supabase...')
  const { data: versete, error: versetError } = await supabase
    .from('versete')
    .select('id, public_id, referinta_ro')

  if (versetError) {
    console.error('❌ Eroare la citirea versetelor:', versetError.message)
    process.exit(1)
  }

  console.log(`   ${versete.length} versete găsite.\n`)

  const parsedOk = []
  const parsedFail = []

  for (const v of versete) {
    if (!v.referinta_ro || !v.referinta_ro.trim()) {
      parsedFail.push({ ...v, reason: 'referinta_ro este goală' })
      continue
    }
    const parsed = parseReference(v.referinta_ro)
    if (!parsed) {
      parsedFail.push({ ...v, reason: 'format necunoscut sau carte nerecunoscută' })
      continue
    }
    parsedOk.push({ ...v, parsed })
  }

  console.log(`✅ Referințe parsate cu succes: ${parsedOk.length}`)
  console.log(`⚠️  Referințe care NU au putut fi parsate: ${parsedFail.length}\n`)

  if (parsedFail.length > 0) {
    console.log('── Referințe neparsabile (verifică manual) ──')
    for (const f of parsedFail) {
      console.log(`   ${f.public_id ?? f.id}: "${f.referinta_ro ?? '(gol)'}" — ${f.reason}`)
    }
    console.log('')
  }

  // ── Marcare în referinte_biblice ──
  let marked = 0
  let created = 0
  let alreadyManual = 0

  for (const v of parsedOk) {
    const { carte, capitol, versicul, referintaOriginala } = v.parsed

    // verifică dacă rândul există și nu e marcat manual de admin pentru alt verset
    const { data: existing, error: fetchErr } = await supabase
      .from('referinte_biblice')
      .select('id, marcat_manual, verset_id, folosit')
      .eq('carte', carte)
      .eq('capitol', capitol)
      .eq('versicul', versicul)
      .maybeSingle()

    if (fetchErr) {
      console.error(`   ❌ Eroare la căutarea referinței pentru ${v.public_id} (${carte} ${capitol}:${versicul}):`, fetchErr.message)
      continue
    }

    if (!existing) {
      // Rândul nu există (structura biblică generată inițial nu acoperă acest capitol/versicul
      // — posibil din cauza unor inexactități în date). Îl creăm pe loc.
      const ordineCarte = BIBLE_BOOKS.indexOf(carte) + 1
      const { error: insertErr } = await supabase
        .from('referinte_biblice')
        .insert({
          carte,
          ordine_carte: ordineCarte > 0 ? ordineCarte : 0,
          capitol,
          versicul,
          folosit: true,
          marcat_manual: false,
          verset_id: v.id,
          referinta_originala: referintaOriginala,
        })

      if (insertErr) {
        console.error(`   ❌ Eroare la crearea referinței ${carte} ${capitol}:${versicul} pentru ${v.public_id}:`, insertErr.message)
        continue
      }
      console.log(`   ➕ Creat rând nou pentru ${carte} ${capitol}:${versicul} (verset ${v.public_id})`)
      created++
      continue
    }

    if (existing.marcat_manual && existing.verset_id !== v.id) {
      // Lăsat intenționat așa cum a fost setat manual de admin
      alreadyManual++
      continue
    }

    const { error: updateErr } = await supabase
      .from('referinte_biblice')
      .update({
        folosit: true,
        verset_id: v.id,
        referinta_originala: referintaOriginala,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)

    if (updateErr) {
      console.error(`   ❌ Eroare la marcarea ${carte} ${capitol}:${versicul} pentru ${v.public_id}:`, updateErr.message)
      continue
    }

    marked++
  }

  console.log('\n── Sumar ──')
  console.log(`   Marcate cu succes: ${marked}`)
  console.log(`   Rânduri create automat (lipseau din structura inițială): ${created}`)
  console.log(`   Sărite (marcate manual pentru alt verset): ${alreadyManual}`)
  console.log(`   Referințe neparsabile: ${parsedFail.length}`)
  console.log('\nDone.')
}

main().catch(err => {
  console.error('❌ Eroare neașteptată:', err)
  process.exit(1)
})
