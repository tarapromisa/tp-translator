/**
 * lib/bibleReference.ts
 *
 * Utilitar pentru parsarea referințelor biblice românești (format Cornilescu).
 *
 * Format tipic: "Isaia 1:1a", "1 Samuel 17:45", "Cântarea Cântărilor 2:3b", "Geneza 1:1"
 *   - Numele cărții poate conține spații și poate începe cu un număr ("1 Samuel", "2 Împărați")
 *   - Format: "<Carte> <capitol>:<versicul><litera_opțională>"
 *   - Litera opțională (a, b, c...) marchează o subdiviziune a versetului și este ignorată
 *     pentru identificarea referinței (Isaia 1:1a și Isaia 1:1b corespund aceluiași rând din
 *     referinte_biblice, capitol 1, versicul 1).
 */

export type ParsedReference = {
  carte: string
  capitol: number
  versicul: number
  litera: string | null   // ex: "a", "b" — păstrat doar pentru afișare/audit
  referintaOriginala: string
}

/**
 * Listă canonică a celor 66 de cărți biblice (denumiri Cornilescu), în ordine.
 * Folosită pentru a valida/normaliza numele cărții extrase.
 */
export const BIBLE_BOOKS = [
  'Geneza','Exodul','Leviticul','Numeri','Deuteronomul','Iosua','Judecători','Rut',
  '1 Samuel','2 Samuel','1 Împărați','2 Împărați','1 Cronici','2 Cronici','Ezra','Neemia',
  'Estera','Iov','Psalmi','Proverbe','Eclesiastul','Cântarea Cântărilor','Isaia','Ieremia',
  'Plângerile lui Ieremia','Ezechiel','Daniel','Osea','Ioel','Amos','Avdia','Iona','Mica',
  'Naum','Habacuc','Țefania','Hagai','Zaharia','Maleahi',
  'Matei','Marcu','Luca','Ioan','Faptele Apostolilor','Romani','1 Corinteni','2 Corinteni',
  'Galateni','Efeseni','Filipeni','Coloseni','1 Tesaloniceni','2 Tesaloniceni','1 Timotei',
  '2 Timotei','Tit','Filimon','Evrei','Iacov','1 Petru','2 Petru','1 Ioan','2 Ioan','3 Ioan',
  'Iuda','Apocalipsa',
] as const

export type BibleBook = typeof BIBLE_BOOKS[number]

// Set normalizat pentru lookup rapid (lowercase, fără diacritice problematice comune)
const NORMALIZED_BOOK_MAP: Map<string, BibleBook> = new Map(
  BIBLE_BOOKS.map(b => [normalizeBookName(b), b])
)

/**
 * Alias-uri pentru nume de cărți care apar sub forme alternative în datele existente
 * (ex: forme cu articol hotărât / genitiv: "Proverbele", "1 Împărăţilor").
 * Mapate la formele canonice din BIBLE_BOOKS.
 */
const BOOK_ALIASES: Record<string, BibleBook> = {
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

const NORMALIZED_ALIAS_MAP: Map<string, BibleBook> = new Map(
  Object.entries(BOOK_ALIASES).map(([k, v]) => [normalizeBookName(k), v])
)

/**
 * Normalizează un nume de carte pentru comparație: lowercase, trim,
 * colapsează spații multiple, înlocuiește diacritice cu echivalente comune
 * (ț/ţ, ă/î/â/ș/ş pot varia în funcție de encoding-ul sursei).
 */
export function normalizeBookName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/ţ/g, 'ț')
    .replace(/ş/g, 'ș')
}

/**
 * Rezolvă un nume de carte (eventual sub formă alternativă) la forma canonică
 * din BIBLE_BOOKS, folosind harta directă și apoi harta de alias-uri.
 */
function resolveBookName(carteRaw: string): BibleBook | null {
  const normalized = normalizeBookName(carteRaw)
  return NORMALIZED_BOOK_MAP.get(normalized) ?? NORMALIZED_ALIAS_MAP.get(normalized) ?? null
}

/**
 * Parsează o referință biblică românească.
 *
 * @param raw - referința brută, ex: "Isaia 1:1a", "1 Samuel 17:45", " Geneza  1:1 "
 * @returns ParsedReference sau null dacă formatul nu poate fi parsat
 *
 * Exemple:
 *   parseReference("Isaia 1:1a")  -> { carte: "Isaia", capitol: 1, versicul: 1, litera: "a", ... }
 *   parseReference("1 Samuel 17:45") -> { carte: "1 Samuel", capitol: 17, versicul: 45, litera: null, ... }
 *   parseReference("Cântarea Cântărilor 2:3b") -> { carte: "Cântarea Cântărilor", capitol: 2, versicul: 3, litera: "b", ... }
 *   parseReference("Proverbele 4:14") -> { carte: "Proverbe", capitol: 4, versicul: 14, litera: null, ... }
 *   parseReference("1 Împăraţilor 8:60,61") -> { carte: "1 Împărați", capitol: 8, versicul: 60, ... } (primul versicul din listă)
 *   parseReference("Marcu 7:6-7") -> { carte: "Marcu", capitol: 7, versicul: 6, ... } (primul versicul din interval)
 *   parseReference("text invalid") -> null
 */
export function parseReference(raw: string): ParsedReference | null {
  if (!raw) return null
  const trimmed = raw.trim().replace(/\s+/g, ' ')

  // Regex: captează "<orice text>" + spațiu + "<capitol>:<versicul>" + opțional
  // o listă/interval de versete suplimentare (",61" sau "-7") + literă opțională,
  // la finalul stringului. Doar primul versicul este folosit pentru maparea în
  // referinte_biblice (care e per-versicul individual).
  const match = trimmed.match(/^(.+?)\s+(\d+):(\d+)(?:[,\-]\d+[a-zA-Z]?)*\s*([a-zA-Z]?)\s*$/)
  if (!match) return null

  const [, carteRaw, capitolStr, versiculStr, litera] = match
  const carteCanonica = resolveBookName(carteRaw)

  if (!carteCanonica) {
    // Carte necunoscută — posibil typo sau nume nestandard. Returnăm null pentru a semnala
    // apelantului că referința nu poate fi mapată cu siguranță.
    return null
  }

  const capitol = parseInt(capitolStr, 10)
  const versicul = parseInt(versiculStr, 10)

  if (!Number.isFinite(capitol) || !Number.isFinite(versicul) || capitol < 1 || versicul < 1) {
    return null
  }

  return {
    carte: carteCanonica,
    capitol,
    versicul,
    litera: litera ? litera.toLowerCase() : null,
    referintaOriginala: trimmed,
  }
}

/**
 * Construiește un string de referință afișabil din componente (fără literă).
 * ex: formatReference("Isaia", 1, 1) -> "Isaia 1:1"
 */
export function formatReference(carte: string, capitol: number, versicul: number): string {
  return `${carte} ${capitol}:${versicul}`
}

/**
 * Validează dacă o referință brută este parsabilă și cartea e una dintre cele 66 cărți canonice.
 * Util pentru validarea formularelor înainte de submit.
 */
export function isValidReference(raw: string): boolean {
  return parseReference(raw) !== null
}