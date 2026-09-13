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
  const result = await pool.query('SELECT id, name, email, role, "accountStatus", "createdAt" FROM "user" ORDER BY "createdAt" DESC')
  return NextResponse.json({ users: result.rows })
}

export async function PATCH(request: Request) {
  if (!(await adminSession())) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  const body = await request.json().catch(() => null) as { userId?: string; status?: string; role?: string } | null
  if (!body?.userId || !['pending', 'approved', 'rejected'].includes(body.status || '')) return NextResponse.json({ error: 'Geçersiz hesap durumu' }, { status: 400 })
  const result = await pool.query('UPDATE "user" SET "accountStatus" = $1, role = COALESCE($2, role), "updatedAt" = CURRENT_TIMESTAMP WHERE id = $3 RETURNING id, name, email, role, "accountStatus"', [body.status, body.role || null, body.userId])
  if (!result.rowCount) return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
  return NextResponse.json({ user: result.rows[0] })
}
