'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Check, ClipboardList, Fuel, Menu, Package, Send, Truck, UserRound } from 'lucide-react'

const modules = [{ label: 'Yakıt girişi', detail: 'Dolum, litre ve araç bilgisi', icon: Fuel }, { label: 'Üretim kaydı', detail: 'Üretim miktarı ve sevkiyat', icon: ClipboardList }, { label: 'Araç durumu', detail: 'Kilometre ve arıza bildirimi', icon: Truck }, { label: 'Depo sayımı', detail: 'Stok hareketi ve kritik seviye', icon: Package }]

export default function FieldPage() {
  const [active, setActive] = useState('Yakıt girişi')
  const [saved, setSaved] = useState(false)
  const [userName, setUserName] = useState('Aktif kullanıcı')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [sessionChecked, setSessionChecked] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  useEffect(() => { fetch('/api/auth/get-session').then(response => response.ok ? response.json() : null).then(data => { if (data?.user) { setAuthenticated(true); if (data.user.name) setUserName(data.user.name) } }).catch(() => {}).finally(() => setSessionChecked(true)) }, [])
  if (sessionChecked && !authenticated) return <main className="field-page field-auth-required"><section className="field-form"><span className="eyebrow">Saha uygulaması</span><h1>Oturum gerekli</h1><p>Saha kayıtlarını göndermek için hesabınızla giriş yapın.</p><Link className="field-submit" href="/sign-in">Giriş yap</Link></section></main>
  const submit = async () => { if (!value.trim()) { setError('Lütfen kayıt bilgisini girin.'); return }; setSaving(true); setError(''); const resource = active === 'Yakıt girişi' ? 'fuel' : active === 'Üretim kaydı' ? 'production' : active === 'Araç durumu' ? 'faults' : 'assets'; try { const response = await fetch(`/api/business?resource=${resource}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, value: value.trim(), source: 'field' }) }); if (!response.ok) throw new Error(); setSaved(true); setValue('') } catch { setError('Kayıt gönderilemedi. Yetkinizi veya bağlantınızı kontrol edin.') } finally { setSaving(false) } }
  return <main className="field-page"><header className="field-topbar"><div className="field-brand"><div className="field-mark">m</div><div><strong>madenova</strong><span>Saha uygulaması</span></div></div><button className="field-user" aria-label="Kullanıcı menüsü"><UserRound size={18}/></button></header><section className="field-hero"><span className="eyebrow">Bugünkü saha işleri</span><h1>Merhaba, {userName}</h1><p>Kaydınızı girin; yöneticiniz veriyi ana panelde anlık görür.</p><div className="sync-pill"><span/> Sunucu ile senkronize</div></section><nav className="field-modules" aria-label="Saha modülleri">{modules.map(({ label, detail, icon: Icon }) => <button key={label} className={active === label ? 'selected' : ''} onClick={() => { setActive(label); setSaved(false) }}><Icon size={19}/><span><strong>{label}</strong><small>{detail}</small></span></button>)}</nav><section className="field-form"><div className="field-form-heading"><div><span className="eyebrow">Yeni kayıt</span><h2>{active}</h2></div><span className="actor-chip"><UserRound size={13}/> Aktif kullanıcı</span></div><label>İşlem tarihi<input type="date" value={date} onChange={event => setDate(event.target.value)}/></label><label>{active === 'Yakıt girişi' ? 'Araç plakası' : active === 'Üretim kaydı' ? 'Ürün / malzeme' : active === 'Araç durumu' ? 'Araç plakası' : 'Stok kalemi'}<input placeholder="Bilgi girin"/></label><label>Miktar / açıklama<input value={value} onChange={event => setValue(event.target.value)} placeholder="Örn. 250 litre veya kısa açıklama"/></label>{error && <p className="field-error">{error}</p>}<button className="field-submit" disabled={saving} onClick={submit}>{saved ? <><Check size={17}/> Kaydedildi ve senkronlandı</> : <><Send size={17}/> {saving ? 'Gönderiliyor...' : 'Kaydı gönder'}</>}</button>{saved && <p className="field-confirm">Kayıt zaman damgası ve kullanıcı bilgisiyle yönetici paneline aktarıldı.</p>}</section><footer className="field-footer"><Menu size={17}/> Yetkili olduğunuz modülleri görüyorsunuz · Veriler güvenli sunucuda saklanır</footer></main>
}
