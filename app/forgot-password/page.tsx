'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    await fetch('/api/auth/request-password-reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, redirectTo: `${window.location.origin}/reset-password` }) })
    setLoading(false)
    setSent(true)
  }

  return <main className="auth-page"><section className="auth-card"><span className="stitch-kicker">Zirveflow</span><h1>Şifrenizi yenileyin</h1><p>E-posta adresinizi yazın. Hesabınız varsa güvenli yenileme bağlantısını göndereceğiz.</p>{sent ? <><p className="auth-success">E-posta adresinizi kontrol edin. Bağlantı 1 saat geçerlidir.</p><Link href="/sign-in" className="primary-button auth-submit">Giriş sayfasına dön</Link></> : <form className="auth-form" onSubmit={submit}><label>E-posta<input required type="email" value={email} onChange={event => setEmail(event.target.value)} /></label><button className="primary-button auth-submit" disabled={loading}>{loading ? 'Gönderiliyor…' : 'Sıfırlama bağlantısı gönder'}</button><Link href="/sign-in" className="auth-link">Giriş sayfasına dön</Link></form>}</section></main>
}
