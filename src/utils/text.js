const trim = (text, max = 28) => String(text || '').length > max ? `${String(text).slice(0, max - 3)}...` : String(text || '');
module.exports = { trim };
