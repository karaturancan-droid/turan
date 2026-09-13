import { NextResponse } from 'next/server'
import { Pool } from 'pg'
import { canAccess, getSessionUser } from '@/lib/authorization'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const types = ['sites', 'vehicles', 'materials', 'personnel'] as const

async function ensureTable() {
  await pool.query(`CREATE TABLE IF NOT EXISTS zirveflow_master_data (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT NOT NULL, type TEXT NOT NULL, code TEXT NOT NULL, name TEXT NOT NULL, details JSONB NOT NULL DEFAULT '{}'::jsonb, active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(user_id, type, code))`)
}

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user || !canAccess(user, 'sites', 'read')) return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
  const type = new URL(request.url).searchParams.get('type')
  if (!type || !types.includes(type as typeof types[number])) return NextResponse.json({ error: 'Geçerli bir master data tipi gerekli' }, { status: 400 })
  await ensureTable()
  const result = await pool.query('SELECT id, type, code, name, details, active, created_at, updated_at FROM zirveflow_master_data WHERE type = $1 AND active = TRUE ORDER BY name ASC', [type])
  return NextResponse.json({ data: result.rows })
}

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user || !canAccess(user, 'sites', 'write')) return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
  const body = await request.json().catch(() => null)
  if (!body || typeof body.type !== 'string' || !types.includes(body.type) || typeof body.code !== 'string' || typeof body.name !== 'string') return NextResponse.json({ error: 'Tip, kod ve ad zorunludur' }, { status: 400 })
  await ensureTable()
  const result = await pool.query('INSERT INTO zirveflow_master_data (user_id, type, code, name, details) VALUES ($1,$2,$3,$4,$5) RETURNING id, type, code, name, details, active, created_at, updated_at', [user.id, body.type, body.code.trim().slice(0, 50), body.name.trim().slice(0, 120), JSON.stringify(body.details || {})])
  return NextResponse.json({ data: result.rows[0] }, { status: 201 })
}
