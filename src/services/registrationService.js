const { run, get, all } = require('./database');
const { isoNow } = require('../utils/date');

async function upsertRegistration(payload) {
  await run(`INSERT INTO registrations (
    discord_user_id, discord_tag, nome, telefone, steam_id, created_at, updated_at, last_user_alert_at, last_admin_alert_at, status
  ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, 'ativa')
  ON CONFLICT(discord_user_id) DO UPDATE SET
    discord_tag=excluded.discord_tag,
    nome=excluded.nome,
    telefone=excluded.telefone,
    steam_id=excluded.steam_id,
    updated_at=excluded.updated_at,
    last_user_alert_at=NULL,
    last_admin_alert_at=NULL,
    status='ativa'`, [
    payload.discord_user_id,
    payload.discord_tag,
    payload.nome,
    payload.telefone,
    payload.steam_id,
    payload.created_at,
    payload.updated_at
  ]);
}

async function getRegistration(userId) {
  return get('SELECT * FROM registrations WHERE discord_user_id = ?', [userId]);
}

async function getAllRegistrations() {
  return all('SELECT * FROM registrations ORDER BY updated_at ASC');
}

async function markAlert(userId, field) {
  return run(`UPDATE registrations SET ${field} = ? WHERE discord_user_id = ?`, [isoNow(), userId]);
}

async function updateStatus(userId, status) {
  return run('UPDATE registrations SET status = ? WHERE discord_user_id = ?', [status, userId]);
}

module.exports = { upsertRegistration, getRegistration, getAllRegistrations, markAlert, updateStatus };
