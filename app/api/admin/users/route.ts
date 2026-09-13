import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { Pool } from 'pg'
import { auth } from '@/lib/auth'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function adminSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user && String((session.user as { role?: string }).role) === 'admin' ? session.user : null
}

async function ensureAuditTable() {
  await pool.query(`CREATE TABLE IF NOT EXISTS zirveflow_audit_logs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, action TEXT NOT NULL, details JSONB NOT NULL DEFAULT '{}'::jsonb, actor_name TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`)
}

async function recordAdminAction(actor: { id: string; name?: string | null }, action: string, targetId: string, details: unknown) {
  await ensureAuditTable()
  await pool.query('INSERT INTO zirveflow_audit_logs (user_id, entity_type, entity_id, action, details, actor_name) VALUES ($1,$2,$3,$4,$5,$6)', [actor.id, 'user_account', targetId, action, JSON.stringify(details || {}), actor.name || 'Yönetici'])
}

export async function GET() {
  if (!(await adminSession())) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  const result = await pool.query('SELECT id, name, email, role, permissions, "accountStatus", "createdAt" FROM "user" ORDER BY "createdAt" DESC')
  return NextResponse.json({ users: result.rows })
}

export async function PATCH(request: Request) {
  if (!(await adminSession())) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  const body = await request.json().catch(() => null) as { userId?: string; status?: string; role?: string; permissions?: string[]; action?: string } | null
  if (!body?.userId) return NextResponse.json({ error: 'Kullanıcı seçilmedi' }, { status: 400 })
  const actor = await adminSession()
  if (!actor) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  if (body.action === 'delete') {
    const admin = actor
    if (admin.id === body.userId) return NextResponse.json({ error: 'Kendi hesabınızı silemezsiniz' }, { status: 400 })
    const admins = await pool.query('SELECT COUNT(*)::int AS count FROM "user" WHERE role = $1 AND "accountStatus" = $2', ['admin', 'approved'])
    const target = await pool.query('SELECT role FROM "user" WHERE id = $1', [body.userId])
    if (target.rows[0]?.role === 'admin' && admins.rows[0].count <= 1) return NextResponse.json({ error: 'Son yönetici hesabı silinemez' }, { status: 400 })
    await pool.query('UPDATE "user" SET "accountStatus" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2', ['disabled', body.userId])
    await recordAdminAction(actor, 'account_disabled', body.userId, { previousRole: target.rows[0]?.role })
    return NextResponse.json({ disabled: true })
  }
  if (!['pending', 'approved', 'rejected'].includes(body.status || '')) return NextResponse.json({ error: 'Geçersiz hesap durumu' }, { status: 400 })
  const allowedRoles = ['field', 'finance', 'operations', 'fuel', 'driver', 'admin']
  if (body.role && !allowedRoles.includes(body.role)) return NextResponse.json({ error: 'Geçersiz kullanıcı rolü' }, { status: 400 })
  const permissions = Array.isArray(body.permissions) ? body.permissions.filter(permission => typeof permission === 'string').slice(0, 30) : []
  const result = await pool.query('UPDATE "user" SET "accountStatus" = $1, role = COALESCE($2, role), permissions = $3::jsonb, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $4 RETURNING id, name, email, role, permissions, "accountStatus"', [body.status, body.role || null, JSON.stringify(permissions), body.userId])
  if (!result.rowCount) return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
  await recordAdminAction(actor, body.status === 'approved' ? 'account_approved' : body.status === 'rejected' ? 'account_rejected' : 'account_updated', body.userId, { role: body.role || null, permissions })
  return NextResponse.json({ user: result.rows[0] })
}
