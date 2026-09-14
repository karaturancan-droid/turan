#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::fs;
use tauri::{Manager, State};
use std::sync::Mutex;

struct AppDb(Mutex<Connection>);

#[derive(Debug, Serialize, Deserialize)]
struct LocalCompany {
    id: i64,
    name: String,
    address: Option<String>,
    created_at: String,
}

#[tauri::command]
fn list_local_companies(db: State<'_, AppDb>) -> Result<Vec<LocalCompany>, String> {
    let connection = db.0.lock().map_err(|_| "Yerel veritabanı kilitli".to_string())?;
    let mut statement = connection.prepare("SELECT id, name, address, created_at FROM companies ORDER BY name")
        .map_err(|error| error.to_string())?;
    let rows = statement.query_map([], |row| Ok(LocalCompany {
        id: row.get(0)?,
        name: row.get(1)?,
        address: row.get(2)?,
        created_at: row.get(3)?,
    })).map_err(|error| error.to_string())?;
    rows.map(|row| row.map_err(|error| error.to_string())).collect()
}

#[tauri::command]
fn save_local_company(db: State<'_, AppDb>, name: String, address: Option<String>) -> Result<i64, String> {
    if name.trim().is_empty() { return Err("Firma adı boş olamaz".to_string()); }
    let connection = db.0.lock().map_err(|_| "Yerel veritabanı kilitli".to_string())?;
    connection.execute("INSERT INTO companies (name, address, created_at) VALUES (?1, ?2, datetime('now'))", params![name.trim(), address])
        .map_err(|error| error.to_string())?;
    Ok(connection.last_insert_rowid())
}

#[tauri::command]
fn local_sync_status() -> serde_json::Value {
    serde_json::json!({ "online": true, "pending": 0, "mode": "local-first" })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let data_dir = app.path().app_data_dir().map_err(|error| error.to_string())?;
            fs::create_dir_all(&data_dir).map_err(|error| error.to_string())?;
            let database_path = data_dir.join("madenova.sqlite3");
            let connection = Connection::open(database_path).map_err(|error| error.to_string())?;
            connection.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS companies (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, address TEXT, created_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sync_queue (id INTEGER PRIMARY KEY AUTOINCREMENT, entity TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL, synced_at TEXT);")
                .map_err(|error| error.to_string())?;
            app.manage(AppDb(Mutex::new(connection)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![list_local_companies, save_local_company, local_sync_status])
        .run(tauri::generate_context!())
        .expect("error while running Madenova desktop application");
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn local_schema_can_be_initialized() {
        let connection = Connection::open_in_memory().unwrap();
        connection.execute("CREATE TABLE companies (id INTEGER PRIMARY KEY, name TEXT NOT NULL, address TEXT, created_at TEXT NOT NULL)", []).unwrap();
    }
}
