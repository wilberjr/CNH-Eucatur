const isoNow = () => new Date().toISOString();
const daysSince = date => Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
const addDays = (date, days) => { const d = new Date(date); d.setDate(d.getDate() + days); return d; };
const brDate = date => new Date(date).toLocaleDateString('pt-BR');
const classify = days => { if (days >= 40) return 'inativa'; if (days >= 30) return 'vencida'; if (days >= 25) return 'proximo'; return 'ativa'; };
module.exports = { isoNow, daysSince, addDays, brDate, classify };
