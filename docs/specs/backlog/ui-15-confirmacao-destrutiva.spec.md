# UI-15 — Confirmação destrutiva

> Filha da auditoria visual (seções Modal e Componentes novos).

## Objetivo

Dar ao `app-modal` um rodapé de ações e criar o serviço de confirmação que hoje é remontado a
cada ação destrutiva, com rótulos e ordem de botões diferentes em cada tela.

## Entregáveis

1. Adicionar ao `app-modal` o slot `[modalAcoes]`: régua `--border` acima, gap 10px, alinhamento
   à direita. Hoje o corpo é projetado inteiro e cada consumidor monta a própria barra.
2. Criar `app-confirmacao` como serviço que devolve uma promessa e fixa título, texto de
   consequência, severidade e a posição do botão destrutivo. Botão de perigo em `--erro`, ícone
   de alerta já existente.
3. Migrar os quatro fluxos citados na auditoria: excluir ficha, encerrar encontro, remover
   combatente e sair da campanha. Cada um passa a informar apenas texto e ação.
4. Documentar no `DESIGN.md` a ordem canônica dos botões e a regra de quando a consequência
   precisa ser escrita ("Não há desfazer").

## Critérios de Aceite

- Os quatro fluxos usam o serviço; nenhum deles monta `<app-modal>` de confirmação à mão.
- Ordem dos botões, severidade e foco inicial são idênticos nos quatro; `Escape` cancela e a
  promessa resolve como negativa.
- Gate visual do diálogo nos dois viewports; no mobile os botões mantêm alvo de 44px.

## Fora de Escopo

Confirmação com entrada de texto ("digite o nome para excluir"), desfazer e qualquer mudança nas
regras de permissão das ações migradas.

## Dependências

`ui-02`, `ui-07`, `ui-12` (severidade `perigo` em `--erro`).
