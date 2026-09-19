export const CANONICAL_ROLES = ['customer', 'driver', 'warehouse', 'operations', 'finance', 'admin'] as const
export type CanonicalRole = typeof CANONICAL_ROLES[number]

const ROLE_ALIASES: Record<string, CanonicalRole> = {
  customer: 'customer',
  driver: 'driver',
  warehouse: 'warehouse',
  operations: 'operations',
  finance: 'finance',
  accountant: 'finance',
  admin: 'admin',
  super_admin: 'admin',
}

export function normalizeRole(role: unknown): CanonicalRole | null {
  if (typeof role !== 'string') return null
  return ROLE_ALIASES[role.trim().toLowerCase()] ?? null
}

export function canReadOperations(role: unknown): boolean {
  return ['admin', 'operations', 'finance', 'warehouse', 'driver'].includes(normalizeRole(role) ?? '')
}

export function canManageShipments(role: unknown): boolean {
  return ['admin', 'operations', 'warehouse'].includes(normalizeRole(role) ?? '')
}

export function canManageShipmentEvents(role: unknown): boolean {
  return ['admin', 'operations', 'warehouse', 'driver'].includes(normalizeRole(role) ?? '')
}

export function canManageFinance(role: unknown): boolean {
  return normalizeRole(role) === 'finance' || normalizeRole(role) === 'admin'
}
