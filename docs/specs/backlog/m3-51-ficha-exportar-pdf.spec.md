# m3-51-ficha-exportar-pdf.spec.md

> Task 48 do milestone `m3-ficha-jogador.spec.md`. Lote de refino da ficha (`m3-38`…`m3-54`).
> **Spec grande** — pode ser quebrada em subtasks na hora de implementar.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). O PDF deve ser **fiel ao tema** — nada de hex/
> fonte/raio solto (proibição #29). Fontes IBM Plex Mono/Sans embutidas.

## Objetivo

Adicionar a opção **"Exportar ficha"** que gera um **PDF bonito**, estilizado no tema de
Contratados, com os dados da ficha.

## Entregáveis

1. **Decisão de arquitetura (a spec fixa antes de codar):** geração no **frontend** (client-side —
   ex.: layout HTML dedicado + `window.print()`/`@media print`, ou lib de PDF sem dependência de
   servidor) **vs. backend**. Levar em conta as fontes embutidas, fidelidade ao tema e a
   privacidade de campos (História/Anotações privadas — respeitar o gate da `m3-48`/`m3-49`: só o
   dono/mestre exporta com esses campos).
2. **Layout do PDF** fiel a `docs/design/` (cores/tokens, mono para dados/rótulos, sans para
   corpo, chip de classificação, cabeçalhos de seção com badge+régua). Seções: identidade
   (Agente/Contrato), atributos, derivados/combate, resistências, habilidades, inventário,
   sanidade, origem/personalidade. Consome `FichaJogadorDadosDto` + derivados de
   `shared/src/regras` (nunca recalcula no template).
3. **Ação "Exportar ficha"** no menu da ficha (`visualizar.page`) e/ou no acervo, gerando o
   arquivo com nome baseado no nome do Agente.
4. Responsivo à quantidade de conteúdo (quebra de página coerente).

## Critérios de Aceite

- Exportar produz um PDF legível, fiel ao tema (fontes/cores corretas), com as seções da ficha.
- Campos privados (História/Anotações) só entram no PDF para dono/mestre.
- Os valores no PDF batem com os exibidos na ficha (mesma fonte de verdade `shared/regras`).

## Fora de Escopo

- Templates alternativos/customização de layout pelo usuário (um layout canônico só).
- Exportar ficha de criatura/NPC (milestone M4).

## Dependências

- `m3-06`/`m3-07` (visualização da ficha), `m3-48`/`m3-49` (campos privados por permissão),
  `shared/regras` (derivados).
