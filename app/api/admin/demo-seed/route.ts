import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { Pool } from 'pg'
import { auth } from '@/lib/auth'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const company = 'Ünaldı Madencilik'
const sites = ['Kütahya Tavşanlı Tunçbilek yolu üzeri', 'Orhaneli Ocağı', 'Eskişehir Ocağı']
const workerRoles = ['Yakıt Operatörü', 'Üretim Operatörü', 'Depo Görevlisi', 'Tamirci', 'Saha Sorumlusu', 'Şoför', 'Yönetici']
const vehicleTypes = ['Kamyon', 'Tır', 'Ekskavatör', 'Kepçe', 'Servis Aracı']
const faults = ['Hidrolik yağ kaçağı', 'Fren balatası aşınması', 'Motor hararet uyarısı', 'Lastik basıncı düşük', 'Elektrik sistemi arızası']

async function getAdmin() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null
  const role = (session.user as typeof session.user & { role?: string }).role
  return role && !['admin', 'manager', 'owner'].includes(role) ? null : session.user
}

export async function POST() {
  const user = await getAdmin()
  if (!user) return NextResponse.json({ error: 'Yönetici oturumu gerekli' }, { status: 403 })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const existing = await client.query('SELECT employee_count, vehicle_count FROM zirveflow_demo_runs WHERE user_id = $1 AND seed_key = $2', [user.id, 'unaldi-demo-v1'])
    if (existing.rowCount) { await client.query('COMMIT'); return NextResponse.json({ seeded: false, employees: existing.rows[0].employee_count, vehicles: existing.rows[0].vehicle_count, message: 'Demo verileri zaten mevcut.' }) }

    for (let index = 1; index <= 50; index++) {
      const role = workerRoles[(index - 1) % workerRoles.length]
      await client.query('INSERT INTO zirveflow_workers (user_id, name, role, phone, site, status) VALUES ($1, $2, $3, $4, $5, $6)', [user.id, `${role} ${String(index).padStart(2, '0')}`, role, `0532 ${String(1000000 + index).slice(0, 3)} ${String(1000000 + index).slice(3)}`, sites[index % sites.length], index % 11 === 0 ? 'İzinli' : 'Aktif'])
    }
    const workerRows = await client.query('SELECT id, name FROM zirveflow_workers WHERE user_id = $1 ORDER BY id DESC LIMIT 50', [user.id])
    for (let index = 1; index <= 90; index++) {
      const vehicleType = vehicleTypes[(index - 1) % vehicleTypes.length]
      const status = index % 9 === 0 ? 'Bakımda' : index % 13 === 0 ? 'Arızalı' : 'Aktif'
      const fault = status === 'Arızalı' ? faults[index % faults.length] : null
      await client.query('INSERT INTO zirveflow_vehicles (user_id, seed_key, plate, vehicle_type, model, site, mileage, status, fault_summary) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (user_id, plate) DO NOTHING', [user.id, 'unaldi-demo-v1', `43 ${String(100 + index).slice(0, 3)} ${String(10 + index).slice(-2)}`, vehicleType, `${vehicleType} ${2020 + (index % 5)}`, sites[index % sites.length], 12000 + index * 1843, status, fault])
    }
    const vehicles = await client.query('SELECT id, status FROM zirveflow_vehicles WHERE user_id = $1 AND seed_key = $2 ORDER BY id', [user.id, 'unaldi-demo-v1'])
    for (let index = 1; index <= 18; index++) await client.query('INSERT INTO zirveflow_tires (user_id, seed_key, size, brand, pattern, season, quantity, warehouse, minimum_quantity, vehicle_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)', [user.id, 'unaldi-demo-v1', index % 2 ? '12.00R24' : '315/80 R22.5', index % 3 ? 'Michelin' : 'Bridgestone', index % 2 ? 'X Multi' : 'Earthmover', index % 3 ? 'Yaz/Kış' : 'Dört Mevsim', index % 5 === 0 ? 2 : 8 + index, 'Ana Depo', index % 5 === 0 ? 4 : 5, vehicles.rows[index % vehicles.rows.length]?.id ?? null])
    for (let index = 0; index < 10; index++) { const vehicle = vehicles.rows.find((item) => item.status === 'Arızalı') || vehicles.rows[index]; const worker = workerRows.rows.find((item) => item.name.includes('Tamirci')) || workerRows.rows[0]; await client.query('INSERT INTO zirveflow_repairs (user_id, seed_key, vehicle_id, assigned_worker_id, fault_type, diagnosis, priority, status, parts_cost, labor_cost, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)', [user.id, 'unaldi-demo-v1', vehicle.id, String(worker.id), faults[index % faults.length], 'Saha kontrolü ve ilk teşhis tamamlandı.', index % 3 === 0 ? 'Yüksek' : 'Orta', index % 3 === 0 ? 'Atandı' : 'Açık', 1250 + index * 175, 900 + index * 120, user.name]) }
    await client.query('INSERT INTO zirveflow_demo_runs (user_id, seed_key, company_name, employee_count, vehicle_count) VALUES ($1, $2, $3, $4, $5)', [user.id, 'unaldi-demo-v1', company, 50, 90])
    await client.query('INSERT INTO zirveflow_audit_logs (user_id, actor_name, action, entity_type, details) VALUES ($1, $2, $3, $4, $5)', [user.id, user.name, 'demo_seeded', 'company', JSON.stringify({ company, sites, employees: 50, vehicles: 90 })])
    await client.query('COMMIT')
    return NextResponse.json({ seeded: true, company, sites, employees: 50, vehicles: 90, repairs: 10, message: 'Ünaldı Madencilik demo verileri oluşturuldu.' })
  } catch (error) { await client.query('ROLLBACK'); console.error('[v0] demo seed failed', error); return NextResponse.json({ error: 'Demo verileri oluşturulamadı.' }, { status: 500 }) } finally { client.release() }
}
