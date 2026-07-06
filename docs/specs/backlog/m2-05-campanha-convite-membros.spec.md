# m2-05-campanha-convite-membros.spec.md

> Task 5/8 do milestone `m2-auth-campanhas.spec.md`.

## Objetivo

Fechar o backend de campanhas: entrada por código de convite (papel `JOGADOR`), regeneração
do código pelo mestre (invalidando o anterior) e listagem de membros. Consolida a **matriz de
permissões de campanha** (SYSTEM.SPEC §14) em testes de service.

## Entregáveis

1. **`entrarCampanha`** por `codigo_convite`: cria `campanha_membro` do usuário autenticado
   com papel `JOGADOR`. Código inexistente/inválido → `ResourceNotFoundException`/
   `BusinessException`; usuário já membro → `BusinessException` (respeitando
   `uix_campanha_membro_campanha_usuario_ativo`). DTO de entrada carrega o `codigo_convite`.
2. **`regenerarConvite`** (só mestre): gera um novo `codigo_convite` único e invalida o
   anterior (o código antigo deixa de funcionar). DTOs `CampanhaConviteRegenerarDto` /
   `CampanhaConviteRegeneradoDto` (complemento `Convite` inteiro antes do verbo).
3. **`listarMembros`** da campanha: nome do usuário + papel (`MESTRE`/`JOGADOR`), traduzindo
   `tipo_campanha_membro_papel_id → codigo` no repositório. Visível aos membros da campanha
   (permissão no service).
4. **Matriz de permissões (§14)** coberta por **testes de service**: mestre vs jogador vs
   não-membro; gerenciar convite/membros só pelo mestre; a service é o único árbitro
   (proibição #28), reaproveitando a mesma verificação usada no CRUD (m2-04).
5. Camadas e SQL conforme §7/§10 (SELECT com `is_deleted = false`, INSERT `... SELECT ...
   RETURNING`, parâmetros nomeados, soft delete).

## Critérios de Aceite

- Um segundo usuário entra por `codigo_convite` e passa a aparecer em `listarMembros` com papel
  `JOGADOR`; o mestre vê a lista de membros.
- Regenerar o código pelo mestre invalida o código anterior; não-mestre não pode regenerar.
- Entrar com código inválido ou já sendo membro é rejeitado com a exceção adequada.
- Matriz de permissões da campanha (§14) coberta por testes de service (critério de aceite do
  milestone).

## Fora de Escopo

- Frontend (m2-07).
- Fichas, concessão de acesso a ficha (`usuario_ficha_acesso`) — M3.
- Tempo real (WebSocket) — M3+.

## Dependências

- `m2-04` (módulo `campanha`, verificação de permissão reaproveitada).
