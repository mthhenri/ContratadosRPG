# m2-11-backend-perfil-usuario.spec.md

> Extensão do milestone `m2-auth-campanhas.spec.md` (pós-m2-09) — task `m2-11`.

## Objetivo

Completar o backend self-service do usuário — **alterar os dados do perfil (nome e login)** e
**excluir a própria conta** (soft delete). A troca de senha já existe (m2-03). Estende o
módulo `usuario`. Sem frontend.

## Entregáveis

1. **DTOs** em `shared/src/dtos/usuario/` (CONVENTIONS / `dto-conventions`):
   `UsuarioPerfilAlterarDto` (`{ nome, login }`) / `UsuarioPerfilAlteradoDto`
   (`{ id, login, nome }` — **sem** senha; particípio masculino concordando com o complemento
   `Perfil`, como `CampanhaConviteRegeneradoDto`); `UsuarioExcluirDto` (`{ id }`, interno).
2. **`alterarPerfil`** (service): altera `nome` e `login` do usuário autenticado
   (`@ActiveUser()`). **Valida unicidade do `login`** (respeitando
   `uix_usuario_login_ativo`) — login em uso por **outra** conta → `BusinessException('Login
   já está em uso')` (§11). A resposta **nunca** inclui a senha.
3. **`excluirConta`** (service): soft delete da **própria** conta via `executarSoftDelete`. O
   encerramento da sessão do cliente é responsabilidade do frontend (`m2-14`).
4. **Controller** burra: `PATCH /usuario/perfil` e `DELETE /usuario` — montando o DTO com o
   `id` do token.
5. **Repository** dono das queries de `usuario` (proibição #23): `alterarPerfil`
   (`UPDATE nome, login ... WHERE id = :id AND is_deleted = false RETURNING ...`) e a
   verificação de unicidade reusando `recuperarPorLogin` (m2-02); exclusão via
   `executarSoftDelete`.
6. **Testes de service**: alteração de nome/login, rejeição de login duplicado, exclusão da
   conta.

## Critérios de Aceite

- Usuário altera o próprio nome e login; login já usado por outra conta é barrado com
  `BusinessException`.
- Conta excluída via **soft delete** (nunca DELETE físico — proibição #14).
- A senha nunca volta ao cliente em nenhuma resposta.
- SQL segue todas as regras (§10.2 / §16).

## Fora de Escopo

- Frontend (`m2-14`).
- Troca de senha (já entregue na m2-03).
- Recuperação de conta / fluxo por e-mail (fora do v1 — SYSTEM.SPEC §12).
- **Tratamento de campanhas órfãs** de um mestre que exclui a conta — edge conhecido do v1;
  a saída recomendada é transferir o mestre (`m2-10`) ou excluir a campanha antes. Não
  bloquear a exclusão por isso nesta task.

## Dependências

- `m2-02` (guard global, `@ActiveUser()`, `UsuarioRepository`, `recuperarPorLogin`).
- `m2-03` (padrão self-service do módulo `usuario`, custo bcrypt).
