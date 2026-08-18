const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { env } = require('../config/env');
const DATA_DIR = env.dataDir;
const DB_PATH = path.join(DATA_DIR, 'cnh.sqlite');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new sqlite3.Database(DB_PATH);
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS registrations (
    discord_user_id TEXT PRIMARY KEY,
    discord_tag TEXT,
    nome_completo TEXT NOT NULL,
    identificacao_empresa TEXT NOT NULL,
    telefone TEXT NOT NULL,
    steam_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_user_alert_at TEXT,
    last_admin_alert_at TEXT,
    status TEXT NOT NULL DEFAULT 'ativa'
  )`);
});
function run(sql, params = []) { return new Promise((resolve, reject) => db.run(sql, params, err => err ? reject(err) : resolve())); }
function get(sql, params = []) { return new Promise((resolve, reject) => db.get(sql, params, (err, row) => err ? reject(err) : resolve(row))); }
function all(sql, params = []) { return new Promise((resolve, reject) => db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows))); }
module.exports = { db, run, get, all, DATA_DIR };
