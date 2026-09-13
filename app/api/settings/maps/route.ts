import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { Pool } from 'pg'
import { auth } from '@/lib/auth'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

let schemaReady: Promise<void> | null = null
async function ensureMapColumns() { schemaReady ??= pool.query('ALTER TABLE zirveflow_company_settings ADD COLUMN IF NOT EXISTS google_maps_business JSONB, ADD COLUMN IF NOT EXISTS google_maps_regions JSONB').then(() => undefined); await schemaReady }

type Coordinate = { lat: number; lng: number }
type BusinessLocation = { name: string; address: string; position: Coordinate }
type Region = { id: string; name: string; color: string; path: Coordinate[] }

function parseJson<T>(value: unknown, fallback: T): T { return value && typeof value === 'object' ? value as T : fallback }

async function getUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null
  const role = (session.user as typeof session.user & { role?: string }).role
  return role && !['admin', 'manager', 'owner'].includes(role) ? null : session.user
}

export async function GET() {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Yönetici oturumu gerekli' }, { status: 403 })
    await ensureMapColumns()
    const result = await pool.query('SELECT google_maps_enabled, google_maps_business, google_maps_regions FROM zirveflow_company_settings WHERE user_id = $1', [user.id])
    return NextResponse.json({ enabled: result.rows[0]?.google_maps_enabled === true, apiConfigured: Boolean(process.env.GOOGLE_MAPS_API_KEY), business: parseJson<BusinessLocation | null>(result.rows[0]?.google_maps_business, null), regions: parseJson<Region[]>(result.rows[0]?.google_maps_regions, []) })
  } catch {
    return NextResponse.json({ enabled: false, apiConfigured: Boolean(process.env.GOOGLE_MAPS_API_KEY), error: 'Harita ayarı şu anda okunamadı.' }, { status: 200 })
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Yönetici oturumu gerekli' }, { status: 403 })
    await ensureMapColumns()
    const body = await request.json() as { enabled?: boolean; business?: BusinessLocation | null; regions?: Region[] }
    const enabled = body.enabled === true
    if (enabled && !process.env.GOOGLE_MAPS_API_KEY) return NextResponse.json({ error: 'Google Maps API anahtarı tanımlı değil.' }, { status: 400 })
    const business = body.business ?? null
    const regions = Array.isArray(body.regions) ? body.regions : []
    if (business && (!business.name || !business.position || typeof business.position.lat !== 'number' || typeof business.position.lng !== 'number')) return NextResponse.json({ error: 'İşletme konumu geçersiz.' }, { status: 400 })
    if (regions.some(region => !region.id || !region.name || !Array.isArray(region.path) || region.path.length < 3 || region.path.some(point => typeof point.lat !== 'number' || typeof point.lng !== 'number'))) return NextResponse.json({ error: 'İşletme bölgesi verisi geçersiz.' }, { status: 400 })
    await pool.query(`INSERT INTO zirveflow_company_settings (user_id, google_maps_enabled, google_maps_business, google_maps_regions, updated_at) VALUES ($1, $2, $3, $4, NOW()) ON CONFLICT (user_id) DO UPDATE SET google_maps_enabled = EXCLUDED.google_maps_enabled, google_maps_business = EXCLUDED.google_maps_business, google_maps_regions = EXCLUDED.google_maps_regions, updated_at = NOW()`, [user.id, enabled, JSON.stringify(business), JSON.stringify(regions)])
    await pool.query('INSERT INTO zirveflow_audit_logs (user_id, actor_name, action, entity_type, details) VALUES ($1, $2, $3, $4, $5)', [user.id, user.name, 'google_maps_location_updated', 'company_setting', JSON.stringify({ enabled, businessName: business?.name, regions: regions.length })])
    return NextResponse.json({ enabled, apiConfigured: true, business, regions })
  } catch {
    return NextResponse.json({ error: 'Harita ayarı kaydedilemedi.' }, { status: 500 })
  }
}
