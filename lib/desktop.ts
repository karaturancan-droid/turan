import { invoke } from '@tauri-apps/api/core'

export const isDesktopApp = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

export async function getLocalSyncStatus() {
  if (!isDesktopApp()) return { online: navigator.onLine, pending: 0, mode: 'web' as const }
  return invoke<{ online: boolean; pending: number; mode: 'local-first' }>('local_sync_status')
}

export async function listLocalCompanies() {
  if (!isDesktopApp()) return []
  return invoke<Array<{ id: number; name: string; address?: string; created_at: string }>>('list_local_companies')
}

export async function saveLocalCompany(name: string, address?: string) {
  if (!isDesktopApp()) throw new Error('Bu işlem masaüstü uygulamasında kullanılabilir.')
  return invoke<number>('save_local_company', { name, address })
}
