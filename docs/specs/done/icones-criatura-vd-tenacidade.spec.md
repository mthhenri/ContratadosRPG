# icones-criatura-vd-tenacidade.spec.md

> **Concluída em 2026-10-20** — relatório em [verificacao.md](icones-criatura-vd-tenacidade/verificacao.md).

> Spec avulsa. Pedido do autor em 2026-10-14, marcado como **importante**: criar ícones para o Valor de
> Desafio (VD) e para a Tenacidade da criatura.

## Objetivo

Desenhar, votar e adotar dois glifos novos — **VD** e **Tenacidade** — e usá-los onde esses conceitos
aparecem.

## Situação atual (levantada em 2026-10-14)

- Conceitos em `docs/core/guia_de_mestre-v4.2.0.md`: "Definindo o Valor de Desafio (VD)" e a Tenacidade
  que, com o VD, define a Vida da criatura ("Porte ≠ Tenacidade", "Cadência ≠ VD").
- Nenhum glifo hoje. Onde aparecem: `criatura-visualizacao` (stat "VD" e Tenacidade),
  `ficha-flutuante-conteudo`, `criar-criatura`, `visualizar-criatura`, `cartao-ficha-acervo`
  ("NA … · VD …"). O card do mestre (`criatura-esquadrao-card`) não mostra VD nem Tenacidade.

## Entregáveis

1. **Prancha para votação** (anexo na pasta da task, formato das pranchas de `icones-recursos-sistema`):
   ao menos três opções por conceito, traço de contorno da família atual, testadas em 16 px ao lado do
   texto e em tema claro/escuro. Os desenhos não podem colidir com glifos existentes (`patente`, `dt`,
   `defesa`, `vida`, `scp`).
2. Glifos aprovados em `app-icone` (`IconeNome` + `@case`, crédito/licença no comentário).
3. Lista de consumidores com proposta de adoção, aprovada pelo autor; aplicação com `appTooltip`
   ("Valor de Desafio", "Tenacidade"). Se o autor quiser VD/Tenacidade no card do mestre, entra aqui.

## Critérios de Aceite

- Decisão explícita do autor sobre os dois desenhos antes de qualquer código.
- `icone.component.spec.ts` cobrindo os novos nomes.
- Gate visual (`design-fidelity` + `verify`) em `1920×1080` e `360×800` nas telas adotadas, tema escuro e
  claro, comparando com o ícone `defesa`/`vida` vizinho. Lint, build, `npm run repo:verificar`.

## Fora de Escopo

Mudar regra de VD/Tenacidade; ícones de outros conceitos de criatura (Porte, Cadência, Nível de Ameaça) —
listar como candidatos em `icones-recursos-glifos-e-pendencias` se surgirem.

## Decisões e direção do autor — 2026-10-18

- Aplicar nos campos/resumos de criação, ficha completa, flutuante, Acervo e
  seletor de combatentes; manter o card do mestre sem acrescentar VD/Tenacidade.
- Primeira rodada não escolhida. Nova direção: VD parecido com indicador de nível;
  Tenacidade relacionada à Vida, como coração rígido/reforçado. Manter distinção
  visual entre os conceitos sem proibir a metáfora de coração pedida pelo autor.
- Voto recebido: **VD A — Patamares de nível** e **Tenacidade B — Coração reforçado**, da rodada 2.
- Autor reafirmou todos os locais propostos, incluindo seletor e flutuante; manter card do mestre como está. Adoção e gates de produto permanecem abertos.
