# dev-01 — Reset e seed do banco de desenvolvimento

## Objetivo

Fornecer um comando seguro e reproduzível que apague exclusivamente o PostgreSQL local do projeto,
reaplique todas as migrations e crie contas, campanhas, membros e fichas de agente estáveis para
testes manuais em desenvolvimento.

## Entregáveis

1. Comando raiz `npm run db:reset:dev`, bloqueado fora de `APP_AMBIENTE=development` e contra host,
   banco, usuário ou armazenamento que não sejam locais.
2. Seed TypeScript idempotente e transacional, separado das migrations.
3. Contas `senhor.contratados`, `codex.dev`, `jogador.stub.1` e `jogador.stub.2`; a conta do autor
   preserva sua senha e as demais usam uma credencial comum documentada de desenvolvimento.
4. `Campanha do Matheus` e `Campanha do Codex`, cada uma com seu mestre, o outro usuário principal e
   os dois stubs como jogadores.
5. Quatro fichas de jogador/agente: Matheus e Codex possuem uma ficha em cada campanha. Todas têm
   cores de identidade explícitas e distintas e JSONB compatível com o contrato atual.
6. Testes das proteções, da composição do cenário e da idempotência; verificação real do reset,
   migrations, contagens, logins e acesso às campanhas/fichas pela aplicação.
7. Documentação das credenciais, do conteúdo destruído, do uso e da recuperação após falha.

## Critérios de aceite

- O comando recusa produção, host remoto, banco diferente de `contratados_rpg`, usuário diferente
  de `postgres` e armazenamento diferente de `local` antes de chamar Docker.
- O reset remove somente o volume declarado no Compose deste repositório, sem backup, sobe o banco,
  aplica as migrations e encerra com seed validado.
- Rodar o seed duas vezes mantém exatamente 4 usuários ativos, 2 campanhas fixture, 8 vínculos
  fixture e 4 fichas fixture, sem duplicatas.
- A senha de `senhor.contratados` não é alterada pelo seed.
- `senhor.contratados` e `codex.dev` autenticam pela API real e veem uma campanha como mestre e a
  outra como jogador.
- As quatro fichas abrem e são editáveis na aplicação; suas cores são distintas e respeitam
  `^#[0-9A-Fa-f]{6}$`.
- A implementação não reescreve migrations históricas nem cria dados de desenvolvimento em
  produção.

## Fora de escopo

- Produção, Supabase ou bancos remotos.
- Backup do banco local atual.
- Criaturas, NPCs, imagens, uploads e carga/performance.
- IDs seriais fixos como contrato.

## Fonte de design

Detalhamento aprovado em
[`docs/superpowers/specs/2026-08-11-reset-seed-desenvolvimento-design.md`](../../superpowers/specs/2026-08-11-reset-seed-desenvolvimento-design.md).
