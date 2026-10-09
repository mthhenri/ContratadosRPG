# Usabilidade de classes, dados e condições

> Pedido do autor em 09/10/2026: análise de usabilidade do sistema, com foco na compreensão das classes e dos dados, e tooltips descritivos das condições.

## Objetivo

Avaliar a experiência atual nas jornadas de consulta de regras, simulação, criação e leitura de ficha, priorizando classes, progressão e interpretação dos dados. Disponibilizar a descrição canônica das condições nos pontos em que são apresentadas.

## Entregáveis

1. Relatório da inspeção atual, com etapas, evidências, gravidade, recomendações e limites; anexos em `usabilidade-classes-condicoes-2026-10-09/`, capturas locais em `.artifacts/usabilidade-classes-condicoes-2026-10-09/`.
2. Tooltips das condições usando `appTooltip` e descrições do Sistema vigente, compartilhadas pelos consumidores sem redefinir efeitos ou automação de jogo.
3. Verificação de mouse, teclado e toque, controles de edição preservados e atualização do contexto.

## Critérios de Aceite

Inspecionar pessoalmente a aplicação real em 1920×1080, 1366×768, 960×1080 e 360×800. Registrar estados e análogo: tooltips informativos de atributos e termos existentes, mesma casca, densidade e posicionamento; cartões e controles permanecem nos padrões atuais. As condições exibidas devem explicar efeitos, duração/remoção previstos na fonte; condições livres desconhecidas não recebem regra inventada. Build, lint, testes proporcionais e `repo:verificar` executados e documentados. Limitação de acesso ou gate ausente mantém o recorte aberto.

## Fora de Escopo

Redesenhar classes ou implementar outras recomendações sem decisão do autor; alterar regras, permissões, persistência ou condições automaticamente; encerrar a avaliação legada de setembro por esta inspeção.

## Dependências

`docs/SYSTEM.SPEC.md`, `docs/CONVENTIONS.md`, `docs/design/DESIGN.md`, handoff de tema e `docs/core/sistema-v4.1.4.md` (Condições). Avaliação legada em `docs/specs/active/usabilidade-2026-09-13/` somente como contexto, não evidência atual.
