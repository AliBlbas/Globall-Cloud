export function resolveServiceKey(): string | null {
  const direct = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim()
  if (direct) return direct

  const raw = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (!raw) return null

  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed === 'string' && parsed.trim()) return parsed.trim()
    if (parsed && typeof parsed === 'object') {
      const record = parsed as Record<string, unknown>
      if (typeof record.default === 'string' && record.default.trim()) return record.default.trim()
      const first = Object.values(record).find((value) => typeof value === 'string' && value.trim())
      if (typeof first === 'string') return first.trim()
    }
  } catch {
    return null
  }

  return null
}

export function requireServiceKey(): string {
  const key = resolveServiceKey()
  if (!key) throw new Error('Supabase service configuration is unavailable')
  return key
}
