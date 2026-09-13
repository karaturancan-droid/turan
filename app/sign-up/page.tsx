import Link from 'next/link'
import { AuthForm } from '@/components/auth-form'

export default function SignUpPage() {
  return <main className="auth-page"><section className="auth-card"><span className="stitch-kicker">Zirveflow</span><h1>Saha hesabı oluşturun</h1><p>Ocak ve operasyon verilerini güvenli biçimde ekleyin.</p><AuthForm mode="sign-up"/><Link href="/sign-in" className="auth-link">Zaten hesabınız var mı? Giriş yapın</Link></section></main>
}
