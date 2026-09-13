import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return { name: 'Zirveflow Saha', short_name: 'Zirveflow', description: 'Saha operasyonları ve işletme yönetimi', start_url: '/', display: 'standalone', background_color: '#071b1d', theme_color: '#087f78', icons: [] }
}
