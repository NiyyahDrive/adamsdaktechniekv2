/**
 * Adams Daktechniek — Form submission Worker
 *
 * Ontvangt formulier-POSTs van adamsdaktechniek.nl en verstuurt
 * mail via Resend API vanaf aanvragen@adamsdaktechniek.nl naar
 * info@adamsdaktechniek.nl. Ondersteunt file-attachments en honeypot.
 * Sinds 2026-09-04: ook een bevestigingsmail naar de aanvrager.
 * Bron: site_lokaal/WebSite/workers/form-worker.js — deploy via tools/deploy_form_worker.sh
 *
 * ENV vereist:
 *   RESEND_API_KEY  → re_xxx... (genereer in Resend dashboard)
 */

const ALLOWED_ORIGINS = [
  'https://adamsdaktechniek.nl',
  'https://www.adamsdaktechniek.nl',
];

const FROM_ADDRESS = 'Adams Daktechniek <aanvragen@adamsdaktechniek.nl>';
const TO_ADDRESS   = 'info@adamsdaktechniek.nl';
const CONFIRM_REPLY_TO = 'info@adamsdaktechniek.nl';
const SITE = 'https://adamsdaktechniek.nl';

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB per file
const MAX_TOTAL_BYTES = 25 * 1024 * 1024; // 25 MB totaal

// Velden die we NIET in de e-mail body willen tonen
const SKIP_FIELDS = new Set([
  '_honey', '_subject', '_template', '_captcha', '_next', '_autoresponse', '_replyto',
]);

// Vriendelijke labels voor veelvoorkomende veldnamen
const FIELD_LABELS = {
  name: 'Naam', naam: 'Naam', firstname: 'Voornaam', lastname: 'Achternaam',
  email: 'E-mail', phone: 'Telefoon', telefoon: 'Telefoon',
  address: 'Adres', adres: 'Adres', postcode: 'Postcode', city: 'Plaats', plaats: 'Plaats',
  service: 'Dienst', dienst: 'Dienst', service_type: 'Type werk',
  message: 'Bericht', toelichting: 'Toelichting', vraag: 'Vraag',
  urgency: 'Urgentie', urgentie: 'Urgentie',
  property_type: 'Type pand', property_age: 'Bouwjaar pand',
  area_size: 'Oppervlakte', oppervlakte: 'Oppervlakte',
  privacy: 'Privacy-akkoord', privacy_akkoord: 'Privacy-akkoord',
};

function corsHeaders(origin) {
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function formatLabel(key) {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  return key.replace(/[_-]/g, ' ').replace(/^./, c => c.toUpperCase());
}

function formatValue(value) {
  if (value === 'on') return 'Ja';
  if (value === '' || value == null) return '—';
  return value;
}

function buildEmailHtml(data, attachments) {
  let rows = '';
  for (const [key, value] of Object.entries(data)) {
    if (SKIP_FIELDS.has(key) || key.startsWith('_')) continue;
    if (value === '' || value == null) continue;
    const label = formatLabel(key);
    const displayValue = Array.isArray(value) ? value.join(', ') : formatValue(value);
    rows += `<tr>
      <td style="padding:10px 14px;border-bottom:1px solid #e5e5e5;font-weight:600;color:#444;width:32%;vertical-align:top">${escapeHtml(label)}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #e5e5e5;color:#000;white-space:pre-wrap">${escapeHtml(displayValue)}</td>
    </tr>`;
  }

  let attachmentBlock = '';
  if (attachments.length > 0) {
    const list = attachments.map(a =>
      `<li style="margin:4px 0">${escapeHtml(a.filename)} <span style="color:#888;font-size:12px">(${Math.round(a.size / 1024)} KB)</span></li>`
    ).join('');
    attachmentBlock = `<div style="margin:20px 0;padding:14px 18px;background:#f0f7f0;border-left:4px solid #2E7D45;border-radius:4px">
      <strong style="color:#2E7D45;font-size:14px">📎 ${attachments.length} bijlage${attachments.length > 1 ? 'n' : ''} meegestuurd</strong>
      <ul style="margin:8px 0 0;padding-left:20px;color:#444;font-size:14px">${list}</ul>
    </div>`;
  }

  const replyTo = data.email || data.telefoon || data.phone || '';
  const replyHint = replyTo
    ? `<p style="margin:20px 0 0;padding:12px;background:#f5f5f5;border-radius:4px;font-size:13px;color:#666">💡 Klik op <strong>Reply</strong> in je mail-client om direct te antwoorden — de Reply-To is ingesteld op <strong>${escapeHtml(replyTo)}</strong>.</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"><title>Nieuwe offerte-aanvraag</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;line-height:1.55;color:#0a0a0a;background:#fafafa;margin:0;padding:24px">
  <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05)">
    <div style="padding:20px 24px;background:#0a0a0a;color:#fff">
      <h2 style="margin:0;font-size:18px;font-weight:700">Nieuwe offerte-aanvraag</h2>
      <p style="margin:4px 0 0;font-size:13px;color:#a8a8a8">via adamsdaktechniek.nl · ${new Date().toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' })}</p>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>
    <div style="padding:0 24px 24px">${attachmentBlock}${replyHint}</div>
  </div>
</body>
</html>`;
}

/* ---------- Bevestigingsmail naar de aanvrager (toegevoegd 2026-09-04) ---------- */
function pick(data, ...keys) {
  for (const k of keys) {
    const v = data[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return Array.isArray(v) ? v.join(', ') : String(v);
  }
  return '';
}

function buildConfirmationHtml(data) {
  const firstName = pick(data, 'first_name', 'naam', 'name').split(' ')[0] || '';
  const hallo = firstName ? `Hoi ${escapeHtml(firstName)},` : 'Hallo,';
  const rows = [
    ['Dienst', pick(data, 'Gevraagde diensten', 'dienst', 'service')],
    ['Klanttype', pick(data, 'Klanttype')],
    ['Plaats', pick(data, 'city', 'plaats')],
    ['Urgentie', pick(data, 'Urgentie', 'urgentie')],
    ['Telefoon', pick(data, 'phone', 'telefoon')],
  ].filter(([, v]) => v);
  const rowsHtml = rows.map(([k, v]) =>
    `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;font-size:14px;width:34%">${escapeHtml(k)}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#111;font-size:14px">${escapeHtml(v)}</td></tr>`
  ).join('');
  const summary = rowsHtml
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border:1px solid #eee;border-radius:10px;overflow:hidden;border-collapse:separate">${rowsHtml}</table>`
    : '';
  return `<!DOCTYPE html>
<html lang="nl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>We hebben je aanvraag ontvangen</title></head>
<body style="margin:0;padding:0;background:#f4f4f2;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f2;padding:24px 0;"><tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;">
      <tr><td style="background:#0a0a0a;padding:28px 32px;text-align:center;">
        <img src="${SITE}/Images/logo-email.png" alt="Adams Daktechniek" height="44" style="height:44px;">
      </td></tr>
      <tr><td style="padding:36px 32px 8px;">
        <p style="margin:0 0 6px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#2E7D45;font-weight:bold;">Aanvraag ontvangen</p>
        <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;color:#111;">${hallo} bedankt voor je aanvraag</h1>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#444;">
          We hebben je offerte-aanvraag goed ontvangen. We nemen <strong>binnen 48 uur</strong> (werkdagen) contact met je op om een afspraak in te plannen of je vraag direct te beantwoorden.
        </p>
        ${summary}
        <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#444;">
          Is het dringend, bijvoorbeeld bij een lekkage? Bel ons dan direct &mdash; voor spoed zijn we <strong>24 uur per dag</strong> bereikbaar.
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;"><tr><td style="border-radius:999px;background:#2E7D45;">
          <a href="tel:+31683396082" style="display:inline-block;padding:15px 32px;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;">Bel 06-83 396 082</a>
        </td></tr></table>
        <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#444;">
          Liever appen? <a href="https://wa.me/31683396082" style="color:#2E7D45;font-weight:bold;">Stuur een WhatsApp</a>. Reageren op deze mail kan ook, dan komt je bericht bij ons team terecht.
        </p>
        <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#444;">Met vriendelijke groet,<br><strong>Adams Daktechniek</strong></p>
      </td></tr>
      <tr><td style="padding:20px 32px 28px;border-top:1px solid #eee;">
        <p style="margin:0 0 4px;font-size:12px;line-height:1.6;color:#888;">Adams Daktechniek &middot; Schrieversheideweg 56, 6414 RL Heerlen &middot; 06-83 396 082 &middot; <a href="${SITE}" style="color:#888;">adamsdaktechniek.nl</a></p>
        <p style="margin:0;font-size:12px;line-height:1.6;color:#888;">Je ontvangt deze mail omdat je via onze website een offerte of inspectie hebt aangevraagd. <a href="${SITE}/privacy" style="color:#888;">Privacyverklaring</a></p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

async function sendConfirmation(env, data, replyTo) {
  if (!replyTo) return;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [replyTo],
        reply_to: CONFIRM_REPLY_TO,
        subject: 'We hebben je aanvraag ontvangen – Adams Daktechniek',
        html: buildConfirmationHtml(data),
      }),
    });
    if (!r.ok) console.error('Bevestigingsmail mislukt', r.status, await r.text());
  } catch (e) {
    console.error('Bevestigingsmail error', e);
  }
}

async function fileToBase64(file) {
  const buffer = await file.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function redirectResponse(url, cors) {
  // 303 See Other zorgt dat de browser GET doet (geen re-POST bij refresh)
  return new Response(null, {
    status: 303,
    headers: { ...cors, 'Location': url },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin);

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method === 'GET') {
      return new Response('Adams Daktechniek form handler — POST only.', {
        status: 200, headers: { ...cors, 'Content-Type': 'text/plain' },
      });
    }
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers: cors });
    }

    if (!env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY niet gezet');
      return new Response('Server-configuratie ontbreekt. Bel 06-83 396 082.', {
        status: 500, headers: cors,
      });
    }

    try {
      const formData = await request.formData();
      const data = {};
      const attachments = [];
      let totalBytes = 0;

      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          if (value.size === 0) continue;
          if (value.size > MAX_FILE_BYTES) {
            return new Response(`Bestand "${value.name}" is te groot (max 10 MB).`, {
              status: 413, headers: cors,
            });
          }
          totalBytes += value.size;
          if (totalBytes > MAX_TOTAL_BYTES) {
            return new Response('Totale bijlage-grootte overschreden (max 25 MB).', {
              status: 413, headers: cors,
            });
          }
          attachments.push({
            filename: value.name,
            content: await fileToBase64(value),
            size: value.size,
          });
        } else {
          if (data[key] !== undefined) {
            if (!Array.isArray(data[key])) data[key] = [data[key]];
            data[key].push(value);
          } else {
            data[key] = value;
          }
        }
      }

      // Honeypot: stille redirect zonder mail te sturen
      if (data._honey && String(data._honey).trim() !== '') {
        const redirectUrl = data._next || 'https://adamsdaktechniek.nl/bedankt.html';
        return redirectResponse(redirectUrl, cors);
      }

      const visitorName = data.name || data.naam || 'website-bezoeker';
      const subject = data._subject || `Nieuwe aanvraag van ${visitorName}`;
      const replyTo = data.email && /^\S+@\S+\.\S+$/.test(data.email) ? data.email : undefined;

      const payload = {
        from: FROM_ADDRESS,
        to: [TO_ADDRESS],
        subject,
        html: buildEmailHtml(data, attachments),
      };
      if (replyTo) payload.reply_to = replyTo;
      if (attachments.length > 0) {
        payload.attachments = attachments.map(({ filename, content }) => ({ filename, content }));
      }

      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!resendResponse.ok) {
        const errText = await resendResponse.text();
        console.error('Resend error', resendResponse.status, errText);
        return new Response(
          `Mail-versturen mislukt. Bel 06-83 396 082 of probeer het over enkele minuten opnieuw.`,
          { status: 502, headers: cors }
        );
      }

      // Bevestiging naar de aanvrager (fouten hierin blokkeren de lead-mail niet)
      await sendConfirmation(env, data, replyTo);

      const redirectUrl = data._next || 'https://adamsdaktechniek.nl/bedankt.html';
      return redirectResponse(redirectUrl, cors);

    } catch (err) {
      console.error('Worker error:', err);
      return new Response(
        `Er ging iets mis. Bel 06-83 396 082 of probeer opnieuw.`,
        { status: 500, headers: cors }
      );
    }
  }
};
