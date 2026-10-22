# transcricoes-desativacao-acessos-residuais.spec.md

> Pedido direto do autor em 22/10/2026: remover o botão de dispositivos restante no Perfil
> e conferir se a transcrição está desativada e ausente das telas.

## Objetivo

Completar a retirada dos acessos visíveis à integração abandonada, corrigindo o link
residual no Perfil e auditando seus pontos de entrada web e API.

## Entregáveis

1. Remover o link Dispositivos de transcrição do Perfil, sua classe exclusiva e import
   standalone que ficar sem uso. Manter os controles de conta existentes.
2. Conferir navegação, rotas, imports de execução, proxy e OpenAPI; verificar as URLs
   e operações históricas contra a aplicação local real, sem ativar o módulo abandonado.
3. Registrar alcance, evidências e limites em `transcricoes-desativacao-acessos-residuais/verificacao.md`.

## Critérios de Aceite

- Perfil sem atalho de transcrição em 1920×1080, 1366×768, 960×1080 e 360×800,
  bases clara e escura; comparação pessoal com o próprio Perfil aprovado e seus
  cartões de senha/conta, mantendo shell, densidade, hierarquia e controles canônicos.
- Nenhuma entrada produtiva restante para a feature; endpoints históricos retornam
  404 com e sem sessão, e URLs antigas não montam seus componentes.
- Testes de Perfil, build e lint frontend, revisão do diff e `npm run repo:verificar` aprovados.

## Fora de Escopo

Apagar dados, tabelas, migrations, contratos ou código histórico inativo; modificar
o Python pessoal, reativar a integração, publicar versão ou alterar os requisitos
das specs históricas concluídas. A tarefa dos ícones conserva seu próprio fecho.

## Dependências

[Desativação original](../done/transcricoes-desativacao.spec.md), `docs/SYSTEM.SPEC.md`,
`docs/CONVENTIONS.md`, `docs/design/DESIGN.md` e skills `task-flow`, `design-fidelity`,
`verify` e `convencoes-check`.
