'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    const result = mode === 'sign-up'
      ? await authClient.signUp.email({ name, email, password })
      : await authClient.signIn.email({ email, password })
    setLoading(false)
    if (result.error) {
      setError('Giriş bilgileri doğrulanamadı. Lütfen tekrar deneyin.')
      return
    }
    const sessionResponse = await fetch('/api/auth/get-session', { credentials: 'include' })
    const sessionData = await sessionResponse.json().catch(() => null) as { user?: { accountStatus?: string } } | null
    router.push(sessionData?.user?.accountStatus === 'approved' ? '/' : '/account-pending')
    router.refresh()
  }

  async function signInWithGoogle() {
    setLoading(true)
    setError('')
    const result = await authClient.signIn.social({ provider: 'google', callbackURL: '/' })
    if (result.error) {
      setError('Google ile giriş yapılamadı. OAuth ayarlarını kontrol edin.')
      setLoading(false)
    }
  }

  return <form className="auth-form" onSubmit={submit}>
    {mode === 'sign-up' && <label>Ad soyad<input required value={name} onChange={event => setName(event.target.value)} /></label>}
    <label>E-posta<input required type="email" value={email} onChange={event => setEmail(event.target.value)} /></label>
    <label>Parola<input required minLength={8} type="password" value={password} onChange={event => setPassword(event.target.value)} /></label>
    {error && <p className="auth-error">{error}</p>}
    <button className="primary-button auth-submit" disabled={loading}>{loading ? 'Kontrol ediliyor…' : mode === 'sign-in' ? 'Giriş yap' : 'Hesap oluştur'}</button>
    <div className="auth-divider">veya</div>
    <button type="button" className="secondary-button auth-submit" disabled={loading} onClick={signInWithGoogle}>Google ile devam et</button>
  </form>
}
