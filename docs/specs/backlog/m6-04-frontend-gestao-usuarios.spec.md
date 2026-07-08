# m6-04-frontend-gestao-usuarios.spec.md

> Task 4/4 do milestone `m6-gestao-usuarios-papeis.spec.md`.

## Objetivo

Frontend da **tela de gestão de usuários do admin** sobre o backend da m6-03: listar, criar,
alterar, excluir e trocar o tipo de qualquer usuário — acessível **só** para admin. Só camada de
frontend.

## Entregáveis

1. **`adminGuard`** (`frontend/src/app/core/guards/admin.guard.ts`, comportamento de negócio →
   português como o `autenticacao.guard.ts` existente): guard funcional (`CanActivateFn`) que
   encadeia o `autenticacaoGuard` (exige sessão) e libera só se o usuário logado for `ADMIN`;
   caso contrário redireciona para `/painel`. O tipo do usuário vem da sessão — **estender o
   `SessaoService`/DTO de sessão** para carregar/guardar o `tipo` (o backend já o devolve no
   login via m6-02; refletir no Signal + `localStorage`, como já feito com nome/login na m2-14).
2. **`UsuarioService` (frontend)** ganha o transporte HTTP puro (DTOs do shared, extrai `dados`
   do `StandardResponse`, JWT via interceptor): `listarUsuarios` (passando busca/filtro/
   `incluirExcluidos` como query), `criarUsuario`, `alterarUsuario`, `alterarTipoUsuario`,
   `resetarSenha`, `excluirUsuario`, `reativarUsuario` — mapeando às rotas da m6-03. Não redefine
   DTO (todos vêm do shared).
3. **Rota lazy** `/usuarios` (em `usuario.routes.ts` ou rota nova dedicada) atrás do `adminGuard`,
   via `loadComponent`. **Item de menu "Usuários"** no dropdown/topbar (`shared/layout`) visível
   **só** quando o usuário for admin (derivado da sessão) — segue o padrão do item "Perfil" da
   m2-14.
4. **Tela de gestão** (`paginas/gestao-usuarios/`, standalone, Signals, Reactive Forms):
   - **Lista** de usuários (login, nome, tipo) com estado de carregamento (`.esqueleto-bloco`,
     padrão m2 lista) e paginação/`allRows` conforme o backend.
   - **Busca e filtro**: campo de busca (login/nome) + filtro por tipo, alimentando
     `listarUsuarios`; alternância "ver excluídos" (lixeira) via `incluirExcluidos`.
   - **Criar** usuário (login, nome, senha, tipo — `p-select`/select com os valores de
     `TipoUsuarioEnum`), reusando o toggle "olhinho" de senha existente.
   - **Alterar** nome/login (edição inline no padrão das telas m2).
   - **Trocar tipo** de um usuário (chama `alterarTipoUsuario`).
   - **Resetar senha** de um usuário (campo de nova senha + toggle "olhinho"; chama `resetarSenha`).
   - **Excluir** com **confirmação inline forte** (sem `confirm()` nativo — padrão
     `--accent-dim`/`--accent-border` das m2-12/m2-13/m2-14).
   - **Reativar** conta excluída (a partir da visão de lixeira; chama `reativarUsuario`).
   - Erros (login duplicado; "não pode rebaixar/excluir o último admin"; auto-ação; exclusão de
     mestre) vêm do backend e aparecem via `error-handler` (toast) — não reimplementar a regra no
     front.
5. **Reação à invalidação de sessão**: como reset de senha / rebaixamento / exclusão passam a
   derrubar a sessão do alvo (m6-02/m6-03), o request seguinte daquele usuário vem 401. Garantir
   que o `error-handler`/interceptor existente encerre a sessão e redirecione ao `/login` no 401
   (se já faz, só cobrir por teste; se não, ajustar). Também: quando o **próprio admin** rebaixa a
   si — bloqueado no backend, mas a tela não deve oferecer a ação sobre a própria linha.
6. **Estilos** `.scss`/BEM **só com tokens** do tema (proibição #29 — copiar blocos sancionados de
   `docs/design/tema/_componentes.scss`); alvos de toque ≥44px no mobile (padrão m1-15/m2-08). Sem
   `.css`, sem `style=""`, sem seletor de ID; standalone; Reactive Forms.
7. **Testes** (Vitest): `admin.guard.spec` (admin passa, não-admin redireciona, sem sessão vai
   ao login); `usuario.service.spec` (cada método atinge rota/verbo/corpo e mapeia `dados`,
   incluindo busca/filtro na query, resetar senha e reativar);
   `gestao-usuarios.page.spec` (lista carrega; busca/filtro dispara `listarUsuarios`; criar chama
   `criarUsuario`; trocar tipo chama `alterarTipoUsuario`; resetar senha chama `resetarSenha`;
   excluir exige confirmação → `excluirUsuario`; reativar chama `reativarUsuario`; a própria linha
   do admin não oferece rebaixar/excluir; menu "Usuários" só para admin); `app.routes.spec`
   (`/usuarios` sem sessão → login; com sessão não-admin → `/painel`; com admin → resolve a tela).
   Adicionar `/usuario` ao proxy de dev se necessário (já existe da m2-11).

## Critérios de Aceite

- Só admin vê o item de menu "Usuários" e acessa `/usuarios`; não-admin é redirecionado.
- Admin lista (com busca/filtro/lixeira), cria, altera, reseta senha, troca o tipo, exclui e
  reativa usuários pela tela.
- Confirmação de exclusão sem `confirm()` nativo; erros do backend exibidos via toast.
- 401 por sessão invalidada encerra a sessão e leva ao `/login`.
- Responsivo (~360px) sem scroll horizontal; alvos de toque ≥44px.
- `.scss`/BEM só com tokens; standalone; Signals; Reactive Forms; nenhum DTO redefinido no front.
- `lint`/`test`/`build` do frontend verdes (dentro do budget de bundle; a tela vira chunk lazy).

## Fora de Escopo

- Backend (m6-03) e autorização/guard de backend (m6-02).
- Suspender/bloquear, "último acesso" e auditoria — não escolhidos para o M6.
- Aplicar a mecânica de tester a qualquer módulo (feito caso a caso no futuro).

## Dependências

- `m6-03` (endpoints de gestão de usuários pelo admin).
- `m6-02` (tipo do usuário no login/sessão).
- M2 frontend (`SessaoService`, `autenticacaoGuard`, `UsuarioService`, layout/topbar, toggle de
  senha, padrão de confirmação inline).
