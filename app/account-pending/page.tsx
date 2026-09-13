import Link from 'next/link'

export default function AccountPendingPage() {
  return <main className="auth-shell"><section className="auth-card"><p className="eyebrow">Hesap onayı</p><h1>Yönetici onayı bekleniyor</h1><p className="muted">Hesabınız oluşturuldu. Uygulamayı kullanabilmeniz için yönetici hesabının onay vermesi gerekiyor.</p><Link className="primary-button auth-submit" href="/sign-in">Giriş ekranına dön</Link></section></main>
}
