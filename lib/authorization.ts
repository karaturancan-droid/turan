import { headers } from 'next/headers'
import { auth } from '@/lib/auth'

export const USER_ROLES = ['field', 'finance', 'operations', 'fuel', 'driver', 'admin'] as const
export type UserRole = typeof USER_ROLES[number]

export const ROLE_LABELS: Record<UserRole, string> = {
  field: 'Saha çalışanı',
  finance: 'Muhasebe / finans',
  operations: 'Operasyon yöneticisi',
  fuel: 'Yakıt sorumlusu',
  driver: 'Şoför',
  admin: 'Yönetici',
}

export type SessionUser = { id: string; name?: string | null; email?: string | null; role?: string | null; permissions?: string[] | null; accountStatus?: string | null }

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null
  return session.user as SessionUser
}

export function normalizeRole(role?: string | null): UserRole {
  return USER_ROLES.includes(role as UserRole) ? role as UserRole : 'field'
}

export function canAccess(user: SessionUser, resource: string, action: 'read' | 'write' = 'read') {
  if (user.accountStatus && user.accountStatus !== 'approved') return false
  const role = normalizeRole(user.role)
  if (role === 'admin') return true
  const access: Record<string, UserRole[]> = {
    field: ['field', 'operations', 'fuel', 'driver'],
    production: ['field', 'operations'],
    operations: ['field', 'operations'],
    tasks: ['field', 'operations', 'driver'],
    maintenance: ['field', 'operations'],
    faults: ['field', 'operations', 'driver'],
    fuel: ['field', 'operations', 'fuel'],
    assets: ['field', 'operations'],
    finance: ['finance'],
    suppliers: ['finance', 'operations'],
    purchases: ['finance', 'operations'],
    documents: ['finance', 'operations'],
    reports: ['finance', 'operations'],
    sites: ['operations'],
  }
  const allowed = access[resource] || []
  if (!allowed.includes(role)) return false
  if (action === 'write' && role === 'driver' && !['field', 'tasks', 'faults'].includes(resource)) return false
  return true
}

export function hasPermission(user: SessionUser, permission: string) {
  return normalizeRole(user.role) === 'admin' || Boolean(user.permissions?.includes(permission))
}
