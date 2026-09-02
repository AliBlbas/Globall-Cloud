// Supabase Edge Function: payment-webhook
// Purpose: receive provider webhooks (Qicard / FIB), verify signature, store idempotent event
// Notes:
// - This is a template. Replace PROVIDER_SECRET_* and SUPABASE_SERVICE_ROLE_KEY via your deployment secrets.
// - The function inserts the raw payload into `payment_webhook_events` using provider + provider_event_id unique index.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); // must be set in Edge Function secrets

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.warn('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in environment');
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { global: { headers: { 'x-gc-fn': 'payment-webhook' } } });

function verifyHMAC(payloadText, signatureHeader, secret) {
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const payloadData = encoder.encode(payloadText);
    // HMAC-SHA256
    const cryptoKey = crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    return cryptoKey.then((k) => crypto.subtle.verify('HMAC', k, hexToUint8(signatureHeader), payloadData));
  } catch (err) {
    console.error('verifyHMAC error', err);
    return Promise.resolve(false);
  }
}

function hexToUint8(hex) {
  if (!hex) return new Uint8Array();
  const s = hex.replace(/^0x/, '');
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < s.length; i += 2) out[i / 2] = parseInt(s.substr(i, 2), 16);
  return out;
}

export default async function (req) {
  const text = await req.text();
  const headers = req.headers;
  const provider = headers.get('x-provider') || 'unknown';
  const signature = headers.get('x-provider-signature') || headers.get('x-signature');
  const secretEnvName = `PROVIDER_SECRET_${provider.toUpperCase()}`;
  const secret = Deno.env.get(secretEnvName) || Deno.env.get('PROVIDER_SECRET');

  if (!secret) {
    console.error('No provider secret configured for', provider);
    return new Response(JSON.stringify({ error: 'Provider secret not configured' }), { status: 500 });
  }

  const verified = signature ? await verifyHMAC(text, signature, secret) : false;
  if (!verified) {
    console.warn('Webhook signature verification failed for provider', provider);
    // reject with 400 so providers may retry appropriately
    return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 });
  }

  let payload = null;
  try { payload = JSON.parse(text); } catch { payload = { raw: text }; }

  // derive provider_event_id in a provider-specific way; change as needed
  const providerEventId = (payload && (payload.id || payload.event_id || payload.transaction_id)) || null;

  try {
    // Try to insert idempotently; payment_webhook_events has a unique index on (provider, provider_event_id)
    const { error } = await supabase
      .from('payment_webhook_events')
      .insert([{ provider, provider_event_id: providerEventId, event_payload: payload }]);

    if (error) {
      // If unique violation, treat as idempotent success
      if (String(error.message || '').toLowerCase().includes('unique') || String(error.details || '').toLowerCase().includes('unique')) {
        console.info('Duplicate webhook event ignored', providerEventId);
        return new Response(JSON.stringify({ ok: true, duplicate: true }), { status: 200 });
      }
      console.error('DB insert error', error);
      return new Response(JSON.stringify({ error: 'Failed to store event' }), { status: 500 });
    }

    // Optionally enqueue a background reconciliation job (by inserting into payment_sessions or a worker queue)
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    console.error('Unhandled error', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 });
  }
}
