# ui-08-primitivo-botao-icone.spec.md

> Evolução filha da auditoria `ui-06`. Origem: `docs/design/AUDITORIA-BIBLIOTECA-VISUAL.md`.

## Objetivo

Criar o primitivo canônico para ações compactas somente por ícone e migrar os consumidores que
hoje repetem identidade de botão fora da biblioteca, sem absorver keypads, steppers, abas ou
controles de domínio compostos.

## Entregáveis

1. Implementar em `shared/ui/` um botão de ícone com contrato mínimo e explícito: sem rótulo
   visual, `aria-label` obrigatório, integração com `[appTooltip]`, foco, desabilitado, tamanhos
   canônicos e alvo de toque mobile. A API nasce dos olhos de senha, cópia, lápis e ações de
   fechar já existentes; não inventar severidades ou estados hipotéticos.
2. Migrar os consumidores equivalentes de autenticação, campanha, ficha, caderno e shared,
   apagando a identidade duplicada de cada classe local e preservando a classe de layout quando
   ela ainda for necessária.
3. Documentar no `DESIGN.md` o novo primitivo, os controles que continuam exceções (teclas da
   calculadora, `app-step-input`, `app-aba`, fundo de modal e botões de domínio compostos) e a
   regra de escolha entre ele e `app-botao`.

## Critérios de Aceite

- Os quatro papéis reais (visibilidade de senha, copiar, editar e fechar) usam o mesmo primitivo
  ou uma exceção documentada e justificada.
- Cada ação tem nome acessível, tooltip quando só o ícone aparece, foco visível e alvo de 44px no
  mobile; normal, hover/foco e desabilitado são observados em `1920×1080` e `360×800`.
- Testes do primitivo, lint e gate visual passam sem erro novo; não há cópia de sua identidade
  BEM fora de `shared/ui/`.

## Fora de Escopo

- Migrar botões que expressam um controle de domínio composto ou uma quantidade; eles são
  classificados na `ui-09`/`I-025`/`I-026`.
- Alterar ações, permissões ou textos de produto.

## Dependências

- `ui-06`, `docs/design/DESIGN.md` e os primitivos `Botao`/`Modal` já concluídos.

## Riscos e Mitigação

- Usar o componente para qualquer ícone apagaria semânticas diferentes. A migração só aceita
  ações unitárias; teclado, stepper e abas permanecem componentes próprios.
