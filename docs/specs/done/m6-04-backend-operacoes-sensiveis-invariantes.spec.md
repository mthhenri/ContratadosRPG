# m6-04-backend-operacoes-sensiveis-invariantes.spec.md

> Task 4/7 do milestone `m6-gestao-usuarios-papeis.spec.md`.

## Objetivo

As duas ações "perigosas" da gestão de usuários — **trocar tipo** e **resetar senha** — mais as
**invariantes de segurança** que protegem todo o módulo: nunca ficar sem `ADMIN` ativo, admin
não se auto-rebaixa/exclui, e exclusão não pode gerar campanha órfã. Fecha o CRUD da `m6-03`
para produção.

## Entregáveis

1. **DTOs** em `shared/src/dtos/usuario/`:
   - `UsuarioTipoAlterarDto` (`{ id, tipo: TipoUsuarioEnum }`) / `UsuarioTipoAlteradoDto`
     (`{ id, login, nome, tipo, tipoDescricao }`).
   - `UsuarioSenhaResetarDto` (`{ id, novaSenha }` — verbo "resetar", distinto de "alterar" para
     não colidir com `UsuarioSenhaAlterarDto`/m2-03, que exige `senhaAtual` e é self-service) /
     `UsuarioSenhaResetadaDto` (confirmação, sem senha).
2. **Invariante "≥1 `ADMIN` ativo"** — método privado/compartilhado na `UsuarioService`
   (`validarAdminRestante` ou similar; nunca `existe*` — Proibição #20) que conta admins ativos
   excluindo o alvo da operação em curso; violação → `BusinessException`. Usado por:
   - `excluir` (`m6-03`, agora completo com esta checagem).
   - `alterarTipo` quando o alvo é `ADMIN` e o novo tipo não é `ADMIN` (rebaixamento).
   - **`excluirConta` self-service (m2-11)** — mesma checagem, para que o último admin não
     consiga se auto-excluir pela tela de Perfil (critério de aceite do milestone é explícito
     nisso).
3. **Proteção de auto-ação**: `excluir` e `alterarTipo` (rotas de gestão) recusam quando o
   `id` do alvo é o próprio admin autenticado (`@ActiveUser()`) → `BusinessException`
   orientando a usar a tela de Perfil (exclusão) — ela própria protegida pela invariante do
   item 2. Rebaixar a si mesmo pela gestão é sempre bloqueado, mesmo havendo outros admins
   (a via legítima de abrir mão do próprio tipo, se algum dia existir, não é esta).
4. **`alterarTipo`** (service, `@TiposPermitidos(ADMIN)`): valida alvo existente, aplica a
   invariante (item 2) e a proteção de auto-ação (item 3), grava o novo `tipo_usuario_id`
   (repositório traduz `codigo ↔ id`, §10.2.12) e **incrementa `token_versao`** do alvo (bump —
   invalidação imediata, consumida pelo `AutorizacaoGuard` da `m6-02`).
5. **`resetarSenha`** (service, `@TiposPermitidos(ADMIN)`): encripta `novaSenha` (bcrypt, mesmo
   custo de `m2-02`/`m2-03`), persiste e **incrementa `token_versao`** do alvo. Sem checagem de
   senha atual (é o admin quem autoriza, não o dono da conta).
6. **`UsuarioRepository`** ganha `alterarTipo` (UPDATE com o `JOIN`/subquery de tradução
   `codigo → id`), `incrementarTokenVersao(dto: { id })` (reaproveitado pelas duas ações acima
   e por `resetarSenha`; `UPDATE usuario SET token_versao = token_versao + 1, updated_date =
   NOW() WHERE id = :id AND is_deleted = false`) e `contarAdminsAtivos(dto: { idExcluido? })`
   para a invariante do item 2.
7. **Exclusão de mestre de campanha** (fecha o edge deixado aberto pela `m2-11`, mas só para o
   caminho **admin**): `excluir` (gestão) recusa alvo que seja `MESTRE` ativo de alguma
   campanha → `BusinessException` orientando a transferir o mestre (`m2-10`) ou excluir a
   campanha antes. Consulta via `CampanhaRepository` (owner da query — Proibição #23; a service
   de `usuario` injeta `CampanhaRepository`, não reimplementa a query). **Não** retroage sobre
   o self-service (`m2-11`), que permanece com o edge conhecido documentado lá — mudar esse
   comportamento é decisão separada, fora desta task.
8. **Testes de service**: rebaixar o único admin → bloqueado; excluir o único admin →
   bloqueado; admin tenta excluir/rebaixar a si mesmo → bloqueado mesmo havendo outros admins;
   resetar senha e trocar tipo incrementam `token_versao`; excluir um mestre de campanha ativo
   → bloqueado com a mensagem orientando a transferência.

## Critérios de Aceite

- Sistema nunca fica sem ao menos um `ADMIN` ativo — nem por exclusão, nem por rebaixamento,
  nem pela gestão, nem pelo self-service (`m2-11`).
- Admin não se auto-exclui nem se auto-rebaixa pela tela de gestão.
- Resetar senha ou trocar o tipo de uma conta derruba a sessão dela **no request seguinte**
  (via `token_versao` + `AutorizacaoGuard`, `m6-02`), sem esperar o token expirar.
- Excluir um usuário que é mestre de uma campanha ativa é bloqueado com mensagem orientando a
  transferir o papel ou excluir a campanha primeiro.
- SQL segue §10.2/§16.

## Fora de Escopo

- Frontend (`m6-05`).
- Retroagir o tratamento de mestre-órfão sobre a exclusão self-service (`m2-11`) — fica
  registrado como edge conhecido, não fechado aqui.
- Qualquer novo tipo além de `NORMAL`/`ADMIN`/`TESTER` — a extensão futura é só migration +
  enum (ver `m6-gestao-usuarios-papeis.spec.md`), sem tocar neste mecanismo.

## Dependências

- `m6-03` (CRUD básico, DTOs de listagem/criação/alteração/exclusão/reativação).
- `m6-02` (`AutorizacaoGuard`, `token_versao` como fonte de invalidação).
- `m2-10` (`CampanhaRepository`, papel de mestre) e `m2-11` (self-service, ponto de extensão da
  invariante de ≥1 admin).
