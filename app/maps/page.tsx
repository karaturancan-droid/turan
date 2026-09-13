import Link from 'next/link'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { ArrowLeft, MapPin } from 'lucide-react'
import { Pool } from 'pg'
import { auth } from '@/lib/auth'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
import MapClient from './map-client'

export default async function MapsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/')
  const setting = await pool.query('SELECT google_maps_enabled FROM zirveflow_company_settings WHERE user_id = $1', [session.user.id])
  if (setting.rows[0]?.google_maps_enabled !== true) redirect('/')
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  return <main className="maps-page"><header className="maps-header"><Link href="/" className="back-link"><ArrowLeft size={16} /> Ana panele dön</Link><div className="maps-title"><div className="maps-icon"><MapPin size={22} /></div><div><span className="eyebrow">Saha görünümü</span><h1>İşletme konumu ve bölgeleri</h1><p>İşletme merkezini girin, çalışma alanlarını haritada çizin ve kaydedin.</p></div></div></header>{apiKey ? <section className="maps-layout"><MapClient apiKey={apiKey} /></section> : <div className="map-message">Google Maps API anahtarı tanımlı değil. Sağlayıcı ayarlarından kontrol edin.</div>}</main>
}
