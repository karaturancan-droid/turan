import { NextResponse } from 'next/server'
import { Pool } from 'pg'
import { getSessionUser, canAccess } from '@/lib/authorization'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const safeResources = new Set(['fuel', 'production', 'inventory', 'faults', 'finance', 'purchases'])
export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Oturum gerekli' }, { status: 401 })
  const resource = new URL(request.url).searchParams.get('resource') || ''
  if (!safeResources.has(resource) || !canAccess(user, resource, 'read')) return NextResponse.json({ error: 'Bu veriyi dışa aktarma yetkiniz yok' }, { status: 403 })
  const result = await pool.query('SELECT id, payload, created_at, updated_at FROM zirveflow_business_records WHERE user_id = $1 AND resource = $2 AND archived = FALSE ORDER BY created_at DESC LIMIT 5000', [user.id, resource])
  const rows = result.rows.map(row => ({ id: row.id, ...row.payload, created_at: row.created_at, updated_at: row.updated_at }))
  const headers = Array.from(new Set(rows.flatMap(row => Object.keys(row))))
  const csv = [headers.join(','), ...rows.map(row => headers.map(header => JSON.stringify(row[header] ?? '')).join(','))].join('\n')
  return new NextResponse(`\uFEFF${csv}`, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="zirveflow-${resource}.csv"`, 'Cache-Control': 'no-store' } })
}
