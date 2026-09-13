import { NextResponse } from 'next/server'
import { Pool } from 'pg'
import { getSessionUser } from '@/lib/authorization'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
export async function GET() {
  const user = await getSessionUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Yönetici yetkisi gerekli' }, { status: 403 })
  await pool.query(`CREATE TABLE IF NOT EXISTS zirveflow_audit_logs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, action TEXT NOT NULL, details JSONB NOT NULL DEFAULT '{}'::jsonb, actor_name TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`)
  const result = await pool.query('SELECT id, user_id, entity_type, entity_id, action, details, actor_name, created_at FROM zirveflow_audit_logs ORDER BY created_at DESC LIMIT 500')
  return NextResponse.json({ logs: result.rows })
}
