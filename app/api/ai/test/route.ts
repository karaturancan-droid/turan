import { generateText } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { provider?: 'google' | 'gateway'; model?: string; apiKey?: string } | null
  const apiKey = body?.apiKey || process.env.API_KEY
  if (!apiKey && body?.provider !== 'gateway') return Response.json({ error: 'API anahtarı gerekli.' }, { status: 400 })
  try {
    const provider = createGoogleGenerativeAI({ apiKey: apiKey || process.env.API_KEY })
    await generateText({ model: provider(body?.model === 'gemini-2.5-pro' ? 'gemini-2.5-pro' : 'gemini-2.5-flash'), prompt: 'Sadece OK yanıtı ver.' })
    return Response.json({ ok: true })
  } catch {
    return Response.json({ error: 'AI bağlantısı kurulamadı.' }, { status: 502 })
  }
}
