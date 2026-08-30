# p-036-badge-privada-bandeja.spec.md

> Correção avulsa originada de `docs/context/PROBLEMS.md` `P-036`.

## Objetivo

Restaurar o destaque visual do badge `Privada` da Bandeja de Dados, usando o
token vermelho fixo canônico do tema. A correção não cria um token genérico de
erro nem altera outros consumidores fora desse componente.

## Entregáveis

1. `bandeja-dados.component.scss` deixa de referenciar o token inexistente
   `--danger` no modificador `bandeja__visibilidade--privada` e usa `--vida`
   nas três propriedades de cor do badge.
2. Um teste de regressão focado comprova que o modificador não volta a depender
   de `--danger` e permanece ligado ao token `--vida` definido pelo tema.

## Critérios de Aceite

- O teste de regressão falha antes da alteração e passa depois dela.
- O teste focado e o lint do frontend passam sem erro novo.
- No app real, uma rolagem privada mostra o badge em vermelho fixo, com fundo e
  borda translúcidos, em `1920×1080` e `360×800`, comparado ao badge de estado
  operacional `detalhe__estado-operacional--missao`.

## Fora de Escopo

- Criar `--danger` como novo token de tema.
- Corrigir os usos de `--danger` fora da Bandeja de Dados, inclusive o
  Inventário do Esquadrão.
- Alterar o contrato, a visibilidade ou o fluxo de rolagens.

## Dependências

- `docs/context/PROBLEMS.md` `P-036`.
- `docs/design/DESIGN.md` e `docs/design/tema/_tokens.scss`.

## Riscos e Mitigação

- Usar `--accent` faria o badge mudar com a preferência do usuário e perderia o
  significado de visibilidade restrita; usar `--vida` preserva o vermelho fixo
  definido pelo tema e pelo componente análogo.
