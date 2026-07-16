# m3-26-otimizacao-espaco-ficha.spec.md

> Extensão do milestone `m3-ficha-jogador.spec.md` — task `m3-26`.
> **Incorpora e supersede a `m3-09-refinamento-mobile-ficha`** (o passe mobile vira parte deste
> redesenho desktop+mobile único; ver banner no topo da m3-09).

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md`; reusar
> `src/styles/tema/_breakpoints.scss` (`$bp-mobile`, mixin `mobile`, `$alvo-toque`) e o override de
> tokens de densidade (`--pad-card`/`--gap-grid`) da `m1-15`. Nada de largura mágica por arquivo
> nem hex/fonte/raio solto (proibição #29).

## Objetivo

**Otimização de espaço + refino visual** da ficha de jogador (a tela única editável no próprio
lugar, `FichaVisualizar` → `app-ficha-visualizacao`), **no desktop e no mobile**, para deixá-la
**mais preenchida sem poluir**. Hoje a página é limitada a **1160px centrados**; só a aba **Visão
Geral** usa a grade de 3 colunas, enquanto as outras 5 abas (Combate, Inventário, Habilidades,
Sanidade & Lesões, Rolagens) vivem num card de **640px** que deixa **metade da tela vazia** no
desktop. **Só apresentação** — sem tocar em regra de jogo nem de negócio; reorganiza e apresenta o
que **já existe**, não adiciona dado nem derivado novo.

## Entregáveis

1. **Desktop — aproveitar a largura:** as abas **não-Visão-Geral** deixam de ficar presas nos
   **640px** e usam melhor o espaço disponível (menos vazio à direita); revisar o teto de **1160px**
   da página e a densidade para o alvo **"mais preenchido, não poluído"** (nada de excesso de
   informação — reorganização, não novos campos).
2. **Mobile — absorvendo a `m3-09`:** ficha usável em **~360px sem scroll horizontal do body**;
   **alvos de toque ≥ 44px** (`$alvo-toque` hoje está **definido e não usado**; os steppers
   `.ficha-passo` estão em 22px); **seções colapsáveis** onde fizer sentido (a ficha é densa);
   densidade via override de `--pad-card`/`--gap-grid` (padrão m1-15). **Substituir o media-query
   mágico de 1080px** por breakpoints via token (reuso de `_breakpoints.scss`).
3. **Fade topo/base** (`appOverflowFade`, o mesmo recurso das listas da calculadora) nas listas
   roláveis da ficha (habilidades, sanidade, rolagens/inventário quando aplicável), com a máscara em
   gradiente no SCSS do consumidor — coerente com o que Habilidades/Sanidade já adotaram.
4. Idealmente **SCSS-heavy** (como m1-15); se um ajuste exigir marcação (ex.: container rolável,
   disclosure de seção), mantê-la mínima e **sem tocar em lógica**; testes verdes.
5. **Verificação responsiva registrada** (360/390/430px), na linha da §6 de `docs/PARIDADE-M1.md`.

## Critérios de Aceite

- Ficha **usável e "preenchida"** no **desktop** (as abas não-Visão-Geral não deixam mais metade da
  tela vazia) e no **mobile** (~360px **sem scroll horizontal**), com a identidade "Terminal de
  Contenção" preservada.
- **Alvos de toque ≥ 44px** nos controles interativos (steppers, botões, chips); densidade coerente
  com o padrão da m1-15; o media-query mágico de 1080px trocado por breakpoint via token.
- **Fade topo/base** presente onde as listas da ficha rolam (`appOverflowFade`).
- `lint`/`test`/`build` do frontend verdes.

## Fora de Escopo

- **Implementar os editores placeholder** — Inventário é a **m3-14**, presets de Rolagem a
  **m3-15**; aqui só se acomoda o que já existe.
- Qualquer **regra de jogo / derivado novo** ou **dado novo** — só reorganiza/apresenta o existente.
- Rework das telas de **campanha** (isso é m2-16/m2-17).

## Dependências

- `m3-10`/`m3-11` (tela única editável + abas — a base a refinar) e `m3-12`/`m3-13` (editores de
  Sanidade e Habilidades a acomodar no novo layout).
- `m1-15` (padrão responsivo por tokens) e `docs/design/examples/ficha-de-jogador.html` (alvo
  desktop).
- `src/styles/tema/_breakpoints.scss` e `appOverflowFade`
  (`src/app/shared/overflow-fade/overflow-fade.directive.ts`).
- **Absorve a `m3-09`** (marcada como superseded no backlog).
