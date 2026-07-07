# m2-02-autenticacao-jwt-guard.spec.md

> Task 2/8 do milestone `m2-auth-campanhas.spec.md`.

## Objetivo

Backbone de autenticação do sistema: registro e login com JWT, guard global que passa a
proteger toda a API (ativando o `@Public()` nascido no M0) e o decorator `@ActiveUser()`.
Inclui a **persistência mínima de usuário** que registro e login consomem — de propriedade do
módulo `usuario` (proibição #23), consumida pelo módulo `autenticacao`.

## Entregáveis

1. **DTOs** em `shared/src/dtos/usuario/` seguindo CONVENTIONS/skill `dto-conventions`
   (nomes finais decididos na implementação): registro (`login`, `senha`, `nome`) e
   sua saída; login (`login`, `senha`) e sua saída (token + dados básicos, **sem senha**).
   Zero primitivos em service/repository — sempre DTO (§5).
2. **Módulo `autenticacao`** (`backend/src/modules/autenticacao/`):
   - **registro** — rota `@Public()`; cria `usuario` com a `senha` gravada como hash **bcrypt**;
     login duplicado → `BusinessException('Login já está em uso')` (§11), checado por
     `validarLogin` (nunca `existe*` — proibição #20);
   - **login** — rota `@Public()`; valida login + senha (`bcrypt.compare`); gera **JWT** via
     Passport (`JwtStrategy`), lendo `JWT_SECRETO`/`JWT_EXPIRACAO` pelo `ConfigService`
     (nunca `process.env` — proibição #10);
   - controller burra (só repassa — proibição #2), service com toda a regra.
3. **`JwtAuthGuard` global via `APP_GUARD`** — passa a exigir JWT em **todas** as rotas,
   exceto as marcadas `@Public()` (registro, login, `GET /health`). É o primeiro consumidor
   real do `@Public()` do M0 (que até aqui não bloqueava nada).
4. **`@ActiveUser()`** — decorator que injeta o payload do JWT no parâmetro do método (§12).
5. **Persistência de usuário** (módulo `usuario`, consumida aqui): `usuario.repository`
   (SQL only, estende `BaseRepository`) com `criarUsuario` (INSERT ... SELECT ... RETURNING —
   nunca VALUES) e busca por login para o `validarLogin`; `WHERE is_deleted = false` em todo
   SELECT. Query de usuário vive no repositório de `usuario`, não no de `autenticacao`
   (proibição #23).

## Critérios de Aceite

- Fluxo `registrar → logar` retorna um JWT válido; a senha **nunca** trafega de volta.
- Rota protegida sem token → 401; com token válido → 200. Rotas `@Public()` (registro, login,
  health) e as páginas da calculadora seguem acessíveis sem login.
- Testes de service cobrindo: registro com login duplicado, login com senha inválida, geração
  de token.

## Fora de Escopo

- Perfil e troca de senha (m2-03).
- Campanhas, fichas, tempo real.
- Frontend de autenticação (m2-06).
- Recuperação de senha por e-mail (fora do v1 — reset manual).

## Dependências

- `m2-01` (tabela `usuario`).
- M0: `@Public()`, `ConfigService` (`JWT_*`), `BaseRepository`, filtro/interceptor globais.
