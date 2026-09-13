import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return { name: 'Madenova Saha', short_name: 'Madenova', description: 'Saha operasyonları ve işletme yönetimi', start_url: '/', display: 'standalone', background_color: '#071b1d', theme_color: '#087f78', icons: [] }
}
