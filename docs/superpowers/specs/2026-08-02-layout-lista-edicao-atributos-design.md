# Layout em lista para a edição de atributos — design

## Problema

O card de edição de atributos (`ficha-visualizacao.component.html`, bloco `@if (editandoAtributos())`)
usa hoje uma grade de caixas compactas (2 colunas), cada uma empilhando verticalmente: abreviação,
valor com stepper `−`/`+`, estrela de Maestria, stepper de modificador de teste e stepper de ajuste
de dados. Com quatro controles empilhados numa caixa estreita, o card fica denso e a leitura de "qual
stepper é qual" depende só de ícone/posição. Além disso, grupos com número ímpar de atributos (5 em
Físicos) exigem CSS especial pra centralizar o item órfão na grade de 2 colunas.

## Escopo

- Muda **só o modo de edição** do card de Atributos. A visualização normal (grade compacta de
  leitura, fora da edição) continua **idêntica** — mesma marcação, mesmo CSS, nenhuma mudança.
- **Puramente visual**: nenhum estado, computed ou método novo. Reusa integralmente o que já existe
  (`rascunhoAtributos`, `rascunhoMaestria`, `rascunhoModificadoresTeste`, `rascunhoDadosTeste`,
  `ajustarAtributoRascunho`, `ajustarModificadorTesteRascunho`, `ajustarDadosTesteRascunho`,
  `alternarMaestria`, `maestriaHabilitada`) — só a marcação de cada atributo em edição muda de
  "caixa de grade" para "linha de lista".
- Os grupos **Físicos**/**Mentais** continuam existindo como seções da lista (mesmo `gruposAtributos`,
  mesmo `<span class="ficha-atributos__rotulo-grupo">`).

## Estrutura de cada linha

Cada atributo em edição vira uma linha de duas sub-linhas, dentro do grupo (Físicos/Mentais):

**Sub-linha 1** — estrela de Maestria (mesmo botão `alternarMaestria`/`maestriaHabilitada`, mesma
trava de 6+ pontos) + **nome completo** do atributo (não mais a abreviação — a linha tem largura de
sobra) + valor com `−`/`+` alinhado à direita da linha:

```
★ Destreza ─────────────────────────  [−] 5 [+]
```

**Sub-linha 2** — os dois mini-steppers existentes (modificador de teste e ajuste de dados) lado a
lado no desktop, cada um agora com um **rótulo de texto curto** ("Mod." / "Dados") acima ou ao lado,
além do ícone de dado que o de dados já tinha:

```
MOD.  [−] +0 [+]        DADOS 🎲 [−] +0 [+]
```

Um separador fino (mesma cor de borda do card, `var(--border)`) entre cada atributo — substitui a
delimitação que antes vinha da caixa individual (`background`/`border` por atributo).

## Responsivo

- **Desktop (≥560px, fora de `bp.mobile`)**: sub-linha 2 sempre lado a lado (`display: flex`,
  `justify-content: space-between` ou `gap` entre os dois mini-steppers).
- **Mobile (`bp.mobile`, ≤560px)**: sub-linha 2 **empilha condicionalmente** se não couber — Mod.
  em cima, Dados embaixo — só nesse breakpoint; desktop nunca empilha.
- A lista vertical elimina o CSS especial do "5º atributo órfão" (grade de 2 colunas com item
  solto) que hoje existe pro grupo de 5 (Físicos) — numa lista, os 5 itens simplesmente empilham em
  sequência, sem sobra a centralizar. Esse CSS (`> *:nth-child(5) { ... }`, presente tanto no bloco
  geral quanto no `@include bp.mobile` dentro de `--2col`) é removido **apenas da marcação de
  edição** — o modo leitura continua como grade e mantém essa regra intacta.

## Fora do escopo

- Modo leitura (grade compacta) — zero mudança.
- Qualquer lógica de estado/persistência — zero mudança, é 100% o mesmo rascunho e os mesmos
  métodos já existentes.
- Nomes completos dos atributos já existem hoje (usados em tooltips/aria-label, ex.: `campo.nome`)
  — não é preciso criar nenhum texto novo, só trocar `campo.abrev` por `campo.nome` na sub-linha 1
  do modo de edição.

## Critério de verificação (obrigatório antes de fechar)

Verificação **ao vivo** (stack real, skill `verify`), nos dois viewports fixos do projeto:

- **Mobile:** 360×800 (Galaxy S20 FE).
- **Desktop:** 1920×1080 (FullHD).

Checar nos dois tamanhos: a lista não estoura a largura do card; no mobile, a sub-linha 2 realmente
empilha quando necessário (e não deixa de empilhar por engano); no desktop, os dois mini-steppers
continuam sempre lado a lado; a estrela de Maestria e os três steppers (valor, modificador, dados)
continuam com alvo de toque ≥44px no mobile; o modo leitura (grade compacta) permanece bit-a-bit
idêntico ao já verificado antes desta mudança (nenhuma classe/regra de leitura foi tocada).

## Testes

- `ficha-visualizacao.component.spec.ts`: os testes existentes de lógica (edição/confirmação de
  atributos, Maestria, modificador, dados) continuam passando sem alteração — nenhum deles depende
  da marcação HTML, só dos métodos/sinais do componente. Nenhum teste novo é necessário além da
  verificação ao vivo (mudança puramente de apresentação).
