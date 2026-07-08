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
- **Refinamento de UI/UX mobile** (task numerada dedicada, `m2-08`): telas de
  auth (login/registro), criação/entrada por código e listas de campanha/membros otimizadas
  para tela pequena (~360px, sem scroll horizontal do body, alvos de toque confortáveis),
  seguindo o mesmo padrão responsivo por tokens estabelecido em `m1-15` e a identidade
  "Terminal de Contenção" (`docs/design/`). Ver `m1-15-refinamento-mobile-calculadora.spec.md`.
- **Revisão geral de estilização** (task numerada dedicada no fim do milestone, `m2-09`):
  quando o handoff de design em `docs/design/` receber novos arquivos, revisar toda a
  estilização do site (calculadora do M1 + auth/campanhas do M2) contra a atualização.
  Bloqueada até a chegada dos novos arquivos — ver
  `m2-09-revisao-estilizacao-geral.spec.md`.

## Critérios de Aceite (mínimos)

- Fluxo completo: registrar → logar → criar campanha → outro usuário entra por código →
  mestre vê lista de membros
- Matriz de permissões de campanha (SYSTEM.SPEC §14) coberta por testes de service
- Calculadora continua pública e funcional sem login
- Todas as telas novas (auth + campanha) usáveis no mobile (~360px) sem scroll horizontal

## Dependências

- M0 (infra) — M1 não é dependência técnica, mas é prioridade de entrega
