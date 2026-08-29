import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const functionsDir = path.join(root, 'supabase', 'functions')
const targets = ['logistics-control-plane', 'document-access', 'account-admin', 'operations-admin']

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

const normalize = (source, file) => {
  if (source.includes('const resolveServiceKey = () =>')) return source

  const pattern = /const serviceClient = \(\) => \{\n  const url = Deno\.env\.get\('SUPABASE_URL'\)\n  const (?:secret|key) = Deno\.env\.get\('SUPABASE_SERVICE_ROLE_KEY'\) \|\| Deno\.env\.get\('SUPABASE_SECRET_KEY'\)\n  if \(!url \|\| (?:secret|key)\) throw new Error\('Supabase service configuration is unavailable'\)\)\n  return createClient\(url, (?:secret|key), \{[\s\S]*?\n\}\n/
  if (!pattern.test(source)) throw new Error(`No legacy serviceClient pattern found in ${file}`)

  const replacement = `${helper}\nconst serviceClient = () => {
  const url = Deno.env.get('SUPABASE_URL')
  const secret = resolveServiceKey()
  if (!url || !secret) throw new Error('Supabase service configuration is unavailable')
  return createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
}
`
  return source.replace(pattern, replacement)
}

for (const name of targets) {
  const file = path.join(functionsDir, name, 'index.ts')
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}`)
  const before = fs.readFileSync(file, 'utf8')
  const after = normalize(before, file)
  if (after !== before) fs.writeFileSync(file, after)
}

for (const name of targets) {
  const file = path.join(functionsDir, name, 'index.ts')
  const source = fs.readFileSync(file, 'utf8')
  if (!source.includes('const resolveServiceKey = () =>')) throw new Error(`Secret resolver missing in ${file}`)
  if (source.includes("Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY')")) throw new Error(`Legacy secret fallback remains in ${file}`)
}

console.log('Supabase service-key compatibility is normalized.')
