import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'

const allowedTypes = new Set(['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/csv','image/png','image/jpeg'])
const maxSize = 10 * 1024 * 1024

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Dosya seçilmedi.' }, { status: 400 })
  if (!allowedTypes.has(file.type)) return NextResponse.json({ error: 'PDF, Word, Excel, PNG, JPEG veya CSV yükleyebilirsiniz.' }, { status: 415 })
  if (file.size > maxSize) return NextResponse.json({ error: 'Dosya boyutu en fazla 10 MB olabilir.' }, { status: 413 })
  const blob = await put(`zirveflow/uploads/${Date.now()}-${file.name}`, file, { access: 'private', addRandomSuffix: true })
  return NextResponse.json({ pathname: blob.pathname, filename: file.name, contentType: file.type, size: file.size })
}
