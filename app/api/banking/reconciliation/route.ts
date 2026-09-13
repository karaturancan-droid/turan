import { NextResponse } from 'next/server'
import { Pool } from 'pg'
import { getSessionUser, canAccess } from '@/lib/authorization'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
async function ensureSchema() { await pool.query(`ALTER TABLE zirveflow_bank_transactions ADD COLUMN IF NOT EXISTS reconciled BOOLEAN NOT NULL DEFAULT FALSE`); await pool.query(`ALTER TABLE zirveflow_bank_transactions ADD COLUMN IF NOT EXISTS reconciliation_note TEXT`) }

export async function GET() {
  const user = await getSessionUser()
  if (!user || !canAccess(user, 'finance', 'read')) return NextResponse.json({ error: 'Finans yetkisi gerekli' }, { status: 403 })
  await ensureSchema()
  const result = await pool.query('SELECT id, account_name, booked_at, description, amount, currency, direction, category, reconciled, reconciliation_note FROM zirveflow_bank_transactions WHERE user_id = $1 ORDER BY booked_at DESC LIMIT 500', [user.id])
  return NextResponse.json({ transactions: result.rows })
}

export async function PATCH(request: Request) {
  const user = await getSessionUser()
  if (!user || !canAccess(user, 'finance', 'write')) return NextResponse.json({ error: 'Finans yazma yetkisi gerekli' }, { status: 403 })
  const body = await request.json().catch(() => null)
  if (!body?.id || typeof body.reconciled !== 'boolean') return NextResponse.json({ error: 'Hareket ve mutabakat durumu gerekli' }, { status: 400 })
  await ensureSchema()
  const result = await pool.query('UPDATE zirveflow_bank_transactions SET reconciled = $1, reconciliation_note = $2 WHERE id = $3 AND user_id = $4 RETURNING id, reconciled, reconciliation_note', [body.reconciled, typeof body.note === 'string' ? body.note.trim().slice(0, 500) : null, body.id, user.id])
  if (!result.rowCount) return NextResponse.json({ error: 'Banka hareketi bulunamadı' }, { status: 404 })
  return NextResponse.json({ transaction: result.rows[0] })
}
