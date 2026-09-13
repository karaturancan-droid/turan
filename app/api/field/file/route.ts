import { get } from '@vercel/blob'
import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/authorization'

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user || user.accountStatus !== 'approved') return NextResponse.json({ error: 'Yetkili oturum gerekli' }, { status: 401 })
  const pathname = new URL(request.url).searchParams.get('pathname')
  if (!pathname || !pathname.startsWith(`field/${user.id}/`)) return NextResponse.json({ error: 'Dosyaya erişim yetkiniz yok' }, { status: 403 })
  const result = await get(pathname, { access: 'private', ifNoneMatch: request.headers.get('if-none-match') ?? undefined })
  if (!result) return new NextResponse('Dosya bulunamadı', { status: 404 })
  if (result.statusCode === 304) return new NextResponse(null, { status: 304, headers: { ETag: result.blob.etag, 'Cache-Control': 'private, no-cache' } })
  return new NextResponse(result.stream, { headers: { 'Content-Type': result.blob.contentType, ETag: result.blob.etag, 'Cache-Control': 'private, no-cache' } })
}
