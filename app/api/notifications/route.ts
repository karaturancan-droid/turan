import { NextResponse } from 'next/server'
import { Pool } from 'pg'
import { getSessionUser } from '@/lib/authorization'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Oturum gerekli' }, { status: 401 })
  const notifications: Array<{ id: string; type: string; title: string; detail: string }> = []
  if (user.role === 'admin') {
    const pending = await pool.query(`SELECT COUNT(*)::int AS count FROM "user" WHERE "accountStatus" = 'pending'`)
    if (pending.rows[0].count > 0) notifications.push({ id: 'pending-users', type: 'approval', title: 'Onay bekleyen kullanıcılar', detail: `${pending.rows[0].count} hesap yönetici onayı bekliyor.` })
  }
  try {
    const critical = await pool.query(`SELECT COUNT(*)::int AS count FROM zirveflow_business_records WHERE resource = 'inventory' AND archived = FALSE AND (payload->>'quantity')::numeric <= 0`)
    if (critical.rows[0].count > 0) notifications.push({ id: 'inventory-critical', type: 'inventory', title: 'Stok kontrolü gerekli', detail: `${critical.rows[0].count} stok kaydı kontrol bekliyor.` })
  } catch { }
  return NextResponse.json({ notifications, unread: notifications.length })
}
