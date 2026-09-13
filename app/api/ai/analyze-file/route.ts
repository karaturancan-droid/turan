import { generateText } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { NextResponse } from 'next/server'

const imageTypes = new Set(['image/png','image/jpeg'])

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Dosya seçilmedi.' }, { status: 400 })
  if (!process.env.API_KEY) return NextResponse.json({ error: 'AI anahtarı yapılandırılmamış.' }, { status: 503 })
  const googleAI = createGoogleGenerativeAI({ apiKey: process.env.API_KEY })
  const context = String(formData.get('context') || '')
  const instruction = `Bu dosya Ünaldı Madencilik işletmesine ait olabilir. Türkçe analiz yap. Dosya türü: ${file.type}. Dosya adı: ${file.name}. Kullanıcı onayı olmadan hiçbir kayıt ekleme. Bir fiş/fatura ise tarih, satıcı, toplam, KDV, kalemler ve hangi ocakla ilişkilendirilebileceğini çıkar. Sonunda ÖNERİLEN MODÜL, ALANLAR ve ONAY BEKLENİYOR başlıklarını kullan. Bilgi okunamıyorsa açıkça belirt. Uygulama bağlamı: ${context}`
  const content = imageTypes.has(file.type) ? [{ type: 'text' as const, text: instruction }, { type: 'image' as const, image: new Uint8Array(await file.arrayBuffer()) }] : instruction + ` Dosyanın içeriği bu ortamda doğrudan okunamıyorsa, kullanıcıdan metin veya ekran görüntüsü istemek yerine dosyayı inceleme bekleyen belge olarak işaretle.`
  const result = await generateText({ model: googleAI('gemini-2.5-flash'), system: 'Sen belge ve fiş analiz asistanısın. Kesin muhasebe kaydı yapma; yalnızca taslak çıkar ve mutlaka kullanıcı onayı iste.', messages: [{ role: 'user', content }] as never, maxOutputTokens: 1800 })
  return NextResponse.json({ text: result.text, filename: file.name, contentType: file.type, requiresApproval: true })
}
