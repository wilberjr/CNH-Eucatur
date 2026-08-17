const trim = (text, max = 28) => text.length > max ? `${text.slice(0, max - 3)}...` : text;
module.exports = { trim };
