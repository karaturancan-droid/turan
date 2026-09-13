import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { Pool } from 'pg'
import { auth } from '@/lib/auth'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function adminSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user && String((session.user as { role?: string }).role) === 'admin' ? session.user : null
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
  if (body.action === 'delete') {
    const admin = await adminSession()
    if (admin.id === body.userId) return NextResponse.json({ error: 'Kendi hesabınızı silemezsiniz' }, { status: 400 })
    const admins = await pool.query('SELECT COUNT(*)::int AS count FROM "user" WHERE role = $1 AND "accountStatus" = $2', ['admin', 'approved'])
    const target = await pool.query('SELECT role FROM "user" WHERE id = $1', [body.userId])
    if (target.rows[0]?.role === 'admin' && admins.rows[0].count <= 1) return NextResponse.json({ error: 'Son yönetici hesabı silinemez' }, { status: 400 })
    await pool.query('DELETE FROM "user" WHERE id = $1', [body.userId])
    return NextResponse.json({ deleted: true })
  }
  if (!['pending', 'approved', 'rejected'].includes(body.status || '')) return NextResponse.json({ error: 'Geçersiz hesap durumu' }, { status: 400 })
  const allowedRoles = ['field', 'finance', 'operations', 'fuel', 'driver', 'admin']
  if (body.role && !allowedRoles.includes(body.role)) return NextResponse.json({ error: 'Geçersiz kullanıcı rolü' }, { status: 400 })
  const permissions = Array.isArray(body.permissions) ? body.permissions.filter(permission => typeof permission === 'string').slice(0, 30) : []
  const result = await pool.query('UPDATE "user" SET "accountStatus" = $1, role = COALESCE($2, role), permissions = $3::jsonb, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $4 RETURNING id, name, email, role, permissions, "accountStatus"', [body.status, body.role || null, JSON.stringify(permissions), body.userId])
  if (!result.rowCount) return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
  return NextResponse.json({ user: result.rows[0] })
}
