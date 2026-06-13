/**
 * Wild Encounter — Discord Webhook Proxy (Cloudflare Worker)
 *
 * Receives applicant submissions from the Wild Encounter web app,
 * validates them, and forwards to the actual Discord webhook
 * (stored as an encrypted secret on the Worker — never exposed to clients).
 *
 * Set up in Cloudflare dashboard:
 *   Settings → Variables and Secrets → Add
 *     Name: DISCORD_WEBHOOK_URL
 *     Value: https://discord.com/api/webhooks/...
 *     Type: Secret (encrypted)
 *
 * Optionally also set:
 *     ALLOWED_ORIGIN: https://solrooster.github.io  (locks CORS to your site)
 */

export default {
  async fetch(request, env) {
    const requestOrigin = request.headers.get('Origin') || '';

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(env, requestOrigin) });
    }

    // Only accept POST
    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405, env, requestOrigin);
    }

    // Parse the body
    let payload;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON' }, 400, env, requestOrigin);
    }

    // Honeypot check — if the hidden field has content, it's a bot
    if (payload.hp && payload.hp.trim() !== '') {
      // Silently pretend success so bots don't get useful signal
      return jsonResponse({ ok: true }, 200, env, requestOrigin);
    }

    // Basic shape validation
    if (!payload.applicant || typeof payload.applicant !== 'string') {
      return jsonResponse({ error: 'Missing applicant name' }, 400, env, requestOrigin);
    }
    // Accept either the new `fields` array (survey-agnostic) or the legacy `answers` object
    const hasFields = Array.isArray(payload.fields);
    const hasAnswers = payload.answers && typeof payload.answers === 'object';
    if (!hasFields && !hasAnswers) {
      return jsonResponse({ error: 'Missing fields' }, 400, env, requestOrigin);
    }

    // Size guard — Discord embeds have field-size limits and we don't want huge dumps
    const totalSize = JSON.stringify(payload).length;
    if (totalSize > 10_000) {
      return jsonResponse({ error: 'Submission too large' }, 413, env, requestOrigin);
    }

    // Build the Discord embed
    const discordPayload = buildDiscordEmbed(payload.applicant, payload.fields, payload.answers);

    // Forward to Discord
    if (!env.DISCORD_WEBHOOK_URL) {
      return jsonResponse({ error: 'Webhook not configured on server' }, 500, env, requestOrigin);
    }

    try {
      const discordRes = await fetch(env.DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(discordPayload),
      });

      if (!discordRes.ok) {
        const text = await discordRes.text();
        return jsonResponse({ error: `Discord returned ${discordRes.status}`, detail: text.slice(0, 200) }, 502, env, requestOrigin);
      }

      return jsonResponse({ ok: true }, 200, env, requestOrigin);
    } catch (err) {
      return jsonResponse({ error: `Forward failed: ${err.message}` }, 502, env, requestOrigin);
    }
  },
};

function buildDiscordEmbed(applicant, fields, legacyAnswers) {
  const truncate = (s, max = 1024) => {
    if (!s) return '*(no answer)*';
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
  };

  // Prefer the new ordered `fields` array. Fall back to the old hardcoded
  // answers shape so older clients (or cached builds) still work.
  let embedFields;
  if (Array.isArray(fields) && fields.length > 0) {
    // Discord allows max 25 fields per embed
    embedFields = fields.slice(0, 25).map((f) => ({
      name: truncate(String(f.name || 'Question'), 256),
      value: truncate(f.value),
    }));
  } else {
    const a = legacyAnswers || {};
    embedFields = [
      { name: '1.  Thoughts on "She-Hulk"', value: truncate(a.shehulk) },
      { name: '2.  Thoughts on Steve Harvey (no context)', value: truncate(a.steve_harvey) },
      { name: '3.  Korra — better show and/or avatar?', value: truncate(a.korra) },
      { name: '4.  The definitive waifu', value: truncate(a.waifu) },
      { name: '5.  Top 5 Pokémon', value: truncate(a.top_five) },
    ];
  }

  return {
    username: 'Wild Encounter',
    avatar_url: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png',
    embeds: [
      {
        title: `🌿  A wild ${truncate(applicant, 200)} appeared!`,
        description: 'Submitted via Wild Encounter — The Roster vibe check.',
        color: 0xf7d02c,
        fields: embedFields,
        footer: { text: '👍 vote them in   ·   👎 discuss   ·   🤔 ponder' },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

function corsHeaders(env, requestOrigin) {
  // ALLOWED_ORIGIN may be a single origin or a comma-separated list.
  // We echo back the requester's origin if it's in the list (proper multi-origin CORS).
  // If ALLOWED_ORIGIN isn't set, allow any origin (development fallback).
  const raw = env.ALLOWED_ORIGIN;
  let allowOrigin = '*';

  if (raw) {
    const allowed = raw.split(',').map(s => s.trim()).filter(Boolean);
    if (requestOrigin && allowed.includes(requestOrigin)) {
      allowOrigin = requestOrigin;
    } else if (allowed.length === 1) {
      // Single configured origin — return it regardless (CORS will still block mismatched requests)
      allowOrigin = allowed[0];
    } else {
      // Requester not on the allowlist — return the first allowed value
      // (browser will block the mismatch, which is what we want for unauthorized origins)
      allowOrigin = allowed[0];
    }
  }

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(body, status, env, requestOrigin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(env, requestOrigin),
    },
  });
}
