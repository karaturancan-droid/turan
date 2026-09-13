import { createAuthClient } from 'better-auth/react'

const clientOrigin = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || (typeof window !== 'undefined' ? window.location.origin : undefined)

export const authClient = createAuthClient({
  baseURL: clientOrigin,
})
