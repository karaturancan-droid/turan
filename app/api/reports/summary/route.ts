import { NextResponse } from 'next/server'
import { Pool } from 'pg'
import { getSessionUser, canAccess } from '@/lib/authorization'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Oturum gerekli' }, { status: 401 })
  if (!canAccess(user, 'reports')) return NextResponse.json({ error: 'Rapor yetkiniz yok.' }, { status: 403 })
  await pool.query(`CREATE TABLE IF NOT EXISTS zirveflow_business_records (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT NOT NULL, resource TEXT NOT NULL, payload JSONB NOT NULL DEFAULT '{}'::jsonb, archived BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`)
  const params = new URL(request.url).searchParams
  const from = params.get('from') || '2000-01-01'
  const to = params.get('to') || '2100-01-01'
  const scope = user.role === 'admin' || user.role === 'operations' || user.role === 'finance' ? '' : ' AND user_id = $3'
  const result = await pool.query(`
    SELECT resource, COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE created_at >= $1::date AND created_at < ($2::date + INTERVAL '1 day'))::int AS period_total,
      MAX(created_at) AS last_created_at
    FROM zirveflow_business_records
    WHERE archived = FALSE AND created_at >= $1::date AND created_at < ($2::date + INTERVAL '1 day')${scope}
    GROUP BY resource ORDER BY resource ASC
  `, scope ? [from, to, user.id] : [from, to])
  const total = result.rows.reduce((sum: number, row: { period_total: number }) => sum + row.period_total, 0)
  return NextResponse.json({ from, to, total, byResource: result.rows })
}
