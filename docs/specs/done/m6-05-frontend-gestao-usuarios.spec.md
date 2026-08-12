# m6-05-frontend-gestao-usuarios.spec.md

> Task 5/7 do milestone `m6-gestao-usuarios-papeis.spec.md`.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema "Terminal
> de Contenção" (`docs/design/tema/`). Componente análogo a registrar na implementação: a
> tela de campanhas (lista com busca, avatares, chips, ações por linha) é a referência mais
> próxima de uma listagem administrativa com filtro no projeto — inspecionar antes de desenhar
> a tela nova (Proibição #29, processo de UI do `AGENTS.md`).

## Objetivo

**Tela de gestão de usuários** do admin: listar com busca/filtro, criar, alterar nome/login,
resetar senha, trocar tipo, excluir e reativar. Consome o backend das `m6-03`/`m6-04`. Rota
protegida por `adminGuard`; item de menu visível só para `ADMIN`.

## Entregáveis

1. **`adminGuard`** (`frontend/src/app/core/guards/admin.guard.ts`, functional
   `CanActivateFn`, mesmo padrão de `autenticacaoGuard`): libera quando
   `sessaoService.usuario()?.tipo === TipoUsuarioEnum.ADMIN`; caso contrário redireciona a
   `/painel` (destino padrão pós-login — reavaliar para `/acesso-negado` depois que a `m6-06`
   entregar a tela, se fizer sentido unificar; não é dependência bloqueante desta task, que
   roda em paralelo com a `m6-06`).
2. **`UsuarioAutenticadoDto`** (shared, consumido por `SessaoService`) ganha `tipo:
   TipoUsuarioEnum` — já emitido pelo login/`gerarToken` desde a `m6-02`; só falta o campo no
   DTO e o `SessaoService` passar a expor `usuario()?.tipo` para o guard e para o item de menu.
3. **Rota nova** `/admin/usuarios` em `app.routes.ts` (`canActivate: [adminGuard]`,
   `loadChildren` lazy), montando um `usuarioAdminRoutes` novo (ou estendendo
   `usuario.routes.ts`, a decidir na implementação conforme o quanto a página compartilha com
   `perfil`).
4. **Tela de gestão** (`frontend/src/app/modules/usuario/paginas/gestao/`, standalone,
   Signals, Reactive Forms):
   - **Listagem** paginada com busca por login/nome e filtro por tipo (consumindo
     `UsuarioListarDto`/`UsuarioListadosDto`), toggle para ver a "lixeira"
     (`apenasExcluidos`). Tipo exibido pelo **rótulo** (`tipoDescricao`), nunca o `codigo` cru.
   - **Criar** conta (form: login, senha, nome).
   - **Alterar** nome/login de uma conta existente (edição no próprio lugar, no padrão já usado
     no projeto — evitar página de formulário separada quando a ação cabe inline).
   - **Resetar senha** (form simples: nova senha, com o toggle "olhinho" já existente) e
     **trocar tipo** (select populado com `TipoUsuarioEnum` e rótulos locais — `Normal` /
     `Administrador` / `Testador`, mesmo texto seedado na `m6-01`; nenhum endpoint novo de
     listagem de tipos nesta task).
   - **Excluir** com confirmação forte (mesmo padrão de `excluirConta`, m2-14) e **reativar**
     uma conta da lixeira.
   - Erros de negócio (login duplicado, último admin, auto-ação, mestre de campanha) chegam ao
     admin via o `error-handler.interceptor` existente (toast com `StandardResponse.mensagem`)
     — nenhum tratamento especial de erro nesta tela além do já global.
5. **`UsuarioAdminService`** (ou extensão de `UsuarioService`, a decidir pela proximidade de
   responsabilidade) consumindo `GET/POST/PATCH/DELETE` da `m6-03`/`m6-04`, extraindo `dados`
   do `StandardResponse`, com os DTOs do `shared`.
6. **Item de menu "Gestão de Usuários"** na topbar (`shared/layout`), visível só quando
   `sessaoService.usuario()?.tipo === TipoUsuarioEnum.ADMIN` — um `NORMAL`/`TESTER` nunca vê o
   link.

## Critérios de Aceite

- Só admin acessa `/admin/usuarios`; o item de menu correspondente não aparece para os demais.
- Listagem com busca/filtro por login/nome/tipo e toggle de lixeira funcionam.
- Admin cria, altera nome/login, reseta senha, troca tipo, exclui e reativa contas pela tela.
- Tipo aparece pelo rótulo (`tipoDescricao`/label local), nunca pelo `codigo` cru.
- Erros de negócio (login duplicado, invariante de admin, auto-ação, mestre de campanha)
  chegam ao admin como toast legível.
- Padrões do frontend respeitados (standalone, Signals, Reactive Forms, `.scss`/BEM com tokens
  — Proibições #16/#17/#18/#29).

## Fora de Escopo

- Backend (`m6-03`/`m6-04`).
- `tipoGuard` genérico e a tela de "acesso negado" (`m6-06`) — guards independentes, sem
  dependência cruzada entre as duas tasks.
- Validação/refinamento mobile — `m6-07`.

## Dependências

- `m6-04` (todas as operações e invariantes do backend).
- `m6-02` (`tipo` no JWT/login, consumido pelo `SessaoService`).
- `m2-14` (padrão de tela self-service, dropdown de perfil, toggle "olhinho", confirmação de
  exclusão) e `m2-09`/`m2-15` (padrão visual de listagem/busca já estabelecido em campanhas).
