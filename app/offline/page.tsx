'use client'

import { useEffect, useState } from 'react'

export default function OfflinePage() {
  const [pending, setPending] = useState(0)
  useEffect(() => { if (!('indexedDB' in window)) return; const request = indexedDB.open('zirveflow-offline', 1); request.onupgradeneeded = () => request.result.createObjectStore('queue', { autoIncrement: true }); request.onsuccess = () => { const transaction = request.result.transaction('queue', 'readonly'); const count = transaction.objectStore('queue').count(); count.onsuccess = () => setPending(count.result) } }, [])
  return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#f4f8f7', color: '#24484d', fontFamily: 'Inter, sans-serif' }}><section style={{ maxWidth: 520, width: '100%', padding: 32, border: '1px solid #dce8e8', borderRadius: 16, background: '#fff' }}><p style={{ color: '#087f78', fontWeight: 700 }}>Zirveflow saha modu</p><h1>Bağlantı bekleniyor</h1><p style={{ color: '#789092', lineHeight: 1.6 }}>Bağlantı geri geldiğinde bekleyen saha kayıtları senkronize edilecektir.</p><div style={{ display: 'flex', justifyContent: 'space-between', padding: 14, borderRadius: 10, background: '#eff8f6', color: '#087f78', fontWeight: 700 }}><span>Bekleyen kayıt</span><strong>{pending}</strong></div><button style={{ marginTop: 18, width: '100%', padding: 12, border: 0, borderRadius: 8, background: '#087f78', color: '#fff', fontWeight: 700 }} onClick={() => window.location.reload()}>Bağlantıyı yeniden kontrol et</button></section></main>
}
