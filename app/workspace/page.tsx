'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { authClient } from '@/lib/auth-client'

const modules = {
  admin: [
    ['Yönetim dashboardu', 'Finans, üretim, filo ve tüm ocakların genel görünümü'],
    ['Kullanıcı ve roller', 'Yönetici, saha sorumlusu ve veri giriş yetkilerini yönetin'],
    ['Raporlar ve dışa aktarım', 'Ocak bazlı performans ve yönetici raporlarını hazırlayın'],
    ['Ayarlar ve entegrasyonlar', 'Google Maps, AI, cihaz ve veri bağlantılarını yönetin'],
  ],
  field: [
    ['Saha veri girişi', 'Üretim, sevkiyat, bakım ve vardiya kayıtlarını ekleyin'],
    ['Ocak görevleri', 'Sorumlu olduğunuz ocakların günlük işlerini takip edin'],
    ['Filo ve arıza bildirimi', 'Araç durumunu, arızaları ve bakım taleplerini girin'],
    ['Stok hareketi', 'Yakıt, sarf ve kritik stok değişikliklerini kaydedin'],
  ],
} as const

export default function WorkspacePage() {
  const { data: session, isPending } = authClient.useSession()
  const [role, setRole] = useState<'admin' | 'field'>('field')

  useEffect(() => {
    const currentRole = (session?.user as { role?: string } | undefined)?.role
    setRole(currentRole === 'admin' ? 'admin' : 'field')
  }, [session])

  if (isPending) return <main className="auth-page"><section className="auth-card"><p>Oturum kontrol ediliyor…</p></section></main>
  if (!session) return <main className="auth-page"><section className="auth-card"><h1>Oturum gerekli</h1><p>Çalışma alanına erişmek için giriş yapın.</p><Link href="/sign-in" className="primary-button">Giriş sayfasına git</Link></section></main>

  return <main className="workspace-page"><header className="workspace-header"><div><span className="stitch-kicker">Zirveflow çalışma alanı</span><h1>{role === 'admin' ? 'Yönetici modülleri' : 'Saha çalışma alanı'}</h1><p>{session.user.name} · {role === 'admin' ? 'Tam yetki' : 'Saha veri girişi'}</p></div><Link href="/" className="outline-button">Dashboard’a dön</Link></header><section className="role-banner"><strong>{role === 'admin' ? 'Yönetici görünümü' : 'Saha kullanıcı görünümü'}</strong><span>{role === 'admin' ? 'Tüm ocaklar, kullanıcılar ve finans modülleri açık.' : 'Yalnızca saha operasyonları ve atanmış kayıt modülleri açık.'}</span></section><div className="role-module-grid">{modules[role].map(([title, description]) => <article className="role-module-card" key={title}><span className="module-status"/><h2>{title}</h2><p>{description}</p><button className="outline-button">Modülü aç</button></article>)}</div></main>
}
