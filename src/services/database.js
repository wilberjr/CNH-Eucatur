const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { env } = require('../config/env');
const DATA_DIR = env.dataDir;
const DB_PATH = path.join(DATA_DIR, 'cnh.sqlite');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new sqlite3.Database(DB_PATH);

function run(sql, params = []) { return new Promise((resolve, reject) => db.run(sql, params, err => err ? reject(err) : resolve())); }
function get(sql, params = []) { return new Promise((resolve, reject) => db.get(sql, params, (err, row) => err ? reject(err) : resolve(row))); }
function all(sql, params = []) { return new Promise((resolve, reject) => db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows))); }

/*
 * Cria a tabela e roda migrações ANTES de qualquer outra query poder
 * acontecer. Antes, isso rodava solto dentro de db.serialize() no
 * carregamento do módulo, sem nada aguardar a conclusão — o resto do
 * bot podia começar a usar o banco antes do ALTER TABLE terminar,
 * causando "table registrations has no column named ..." em produção
 * quando o banco já existia de uma versão anterior.
 *
 * Agora é uma única Promise (`ready`), aguardada em index.js antes do
 * bot sequer logar no Discord — garante ordem sem depender de detalhes
 * internos do driver sqlite3.
 */
const ready = (async () => {
  await run(`CREATE TABLE IF NOT EXISTS registrations (
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
    last_reminder_alert_at TEXT,
    status TEXT NOT NULL DEFAULT 'ativa'
  )`);

  /*
   * Migração para bancos já existentes (criados antes da coluna
   * last_reminder_alert_at existir). CREATE TABLE IF NOT EXISTS não
   * altera tabelas que já existem, então tentamos adicionar a coluna
   * separadamente e ignoramos o erro se ela já estiver lá.
   */
  await run('ALTER TABLE registrations ADD COLUMN last_reminder_alert_at TEXT').catch(error => {
    if (!/duplicate column/i.test(error.message)) {
      console.error('[db] Falha ao migrar coluna last_reminder_alert_at:', error.message);
      throw error;
    }
  });

  console.log('[db] Schema pronto.');
})();

module.exports = { db, run, get, all, DATA_DIR, ready };
