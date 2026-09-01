# UI-20 — Fila de notificações: ícone, ação e duração

> Filha da auditoria visual (seção Abas · modal · notificações).

## Objetivo

A fila tem 4 severidades e régua de 3px, mas nenhuma forma de responder a um erro nem de mostrar
quanto tempo resta. O padrão para as duas coisas já existe no projeto, na bandeja de dados.

## Entregáveis

1. Ícone por severidade, dos que já existem no `app-icone`: `check`, `alerta`, `olho`,
   `excluir`. Cor por severidade, sem novidade na paleta.
2. Slot de ação opcional, no estilo `link` do primitivo de botão. Erro é a única severidade que
   costuma exigir resposta ("tentar de novo", "ver detalhes") e hoje o usuário só pode fechar.
3. Barra de duração com pausa no hover, copiando o comportamento da bandeja de dados (barra de 3px
   que esvazia em 7s e volta cheia no hover) — mesmo padrão, alimentado pela duração real do
   serviço, não por um número escrito no CSS.
4. Documentar no `DESIGN.md` quando a notificação leva ação e quando o erro exige diálogo.

## Critérios de Aceite

- As quatro severidades saem com ícone correto; nenhum ícone novo foi adicionado ao `app-icone`.
- Notificação de erro com ação: a ação é alcançável por teclado e não fecha o toast antes de
  executar.
- Duração no CSS e no serviço vêm da mesma fonte; hover pausa e restaura.
- `prefers-reduced-motion` honrado na barra. Gate visual das quatro severidades, com e sem ação.

## Fora de Escopo

Empilhamento/limite da fila, agrupar notificações repetidas e histórico de notificações.

## Dependências

`ui-19` (estilo `link`), `app-icone`, `shared/bandeja-dados` (referência de comportamento).
