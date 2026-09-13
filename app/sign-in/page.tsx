import Link from 'next/link'
import { AuthForm } from '@/components/auth-form'

export default function SignInPage() {
  return <main className="auth-page"><section className="auth-card"><span className="stitch-kicker">Zirveflow</span><h1>İşletmenize giriş yapın</h1><p>Yönetici ve saha ekipleri için güvenli çalışma alanı.</p><AuthForm mode="sign-in"/><Link href="/sign-up" className="auth-link">Yeni kullanıcı hesabı oluştur</Link></section></main>
}
