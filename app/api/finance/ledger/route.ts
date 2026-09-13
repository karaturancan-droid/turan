import { NextResponse } from 'next/server'
import { getSessionUser, canAccess } from '@/lib/authorization'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const entryTypes = ['invoice', 'debt', 'receivable', 'payment', 'receipt', 'purchase']

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user || !canAccess(user, 'finance', 'read')) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  const companyId = new URL(request.url).searchParams.get('companyId')
  const values: string[] = [user.id]
  const filter = companyId ? ' AND l.company_id = $2' : ''
  if (companyId) values.push(companyId)
  const result = await pool.query(`SELECT l.id, l.company_id AS "companyId", c.name AS "companyName", l.entry_type AS "entryType", l.document_number AS "documentNumber", l.description, l.amount::numeric, l.due_date AS "dueDate", l.status, l.attachment_pathname AS "attachmentPathname", l.created_at AS "createdAt" FROM zirveflow_ledger_entries l JOIN zirveflow_companies c ON c.id = l.company_id AND c.user_id = l.user_id WHERE l.user_id = $1${filter} ORDER BY l.created_at DESC`, values)
  return NextResponse.json({ entries: result.rows })
}

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user || !canAccess(user, 'finance', 'write')) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  const body = await request.json().catch(() => null)
  if (!body?.companyId || !entryTypes.includes(body.entryType) || !body.description || typeof body.amount !== 'number' || !Number.isFinite(body.amount) || body.amount <= 0) return NextResponse.json({ error: 'Firma, hareket tipi, açıklama ve pozitif tutar zorunludur' }, { status: 400 })
  const company = await pool.query('SELECT id FROM zirveflow_companies WHERE id = $1 AND user_id = $2', [body.companyId, user.id])
  if (!company.rowCount) return NextResponse.json({ error: 'Firma bulunamadı' }, { status: 404 })
  const result = await pool.query('INSERT INTO zirveflow_ledger_entries (user_id, company_id, entry_type, document_number, description, amount, due_date, status, attachment_pathname) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id, company_id AS "companyId", entry_type AS "entryType", document_number AS "documentNumber", description, amount::numeric, due_date AS "dueDate", status', [user.id, body.companyId, body.entryType, body.documentNumber || null, body.description.trim(), body.amount, body.dueDate || null, body.status || 'open', body.attachmentPathname || null])
  return NextResponse.json({ entry: result.rows[0] }, { status: 201 })
}
