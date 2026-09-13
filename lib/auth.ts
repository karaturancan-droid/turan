import { betterAuth } from 'better-auth'
import { Pool } from 'pg'
import { Resend } from 'resend'

const baseURL = process.env.BETTER_AUTH_URL
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined)
  ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined)
  ?? process.env.V0_RUNTIME_URL

const runtimeOrigins = [
  'http://localhost:3000',
  process.env.V0_RUNTIME_URL,
  process.env.V0_DEV_APP_URL,
  process.env.V0_BUILD_URL,
  process.env.V0_SANDBOX_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined,
].filter((origin): origin is string => Boolean(origin))

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  database: new Pool({ connectionString: process.env.DATABASE_URL }),
  baseURL,
  trustedOrigins: runtimeOrigins,
  emailAndPassword: {
    enabled: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    sendResetPassword: async ({ user, url }) => {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const from = process.env.RESEND_EMAIL_DOMAIN ? `Zirveflow <noreply@${process.env.RESEND_EMAIL_DOMAIN}>` : 'Zirveflow <onboarding@resend.dev>'
      const { error } = await resend.emails.send({
        from,
        to: [user.email],
        subject: 'Zirveflow şifre sıfırlama bağlantınız',
        html: `<p>Merhaba ${user.name || ''},</p><p>Şifrenizi yenilemek için aşağıdaki bağlantıyı kullanın. Bu bağlantı 1 saat geçerlidir.</p><p><a href="${url}">Şifremi yenile</a></p><p>Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz.</p>`,
      }, { idempotencyKey: `password-reset/${user.id}/${Date.now()}` })
      if (error) throw new Error(`Password reset email failed: ${error.message}`)
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => ({
          data: {
            ...user,
            role: user.email.toLowerCase() === 'karaturancan@gmail.com' ? 'admin' : 'field',
            accountStatus: user.email.toLowerCase() === 'karaturancan@gmail.com' ? 'approved' : 'pending',
          },
        }),
      },
    },
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'field',
        input: false,
      },
      siteId: {
        type: 'string',
        required: false,
        input: false,
      },
      accountStatus: {
        type: 'string',
        required: false,
        defaultValue: 'pending',
        input: false,
      },
      permissions: {
        type: 'json',
        required: false,
        defaultValue: [],
        input: false,
      },
    },
  },
  ...(process.env.NODE_ENV === 'development'
    ? {
        advanced: {
          defaultCookieAttributes: {
            sameSite: 'none' as const,
            secure: true,
          },
        },
      }
    : {}),
})
