import { NextResponse } from 'next/server'
import { getSessionUser, canAccess } from '@/lib/authorization'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export async function GET() {
  const user = await getSessionUser()
  if (!user || !canAccess(user, 'finance', 'read')) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  const result = await pool.query(`SELECT c.id, c.name, c.tax_number AS "taxNumber", c.phone, c.email, c.address, c.notes, c.created_at AS "createdAt", COALESCE(SUM(CASE WHEN l.entry_type IN ('invoice','debt','purchase') AND l.status <> 'paid' THEN l.amount WHEN l.entry_type IN ('payment','receipt') THEN -l.amount ELSE 0 END), 0)::numeric AS balance, COUNT(l.id)::int AS "entryCount" FROM zirveflow_companies c LEFT JOIN zirveflow_ledger_entries l ON l.company_id = c.id AND l.user_id = c.user_id WHERE c.user_id = $1 GROUP BY c.id ORDER BY c.name ASC`, [user.id])
  return NextResponse.json({ companies: result.rows })
}

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user || !canAccess(user, 'finance', 'write')) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  const body = await request.json().catch(() => null)
  if (!body?.name || typeof body.name !== 'string') return NextResponse.json({ error: 'Firma adı zorunludur' }, { status: 400 })
  const result = await pool.query('INSERT INTO zirveflow_companies (user_id, name, tax_number, phone, email, address, notes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, name, tax_number AS "taxNumber", phone, email, address, notes', [user.id, body.name.trim(), body.taxNumber || null, body.phone || null, body.email || null, body.address || null, body.notes || null])
  return NextResponse.json({ company: result.rows[0] }, { status: 201 })
}
