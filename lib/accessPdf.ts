// ── Fișă de acces (PDF) para un usuario nuevo ─────────────────────
// Genera en el navegador un PDF con los datos de acceso y los pasos para entrar.
// Necesita: `npm install jspdf` y las fuentes en /public/fonts (Open Sans, con ș ț ă î â).

export type AccessPdfData = {
  fullName: string
  email: string
  role: string
  language?: string | null
  password?: string | null      // contraseña temporal (si se creó la cuenta de acceso)
  createdBy?: string | null     // quién genera la ficha
}

const APP_URL = 'app.tptranslator.com'
const SUPPORT_EMAIL = 'echipa@tptranslator.com'

const ROLE_INFO: Record<string, string> = {
  'Traducător':            'Vezi citatele și versetele care ți-au fost atribuite și adaugi traducerile în limba ta. Poți completa și formularele echipei.',
  'Operator versete':      'Adaugi, editezi și ștergi versete biblice și vezi în calendar versetele programate. Versetele validate nu mai pot fi modificate.',
  'Coordonator':           'Coordonezi traducerile: citate, versete, calendar, utilizatori, mailuri TLP / TLG și productivitate.',
  'Coordonator principal': 'Ai acces complet la coordonare și validezi traducerile finalizate din pagina Validări.',
  'Admin':                 'Ai acces complet la toate secțiunile și setările platformei.',
}

const RED: [number, number, number] = [206, 1, 0]
const INK: [number, number, number] = [17, 17, 17]
const MUTED: [number, number, number] = [136, 128, 124]
const LINE: [number, number, number] = [240, 233, 229]
const SOFT: [number, number, number] = [250, 247, 245]

async function fileToBase64(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Nu am putut încărca ${url}`)
  const buf = await res.arrayBuffer()
  let bin = ''
  const bytes = new Uint8Array(buf)
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

type Loader = (path: string) => Promise<string>

export async function buildAccessPdf(data: AccessPdfData, load: Loader = fileToBase64) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  // Fuentes con diacríticos rumanos.
  // Cada grosor se registra con un NOMBRE PROPIO: si los cuatro se llaman igual,
  // algunas impresoras y drivers mezclan las fuentes y al imprimir salen caracteres rotos.
  const fonts: [string, string][] = [
    ['OpenSans-Light.ttf', 'OpenSans-Light'], ['OpenSans-Regular.ttf', 'OpenSans-Regular'],
    ['OpenSans-SemiBold.ttf', 'OpenSans-SemiBold'], ['OpenSans-Bold.ttf', 'OpenSans-Bold'],
  ]
  for (const [file, name] of fonts) {
    doc.addFileToVFS(file, await load(`/fonts/${file}`))
    doc.addFont(file, name, 'normal')
  }
  const FAMILY: Record<string, string> = {
    light: 'OpenSans-Light', normal: 'OpenSans-Regular', semibold: 'OpenSans-SemiBold', bold: 'OpenSans-Bold',
  }
  const font = (style: string, size: number, color = INK) => {
    doc.setFont(FAMILY[style] ?? 'OpenSans-Regular', 'normal'); doc.setFontSize(size); doc.setTextColor(...color)
  }

  const W = 210, M = 20, CW = W - M * 2
  let y = 0

  // Barra superior + logo
  doc.setFillColor(...RED); doc.rect(0, 0, W, 4, 'F')
  y = 18
  try {
    const logo = await load('/logo.png')
    doc.addImage(`data:image/png;base64,${logo}`, 'PNG', M, y - 6, 0, 14)
  } catch {
    font('bold', 14, RED); doc.text('TP Translator', M, y + 4)
  }
  font('semibold', 8, MUTED)
  doc.text('FIȘĂ DE ACCES · CONFIDENȚIAL', W - M, y + 3, { align: 'right' })

  // Título
  y = 42
  font('light', 28); doc.text('Bine ai venit,', M, y)
  y += 11
  font('semibold', 20, RED)
  const nameLines = doc.splitTextToSize(data.fullName, CW)
  doc.text(nameLines, M, y)
  y += nameLines.length * 8 + 2
  doc.setFillColor(...RED); doc.roundedRect(M, y, 12, 1.2, 0.6, 0.6, 'F')
  y += 8
  font('normal', 10, MUTED)
  doc.text('Aceasta este fișa cu datele tale de acces în platforma TP Translator.', M, y)

  // Tarjeta de datos
  y += 8
  const rows: [string, string, boolean?][] = [
    ['Adresa platformei', `https://${APP_URL}`],
    ['Email (utilizator)', data.email],
    ['Parolă temporară', data.password || 'O primești separat de la coordonator', !!data.password],
    ['Rol', data.role],
    ...(data.language ? [['Limba de lucru', data.language] as [string, string]] : []),
  ]
  const rowH = 10
  const cardH = rows.length * rowH + 6
  doc.setFillColor(...SOFT); doc.setDrawColor(...LINE)
  doc.roundedRect(M, y, CW, cardH, 3, 3, 'FD')
  rows.forEach(([label, value, highlight], i) => {
    const ry = y + 3 + i * rowH + 7
    font('semibold', 8, MUTED); doc.text(label.toUpperCase(), M + 6, ry)
    if (highlight) {
      font('bold', 13, RED)
      doc.text(value, M + 62, ry + 0.5)
    } else {
      font(i === 0 ? 'semibold' : 'normal', 11, INK)
      doc.text(doc.splitTextToSize(value, CW - 68)[0], M + 62, ry)
    }
    if (i < rows.length - 1) {
      doc.setDrawColor(...LINE); doc.line(M + 6, ry + 4, M + CW - 6, ry + 4)
    }
  })
  y += cardH + 10

  // Pasos
  font('bold', 13); doc.text('Cum intri în cont', M, y)
  y += 8
  const steps: [string, string][] = [
    ['Deschide platforma', `Intră în browser (Chrome, Safari etc.) la adresa ${APP_URL}.`],
    ['Introdu emailul', `Scrie adresa ${data.email} în câmpul de email.`],
    ['Introdu parola', data.password ? 'Scrie parola temporară de mai sus, exact cum apare (contează literele mari și mici).' : 'Scrie parola primită de la coordonator.'],
    ['Schimbă parola', 'După prima autentificare, intră în Setări, la secțiunea Parola, și alege o parolă nouă, doar a ta.'],
    ['Adaugă pe ecranul telefonului (opțional)', 'Pe telefon, din meniul browserului alege „Adaugă pe ecranul principal” ca să ai platforma la un clic distanță.'],
  ]
  steps.forEach(([title, body], i) => {
    doc.setFillColor(...RED); doc.circle(M + 3.5, y - 1.2, 3.5, 'F')
    font('bold', 9, [255, 255, 255]); doc.text(String(i + 1), M + 3.5, y + 0.2, { align: 'center' })
    font('semibold', 11); doc.text(title, M + 11, y)
    font('normal', 9.5, [85, 78, 74])
    const lines = doc.splitTextToSize(body, CW - 11)
    doc.text(lines, M + 11, y + 5)
    y += 5 + lines.length * 4.6 + 3.5
  })

  // Qué puede hacer
  font('bold', 13); doc.text('Ce poți face în platformă', M, y)
  y += 6
  font('normal', 10, [85, 78, 74])
  const roleLines = doc.splitTextToSize(ROLE_INFO[data.role] ?? 'Accesul tău este stabilit de coordonator.', CW)
  doc.text(roleLines, M, y)
  y += roleLines.length * 4.8 + 6

  // Aviso de seguridad
  const note = 'Parola din această fișă este temporară. Schimb-o la prima autentificare și nu trimite această fișă altor persoane. Dacă ai probleme la autentificare, scrie-ne la ' + SUPPORT_EMAIL + '.'
  font('normal', 9, [122, 74, 0])
  const noteLines = doc.splitTextToSize(note, CW - 16)
  const noteH = noteLines.length * 4.4 + 10
  // Si no cabe antes del pie (nombres o textos largos), el aviso pasa a una segunda página
  if (y + noteH > 274) { doc.addPage(); doc.setFillColor(...RED); doc.rect(0, 0, 210, 4, 'F'); y = 20 }
  doc.setFillColor(255, 245, 235); doc.setDrawColor(255, 217, 168)
  doc.roundedRect(M, y, CW, noteH, 3, 3, 'FD')
  font('bold', 9, [192, 92, 0]); doc.text('IMPORTANT', M + 8, y + 7)
  font('normal', 9, [122, 74, 0]); doc.text(noteLines, M + 8, y + 12)

  // Pie
  const today = new Date().toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })
  const pages = doc.getNumberOfPages()
  for (let pg = 1; pg <= pages; pg++) {
    doc.setPage(pg)
    doc.setDrawColor(...LINE); doc.line(M, 280, W - M, 280)
    font('normal', 8, MUTED)
    doc.text(`Generat la ${today}${data.createdBy ? ` de ${data.createdBy}` : ''}`, M, 285)
    doc.text(pages > 1 ? `Pagina ${pg} din ${pages} · ${SUPPORT_EMAIL}` : `TP Translator · ${SUPPORT_EMAIL}`, W - M, 285, { align: 'right' })
  }

  return doc
}

export async function downloadAccessPdf(data: AccessPdfData) {
  const doc = await buildAccessPdf(data)
  const safe = data.fullName.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '')
  doc.save(`Fisa-acces-${safe || 'utilizator'}.pdf`)
}