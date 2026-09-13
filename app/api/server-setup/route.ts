import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Oturum gerekli' }, { status: 401 })
  return NextResponse.json({
    mode: 'installer-required',
    platform: 'windows',
    dockerComposeReady: true,
    migrationReady: true,
    localStorage: 'docker-volume',
    network: 'lan-vpn',
    instructions: ['Docker Desktop kurulmalı ve çalışıyor olmalı.', 'Installer PowerShell ile çalıştırılmalı.', 'Kurulum sonunda LAN adresi ile istemciler bağlanabilir.'],
  })
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Oturum gerekli' }, { status: 401 })
  const body = await request.json().catch(() => ({})) as { mode?: string; dataPath?: string; backupPath?: string; migrateNeon?: boolean; useGoogleDrive?: boolean }
  if (!['server', 'client'].includes(body.mode || '')) return NextResponse.json({ error: 'Sunucu rolü seçilmelidir.' }, { status: 400 })
  return NextResponse.json({ ok: true, installerRequired: true, migration: body.migrateNeon === true ? 'installer' : 'new-local-database', storage: body.useGoogleDrive === true ? 'local-plus-google-drive' : 'local-only', dataPath: body.dataPath, backupPath: body.backupPath })
}
