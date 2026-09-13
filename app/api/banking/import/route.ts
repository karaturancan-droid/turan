import { NextResponse } from 'next/server'
import { Pool } from 'pg'
import { canAccess, getSessionUser } from '@/lib/authorization'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function getUser() {
  const user = await getSessionUser()
  return user && canAccess(user, 'finance', 'write') ? user : null
}

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Finans yetkisi gerekli' }, { status: 403 })

  const body = await request.json() as { bankName?: string; rows?: Array<Record<string, unknown>>; fileName?: string }
  if (!body.bankName || !Array.isArray(body.rows) || body.rows.length === 0) {
    return NextResponse.json({ error: 'Banka ve işlem satırları gerekli' }, { status: 400 })
  }

  const connection = await pool.query(
    `INSERT INTO zirveflow_bank_connections (user_id, provider, bank_name, status, accounts_count, last_synced_at)
     VALUES ($1, 'statement-import', $2, 'connected', 1, NOW())
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [user.id, body.bankName],
  )
  let connectionId = connection.rows[0]?.id as number | undefined
  if (!connectionId) {
    const existing = await pool.query('SELECT id FROM zirveflow_bank_connections WHERE user_id = $1 AND bank_name = $2 ORDER BY id DESC LIMIT 1', [user.id, body.bankName])
    connectionId = existing.rows[0]?.id
  }
  if (!connectionId) return NextResponse.json({ error: 'Banka bağlantısı oluşturulamadı' }, { status: 500 })

  let imported = 0
  for (const row of body.rows.slice(0, 2000)) {
    const externalId = String(row.externalId || row.id || `${body.fileName || 'statement'}-${row.date}-${row.description}-${row.amount}`)
    const amount = Number(String(row.amount ?? '0').replace(/[^0-9,-]/g, '').replace(',', '.')) || 0
    if (!row.date || !row.description || !amount) continue
    const result = await pool.query(
      `INSERT INTO zirveflow_bank_transactions (user_id, connection_id, external_id, account_name, booked_at, description, amount, currency, direction, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'TRY', $8, $9)
       ON CONFLICT (connection_id, external_id) DO NOTHING`,
      [user.id, connectionId, externalId, row.account || body.bankName, row.date, row.description, Math.abs(amount), amount >= 0 ? 'in' : 'out', row.category || 'Diğer'],
    )
    if (result.rowCount) imported += 1
  }
  await pool.query('UPDATE zirveflow_bank_connections SET status = $1, last_synced_at = NOW(), updated_at = NOW() WHERE id = $2 AND user_id = $3', ['connected', connectionId, user.id])
  await pool.query('INSERT INTO zirveflow_audit_logs (user_id, actor_name, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5, $6)', [user.id, user.name, 'statement_imported', 'bank_transaction', String(connectionId), JSON.stringify({ fileName: body.fileName, received: body.rows.length, imported })])
  return NextResponse.json({ imported, skipped: body.rows.length - imported, connectionId })
}

export const dynamic = 'force-dynamic'
