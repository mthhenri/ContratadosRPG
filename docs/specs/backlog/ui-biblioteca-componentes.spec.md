# ui-biblioteca-componentes.spec.md

> Guarda-chuva. Quebra em `ui-01`…`ui-05` — não implementar este arquivo direto.
> Origem: `PROBLEMS.md` `P-034` (biblioteca de componentes existe como catálogo copiado, não como
> código) e a auditoria de uso real do PrimeNG registrada em `HISTORY.md` (2026-08-28).

## Objetivo

Transformar o design system do projeto de **catálogo copiado** em **biblioteca importada**:
criar `frontend/src/app/shared/ui/` com os primitivos que hoje são replicados à mão em dezenas de
SCSS, adotá-los em todo o frontend e, com isso, remover o PrimeNG por completo — mantendo a
identidade visual "Terminal de Contenção" pixel a pixel.

## Motivação

O `SYSTEM.SPEC.md` dizia "UI: PrimeNG 21". A auditoria de 2026-08-28 mediu o uso real:

| O que o PrimeNG entrega hoje | Volume |
|---|---|
| `<p-dialog>` | 14 tags em 5 arquivos (3 sem `[appendTo]`, mesma classe do `P-025`) |
| `<p-toast>` + `MessageService` | 1 tag; `MessageService` em 4 páginas + `app.config.ts` |
| Preset de tema (`ContencaoPreset`, `updatePrimaryPalette`) | ~100 linhas |

Nenhum `pButton`, `p-select`, `p-inputtext`, `p-table`, `p-tabs`, `p-checkbox`, `p-tooltip`,
`p-menu` — nenhuma diretiva `p*` em template nenhum. Os controles são nativos: **723 `<button>`,
219 `<input>`, 71 `<select>`, 31 `<textarea>`**, todos estilizados à mão.

A biblioteca própria existe, mas por cópia. `docs/design/tema/_componentes.scss` (292 linhas, 8
blocos BEM) **não entra no build** — o `styles.scss` importa `tokens`, `base`, `breakpoints`,
`utilitario-flutuante` e o Tailwind, e o `DESIGN.md`/`CONVENTIONS.md` mandam copiar o bloco para
o SCSS scoped de cada componente. O resultado medido:

| Bloco | Declarado em N arquivos SCSS | Usado em N templates |
|---|---|---|
| `.botao` | **20** | 24 |
| `.campo` | 17 (uma versão por componente) | 17 |
| `.stat` | 5 | 13 |
| `.card` | 5 | 6 |
| `.stepper` | 4 | 5 |
| `.chip-classificacao` | 3 | 3 |

São **32.393 linhas de SCSS para 21.681 linhas de template** — mais estilo do que marcação, a
assinatura de um design system replicado. Vinte implementações de botão que só coincidem enquanto
ninguém mexer, e o gate visual da proibição #31 tendo que provar à mão o que deveria ser garantido
por construção.

## Tasks

1. **`ui-01-primitivos-base`** — a fundação (`shared/ui/`, camada base no build, regra de consumo)
   e os três primitivos de maior duplicação: `Botao`, `Campo`, `Selecao`.
2. **`ui-02-modal-e-notificacao`** — `Modal` sobre `<dialog>` nativo e `Notificacao` (toaster
   próprio); migra os 14 `p-dialog` e o `p-toast`/`MessageService`. Deixa o PrimeNG sem consumidor
   fora do tema.
3. **`ui-03-primitivos-composicao`** — `Cartao`, `Stat`, `Stepper`, `Chip`, `Abas`.
4. **`ui-04-adocao-por-modulo`** — adoção dos primitivos nos 8 módulos, um a um, eliminando as
   cópias BEM. É a maior; pode ser quebrada em `ui-04a`…`ui-04h` por módulo se necessário.
5. **`ui-05-remover-primeng`** — desinstalar `primeng`/`@primeuix/themes`, tema em CSS vars puras,
   budget do bundle, `SYSTEM.SPEC`/`CONVENTIONS`/`DESIGN.md`/skills atualizados.

Ordem obrigatória: `ui-01` → (`ui-02` ∥ `ui-03`) → `ui-04` → `ui-05`.

## Critérios de Aceite do guarda-chuva

- `grep -r "primeng\|primeuix" frontend/src frontend/package.json` não retorna nada.
- Nenhum bloco do catálogo declarado em mais de um lugar: para cada primitivo, o seletor base
  existe em exatamente **um** arquivo de `shared/ui/`.
- SCSS total do frontend **reduzido**, não aumentado, em relação às 32.393 linhas de partida — o
  número final entra no fecho.
- Bundle inicial de produção **abaixo** do valor de partida, com o budget do `angular.json`
  **baixado** junto (não elevado) — é a primeira redução real desde que `P-004` foi aberto.
- Gate visual da proibição #31 cumprido por módulo, com comparação de captura antes/depois: pixel
  diff **zero** onde a mudança é puramente estrutural, e divergência justificada item a item onde
  não for.

## Fora de Escopo

- **Migrar para React.** A avaliação que originou esta frente concluiu que a decisão real não é
  Angular vs React; esta série é em Angular e vale independentemente daquela escolha. O estudo de
  esforço da migração está no bloco de `HISTORY.md` de 2026-08-28.
- **Redesenhar a identidade visual.** Os primitivos reproduzem o que já está na tela; qualquer
  mudança de forma, cor, densidade ou espaçamento é divergência a corrigir, não melhoria.
- **Reduzir o bundle por lazy loading** (a correção de fato do `P-004`). Aqui só se mede e se
  colhe o que a saída do PrimeNG devolver.
- **Quebrar os componentes gigantes** (`ficha-inventario`, `ficha-visualizacao`). A adoção dos
  primitivos encolhe o SCSS deles, mas a decomposição do TS/HTML é outra frente.
- Ferramenta de regressão visual automatizada; storybook ou catálogo navegável de componentes.
  Cabem em `IDEAS.md`.

## Dependências

- `docs/design/DESIGN.md` e `docs/design/tema/` — fonte de verdade da identidade; os primitivos a
  executam, não a redefinem.
- Nenhuma spec precisa estar em `done/` antes.

## Riscos e Mitigação

- **Regressão visual silenciosa.** É o risco dominante: 63 templates mudam de dono de estilo. A
  mitigação é a técnica já provada na `formatacao-legibilidade-frontend` — capturar a referência
  **antes** de tocar no módulo e exigir pixel diff zero depois, com toda diferença justificada.
- **Primitivo genérico demais.** Um `Botao` com 15 inputs para cobrir 24 usos não resolve nada.
  Regra: o primitivo nasce das variantes que **existem** no `_componentes.scss` e nas cópias
  medidas; variante nova exige um caso real na tela, não hipótese.
- **A série parar no meio.** `ui-01` sozinha aumenta a duplicação (primitivo novo convivendo com
  20 cópias). Se a frente for interrompida, o ponto de parada seguro é depois de `ui-04`; `ui-05`
  é curta e independente.
