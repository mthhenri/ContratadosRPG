# investigacao-rolagem-coluna-e-icones-abas.spec.md

> Task avulsa solicitada pelo autor em 24/10/2026, com posição demarcada em captura.

## Objetivo

Concentrar a Rolagem rápida da Investigação na coluna de rolagens e alinhar
as abas Criaturas/NPCs às identidades canônicas disponíveis no sistema.

## Entregáveis

1. Na Investigação do mestre, Rolagem rápida e seletor público/oculto ficam no
   topo da coluna de rolagens, acima do histórico, na largura compacta dessa coluna.
   Não ocupam mais a largura do palco. Rolador continua disponível quando o
   histórico é destacado em janela; preserva registro/evento e evita duplicação.
2. Somente as abas Criaturas/NPCs da campanha do mestre usam `criatura` (SCP)
   e `npc` (peão). Esquadrão mantém `membros`. Não redesenhar glifos nem alterar
   globalmente `alerta`/`agente` ou os botões de criação fora do pedido.
3. Relatório/plano nesta pasta; saídas locais em
   `.artifacts/investigacao-rolagem-coluna-e-icones-abas/`.

## Critérios de Aceite

- Testes da composição garantem rolador na coluna da Investigação, instância
  única, preservação quando histórico destacado e Resistência inalterada.
- Aplicação real observada em 1920×1080, 1366×768, 960×1080 e 360×800:
  Investigação, controle público/oculto, fórmula e histórico; abas de campanha
  com as três seleções e nomes acessíveis no mobile.
- Análogo: painel de rolagens da campanha do mestre, com o mesmo rolador e
  componentes canônicos. Sem overflow, sobreposição ou alteração de regras.
- Testes frontend, lint, build e `repo:verificar` aprovados, limites registrados.

## Fora de Escopo

Redesign de primitivos, novos ícones, outras telas/tipos de cena, regra de
rolagem, API/permissão e alterações anteriores desta sessão já concluídas.

## Dependências

`docs/SYSTEM.SPEC.md`, `docs/CONVENTIONS.md`, `docs/design/DESIGN.md`,
`docs/design/MARCAS.md`, catálogo M10-03/M10-04 e marcação do autor no chat.
