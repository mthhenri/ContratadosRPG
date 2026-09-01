# UI-18 — Escala de espaço em cinco degraus

> Filha da auditoria visual (Tokens, achado 3). Base para as demais tasks de acabamento.

## Objetivo

Fechar a última dimensão do sistema que ainda não tem escala. Forma e tipografia já são
tokenizadas; espaço tem só dois degraus, e todo o resto é literal por componente.

## Entregáveis

1. Congelar cinco degraus em `tema/_tokens.scss` — 4 · 8 · 12 · 16 · 20 — escolhidos para
   preservar a densidade atual, não para mudá-la.
2. Migrar por componente, arredondando cada literal para o degrau mais próximo: 13px/14px no
   stat, 6px/10px no chip, 9px/11px no campo, 12px/14px no item de histórico, 7px de gap no
   campo, 5px no stat. São valores próximos que ninguém escolheu junto.
3. Registrar no `DESIGN.md` a escala e a regra: literal de espaço novo só com justificativa
   escrita no PR.

## Critérios de Aceite

- `grep` de `padding`/`gap`/`margin` com valor literal em px nos componentes migrados volta
  vazio, salvo exceções documentadas.
- Diferença visual por componente dentro de ±2px do estado atual nos dois viewports — a task é
  de vocabulário, não de redesenho. Gate visual completo.

## Fora de Escopo

Alterar densidade, revisar a escala tipográfica e migrar módulos de tela (só `shared/ui` e os
consumidores citados).

## Dependências

`ui-11`, `tema/_tokens.scss`, `docs/design/DESIGN.md`.

## Riscos e Mitigação

- Migração ampla e chata, com risco de regressão silenciosa. Fazer um commit por componente, com
  captura antes/depois, para bissecção fácil.
