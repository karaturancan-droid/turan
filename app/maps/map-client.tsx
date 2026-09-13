'use client'

import { importLibrary, setOptions } from '@googlemaps/js-api-loader'
import { Check, LocateFixed, MapPin, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type Coordinate = { lat: number; lng: number }
type Region = { id: string; name: string; color: string; path: Coordinate[] }
type MapSettings = { enabled: boolean; apiConfigured: boolean; business?: { name: string; address: string; position: Coordinate } | null; regions?: Region[] }

const defaultPosition = { lat: 39.534, lng: 29.491 }
const businessReferenceUrl = 'https://share.google/Pk8xlRxwMzJnAEvCs'
const defaultBusiness = { name: 'Ünaldı Madencilik', address: 'Kütahya, Tavşanlı', position: defaultPosition }

export default function MapClient({ apiKey }: { apiKey: string }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null)
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null)
  const regionPolygons = useRef<google.maps.Polygon[]>([])
  const [status, setStatus] = useState('Harita yükleniyor...')
  const [query, setQuery] = useState('')
  const [settings, setSettings] = useState<MapSettings | null>(null)
  const [business, setBusiness] = useState(defaultBusiness)
  const [regions, setRegions] = useState<Region[]>([])
  const [selectedRegion, setSelectedRegion] = useState('')
  const [saving, setSaving] = useState(false)
  const [searching, setSearching] = useState(false)

  useEffect(() => { fetch('/api/settings/maps', { cache: 'no-store' }).then(response => response.json()).then(data => { setSettings(data); if (data.business) setBusiness(data.business); if (data.regions) setRegions(data.regions) }).catch(() => setStatus('Harita ayarları okunamadı.')) }, [])

  useEffect(() => {
    let cancelled = false
    async function loadMap() {
      try {
        setOptions({ key: apiKey, v: 'weekly' })
        const [{ Map }, { AdvancedMarkerElement }, { DrawingManager }] = await Promise.all([importLibrary('maps'), importLibrary('marker'), importLibrary('drawing')]) as [{ Map: typeof google.maps.Map }, { AdvancedMarkerElement: typeof google.maps.marker.AdvancedMarkerElement }, { DrawingManager: typeof google.maps.drawing.DrawingManager }]
        if (cancelled || !mapRef.current) return
        const map = new Map(mapRef.current, { center: business.position, zoom: 11, mapTypeControl: false, streetViewControl: false, mapId: 'DEMO_MAP_ID' })
        mapInstance.current = map
        markerRef.current = new AdvancedMarkerElement({ map, position: business.position, title: business.name, gmpDraggable: true })
        markerRef.current.addListener('dragend', (event: google.maps.MapMouseEvent) => { if (event.latLng) setBusiness(current => ({ ...current, position: { lat: event.latLng!.lat(), lng: event.latLng!.lng() } })) })
        const drawingManager = new DrawingManager({ drawingMode: null, drawingControl: false, polygonOptions: { fillColor: '#0d9488', fillOpacity: 0.18, strokeColor: '#087f78', strokeWeight: 2, editable: true } })
        drawingManager.setMap(map)
        drawingManager.addListener('polygoncomplete', (polygon: google.maps.Polygon) => { const path = polygon.getPath().getArray().map(point => ({ lat: point.lat(), lng: point.lng() })); const region = { id: crypto.randomUUID(), name: `Yeni bölge ${regions.length + 1}`, color: '#087f78', path }; setRegions(current => [...current, region]); drawingManager.setDrawingMode(null) })
        drawingManagerRef.current = drawingManager
        setStatus('Google Maps bağlantısı aktif')
      } catch { setStatus('Google Maps yüklenemedi. API anahtarı, faturalandırma ve Maps JavaScript API yetkisini kontrol edin.') }
    }
    void loadMap()
    return () => { cancelled = true; mapInstance.current = null }
  }, [apiKey])

  useEffect(() => { if (!mapInstance.current || !markerRef.current) return; markerRef.current.position = business.position; mapInstance.current.panTo(business.position); regionPolygons.current.forEach(polygon => polygon.setMap(null)); regionPolygons.current = regions.map(region => { const polygon = new google.maps.Polygon({ map: mapInstance.current!, paths: region.path, fillColor: region.color, fillOpacity: .18, strokeColor: region.color, strokeWeight: 2, editable: region.id === selectedRegion }); polygon.addListener('click', () => setSelectedRegion(region.id)); return polygon }) }, [business.position, regions, selectedRegion])

  async function searchBusiness() { if (!query.trim()) return; setSearching(true); try { const { Geocoder } = await importLibrary('geocoding') as google.maps.GeocodingLibrary; const result = await new Geocoder().geocode({ address: query }); const location = result.results[0]?.geometry.location; if (!location) throw new Error('not-found'); setBusiness(current => ({ ...current, address: result.results[0].formatted_address, position: { lat: location.lat(), lng: location.lng() } })); setStatus('İşletme konumu bulundu. Markerı sürükleyerek hassaslaştırabilirsiniz.'); } catch { setStatus('Adres bulunamadı. İl, ilçe veya açık adres ile tekrar deneyin.') } finally { setSearching(false) } }
  function startDrawing() { drawingManagerRef.current?.setDrawingMode(google.maps.drawing.OverlayType.POLYGON) }
  async function saveSettings() { setSaving(true); try { const response = await fetch('/api/settings/maps', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: true, business, regions }) }); if (!response.ok) throw new Error(); setStatus('İşletme konumu ve bölgeler kaydedildi.'); } catch { setStatus('Harita ayarları kaydedilemedi.') } finally { setSaving(false) } }
  function deleteRegion() { if (!selectedRegion) return; setRegions(current => current.filter(region => region.id !== selectedRegion)); setSelectedRegion('') }

  return <><div className="map-editor-toolbar"><div><span className="eyebrow">İşletme konumu</span><h2>Google Maps saha düzenleyici</h2><p>İşletme adresini arayın, markerı taşıyın ve çalışma bölgelerinizi çizin.</p></div><div className="map-editor-actions"><button className="secondary-action" onClick={startDrawing}><Plus size={15}/> Bölge çiz</button><button className="primary-button" disabled={saving} onClick={saveSettings}><Check size={15}/> {saving ? 'Kaydediliyor…' : 'Kaydet'}</button></div></div><div className="map-editor-grid"><div className="google-map-wrap"><div ref={mapRef} className="google-map" aria-label="İşletme konumu ve bölgeleri haritası" />{status !== 'Google Maps bağlantısı aktif' && <div className="map-overlay-status">{status}</div>}</div><aside className="map-editor-panel"><div className="map-business-reference"><span>Google işletme kaydı</span><a href={businessReferenceUrl} target="_blank" rel="noreferrer">Ünaldı Madencilik kaydını aç</a></div><label>İşletme adı<input value={business.name} onChange={event => setBusiness(current => ({ ...current, name: event.target.value }))}/></label><label>Adres veya konum ara<div className="map-search-row"><input value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.keyCode !== 229) void searchBusiness() }} placeholder="Örn. Kütahya Tavşanlı"/><button className="secondary-action" onClick={() => void searchBusiness()} disabled={searching} aria-label="Konum ara"><LocateFixed size={15}/></button></div></label><label>Kaydedilen adres<input value={business.address} onChange={event => setBusiness(current => ({ ...current, address: event.target.value }))}/></label><div className="map-coordinates"><span>Enlem <strong>{business.position.lat.toFixed(5)}</strong></span><span>Boylam <strong>{business.position.lng.toFixed(5)}</strong></span></div><div className="region-list"><div className="region-list-head"><div><span className="eyebrow">Çalışma bölgeleri</span><strong>{regions.length} kayıtlı bölge</strong></div><button className="secondary-action" onClick={deleteRegion} disabled={!selectedRegion} aria-label="Seçili bölgeyi sil"><Trash2 size={15}/></button></div>{regions.length ? regions.map(region => <button key={region.id} className={`region-row ${selectedRegion === region.id ? 'selected' : ''}`} onClick={() => setSelectedRegion(region.id)}><span className="region-color" style={{ background: region.color }}/><span>{region.name}<small>{region.path.length} köşe</small></span><Pencil size={14}/></button>) : <p className="map-empty">Henüz bölge çizilmedi. “Bölge çiz” ile harita üzerinde işletme alanınızı işaretleyin.</p>}</div><div className="maps-status"><span /> {status}</div></aside></div></>
}
