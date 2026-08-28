import { createClient } from 'npm:@supabase/supabase-js@2'

type Json = Record<string, unknown>

const SERVER_ID = '1515534446122762420'
const SITE_URL = 'https://globall-cloud.pages.dev/'
const ORIGINS = new Set([
  'https://globall-cloud.pages.dev',
  'https://globall-cloud.netlify.app',
])

const cors = (req: Request) => ({
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': ORIGINS.has(req.headers.get('origin') || '') ? (req.headers.get('origin') || '') : 'https://globall-cloud.pages.dev',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-supabase-auth-token',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Cache-Control': 'no-store',
  'Vary': 'Origin',
  'X-Content-Type-Options': 'nosniff',
})

const json = (req: Request, body: Json, status = 200) => new Response(JSON.stringify(body), { status, headers: cors(req) })

const text = (value: unknown, max: number) => {
  if (value === null || value === undefined) return null
  const valueText = String(value).trim()
  return valueText ? valueText.slice(0, max) : null
}

const serviceClient = () => {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY')
  if (!url || !key) throw new Error('Supabase service configuration is unavailable')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
}

const authenticateStaff = async (req: Request) => {
  const url = Deno.env.get('SUPABASE_URL')
  const publicKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
  const authorization = req.headers.get('authorization') || ''
  if (!url || !publicKey || !/^bearer\s+/i.test(authorization)) throw new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors(req) })

  const userClient = createClient(url, publicKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: authorization } },
  })
  const user = await userClient.auth.getUser()
  if (user.error || !user.data.user) throw new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors(req) })

  const service = serviceClient()
  const staff = await service.from('staff').select('id,full_name,role,is_active,branch').eq('id', user.data.user.id).maybeSingle()
  if (staff.error) throw staff.error
  if (!staff.data?.is_active) throw new Response(JSON.stringify({ error: 'Active staff account required' }), { status: 403, headers: cors(req) })
  return staff.data
}

const getWebhookUrl = () => {
  const value = Deno.env.get('DISCORD_WEBHOOK_URL')
  if (!value) throw new Error('DISCORD_WEBHOOK_URL secret is not configured')
  const parsed = new URL(value)
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'discord.com' || !/^\/api\/webhooks\/\d+\/[^/]+$/.test(parsed.pathname)) {
    throw new Error('Invalid Discord webhook URL')
  }
  return value
}

const verifyWebhookGuild = async (url: string) => {
  const response = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Discord webhook verification failed (${response.status})`)
  const data = await response.json() as Json
  const guildId = text(data.guild_id, 32)
  const channelId = text(data.channel_id, 32)
  if (guildId !== SERVER_ID) throw new Error(`Discord webhook belongs to a different server (${guildId || 'unknown'})`)
  return { guild_id: guildId, channel_id: channelId }
}

const color = (severity: string) => ({ critical: 0xED4245, high: 0xFEE75C, success: 0x57F287 } as Record<string, number>)[severity] || 0x5865F2

const sendToDiscord = async (body: Json, staffName: string) => {
  const webhook = getWebhookUrl()
  const title = text(body.title, 256) || 'Globall Cloud update'
  const eventType = text(body.event_type, 80) || 'site_event'
  const content = text(body.content, 1800)
  const severity = text(body.severity, 20) || 'info'
  const shipmentId = text(body.shipment_id, 128)
  const status = text(body.status, 80)
  const route = text(body.route, 180)
  const details = text(body.details, 1000)
  const fields = [
    shipmentId ? { name: 'Shipment', value: shipmentId, inline: true } : null,
    status ? { name: 'Status', value: status, inline: true } : null,
    route ? { name: 'Route', value: route, inline: false } : null,
    { name: 'Event', value: eventType, inline: true },
    { name: 'Actor', value: staffName.slice(0, 180), inline: true },
    details ? { name: 'Details', value: details, inline: false } : null,
  ].filter(Boolean)

  const payload: Json = {
    username: 'Globall Cloud',
    avatar_url: `${SITE_URL}favicon.ico`,
    content: content || undefined,
    allowed_mentions: { parse: [] },
    embeds: [{
      title,
      url: SITE_URL,
      description: text(body.description, 4096) || undefined,
      color: color(severity),
      fields,
      footer: { text: `Globall Cloud • ${SERVER_ID}` },
      timestamp: new Date().toISOString(),
    }],
  }

  const response = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const message = await response.text().catch(() => '')
    throw new Error(`Discord webhook returned ${response.status}${message ? `: ${message.slice(0, 240)}` : ''}`)
  }
  return { ok: true, server_id: SERVER_ID, event_type: eventType }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) })
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405)
  try {
    const staff = await authenticateStaff(req)
    const body = await req.json().catch(() => ({})) as Json
    const action = text(body.action, 32) || 'send'
    const webhook = getWebhookUrl()

    if (action === 'health') {
      const verified = await verifyWebhookGuild(webhook)
      return json(req, { ok: true, configured: true, server_id: verified.guild_id, channel_id: verified.channel_id, site_url: SITE_URL, staff_role: staff.role })
    }
    if (action !== 'send') return json(req, { error: 'Unsupported action' }, 400)
    if (body.server_id && String(body.server_id) !== SERVER_ID) return json(req, { error: 'Discord server ID does not match configured Global Cloud server' }, 400)
    const result = await sendToDiscord(body, String(staff.full_name || staff.id))
    return json(req, result)
  } catch (error) {
    if (error instanceof Response) return error
    console.error('discord-notify error', error)
    return json(req, { error: error instanceof Error ? error.message : 'Internal server error' }, 500)
  }
})