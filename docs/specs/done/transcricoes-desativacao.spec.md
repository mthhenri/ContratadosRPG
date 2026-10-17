# transcricoes-desativacao.spec.md

> Pedido direto do autor em 2026-10-17: abandonar a integração de transcrição,
> pois o fluxo Python local já atende à necessidade.

## Objetivo

Desativar completamente a transcrição integrada ao site e à API e retirar sua
continuação da fila de trabalho. Preservar o fluxo local do autor e os dados existentes.

## Entregáveis

1. Retirar o módulo de transcrição do registro da aplicação NestJS: nenhum endpoint
   de sessões, faixas, glossário, identidades, vínculo, dispositivos ou aplicativo ativo.
2. Remover as quatro rotas Angular da feature e o atalho na campanha do Mestre.
3. Arquivar o guarda-chuva e as tasks pendentes 02/04–09 com estado explícito
   ABANDONADA por decisão do autor, movendo anexos e corrigindo ponteiros.
   Preservar as specs históricas 01/03 e identificar a desativação no contexto atual.
4. Preservar código inativo, contratos, migrations e dados, sem rollback, exclusões
   ou alterações no Python; avisar no README do aplicativo que a integração foi abandonada.
5. Registrar mapa de impacto, verificações e limites no anexo `transcricoes-desativacao/verificacao.md`.

## Critérios de Aceite

- Backend real sem rotas `/transcricao/*` nem endpoints da feature no OpenAPI.
- URLs antigas não carregam telas de transcrição; campanha sem o atalho.
- Build, testes e lint dos workspaces, além de `npm run repo:verificar`.
- Inspeção pessoal da campanha em 1920×1080 e 360×800 com `verify`.
  Análogo: a própria tela Detalhe do Mestre e sua coluna de ações aprovada;
  preservar shell, densidade, hierarquia, espaçamento, controles, estados,
  iconografia e comportamento responsivo, retirando apenas o item Transcrições.
- Nenhuma task da feature permanece em active/backlog; 01/03 não têm requisitos reescritos.

## Fora de Escopo

- Apagar dados, tabelas, migrations, arquivos locais, instalações ou credenciais do computador.
- Alterar o script Python pessoal, adicionar motores, substituir a integração ou publicar versão.
- Declarar entregas abandonadas como implementadas ou reescrever requisitos de specs concluídas.

## Dependências

`docs/SYSTEM.SPEC.md`, `docs/CONVENTIONS.md`, `docs/design/DESIGN.md`,
skills `task-flow`, `gerenciamento-de-impacto`, `design-fidelity` e `verify`.
