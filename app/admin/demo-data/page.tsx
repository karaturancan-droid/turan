'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, Database, Loader2, ShieldCheck } from 'lucide-react'

export default function DemoDataPage() {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ message?: string; employees?: number; vehicles?: number; repairs?: number }>({})
  async function seed() { setBusy(true); setResult({}); const response = await fetch('/api/admin/demo-seed', { method: 'POST' }); const data = await response.json(); setResult({ message: data.message || data.error, employees: data.employees, vehicles: data.vehicles, repairs: data.repairs }); setBusy(false) }
  return <main className="provider-page"><header className="provider-header"><Link href="/" className="back-link"><ArrowLeft size={16} /> Ana panele dön</Link><div className="provider-title"><div className="provider-title-icon"><Database size={22} /></div><div><span className="eyebrow">Yönetici araçları</span><h1>Demo işletme verileri</h1><p>Ünaldı Madencilik için tüm modülleri test etmeye hazır veri seti.</p></div></div><div className="provider-security"><ShieldCheck size={17} /><span>Seed kayıtları idempotenttir; gerçek kayıtların üzerine yazılmaz.</span></div></header><section className="demo-hero"><div><span className="provider-category">Ünaldı Madencilik</span><h2>Kütahya · Tavşanlı · Tunçbilek yolu üzeri</h2><p>Orhaneli ve Eskişehir ocakları; çalışan, filo, lastik, bakım ve arıza senaryolarıyla birlikte hazırlanır.</p></div><button className="primary-action demo-seed-button" disabled={busy} onClick={() => void seed()}>{busy ? <Loader2 className="spin" size={16} /> : <Database size={16} />} {busy ? 'Veriler hazırlanıyor...' : 'Demo verilerini oluştur'}</button></section><section className="demo-count-grid"><div><strong>50</strong><span>çalışan hesabı</span></div><div><strong>90</strong><span>araç</span></div><div><strong>18</strong><span>lastik kalemi</span></div><div><strong>10</strong><span>arıza kaydı</span></div></section>{result.message && <div className="provider-message"><Check size={16} />{result.message}{result.employees ? ` ${result.employees} çalışan, ${result.vehicles} araç ve ${result.repairs} arıza hazır.` : ''}</div>}</main>
}
