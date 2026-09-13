import { generateText } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { messages?: Array<{ role: 'user' | 'assistant'; content: string }>; context?: unknown } | null
  const messages = body?.messages ?? []
  const accountingContext = '\n\nMUHASEBE KODLARI KATALOĞU (pratik TDHP özeti): 100 Kasa - nakit para; 102 Bankalar - banka hesapları; 120 Alıcılar - müşterilerden alacaklar; 153 Ticari Mallar - stok; 191 İndirilecek KDV - alış KDVsi; 254 Taşıtlar - kamyon ve iş makineleri; 320 Satıcılar - tedarikçi borçları; 391 Hesaplanan KDV - satış KDVsi; 600 Yurtiçi Satışlar - satış geliri; 621 Satılan Ticari Mallar Maliyeti - maliyet; 740 Hizmet Üretim Maliyeti - saha/üretim maliyeti; 760 Pazarlama Satış Dağıtım Giderleri - sevkiyat; 770 Genel Yönetim Giderleri - yönetim gideri; 780 Finansman Giderleri - banka/kredi gideri. Kod sorularında bu katalogdan sade açıklama ve örnek ver; resmi kayıt öncesi mali müşavir kontrolü öner.'
  const appContext = body?.context ? `\n\nUYGULAMA İÇİ GÜNCEL VERİLER (yalnızca bu verileri kullan):\n${JSON.stringify(body.context, null, 2)}${accountingContext}` : accountingContext+'\n\nUygulama içi veri bağlamı gönderilmedi; kayıt varmış gibi sayı uydurma.'
  if (!Array.isArray(messages) || messages.length === 0) return Response.json({ error: 'Mesaj gerekli.' }, { status: 400 })
  if (!process.env.API_KEY) return Response.json({ error: 'Google AI Studio API anahtarı yapılandırılmamış.' }, { status: 503 })

  const googleAI = createGoogleGenerativeAI({ apiKey: process.env.API_KEY })
  const result = await generateText({
    model: googleAI('gemini-2.5-flash'),
    system: `Sen Ünaldı Madencilik için Türkçe ön muhasebe ve işletme yönetimi asistanısın. Uygulama içindeki güncel kayıtları aşağıdaki bağlamdan okuyabilirsin. Kullanıcı araç sayısı, lastik stoğu, kritik stok, kayıt veya aktif modül hakkında soru sorarsa doğrudan bu bağlamdaki verilerle cevap ver. Örneğin vehicleCount 0 ise araç olmadığını, 3 ise 3 araç olduğunu açıkça söyle. Bağlamda bulunmayan cari, fatura veya finans verilerini uydurma; bu veriler henüz AI bağlamına dahil değilse erişilemediğini belirt. Yanıtı tamamla, yarım cümle bırakma. Veri değiştiren işlemlerde açık onay iste.\n\n${appContext}`,
    messages: messages.slice(-12),
    maxOutputTokens: 1600,
  })

  return Response.json({ text: result.text })
}
