import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()

const normalizeServiceClient = (source, file) => {
  const helper = `const resolveServiceKey = () => {
  const direct = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (direct) return direct
  const raw = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed === 'string') return parsed
    if (parsed?.default) return String(parsed.default)
    const first = Object.values(parsed ?? {})[0]
    return first ? String(first) : null
  } catch {
    return null
  }
}
`

  if (source.includes('const resolveServiceKey = () =>')) return source

  const oldBlock = `const serviceClient = () => {
  const url = Deno.env.get('SUPABASE_URL')
  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY')
  if (!url || !secret) throw new Error('Supabase service configuration is unavailable')
  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}
`

  const replacement = `${helper}
const serviceClient = () => {
  const url = Deno.env.get('SUPABASE_URL')
  const secret = resolveServiceKey()
  if (!url || !secret) throw new Error('Supabase service configuration is unavailable')
  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}
`

  if (source.includes(oldBlock)) return source.replace(oldBlock, replacement)

  const compactOld = `const serviceClient = () => {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY')
  if (!url || !key) throw new Error('Supabase service configuration is unavailable')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
}
`

  const compactReplacement = `${helper}
const serviceClient = () => {
  const url = Deno.env.get('SUPABASE_URL')
  const key = resolveServiceKey()
  if (!url || !key) throw new Error('Supabase service configuration is unavailable')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
}
`

  if (source.includes(compactOld)) return source.replace(compactOld, compactReplacement)

  throw new Error(`No known serviceClient pattern found in ${file}`)
}

const functionsDir = path.join(root, 'supabase', 'functions')
const targets = ['logistics-control-plane', 'document-access']
const changed = []

for (const name of targets) {
  const file = path.join(functionsDir, name, 'index.ts')
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}`)
  const before = fs.readFileSync(file, 'utf8')
  const after = normalizeServiceClient(before, file)
  if (after !== before) {
    fs.writeFileSync(file, after)
    changed.push(path.relative(root, file))
  }
}

for (const file of targets.map((name) => path.join(functionsDir, name, 'index.ts'))) {
  const source = fs.readFileSync(file, 'utf8')
  if (!source.includes('SUPABASE_SECRET_KEYS')) {
    throw new Error(`Service-key compatibility was not applied to ${file}`)
  }
  if (source.includes("Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY')")) {
    throw new Error(`Legacy singular secret-key fallback remains in ${file}`)
  }
}

console.log(changed.length ? `Normalized: ${changed.join(', ')}` : 'Supabase service-key compatibility already normalized')
