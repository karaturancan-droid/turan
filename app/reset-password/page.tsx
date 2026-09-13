'use client'

import Link from 'next/link'
import { FormEvent, Suspense, useSearchParams, useState } from 'react'

function ResetPasswordForm() {
  const token = useSearchParams().get('token') || ''
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (password.length < 8) { setError('Yeni parola en az 8 karakter olmalıdır.'); return }
    if (password !== confirmation) { setError('Parolalar eşleşmiyor.'); return }
    const response = await fetch('/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ newPassword: password, token }) })
    if (!response.ok) { setError('Bağlantı geçersiz veya süresi dolmuş olabilir.'); return }
    setDone(true)
  }

  return <main className="auth-page"><section className="auth-card"><span className="stitch-kicker">Zirveflow</span><h1>Yeni şifre belirleyin</h1>{done ? <><p className="auth-success">Şifreniz güvenli şekilde yenilendi.</p><Link href="/sign-in" className="primary-button auth-submit">Giriş yap</Link></> : <form className="auth-form" onSubmit={submit}><label>Yeni parola<input required minLength={8} type="password" value={password} onChange={event => setPassword(event.target.value)} /></label><label>Yeni parola tekrar<input required minLength={8} type="password" value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label>{error && <p className="auth-error">{error}</p>}<button className="primary-button auth-submit" disabled={!token}>Şifreyi yenile</button>{!token && <p className="auth-error">Geçerli bir sıfırlama bağlantısı gerekli.</p>}</form>}</section></main>
}

export default function ResetPasswordPage() { return <Suspense fallback={<main className="auth-page"><section className="auth-card"><p>Yükleniyor...</p></section></main>}><ResetPasswordForm /></Suspense> }
