# m2-auth-campanhas.spec.md

> **Milestone M2 — Auth + Campanhas.** Receberá design detalhado (brainstorming próprio)
> quando chegar a vez; este spec fixa o escopo acordado. Quebrar em tasks numeradas.

## Objetivo

Contas de usuário e campanhas com papéis — a base de permissões de todo o resto.

## Escopo Acordado

- **Módulo `autenticacao`**: registro (`@Public()`), login com JWT (Passport),
  `JwtAuthGuard` global via `APP_GUARD`, `@ActiveUser()`. Senhas bcrypt.
  Sem recuperação por e-mail (reset manual — fora de escopo do v1).
- **Módulo `usuario`**: perfil, troca de senha.
- **Módulo `campanha`**: CRUD; criador vira `MESTRE`; convite por `codigo_convite`
  (entrar na campanha como `JOGADOR`; mestre pode regenerar o código, invalidando o anterior);
  listagem de membros; tabelas `campanha`, `campanha_membro`, `tipo_campanha_membro_papel`
  conforme `SCHEMA.md`.
- **Frontend**: telas de login/registro, guard de rota, signal de usuário autenticado,
  interceptor `auth-token`, telas de campanha (criar, entrar por código, listar, membros).
- Migrations de `usuario`, `campanha`, `campanha_membro` e tabelas de referência.

## Critérios de Aceite (mínimos)

- Fluxo completo: registrar → logar → criar campanha → outro usuário entra por código →
  mestre vê lista de membros
- Matriz de permissões de campanha (SYSTEM.SPEC §14) coberta por testes de service
- Calculadora continua pública e funcional sem login

## Dependências

- M0 (infra) — M1 não é dependência técnica, mas é prioridade de entrega
