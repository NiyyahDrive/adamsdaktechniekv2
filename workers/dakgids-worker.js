/**
 * Adams Daktechniek — Dakgids leadmagnet Worker
 * Route: https://api.adamsdaktechniek.nl/dakgids  (POST, JSON)
 *
 * Ontvangt {voornaam, email, optin, _honey, bron} van het dakgids-formulier
 * en zet de subscriber in MailerLite:
 *   - optin "ja"  → groep DAKGIDS_OPTIN  (automation: dag 0 gids, dag 4 subsidie, dag 12 inspectie)
 *   - optin "nee" → groep DAKGIDS_ONLY   (automation: alléén dag 0 gids-mail — AVG: geen marketing)
 *
 * Secrets/vars (NOOIT hardcoden — zet via `wrangler secret put` of dashboard):
 *   MAILERLITE_API_KEY   (secret)  — MailerLite → Integrations → API
 *   GROUP_DAKGIDS_OPTIN  (var)     — MailerLite groeps-ID mét opt-in
 *   GROUP_DAKGIDS_ONLY   (var)     — MailerLite groeps-ID zonder opt-in
 *
 * Deploy: `wrangler deploy` in deze map, of plak dit bestand in het
 * Cloudflare-dashboard bij de bestaande api.adamsdaktechniek.nl Worker als
 * extra route (zie HANDOVER).
 */

const ALLOWED_ORIGINS = [
  'https://adamsdaktechniek.nl',
  'https://www.adamsdaktechniek.nl',
];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method !== 'POST') {
      return json({ ok: false, error: 'method_not_allowed' }, 405, origin);
    }

    let data;
    try {
      data = await request.json();
    } catch {
      return json({ ok: false, error: 'bad_json' }, 400, origin);
    }

    // Honeypot: bots vullen dit veld — stil accepteren zonder iets te doen.
    if (data._honey) {
      return json({ ok: true }, 200, origin);
    }

    const voornaam = String(data.voornaam || '').trim().slice(0, 80);
    const email = String(data.email || '').trim().toLowerCase();
    const optin = data.optin === 'ja';

    if (!voornaam || !EMAIL_RE.test(email)) {
      return json({ ok: false, error: 'invalid_input' }, 422, origin);
    }

    const groupId = optin ? env.GROUP_DAKGIDS_OPTIN : env.GROUP_DAKGIDS_ONLY;

    // MailerLite upsert (bestaand adres wordt bijgewerkt, geen duplicaten)
    const mlResp = await fetch('https://connect.mailerlite.com/api/subscribers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${env.MAILERLITE_API_KEY}`,
      },
      body: JSON.stringify({
        email,
        fields: {
          name: voornaam,
          dakgids_optin: optin ? 'ja' : 'nee',
          dakgids_bron: String(data.bron || '').slice(0, 120),
        },
        groups: [groupId],
      }),
    });

    if (!mlResp.ok) {
      const detail = await mlResp.text().catch(() => '');
      console.error('MailerLite error', mlResp.status, detail);
      return json({ ok: false, error: 'esp_error' }, 502, origin);
    }

    return json({ ok: true }, 200, origin);
  },
};
