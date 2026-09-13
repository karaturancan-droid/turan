'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Building2, Check, ChevronRight, CloudDownload, FileSpreadsheet, Link2, Loader2, Plus, RefreshCw, ShieldCheck, Trash2, Upload, WalletCards } from 'lucide-react'
import Link from 'next/link'

type Bank = { id: string; name: string; provider: string }
type Connection = { id: number; bank_name: string; status: string; accounts_count: number; last_synced_at: string | null }
type Transaction = { id: number; bank_name: string; booked_at: string; description: string; amount: number; direction: string; category: string }
type ImportRow = { externalId: string; date: string; description: string; amount: number; account?: string; category?: string }

const bankColors: Record<string, string> = { 'Ziraat Bankası': 'ZB', 'İş Bankası': 'İŞ', 'Garanti BBVA': 'GB', Akbank: 'AK', 'Yapı Kredi': 'YK', VakıfBank: 'VB', Halkbank: 'HB' }

export default function BankingPage() {
  const [banks, setBanks] = useState<Bank[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selected, setSelected] = useState('')
  const [importBank, setImportBank] = useState('Ziraat Bankası')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [fileName, setFileName] = useState('')
  const [search, setSearch] = useState('')

  async function load() {
    setLoading(true)
    const response = await fetch('/api/banking/connections', { cache: 'no-store' })
    if (response.ok) { const data = await response.json(); setBanks(data.banks); setConnections(data.connections); setTransactions(data.transactions || []) }
    setLoading(false)
  }
  useEffect(() => { void load() }, [])

  async function connect() {
    if (!selected) return
    setBusy(true)
    const response = await fetch('/api/banking/connections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bankId: selected, demo: true }) })
    const data = await response.json()
    setMessage(response.ok ? `${data.connection.bank_name} demo bağlantısı hazırlandı. Gerçek sağlayıcı seçildiğinde OAuth akışına geçirilebilir.` : data.error || 'Banka bağlantısı başlatılamadı.')
    if (response.ok) { setSelected(''); await load() }
    setBusy(false)
  }

  async function importStatement(file: File) {
    setBusy(true); setFileName(file.name); setMessage('Ekstre okunuyor...')
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const XLSX = await import('xlsx')
        const workbook = XLSX.read(event.target?.result, { type: 'array', cellDates: true })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
        const rows: ImportRow[] = raw.map((row, index) => {
          const normalized = Object.fromEntries(Object.entries(row).map(([key, value]) => [key.toLowerCase().replace(/\s+/g, ''), value]))
          const dateValue = normalized.date || normalized.tarih || normalized.islemtarihi
          const date = dateValue instanceof Date ? dateValue.toISOString().slice(0, 10) : String(dateValue || '').slice(0, 10)
          return { externalId: String(normalized.id || normalized.islemno || `${file.name}-${index}`), date, description: String(normalized.description || normalized.aciklama || normalized.islem || ''), amount: Number(normalized.amount || normalized.tutar || normalized.bakiye || 0), account: String(normalized.account || normalized.hesap || importBank), category: String(normalized.category || normalized.kategori || 'Diğer') }
        }).filter((row) => row.date && row.description && row.amount)
        const response = await fetch('/api/banking/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bankName: importBank, fileName: file.name, rows }) })
        const data = await response.json()
        setMessage(response.ok ? `${data.imported} işlem içe aktarıldı, ${data.skipped} satır atlandı.` : data.error || 'İçe aktarma başarısız.')
        await load()
      } catch { setMessage('Dosya okunamadı. CSV veya Excel başlıklarını tarih, açıklama ve tutar olarak kontrol edin.') }
      setBusy(false)
    }
    reader.readAsArrayBuffer(file)
  }

  async function remove(id: number) { await fetch(`/api/banking/connections?id=${id}`, { method: 'DELETE' }); await load() }
  const visibleTransactions = useMemo(() => transactions.filter((item) => `${item.description} ${item.bank_name}`.toLowerCase().includes(search.toLowerCase())), [transactions, search])

  return <main className="banking-page"><header className="banking-header"><Link href="/" className="back-link"><ArrowLeft size={16} /> Ana panele dön</Link><div className="banking-heading"><div className="banking-icon"><WalletCards size={24} /></div><div><span className="eyebrow">Finans merkezi</span><h1>Kasa & Banka</h1><p>Türkiye bankalarını demo bağlantı ve ekstre aktarımıyla tek ekranda yönetin.</p></div></div><div className="security-note"><ShieldCheck size={18} /><span>Şifre istemiyoruz. Gerçek bağlantı için sağlayıcı seçildiğinde OAuth kullanılacak.</span></div></header>
    <section className="banking-grid"><div className="banking-main"><div className="section-heading"><div><span className="eyebrow">Bağlantılar</span><h2>Bağlı bankalar</h2><p>Demo bağlantılar ve içe aktarılan hesap hareketleri.</p></div><button className="secondary-action" onClick={() => void load()}><RefreshCw size={15} /> Yenile</button></div>{message && <div className="banking-message"><Check size={16} />{message}</div>}{loading ? <div className="empty-state"><Loader2 className="spin" size={20} /><span>Veriler yükleniyor...</span></div> : connections.length ? <div className="connection-list">{connections.map((connection) => <div className="connection-card" key={connection.id}><div className="bank-logo">{bankColors[connection.bank_name] || 'TR'}</div><div className="connection-info"><strong>{connection.bank_name}</strong><span>{connection.accounts_count} hesap · {connection.last_synced_at ? `Son senkron ${new Date(connection.last_synced_at).toLocaleDateString('tr-TR')}` : 'Henüz senkron yok'}</span></div><span className={`connection-status ${connection.status === 'connected' ? 'connected' : ''}`}>{connection.status === 'connected' ? 'Bağlı' : 'Demo'}</span><button className="icon-action" aria-label="Bağlantıyı sil" onClick={() => void remove(connection.id)}><Trash2 size={14} /></button></div>)}</div> : <div className="empty-state"><Building2 size={24} /><strong>Henüz banka bağlantısı yok</strong><span>Sağdaki panelden demo banka ekleyin veya ekstre aktarın.</span></div>}
        <div className="transaction-preview"><div className="section-heading"><div><h2>Son banka hareketleri</h2><p>Tekrarlanan işlemler otomatik olarak atlanır.</p></div><div className="transaction-tools"><input aria-label="Hareket ara" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Hareket ara" /><button className="text-link">Tümünü gör <ChevronRight size={15} /></button></div></div>{visibleTransactions.length ? <div className="transaction-list">{visibleTransactions.slice(0, 8).map((transaction) => <div className="transaction-row" key={transaction.id}><div><strong>{transaction.description}</strong><span>{transaction.bank_name} · {new Date(transaction.booked_at).toLocaleDateString('tr-TR')} · {transaction.category}</span></div><b className={transaction.direction === 'in' ? 'in' : 'out'}>{transaction.direction === 'in' ? '+' : '-'}{Number(transaction.amount).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</b></div>)}</div> : <div className="transaction-empty"><CloudDownload size={22} /><span>Henüz hareket yok. CSV veya Excel ekstre aktarınca burada görünecek.</span></div>}</div>
      </div><aside className="banking-aside"><div className="connect-card"><div className="card-top"><div className="plus-icon"><Plus size={18} /></div><div><h3>Demo banka bağla</h3><p>Banka seçin; gerçek sağlayıcı belirlenene kadar güvenli demo akışı kullanılır.</p></div></div><label className="select-label">Banka seçin<select value={selected} onChange={(event) => setSelected(event.target.value)}><option value="">Banka seçin...</option>{banks.map((bank) => <option key={bank.id} value={bank.id}>{bank.name}</option>)}</select></label><button className="primary-action" disabled={!selected || busy} onClick={() => void connect()}>{busy ? <Loader2 className="spin" size={15} /> : <Link2 size={15} />} Demo bağlantısı oluştur</button></div><div className="import-card"><FileSpreadsheet size={20} /><div><h3>Ekstre aktar</h3><p>CSV veya Excel dosyanızdaki tarih, açıklama ve tutar sütunlarını okuyun.</p><label className="select-label light">Ekstre bankası<select value={importBank} onChange={(event) => setImportBank(event.target.value)}>{banks.map((bank) => <option key={bank.id} value={bank.name}>{bank.name}</option>)}</select></label><label className="primary-action file-action"><Upload size={15} /> {busy ? 'Aktarılıyor...' : 'Dosya seç'}<input type="file" accept=".csv,.xlsx,.xls" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importStatement(file) }} /></label>{fileName && <small className="file-name">{fileName}</small>}</div></div></aside></section></main>
}
