# m7-07-frontend-log-encontro.spec.md

> Task 7/8 do milestone `m7-encontro-combate.spec.md`.

## Objetivo

Exibir o **Log da rodada** previsto no mockup — a trilha legível do que aconteceu no encontro,
ao vivo, para mestre e jogadores.

## Entregáveis

1. **Painel de log** ao lado da lista de combatentes (desktop), alimentado por `encontro_evento`
   (`m7-04`): entradas marcadas por rodada/turno (`R3`, `T3 · 2`), com o nome do combatente em
   destaque e o texto do evento — dano sofrido e de quem veio, gasto de Energia, condição aplicada,
   início de rodada, mudança de estado.
2. **Ordem e recorte**: mais recente primeiro; o painel mostra a rodada corrente e permite alcançar
   as anteriores sem carregar o encontro inteiro de uma vez.
3. **Tempo real**: novas entradas chegam pelo mesmo evento `encontro:alterado`, sem polling.
4. **Fidelidade visual**: densidade, tipografia mono e hierarquia do mockup; reusar o padrão já
   aprovado da tira/sidebar de rolagens da campanha como análogo (mesma família de "feed de
   eventos"), com tokens — nada hardcoded, `appTooltip` quando houver dica.

## Critérios de Aceite

- Log comparado ao mockup em `1920×1080` pela skill `verify`, com eventos reais gerados na
  aplicação (dano, condição, virada de rodada)
- Entradas aparecem ao vivo para mestre e jogador
- Sem overflow; sem hex/fonte/raio hardcoded
- `npm run test -w frontend` verde; `npm run lint -w frontend` limpo

## Dependências

- `m7-06` (tela completa nos dois papéis)
