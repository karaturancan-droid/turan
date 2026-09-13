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
    router.push('/')
    router.refresh()
  }

  return <form className="auth-form" onSubmit={submit}>
    {mode === 'sign-up' && <label>Ad soyad<input required value={name} onChange={event => setName(event.target.value)} /></label>}
    <label>E-posta<input required type="email" value={email} onChange={event => setEmail(event.target.value)} /></label>
    <label>Parola<input required minLength={8} type="password" value={password} onChange={event => setPassword(event.target.value)} /></label>
    {error && <p className="auth-error">{error}</p>}
    <button className="primary-button auth-submit" disabled={loading}>{loading ? 'Kontrol ediliyor…' : mode === 'sign-in' ? 'Giriş yap' : 'Hesap oluştur'}</button>
  </form>
}
