function normalizePhone(value) { return String(value || '').replace(/[\s\-()]/g, ''); }
function isValidPhone(value) { return /^\+?[1-9]\d{7,14}$/.test(value); }
function normalizeSteamId(value) { return String(value || '').replace(/\s/g, ''); }
function isValidSteamId(value) { return /^7656\d{10,15}$/.test(value); }
module.exports = { normalizePhone, isValidPhone, normalizeSteamId, isValidSteamId };
