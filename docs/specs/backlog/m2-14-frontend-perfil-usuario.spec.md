# m2-14-frontend-perfil-usuario.spec.md

> Extensão do milestone `m2-auth-campanhas.spec.md` (pós-m2-09) — task `m2-14`.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).

## Objetivo

**Tela de perfil** do usuário, acessível pelo **dropdown de perfil da topbar** (hoje só com
"Campanhas" e "Encerrar sessão"): alterar **nome** e **login**, **trocar a senha** e
**excluir/inativar a conta**. Consome o backend da `m2-11` + a troca de senha da `m2-03`.

## Entregáveis

1. Novo item **"Perfil"** no dropdown de perfil da topbar (`shared/layout`) e uma **rota
   privada nova** (ex.: `/perfil`) — tela standalone **lazy** atrás do `autenticacaoGuard`.
2. **Tela de perfil** (Reactive Forms + Signals), carregando os dados via `GET /usuario/perfil`:
   - **editar nome e login** → `alterarPerfil` (login duplicado tratado via `error-handler`);
   - **trocar senha** (`senhaAtual` + `novaSenha`, reusando o toggle "olhinho" existente) →
     `alterarSenha` (m2-03);
   - **excluir/inativar a conta** com **confirmação forte** → `excluirConta`; ao concluir,
     **encerra a sessão** (`SessaoService.sair`) e navega para `/login`.
3. **`UsuarioService`** (frontend, em `core/` ou módulo próprio) consumindo
   `GET /usuario/perfil`, `PATCH /usuario/perfil`, `PATCH /usuario/senha` e `DELETE /usuario`;
   DTOs **do shared**, extraindo o `dados` do `StandardResponse`.
4. Estado em **Signals**, standalone, **Reactive Forms** (sem `ngModel`), `.scss`/BEM com os
   tokens do tema.

## Critérios de Aceite

- Pelo dropdown de perfil o usuário chega à tela e edita nome/login, troca a senha e exclui a
  conta.
- Login já em uso é barrado e a mensagem chega ao usuário (toast do `error-handler`).
- Ao excluir a conta a sessão é encerrada e o usuário vai para `/login`.
- Padrões do front respeitados (standalone, Signals, Reactive Forms, proibições #16/#17/#18/#29).

## Fora de Escopo

- Backend (`m2-11`; senha em `m2-03`).
- Refino visual da tela de campanhas (`m2-15`).

## Dependências

- `m2-11` (backend de perfil: alterar dados, excluir conta) e `m2-03` (troca de senha).
- `m2-06` (sessão, guard, dropdown de perfil da topbar — onde entra o item "Perfil").
