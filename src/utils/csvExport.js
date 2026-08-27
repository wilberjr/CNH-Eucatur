const { daysSince, classify, brDate } = require('./date');

/*
 * Escapa um valor para CSV: envolve em aspas e duplica aspas internas,
 * padrão RFC 4180 (é o que Excel/Google Sheets esperam).
 */
function csvEscape(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

/*
 * Gera o conteúdo de um .csv com os cadastros informados, já ordenado
 * por nome. Usa ponto-e-vírgula como separador (padrão do Excel em
 * pt-BR) e BOM UTF-8 (para acentos abrirem certo sem configuração
 * extra). Compartilhado entre /cnh-exportar e os alertas automáticos
 * de inatividade, para nunca ter duas versões da mesma lógica.
 */
function buildRegistrationsCsv(rows) {
  const header = ['Nome Completo', 'Identificação Empresa', 'Telefone', 'Steam ID', 'Discord', 'Status', 'Dias sem renovar', 'Última renovação'];
  const sorted = [...rows].sort((a, b) => a.nome_completo.localeCompare(b.nome_completo, 'pt-BR'));
  const lines = [header.map(csvEscape).join(';')];

  for (const row of sorted) {
    const days = daysSince(row.updated_at);
    const state = classify(days);
    lines.push([
      row.nome_completo,
      row.identificacao_empresa,
      row.telefone,
      row.steam_id,
      row.discord_tag,
      state,
      days,
      brDate(row.updated_at)
    ].map(csvEscape).join(';'));
  }

  return '\uFEFF' + lines.join('\r\n');
}

module.exports = { buildRegistrationsCsv, csvEscape };
