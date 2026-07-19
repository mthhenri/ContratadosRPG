# m3-29-ficha-anotacoes.spec.md

> Task 29 do milestone `m3-ficha-jogador.spec.md`.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).

## Objetivo

O campo `anotacoes: string` já existe em `FichaJogadorDadosDto`
(`shared/src/dtos/ficha/ficha.dtos.ts`), mas hoje só é exibido read-only (um `<p>` opcional
na Visão Geral). Esta task dá a ele uma **aba própria e editável** — o jogador (e o mestre)
passam a poder escrever/editar anotações livres na ficha.

## Entregáveis

1. Nova aba **"Anotações"** em `ABAS_FICHA`/`AbaFicha`
   (`ficha-visualizacao.component.ts`), com painel inline (`<textarea>`) editável por
   quem já tem permissão de edição da ficha (mesmo signal `ajustavel()` das demais linhas).
2. Edição inline: `blur`/`Enter` confirma e emite um novo output `anotacoesMudou`, persistido
   por `visualizar.page.ts` no mesmo batching otimista dos demais campos.
3. O card read-only de Anotações na Visão Geral continua existindo como "peek" (sem editor
   duplicado ali) — só a aba nova é editável.

## Critérios de Aceite

- Aba "Anotações" aparece na barra de abas; edita e persiste via WS/reload.
- Membro sem permissão de edição vê o texto mas não consegue alterá-lo.
- Nenhuma regressão nas outras abas ou no card da Visão Geral.

## Fora de Escopo

- Rich text/markdown.
- Histórico/versionamento de anotações (não confundir com `m3-27`, que é sobre rolagens).

## Dependências

- `m3-10` (edição inline), `m3-11` (barra de abas).
