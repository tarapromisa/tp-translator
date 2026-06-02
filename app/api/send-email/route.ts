import { NextRequest, NextResponse } from 'next/server'

const BCC = 'echipa@tptranslator.tarapromisa.org'
const GIF = 'https://res.cloudinary.com/dlgqpbpwu/image/upload/v1780257817/Gif_TPT_2026_1_wl9try.gif'

function welcomeHtml(name: string): string {
  const firstName = name.split(' ')[0]
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f9f7f5;font-family:Helvetica,Arial,sans-serif;color:#2e2e2e;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">

  <!-- Header -->
  <div style="background:#ce0100;border-radius:16px 16px 0 0;padding:32px 32px 28px;">
    <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.18em;color:rgba(255,255,255,0.55);text-transform:uppercase;font-family:Helvetica,Arial,sans-serif;">TP Translator</p>
    <h1 style="margin:0;font-size:34px;font-weight:300;color:#ffffff;line-height:1.15;letter-spacing:-0.03em;font-family:Helvetica,Arial,sans-serif;">
      Un sens.<br><span style="font-style:italic;color:rgba(255,255,255,0.75);">Mai multe limbi.</span>
    </h1>
  </div>
  <div style="height:4px;background:#a80000;border-radius:0;"></div>

  <!-- Content -->
  <div style="background:#ffffff;padding:32px;border:1px solid #f0e9e5;border-top:none;border-radius:0 0 16px 16px;">
    <p style="margin:0 0 20px;font-size:17px;font-weight:600;color:#ce0100;font-family:Helvetica,Arial,sans-serif;">Bună și bine ai venit, ${firstName}!</p>

    <p style="margin:0 0 14px;font-size:14px;line-height:1.75;color:#444;font-family:Helvetica,Arial,sans-serif;">
      Ne bucurăm să te avem alături în <strong style="color:#111;">TP Translator</strong>, echipa în care cuvintele trec dincolo de limbă și devin mesaj.
    </p>

    <p style="margin:0 0 14px;font-size:14px;line-height:1.75;color:#444;font-family:Helvetica,Arial,sans-serif;">
      Pentru ca lucrul să fie clar și ușor de urmărit, iată cum funcționează colaborarea:
    </p>

    <ol style="margin:0 0 20px 18px;padding:0;font-family:Helvetica,Arial,sans-serif;">
      <li style="margin:0 0 10px;font-size:14px;line-height:1.7;color:#444;">
        În fiecare zi, citatele pentru traducere vor fi trimise prin <strong style="color:#ce0100;">WhatsApp</strong> și prin <strong style="color:#ce0100;">mail</strong>. Vei traduce doar citatele în care ești menționat(ă).
      </li>
      <li style="margin:0 0 10px;font-size:14px;line-height:1.7;color:#444;">
        Când trimiți traducerea, te rugăm să <strong style="color:#ce0100;">indici corect numărul citatului</strong>, pentru ca acesta să poată fi identificat și procesat fără erori.
      </li>
      <li style="margin:0 0 10px;font-size:14px;line-height:1.7;color:#444;">
        Pe parcursul săptămânii, coordonatorii vor trimite <strong style="color:#ce0100;">mailuri de urmărire cu citatele rămase nefinalizate</strong>.
      </li>
      <li style="margin:0 0 10px;font-size:14px;line-height:1.7;color:#444;">
        Termenul maxim pentru finalizarea unei traduceri este de <strong style="color:#ce0100;">3 luni</strong>, timp suficient pentru a lucra cu <strong style="color:#ce0100;">atenție</strong> și <strong style="color:#ce0100;">responsabilitate</strong>.
      </li>
      <li style="margin:0;font-size:14px;line-height:1.7;color:#444;">
        Traducerile se vor putea trimite atât prin <strong style="color:#ce0100;">WhatsApp</strong> cât și prin <strong style="color:#ce0100;">mail</strong>: <em>echipa@tptranslator.tarapromisa.org</em>
      </li>
    </ol>

    <!-- Info box -->
    <div style="background:#faf7f5;border-left:3px solid #ce0100;border-radius:0 10px 10px 0;padding:16px 18px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;line-height:1.7;color:#555;font-family:Helvetica,Arial,sans-serif;">
        Dacă apare orice întrebare sau nelămurire, coordonatorii sunt punctul tău de contact și te vor ajuta cu plăcere.
      </p>
    </div>

    <p style="margin:0 0 4px;font-size:14px;line-height:1.7;color:#444;font-family:Helvetica,Arial,sans-serif;">
      Îți mulțumim pentru implicare și disponibilitate.<br>
      De aici, sensul merge mai departe.
    </p>
    <p style="margin:20px 0 0;font-size:14px;color:#444;font-family:Helvetica,Arial,sans-serif;">
      Cu apreciere,<br>
      <strong style="color:#111;">Echipa TP Translator</strong>
    </p>
  </div>

  <!-- GIF -->
  <div style="margin-top:20px;border-radius:12px;overflow:hidden;">
    <img src="${GIF}" alt="TP Translator" style="width:100%;display:block;border-radius:12px;" />
  </div>

  <!-- Footer -->
  <p style="margin:16px 0 0;text-align:center;font-size:11px;color:#bbb;font-family:Helvetica,Arial,sans-serif;">
    © 2026 TP Translator · <a href="mailto:echipa@tptranslator.tarapromisa.org" style="color:#bbb;text-decoration:none;">echipa@tptranslator.tarapromisa.org</a>
  </p>

</div>
</body>
</html>`
}

function credentialsHtml(name: string, email: string, password: string): string {
  const firstName = name.split(' ')[0]
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f9f7f5;font-family:Helvetica,Arial,sans-serif;color:#2e2e2e;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">

  <div style="background:#ce0100;border-radius:16px 16px 0 0;padding:32px 32px 28px;">
    <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.18em;color:rgba(255,255,255,0.55);text-transform:uppercase;font-family:Helvetica,Arial,sans-serif;">TP Translator</p>
    <h1 style="margin:0;font-size:34px;font-weight:300;color:#ffffff;line-height:1.15;letter-spacing:-0.03em;font-family:Helvetica,Arial,sans-serif;">
      Datele tale<br><span style="font-style:italic;color:rgba(255,255,255,0.75);">de autentificare.</span>
    </h1>
  </div>
  <div style="height:4px;background:#a80000;"></div>

  <div style="background:#ffffff;padding:32px;border:1px solid #f0e9e5;border-top:none;border-radius:0 0 16px 16px;">
    <p style="margin:0 0 20px;font-size:17px;font-weight:600;color:#ce0100;font-family:Helvetica,Arial,sans-serif;">Bună, ${firstName}!</p>

    <p style="margin:0 0 20px;font-size:14px;line-height:1.75;color:#444;font-family:Helvetica,Arial,sans-serif;">
      Contul tău de acces la platforma <strong style="color:#111;">TP Translator</strong> a fost creat. Mai jos găsești datele de autentificare:
    </p>

    <div style="background:#faf7f5;border-radius:12px;padding:20px 24px;margin-bottom:24px;border:1px solid #f0e9e5;">
      <table style="width:100%;border-collapse:collapse;font-family:Helvetica,Arial,sans-serif;">
        <tr>
          <td style="padding:10px 0;font-size:13px;color:#888;border-bottom:1px solid #f0e9e5;">Email</td>
          <td style="padding:10px 0;font-size:13px;font-weight:600;color:#111;text-align:right;border-bottom:1px solid #f0e9e5;">${email}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;font-size:13px;color:#888;">Parolă temporară</td>
          <td style="padding:10px 0;font-size:15px;font-weight:700;color:#ce0100;text-align:right;letter-spacing:0.05em;">${password}</td>
        </tr>
      </table>
    </div>

    <div style="background:#fff7f7;border-left:3px solid #ce0100;border-radius:0 10px 10px 0;padding:14px 18px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;line-height:1.7;color:#555;font-family:Helvetica,Arial,sans-serif;">
        Te rugăm să îți schimbi parola la prima autentificare. Accesează platforma la <a href="https://tptranslator.tarapromisa.org" style="color:#ce0100;text-decoration:none;">tptranslator.tarapromisa.org</a>
      </p>
    </div>

    <p style="margin:0;font-size:14px;color:#444;font-family:Helvetica,Arial,sans-serif;">
      Cu drag,<br>
      <strong style="color:#111;">Echipa TP Translator</strong>
    </p>
  </div>

  <div style="margin-top:20px;border-radius:12px;overflow:hidden;">
    <img src="${GIF}" alt="TP Translator" style="width:100%;display:block;border-radius:12px;" />
  </div>

  <p style="margin:16px 0 0;text-align:center;font-size:11px;color:#bbb;font-family:Helvetica,Arial,sans-serif;">
    © 2026 TP Translator · <a href="mailto:echipa@tptranslator.tarapromisa.org" style="color:#bbb;text-decoration:none;">echipa@tptranslator.tarapromisa.org</a>
  </p>

</div>
</body>
</html>`
}

function goodbyeHtml(name: string): string {
  const firstName = name.split(' ')[0]
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f9f7f5;font-family:Helvetica,Arial,sans-serif;color:#2e2e2e;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">

  <!-- Header -->
  <div style="background:#ce0100;border-radius:16px 16px 0 0;padding:32px 32px 28px;">
    <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.18em;color:rgba(255,255,255,0.55);text-transform:uppercase;font-family:Helvetica,Arial,sans-serif;">TP Translator</p>
    <h1 style="margin:0;font-size:34px;font-weight:300;color:#ffffff;line-height:1.15;letter-spacing:-0.03em;font-family:Helvetica,Arial,sans-serif;">
      Colaborarea ta<br><span style="font-style:italic;color:rgba(255,255,255,0.75);">va lua sfârșit.</span>
    </h1>
  </div>
  <div style="height:4px;background:#a80000;border-radius:0;"></div>

  <!-- Content -->
  <div style="background:#ffffff;padding:32px;border:1px solid #f0e9e5;border-top:none;border-radius:0 0 16px 16px;">
    <p style="margin:0 0 20px;font-size:17px;font-weight:600;color:#111;font-family:Helvetica,Arial,sans-serif;">Bună, ${firstName}.</p>

    <p style="margin:0 0 14px;font-size:14px;line-height:1.75;color:#444;font-family:Helvetica,Arial,sans-serif;">
      Îți scriem pentru a te informa cu privire la o ajustare în structura echipei <strong style="color:#111;">TP Translator</strong>. În urma unei analize interne, am decis să reconfigurăm componența grupului de traducători.
    </p>

    <p style="margin:0 0 14px;font-size:14px;line-height:1.75;color:#444;font-family:Helvetica,Arial,sans-serif;">
      Participarea ta în cadrul proiectului se încheie începând de acum. Această decizie nu reflectă calitatea muncii tale — dimpotrivă, apreciem profund timpul, efortul și dedicarea pe care le-ai adus în echipă.
    </p>

    <p style="margin:0 0 14px;font-size:14px;line-height:1.75;color:#444;font-family:Helvetica,Arial,sans-serif;">
      Îți mulțumim sincer pentru tot ce ai contribuit. A fost o onoare să lucrăm împreună.
    </p>

    <!-- Info box -->
    <div style="background:#faf7f5;border-radius:10px;padding:18px 20px;margin-bottom:24px;border:1px solid #f0e9e5;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#111;font-family:Helvetica,Arial,sans-serif;">Informații practice:</p>
      <p style="margin:0;font-size:13px;line-height:1.7;color:#555;font-family:Helvetica,Arial,sans-serif;">
        Grupurile de comunicare vor fi actualizate în perioada următoare.<br>
        Pentru orice întrebare, ne poți contacta oricând la
        <a href="mailto:echipa@tptranslator.tarapromisa.org" style="color:#ce0100;text-decoration:none;">echipa@tptranslator.tarapromisa.org</a>.
      </p>
    </div>

    <p style="margin:0 0 4px;font-size:14px;line-height:1.75;color:#444;font-family:Helvetica,Arial,sans-serif;">
      Îți dorim tot binele în proiectele tale viitoare.<br>
      <strong style="color:#111;">Fii binecuvântat/ă!</strong>
    </p>
    <p style="margin:20px 0 0;font-size:14px;color:#444;font-family:Helvetica,Arial,sans-serif;">
      Cu recunoștință și apreciere,<br>
      <strong style="color:#111;">Echipa TP Translator</strong>
    </p>
  </div>

  <!-- GIF -->
  <div style="margin-top:20px;border-radius:12px;overflow:hidden;">
    <img src="${GIF}" alt="TP Translator" style="width:100%;display:block;border-radius:12px;" />
  </div>

  <!-- Footer -->
  <p style="margin:16px 0 0;text-align:center;font-size:11px;color:#bbb;font-family:Helvetica,Arial,sans-serif;">
    © 2026 TP Translator · <a href="mailto:echipa@tptranslator.tarapromisa.org" style="color:#bbb;text-decoration:none;">echipa@tptranslator.tarapromisa.org</a>
  </p>

</div>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  try {
    const { to, toName, type, fromEmail, fromName, password, htmlBody: htmlBody_input, subject: customSubject } = await req.json()

    const subject =
      type === 'welcome'     ? `Bun venit în echipa TP Translator, ${toName.split(' ')[0]}!` :
      type === 'credentials' ? `Datele tale de autentificare — TP Translator` :
      type === 'custom'      ? (customSubject ?? 'Mesaj TP Translator') :
                               `Actualizare echipă TP Translator — ${toName.split(' ')[0]}`

    const htmlBody =
      type === 'welcome'     ? welcomeHtml(toName) :
      type === 'credentials' ? credentialsHtml(toName, to, password ?? '') :
      type === 'custom'      ? (htmlBody_input ?? '') :
                               goodbyeHtml(toName)

    const payload: any = {
      from: {
        address: fromEmail ?? 'echipa@tptranslator.tarapromisa.org',
        name: fromName ?? 'Echipa TP Translator',
      },
      to: [{ email_address: { address: to, name: toName } }],
      bcc: [{ email_address: { address: BCC, name: 'Echipa TP Translator' } }],
      subject,
      htmlbody: htmlBody,
    }

    const res = await fetch('https://api.zeptomail.eu/v1.1/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Zoho-enczapikey ${process.env.ZEPTO_API_KEY}`,
      },
      body: JSON.stringify(payload),
    })

    const responseText = await res.text()
    console.log('Zepto status:', res.status, responseText)

    if (!res.ok) {
      return NextResponse.json({ error: responseText }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('API error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}