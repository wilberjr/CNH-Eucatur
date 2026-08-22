# Ajuste do template oficial da CNH

Este pacote contém o `cardService.js` adaptado para preencher a imagem `cnh-template.jpg` enviada pelo usuário.

## Arquivos
- `assets/cnh-template.jpg` → fundo oficial da CNH
- `src/services/cardService.js` → renderização ajustada para esse template

## Observações
- O código preenche: nome completo, telefone, Steam ID, data de renovação, validade, identificação da empresa e status.
- O avatar é desenhado no quadro da esquerda.
- O status é escrito no selo à direita.
- O arquivo final continua sendo salvo em `DATA_DIR`.

## Substituição
Copie `src/services/cardService.js` para o projeto atual e coloque `cnh-template.jpg` dentro de `assets/`.
