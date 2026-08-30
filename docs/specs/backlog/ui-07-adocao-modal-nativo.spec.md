# ui-07-adocao-modal-nativo.spec.md

> Correção filha da auditoria `ui-06`. Origem: `docs/design/AUDITORIA-BIBLIOTECA-VISUAL.md`.

## Objetivo

Remover as composições locais de overlay/diálogo que sobreviveram à `ui-02` e fazer todos os
diálogos de aplicação usarem `app-modal`, preservando conteúdo, ações, comportamento e geometria.

## Entregáveis

1. Migrar as ocorrências de `dialogo__fundo`/`dialogo__fechar` nos módulos `campanha`, `ficha` e
   `encontro` para `<app-modal>`, incluindo os diálogos de criar/entrar campanha, inventário de
   esquadrão, acervo/visualizações de ficha e rolagem avulsa.
2. Apagar o SCSS de backdrop, caixa e botão fechar que só duplicar `app-modal`; manter apenas o
   layout e o conteúdo de domínio projetados no modal.
3. Conferir que o modal fica fora de ancestral `display: none`, que Escape/fundo/"×" seguem a
   política esperada e que nenhuma tela reintroduz `z-index` para simular top layer.

## Critérios de Aceite

- `rg -n 'dialogo__fundo|dialogo__fechar' frontend/src/app --glob '*.html'` não retorna
  composição de diálogo de aplicação; eventuais controles internos de DOM de terceiro são
  justificados na spec.
- Cada fluxo migrado é observado aberto, fechado por Escape, fechado pelo fundo quando permitido,
  com ação primária/desabilitada e em `1920×1080`/`360×800`, sem overflow nem corte.
- Lint, testes/builds proporcionais e gate visual da skill `verify` passam sem erro novo.

## Fora de Escopo

- Redesenhar o conteúdo dos diálogos ou alterar regras/ações de domínio.
- Criar outro modal ou alterar o contrato de `app-modal` sem caso real que ele não cubra.

## Dependências

- `docs/specs/done/ui-02-modal-e-notificacao.spec.md` e `docs/design/DESIGN.md`.

## Riscos e Mitigação

- Um modal declarado dentro de aba/condicional não ganha caixa mesmo no top layer. Declarar o
  primitivo fora desse ancestral e testar a entrada real que o abre.
