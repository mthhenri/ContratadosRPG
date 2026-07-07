# m2-06-frontend-autenticacao.spec.md

> Task 6/8 do milestone `m2-auth-campanhas.spec.md`.

## Objetivo

Frontend de autenticação: telas de login e registro, sessão do usuário autenticado (signal),
interceptor `auth-token`, guard de rota para áreas privadas e logout — mantendo a calculadora
pública. Consome os endpoints da m2-02.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).

## Entregáveis

1. **Telas standalone lazy** `login` e `registro` (`modules/` conforme estrutura do front),
   com **Reactive Forms** (sem `ngModel`), `.scss` + Tailwind + BEM em português, consumindo
   os tokens do tema. Rotas públicas.
2. **Sessão de usuário**: service em `core/` com **signal** do usuário autenticado; ações de
   `registrar`, `logar` e `sair`; token persistido (localStorage) e restaurado no boot.
3. **Interceptor `auth-token`** (`core/`): injeta o JWT no header das chamadas à API. O
   interceptor `error-handler` existente trata `401` (limpa a sessão e redireciona ao login).
4. **Guard de rota** para áreas privadas (exige sessão); a **calculadora permanece pública**
   (sem guard). Rotas privadas nascem aqui e são consumidas pela m2-07.
5. **Topbar/menu** reflete o estado de sessão (entrar/registrar quando deslogado; identidade +
   sair quando logado), reusando o `shared/layout` existente.
6. DTOs consumidos **do shared** — nunca redefinidos no front.

## Critérios de Aceite

- `registrar → logar` cria e persiste a sessão; F5 mantém a sessão (token restaurado).
- Acessar rota privada sem sessão redireciona ao login; após logar, retorna ao destino.
- A calculadora continua acessível **sem login**.
- Um `401` do backend desloga e leva ao login.
- Padrões do front respeitados: standalone, Signals, Reactive Forms, `.scss`/BEM, tokens do
  tema (proibições #16/#17/#18/#29).

## Fora de Escopo

- Telas de campanha (m2-07).
- Refinamento de UI/UX mobile dedicado (m2-08) — o layout já nasce sem scroll horizontal por
  usar os tokens/breakpoints do tema, mas o polimento mobile é a task final.
- Perfil/troca de senha na UI (não exigido pelo escopo acordado do milestone; endpoints
  existem desde a m2-03).

## Dependências

- `m2-02` (endpoints de registro/login, guard e JWT).
