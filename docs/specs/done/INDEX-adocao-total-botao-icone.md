# Adoção total de `app-botao`/`app-botao-icone` — índice

> Origem: `P-048` (`docs/context/PROBLEMS.md`). A auditoria da `m8-03` achou 5 controles fora do
> padrão em `detalhe.page`/`espectador.page`/`previa-jogador.page`; um levantamento completo
> (2026-09-04, agente de exploração) encontrou **130 classes distintas / 201 ocorrências**
> adicionais espalhadas por quase todo módulo do frontend — tamanho de milestone, não de task
> avulsa. Esta série `ui-28`…`ui-32` substitui o guarda-chuva único: cada spec é um recorte por
> módulo, independente o bastante para implementar em sessões separadas.

Última spec de UI no repositório antes desta série: `docs/specs/done/ui-27-auditoria-componentes-fantasma.spec.md`.
A numeração continua daí.

## Specs

| Spec | Escopo | Onda | Ocorrências (aprox.) |
| --- | --- | --- | --- |
| `ui-28` | Amplia `app-botao-icone` (âncora + tamanho `mini` sem borda) e adota em `shared/` + `modules/campanha` (inclui os 5 originais do P-048) | 1 — fundação, as demais dependem do primitivo ampliado | ~45 |
| `ui-29` | Adoção em `modules/encontro` | 2 | ~15 |
| `ui-30` | Adoção em `modules/ficha` (ficha, não criatura): `ficha-visualizacao`, `ficha-inventario`, `ficha-rolagens`, `ficha-combos`, `ficha-habilidades`, `ficha-habilidade-seletor`, `ficha-sanidade`, `cartao-ficha-acervo`, `acervo.page`, `guia-formula`, `pagina-caderno` | 2 | ~70 |
| `ui-31` | Adoção no lado Criatura/NPC: `criatura-visualizacao`, `criatura-ataque-lista`, `criatura-habilidade-lista`, `criatura-resistencia-lista`, `guia-equipamento-loja`, `criar.page`, `criar-criatura.page`, `visualizar.page`, `visualizar-criatura.page` | 2 | ~55 |
| `ui-32` | Adoção em `modules/simulacao` (`compras.page`, `patente.page`) e `modules/usuario` (`gestao.page`) | 3 — resto, menor risco | ~16 |

## Ordem sugerida

1. `ui-28` primeiro — sem o primitivo ampliado (âncora + `mini`), as outras quatro specs não têm
   como migrar `.rolagem-pill__d20`-like (mini sem borda) nem links de "voltar" (âncora).
2. `ui-29`/`ui-30`/`ui-31` em qualquer ordem — módulos independentes entre si.
3. `ui-32` por último — menor volume, sem dependência de ninguém.

## Fora desta série (decisão registrada em 2026-09-04)

- **Grupo C do levantamento** ("valor editável" clicável — nome da ficha, stats que viram `<input>`
  ao clicar, ~15 classes/32 ocorrências: `criatura__designacao`, `ficha-ident__nome`,
  `barra-recurso__valor-atual`, etc.) — não mapeia em `app-botao` nem `app-botao-icone` (é mais
  campo de formulário disfarçado que ação de botão). Registrado como `P-057` em `PROBLEMS.md`,
  decisão de criar primitivo novo (`app-valor-editavel`?) fica para quando alguém priorizar.
- **Grupo D** (seletor/dropdown customizado com `role="listbox"`/`role="option"` —
  `ficha-inv__categoria-select-*`, `inventario-esquadrao__categoria-select-*`,
  `ficha-inv__mover-*`) — semântica de campo de formulário, não de botão. Não é dívida do P-048;
  não precisa de entrada própria.
- Steppers, chips, radio/checkbox customizado, abas e cartão/linha inteira clicável — já cobertos
  por primitivos ou papéis próprios; confirmados fora do escopo pelo levantamento, sem ação
  pendente.
- **Gatilhos `utilitario-flutuante`** (achado ao implementar `ui-28`, não pelo levantamento
  original): `.calc-flutuante__gatilho`, `.historico-rolagens__gatilho`,
  `.inventario-sidebar__gatilho`, `.ficha-flutuante__gatilho`, `.caderno__gatilho` — botão de ação
  flutuante 48px (`position: fixed`, empilhamento entre si via CSS custom properties) já
  compartilhado via `shared/utilitario-flutuante/_utilitario-flutuante.scss` (mixin único, 6
  consumidores). Papel genuinamente diferente de `app-botao-icone` (inline, sem posicionamento
  próprio) — mesma categoria de exceção que `botao-icone.component.ts` já documenta para
  steppers/abas. Não migrar; **o `__fechar` de cada painel (diferente do `__gatilho`) continua no
  escopo normal.**

## Dependências

- `ui-28` → `ui-29`, `ui-30`, `ui-31`, `ui-32` (primitivo ampliado)
