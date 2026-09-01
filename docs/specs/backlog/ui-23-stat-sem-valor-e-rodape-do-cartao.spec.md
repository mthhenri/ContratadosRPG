# UI-23 — Stat sem valor e rodapé do cartão

> Filha da auditoria visual (seção Cartão · Stat · Chip). Duas lacunas pequenas do mesmo par de
> primitivos.

## Objetivo

Distinguir "não preenchido" de zero no `app-stat`, e dar ao `app-cartao` o rodapé que quem
precisa de ações no fim do card hoje monta por fora.

## Entregáveis

1. Estado sem valor no `app-stat`: traço em `--text-mute`. Um atributo ainda não preenchido cai
   hoje como `0` ou vazio, com o mesmo peso 700 de um número real — em ficha nova a ausência lê
   como valor.
2. Slot `[cartaoRodape]` no `app-cartao`, com a mesma régua hairline do cabeçalho. O primitivo
   tem `[cartaoIndice]` e `[cartaoFim]`, mas nenhum rodapé.
3. Migrar os consumidores que hoje montam a barra de ações fora do cartão.
4. Registrar no `DESIGN.md` a diferença entre stat zero e stat sem valor, e quando usar rodapé em
   vez de `[cartaoFim]`.

## Critérios de Aceite

- Ficha nova: atributos não preenchidos aparecem como traço atenuado, distinguíveis de um valor 0
  real; leitor de tela não anuncia "0".
- Nenhum consumidor migrado ainda desenha barra de ações fora do `app-cartao`.
- Gate visual de stat (com valor, zero, sem valor) e cartão (com e sem rodapé) nos dois viewports.

## Fora de Escopo

Edição inline de atributo, validação de ficha e novas variantes de cartão.

## Dependências

`ui-03`, `ui-18`, `shared/ui/{cartao,stat}`.
