import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { Pool } from 'pg'
import { auth } from '@/lib/auth'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const banks = [
  { id: 'ziraat', name: 'Ziraat Bankası', provider: 'open-banking' },
  { id: 'isbank', name: 'İş Bankası', provider: 'open-banking' },
  { id: 'garanti', name: 'Garanti BBVA', provider: 'open-banking' },
  { id: 'akbank', name: 'Akbank', provider: 'open-banking' },
  { id: 'yapi-kredi', name: 'Yapı Kredi', provider: 'open-banking' },
  { id: 'vakifbank', name: 'VakıfBank', provider: 'open-banking' },
  { id: 'halkbank', name: 'Halkbank', provider: 'open-banking' },
]

async function getUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  const user = session?.user
  if (!user) return null
  const role = (user as typeof user & { role?: string }).role
  if (role && !['admin', 'manager', 'owner'].includes(role)) return null
  return user
}

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Oturum gerekli' }, { status: 401 })
  const result = await pool.query('SELECT id, provider, bank_name, status, accounts_count, last_synced_at, created_at FROM zirveflow_bank_connections WHERE user_id = $1 ORDER BY created_at DESC', [user.id])
  const transactions = await pool.query(`SELECT t.id, c.bank_name, t.booked_at, t.description, t.amount, t.direction, t.category FROM zirveflow_bank_transactions t JOIN zirveflow_bank_connections c ON c.id = t.connection_id WHERE t.user_id = $1 ORDER BY t.booked_at DESC, t.id DESC LIMIT 100`, [user.id])
  return NextResponse.json({ banks, connections: result.rows, transactions: transactions.rows })
}

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Oturum gerekli' }, { status: 401 })
  const body = await request.json() as { bankId?: string; demo?: boolean }
  const bank = banks.find((item) => item.id === body.bankId)
  if (!bank) return NextResponse.json({ error: 'Geçersiz banka' }, { status: 400 })
  const status = body.demo ? 'connected' : 'pending'
  const result = await pool.query('INSERT INTO zirveflow_bank_connections (user_id, provider, bank_name, status, accounts_count, last_synced_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, bank_name, status, accounts_count, last_synced_at', [user.id, body.demo ? 'statement-import-demo' : bank.provider, bank.name, status, body.demo ? 1 : 0, body.demo ? new Date() : null])
  await pool.query('INSERT INTO zirveflow_audit_logs (user_id, actor_name, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5, $6)', [user.id, user.name, 'bank_connection_started', 'bank_connection', result.rows[0].id, JSON.stringify({ bank: bank.name })])
  return NextResponse.json({ connection: result.rows[0], nextStep: 'provider_authorization_required' }, { status: 201 })
}

export async function PATCH(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Oturum gerekli' }, { status: 401 })
  const body = await request.json() as { id?: number; status?: string }
  if (!body.id || !['connected', 'disconnected', 'pending'].includes(body.status ?? '')) return NextResponse.json({ error: 'Bağlantı bilgisi geçersiz' }, { status: 400 })
  const result = await pool.query('UPDATE zirveflow_bank_connections SET status = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING id, bank_name, status, accounts_count, last_synced_at', [body.status, body.id, user.id])
  if (!result.rowCount) return NextResponse.json({ error: 'Bağlantı bulunamadı' }, { status: 404 })
  return NextResponse.json({ connection: result.rows[0] })
}

export async function DELETE(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Oturum gerekli' }, { status: 401 })
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Bağlantı id gerekli' }, { status: 400 })
  await pool.query('DELETE FROM zirveflow_bank_connections WHERE id = $1 AND user_id = $2', [id, user.id])
  return NextResponse.json({ ok: true })
}

export const dynamic = 'force-dynamic'

