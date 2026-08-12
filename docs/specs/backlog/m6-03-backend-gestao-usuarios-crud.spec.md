# m6-03-backend-gestao-usuarios-crud.spec.md

> Task 3/7 do milestone `m6-gestao-usuarios-papeis.spec.md`.

## Objetivo

CRUD de contas pelo admin — **listar (com busca/filtro e lixeira), criar, alterar nome/login,
excluir e reativar**. Estende o módulo `usuario`. As operações **sensíveis** (trocar tipo,
resetar senha) e as **invariantes** de segurança (≥1 admin ativo, proteção de auto-ação,
exclusão de mestre de campanha) ficam na `m6-04` — esta task é o CRUD "básico", sem elas.

## Entregáveis

1. **DTOs** em `shared/src/dtos/usuario/` (`dto-conventions`):
   - `UsuarioListarDto` (entrada paginada — §10.5: `pagina`, `itensPorPagina`, `ordenarPor`,
     `direcao`, `allRows?`; mais os filtros `login?`, `nome?`, `tipo?: TipoUsuarioEnum` e
     `apenasExcluidos?: boolean`, default omitido = só contas ativas).
   - `UsuarioResumoDto` (saída de item de listagem): `id`, `login`, `nome`, `tipo:
     TipoUsuarioEnum`, `tipoDescricao: string` (a `descricao` de `tipo_usuario` — é o rótulo que
     o frontend exibe, nunca o `codigo` cru, conforme o spec do milestone), `isDeleted:
     boolean` (para a UI distinguir linha ativa de "lixeira" numa listagem que pode misturar,
     se a implementação optar por isso).
   - `UsuarioListadosDto extends PaginatedResult<UsuarioResumoDto>` (só herança de DTO core —
     Proibição #21).
   - Criação/alteração pelo admin reaproveitam, quando o formato bate: `UsuarioCriarDto`
     (m2-02, para criar conta) e `UsuarioPerfilAlterarDto`/`UsuarioPerfilAlteradoDto` (m2-11,
     para alterar nome/login de um alvo — o `id` vem do `@Param`, não do token). Reexclusão:
     `UsuarioExcluirDto {id}` (m2-11) — a operação "excluir usuário X por id" tem o mesmo
     formato e sentido para self-service e para admin; não duplicar um DTO idêntico
     (`dto-conventions`: evitar par artificial quando o conceito realmente é o mesmo).
   - `UsuarioReativarDto {id}` (interno) / `UsuarioReativadoDto` (saída, mesmo formato de
     `UsuarioPerfilAlteradoDto` — sem senha).
2. **`UsuarioRepository`** ganha:
   - `listar(dto: UsuarioListarDto): Promise<PaginatedResult<UsuarioResumoDto>>` — `SELECT`
     com `JOIN tipo_usuario`, filtros opcionais (`login ILIKE`, `nome ILIKE`, `tipo_usuario.
     codigo = :tipo`), `WHERE usuario.is_deleted = :apenasExcluidos` (Proibição #4 veda
     **omitir** o filtro, não veda parametrizá-lo — decisão já registrada no spec do
     milestone), paginação/ordenação padrão (§10.5).
   - `reativar(dto: UsuarioReativarDto): Promise<UsuarioReativadoDto>` — `UPDATE usuario SET
     is_deleted = false, deleted_date = NULL, updated_date = NOW() WHERE id = :id AND
     is_deleted = true RETURNING ...` (a única superfície que enxerga e reverte um
     `is_deleted = true`, restrita ao admin pela service).
3. **`UsuarioService`** ganha (protegido por `@TiposPermitidos(ADMIN)` na controller):
   - `listar` — repassa ao repositório, sem regra extra.
   - `criar` — reaproveita a regra de duplicidade de login de `AutenticacaoService.registrar`
     (extrair para o `UsuarioRepository`/`UsuarioService` se ainda não estiver lá, para não
     duplicar a checagem — Proibição #28 é sobre permissão, mas o espírito vale para regra
     compartilhada); grava sempre `tipo: TipoUsuarioEnum.NORMAL` nesta task (trocar tipo é
     `m6-04`, numa ação separada após criar).
   - `alterar` (nome/login de um alvo) — mesma validação de unicidade de login de
     `alterarPerfil` (m2-11), mas por `id` de `@Param`, não do token.
   - `excluir` — soft delete de um alvo qualquer **sem** as invariantes (≥1 admin, auto-ação,
     mestre de campanha) — essas entram na `m6-04`, que estende este método antes dele ir para
     produção. Se a ordem de implementação permitir, é aceitável que `m6-03` já deixe o ponto
     de extensão claro (early return / guard clause) em vez de implementar excluir "sem rede" e
     depois remendar.
   - `reativar` — reverte o soft delete; sem invariante própria (reativar nunca reduz o número
     de admins ativos).
4. **Controller** (`UsuarioController`, mesmo módulo — path sugerido `usuario/admin` ou rotas
   dedicadas `GET /usuario`, `POST /usuario`, `PATCH /usuario/:id`, `DELETE /usuario/:id`,
   `PATCH /usuario/:id/reativar`; decidir na implementação para não colidir com as rotas
   self-service já existentes em `usuario/perfil`/`usuario/senha`), todas anotadas
   `@TiposPermitidos(TipoUsuarioEnum.ADMIN)`. Controller burra (Proibição #2): só monta o DTO
   com `@Param`/`@Query`/body e repassa.
5. **Testes de service**: listar com cada filtro isoladamente e combinados; criar com login
   duplicado (`BusinessException`); alterar com login duplicado; excluir e reativar um alvo
   ativo/inexistente (`ResourceNotFoundException`).

## Critérios de Aceite

- `GET` de listagem (protegida `@TiposPermitidos(ADMIN)`) responde 403 para não-admin.
- Busca/filtro por login, nome e tipo funcionam isolados e combinados; paginação segue §10.5.
- Admin cria, altera nome/login e exclui (soft delete) qualquer conta; a conta excluída some da
  listagem padrão e aparece só com `apenasExcluidos`.
- Reativar uma conta excluída a devolve à listagem padrão, com os mesmos `login`/`nome`.
- SQL segue §10.2/§16 (parâmetros nomeados, sem `VALUES`/`DEFAULT`, `is_deleted` explícito).

## Fora de Escopo

- Trocar tipo, resetar senha e todas as invariantes de segurança (≥1 admin ativo, proteção de
  auto-ação, exclusão de mestre de campanha) — `m6-04`.
- Frontend (`m6-05`).
- Bump de `token_versao` em qualquer operação — só entra com as sensíveis (`m6-04`), já que
  nome/login/exclusão/reativação básicas desta task não exigem derrubar sessão imediatamente
  (a exclusão já é coberta pelo `is_deleted` lido em `recuperarSessao`, m6-02).

## Dependências

- `m6-02` (`@TiposPermitidos`, `AutorizacaoGuard`).
- `m2-02`/`m2-11` (`UsuarioRepository`, `UsuarioCriarDto`, `UsuarioPerfilAlterarDto`,
  `UsuarioExcluirDto`, validação de unicidade de login).
