import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/authorization'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user || user.accountStatus !== 'approved') {
    return NextResponse.json({ error: 'Onaylı oturum gerekli' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Dosya seçilmedi' }, { status: 400 })
  if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: 'Sadece JPG, PNG, WEBP veya PDF yüklenebilir' }, { status: 400 })
  if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'Dosya boyutu 10 MB sınırını aşamaz' }, { status: 400 })

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-100)
  const blob = await put(`field/${user.id}/${Date.now()}-${safeName}`, file, { access: 'private', addRandomSuffix: true })
  return NextResponse.json({ pathname: blob.pathname, contentType: file.type, size: file.size })
}
