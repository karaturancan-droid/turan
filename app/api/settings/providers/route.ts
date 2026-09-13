import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { Pool } from 'pg'
import { getToken } from '@vercel/connect'
import { encryptProviderSecret } from '@/lib/provider-secrets'

const DRIVE_CONNECTOR = 'google/zirveflow-shared-drive'
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const providers = [
  { id: 'neon', category: 'Veri tabanı', name: 'Neon Postgres', description: 'Operasyon, kullanıcı ve audit verilerinin ana veritabanı.', vars: ['DATABASE_URL'] },
  { id: 'better-auth', category: 'Kimlik', name: 'Better Auth', description: 'Kullanıcı hesapları, roller ve güvenli oturumlar.', vars: ['BETTER_AUTH_SECRET'] },
  { id: 'ai', category: 'Yapay zeka', name: 'AI Gateway / Google', description: 'AI asistanı ve belge analizi sağlayıcısı.', vars: ['AI_GATEWAY_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY'] },
  { id: 'blob', category: 'Dosya depolama', name: 'Vercel Blob', description: 'Fiş, arıza fotoğrafı ve belge yüklemeleri.', vars: ['BLOB_READ_WRITE_TOKEN'] },
  { id: 'maps', category: 'Harita', name: 'Google Maps', description: 'İşletme, ocak ve araç konumları.', vars: ['GOOGLE_MAPS_API_KEY'] },
  { id: 'banking', category: 'Finans', name: 'Open Banking', description: 'Türkiye bankaları için OAuth/API sağlayıcısı. Sağlayıcı seçilene kadar ekstre aktarımı aktif.', vars: ['OPEN_BANKING_CLIENT_ID', 'OPEN_BANKING_CLIENT_SECRET'] },
  { id: 'email', category: 'Bildirim', name: 'Transactional Email', description: 'Kritik stok, arıza ve davet bildirimleri.', vars: ['RESEND_API_KEY'] },
  { id: 'drive', category: 'Bulut yedekleme', name: 'Google Drive', description: 'Ortak hesap üzerinden dosya ve veritabanı yedekleri.', vars: [] },
]

async function getDriveToken(userId: string) { return getToken(DRIVE_CONNECTOR, { subject: { type: 'user', id: userId }, scopes: ['https://www.googleapis.com/auth/drive.file'] }) }

async function getAdmin() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null
  const role = (session.user as typeof session.user & { role?: string }).role
  return role && !['admin', 'manager', 'owner'].includes(role) ? null : session.user
}

export async function GET() {
  try {
    const user = await getAdmin()
    if (!user) return NextResponse.json({ error: 'Yönetici oturumu gerekli' }, { status: 403 })
    const result = await pool.query('SELECT provider_settings FROM zirveflow_company_settings WHERE user_id = $1', [user.id])
    const settings = (result.rows[0]?.provider_settings || {}) as Record<string, { enabled?: boolean; testedAt?: string; testStatus?: string; secretConfigured?: boolean }>
    const driveConfigured = await getDriveToken(user.id).then(() => true).catch(() => false)
    return NextResponse.json({ providers: providers.map((provider) => ({ ...provider, configured: provider.id === 'drive' ? driveConfigured : Boolean(settings[provider.id]?.secretConfigured) || provider.vars.some((key) => Boolean(process.env[key])), enabled: settings[provider.id]?.enabled === true, testedAt: settings[provider.id]?.testedAt || null, testStatus: settings[provider.id]?.testStatus || null, variables: provider.vars.map((key) => ({ key, configured: Boolean(process.env[key]) })) })) })
  } catch {
    return NextResponse.json({ providers: [], error: 'Sağlayıcı ayarları şu anda okunamadı.' }, { status: 200 })
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getAdmin()
    if (!user) return NextResponse.json({ error: 'Yönetici oturumu gerekli' }, { status: 403 })
    const body = await request.json() as { providerId?: string; enabled?: boolean; apiKey?: string }
    const provider = providers.find((item) => item.id === body.providerId)
    if (!provider) return NextResponse.json({ error: 'Geçersiz sağlayıcı.' }, { status: 400 })
    if (body.enabled && provider.id === 'drive') { try { await getDriveToken(user.id) } catch { return NextResponse.json({ error: 'Google Drive hesabı henüz bağlanmamış.' }, { status: 400 }) } }
    const current = await pool.query('SELECT provider_settings FROM zirveflow_company_settings WHERE user_id = $1', [user.id])
    const settings = (current.rows[0]?.provider_settings || {}) as Record<string, Record<string, unknown>>
    const storedSecret = Boolean(settings[provider.id]?.secretConfigured)
    if (body.enabled && provider.id !== 'drive' && !body.apiKey?.trim() && !storedSecret && !provider.vars.some((key) => Boolean(process.env[key]))) return NextResponse.json({ error: `${provider.name} için gerekli API bilgisi eksik.` }, { status: 400 })
    if (body.apiKey?.trim()) { if (body.apiKey.length < 12) return NextResponse.json({ error: 'API anahtarı çok kısa.' }, { status: 400 }); settings[provider.id] = { ...(settings[provider.id] || {}), secret: encryptProviderSecret(body.apiKey.trim()), secretConfigured: true } }
    settings[provider.id] = { ...(settings[provider.id] || {}), enabled: body.enabled === true, testedAt: null, testStatus: null }
    await pool.query(`INSERT INTO zirveflow_company_settings (user_id, provider_settings, updated_at) VALUES ($1, $2::jsonb, NOW()) ON CONFLICT (user_id) DO UPDATE SET provider_settings = EXCLUDED.provider_settings, updated_at = NOW()`, [user.id, JSON.stringify(settings)])
    return NextResponse.json({ providerId: provider.id, enabled: body.enabled === true })
  } catch { return NextResponse.json({ error: 'Sağlayıcı ayarı kaydedilemedi.' }, { status: 500 }) }
}

export async function POST(request: Request) {
  try {
    const user = await getAdmin()
    if (!user) return NextResponse.json({ error: 'Yönetici oturumu gerekli' }, { status: 403 })
    const body = await request.json() as { providerId?: string }
    const provider = providers.find((item) => item.id === body.providerId)
    if (!provider) return NextResponse.json({ error: 'Geçersiz sağlayıcı.' }, { status: 400 })
    const current = await pool.query('SELECT provider_settings FROM zirveflow_company_settings WHERE user_id = $1', [user.id])
    const savedSettings = (current.rows[0]?.provider_settings || {}) as Record<string, { secretConfigured?: boolean }>
    const configured = provider.id === 'drive' ? await getDriveToken(user.id).then(async (token) => { const response = await fetch('https://www.googleapis.com/drive/v3/about?fields=user%2CstorageQuota', { headers: { Authorization: `Bearer ${token}` } }); return response.ok }) : Boolean(savedSettings[provider.id]?.secretConfigured) || provider.vars.some((key) => Boolean(process.env[key]))
    const settings = (current.rows[0]?.provider_settings || {}) as Record<string, Record<string, unknown>>
    settings[provider.id] = { ...(settings[provider.id] || {}), testedAt: new Date().toISOString(), testStatus: configured ? 'success' : 'missing_config' }
    await pool.query(`INSERT INTO zirveflow_company_settings (user_id, provider_settings, updated_at) VALUES ($1, $2::jsonb, NOW()) ON CONFLICT (user_id) DO UPDATE SET provider_settings = EXCLUDED.provider_settings, updated_at = NOW()`, [user.id, JSON.stringify(settings)])
    return NextResponse.json({ ok: configured, status: configured ? 'success' : 'missing_config', message: configured ? `${provider.name} bağlantısı hazır.` : 'Gerekli bağlantı değişkenleri eksik.' }, { status: configured ? 200 : 400 })
  } catch { return NextResponse.json({ error: 'Bağlantı testi yapılamadı.' }, { status: 500 }) }
}
