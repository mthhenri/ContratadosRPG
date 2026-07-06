# m1-18-slider-customizado.spec.md

> Task de refinamento do M1 (mesmo padrão de m1-15/m1-16 — melhoria de acabamento após o
> fechamento da paridade em m1-14), a pedido do autor. Cria um **padrão visual próprio para
> `<input type="range">`**, alinhado ao tema "Terminal de Contenção", para substituir a
> aparência padrão (nativa) do navegador.

## Objetivo

Hoje o único slider do app é o campo **Nível** da aba `agente`
(`frontend/src/app/modules/calculadora/paginas/agente/agente.page.html:31-39`, classe
`.agente-slider`), estilizado só com `accent-color: var(--accent)`
(`agente.page.scss:116-120`). Isso deixa track/thumb no visual **padrão do navegador**
(altura, formato e comportamento de foco variam entre Chrome/Firefox/Safari) — destoa da
estética "técnica, sóbria, fria" do resto da UI, onde nenhum outro controle (stepper, select,
chip, botão) usa o estilo nativo do navegador.

Esta task define e aplica um **slider customizado reutilizável**: track fino, thumb
quadrado/levemente arredondado no padrão do tema (raio de controle, não pill nativo),
preenchimento em `--accent` até o thumb, estado de foco visível — consistente entre
navegadores via pseudo-elementos (`::-webkit-slider-*` / `::-moz-range-*`).

**Antes de qualquer UI, ler `docs/design/DESIGN.md` e consumir o handoff de tema em
`docs/design/tema/`.** Não existe hoje um padrão de slider em `_componentes.scss` nem nos
protótipos de `docs/design/examples/` — esta task **introduz** o padrão (a decisão de forma
vive aqui, não em um documento pré-existente) e deve devolvê-lo como bloco BEM canônico
reutilizável, do mesmo jeito que `.stepper`/`.card`/`.stat` já vivem lá.

## Contexto (estado atual)

- Único slider existente no código: `.agente-slider` na aba `agente` (Nível). Não há outro
  `<input type="range">` no frontend hoje.
- `StepInput` (`frontend/src/app/modules/calculadora/componentes/step-input/`) é o padrão
  reutilizável para **entrada numérica com −/+**; o slider é um controle **diferente**
  (arrasto contínuo dentro de um intervalo), usado especificamente para o Nível — não deve
  ser substituído pelo `StepInput`, só ganhar uma casca visual própria.
- O slider é ligado via Reactive Forms pelo `RangeValueAccessor` nativo do Angular (sem
  `ngModel`) — isso **não muda**; a task é puramente visual (CSS sobre o `<input type="range">`
  existente), sem trocar o binding nem introduzir uma biblioteca de terceiros.

## Entregáveis

1. **Padrão canônico do slider em `docs/design/tema/_componentes.scss`**, um bloco BEM novo
   (ex.: `.slider`) documentando: track (altura fina, `--surface-2`/`--border-strong`, raio de
   controle), thumb (tamanho consistente, `--accent`, raio de controle — não circular "pill"
   nativo), preenchimento da faixa percorrida em `--accent` (via gradiente linear calculado a
   partir do `%` atual, já que `input[type=range]` não expõe "faixa preenchida" nativamente
   sem JS ou CSS trick), estado `:hover`/`:focus-visible` (contorno/glow com `--accent`,
   paridade com o foco dos outros controles) e estado `:disabled` (opacidade reduzida,
   cursor `not-allowed`). Cobrir os dois motores de pseudo-elemento (`::-webkit-slider-runnable-track`/`::-webkit-slider-thumb` e `::-moz-range-track`/`::-moz-range-thumb`/`::-moz-range-progress`)
   para paridade visual entre navegadores.
2. **Aplicação no slider existente.** `.agente-slider` (aba `agente`, campo Nível) passa a
   consumir o novo padrão — visual consistente com o resto do tema, thumb/track no raio e
   cores do design system, preenchimento até a posição atual do Nível.
3. **Documentação em `docs/design/DESIGN.md`** referenciando o novo bloco `.slider`, para que
   futuras telas (ex.: ficha de jogador/criatura, que também usam slider nos protótipos de
   `docs/design/examples/`) reusem o mesmo padrão em vez de reinventar.

## Critérios de Aceite

- Nenhum slider do app usa a aparência **nativa** do navegador (track alto/thumb circular
  padrão do SO) — track fino e thumb no raio de controle do tema em Chrome, Firefox e Safari.
- Preenchimento em `--accent` até a posição do thumb, refletindo o valor atual do form control
  (sem JS extra além do necessário para calcular o `%` a partir de `min`/`max`/`value`, se o
  gradiente CSS puro não bastar).
- Estado de foco visível (`:focus-visible`) com o mesmo padrão de destaque `--accent` usado nos
  outros controles do tema (paridade com `input:focus`/`.agente-select:focus`).
- **Tudo via tokens** — nenhum hex/fonte/raio solto no SCSS (proibição #29 do CLAUDE.md); o
  bloco `.slider` vive em `_componentes.scss` como padrão canônico, não só no `.scss` scoped da
  página `agente`.
- Comportamento do form (Reactive Forms, `RangeValueAccessor`, clamp min/max, `step`) **inalterado**
  — mudança é 100% visual.
- **Zero alteração de regra de jogo** — `shared`/`shared/regras` intocados; suíte
  `test --workspace=frontend` segue verde (o spec `agente.page.spec.ts` não deve quebrar, já
  que a mudança é só de CSS/classe); `test --workspace=shared` inalterado; build dentro do
  budget de estilo vigente (elevar se necessário, registrando a decisão como nas tasks
  anteriores).

## Fora de Escopo

- Trocar o `RangeValueAccessor` nativo por uma biblioteca de slider de terceiros.
- Novos sliders em telas que ainda não existem (ficha de jogador/criatura ficam para
  M3/M4 — esta task só deixa o **padrão pronto** para reuso).
- Qualquer mudança em fórmula/regra (`shared/regras`) ou no comportamento funcional da aba
  `agente`.

## Dependências

- `m1-07-pagina-agente.spec.md` (introduziu o `.agente-slider` que esta task reestiliza).
- `docs/design/DESIGN.md` / `docs/design/tema/_componentes.scss` (onde o novo padrão `.slider`
  é registrado como bloco canônico).
