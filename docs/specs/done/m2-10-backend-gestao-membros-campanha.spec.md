# m2-10-backend-gestao-membros-campanha.spec.md

> Extensão do milestone `m2-auth-campanhas.spec.md` (pós-m2-09) — task `m2-10`.

## Objetivo

Gestão de membros da campanha pelo mestre (backend) — **remover um jogador** e **transferir
o papel de mestre**. Estende o módulo `campanha` (m2-04/m2-05). Sem frontend, sem WebSocket.

> **Decisão de escopo (altera a constituição):** a transferência de mestre é **atômica** — o
> mestre promove um jogador a `MESTRE` e **ele mesmo é rebaixado a `JOGADOR`** na mesma ação.
> A campanha continua com **exatamente um mestre**, mas ele **não é mais necessariamente o
> criador**. Isso relaxa o "(o criador)" da SYSTEM.SPEC §14 — a task **atualiza a
> constituição** (ver entregável 6).

## Entregáveis

1. **DTOs** em `shared/src/dtos/campanha/` (CONVENTIONS / `dto-conventions` — complemento
   inteiro antes do verbo): `CampanhaMembroRemoverDto` (`{ id, usuarioId }`, `id` = campanha)
   / removido; `CampanhaMestreTransferirDto` (`{ id, novoMestreUsuarioId }`) / transferido.
2. **`removerMembro`** (service): só o **mestre** remove (gate `validarMestre` — único
   árbitro, proibição #28). Remove o `campanha_membro` (soft delete). O mestre **não** pode
   remover a si mesmo (deixaria a campanha sem mestre) → `BusinessException` orientando a
   transferir o papel ou excluir a campanha. Membro inexistente → `ResourceNotFoundException`.
3. **`transferirMestre`** (service): só o **mestre atual** transfere. Promove o usuário-alvo
   (que deve ser membro `JOGADOR` da campanha) a `MESTRE` e rebaixa o mestre atual a
   `JOGADOR`, **atomicamente**. Mantém a invariante de **exatamente um mestre**. Alvo
   não-membro → `ResourceNotFoundException`; alvo já-mestre / alvo = próprio → `BusinessException`.
4. **Controller** burra: `DELETE /campanha/:id/membro/:usuarioId` e
   `POST /campanha/:id/mestre/transferir` — montando o DTO com os `@Param`/body + o token.
5. **Repository** dono das queries de `campanha_membro` (proibição #23): remoção via
   `executarSoftDelete`; alteração de papel dos dois membros na transferência (nomeados,
   `is_deleted = false`).
6. **Atualizar a constituição**: SYSTEM.SPEC §14 (matriz de permissões + "Regras
   fundamentais") — "uma campanha tem exatamente um mestre" **permanece**, mas deixa de ser
   "(o criador)"; o papel é **transferível** pelo mestre atual. Ajustar CONVENTIONS se algum
   exemplo referenciar a regra antiga.
7. **Testes de service** cobrindo as permissões e a invariante de um único mestre
   (transferência troca os papéis; mestre não se auto-remove).

## Critérios de Aceite

- Só o mestre remove jogador e transfere o papel (não-mestre → `UnauthorizedAccessException`).
- Após a transferência: **exatamente um** mestre (o novo); o antigo vira `JOGADOR`.
- O mestre não consegue se auto-remover deixando a campanha sem mestre.
- SQL segue todas as regras (§10.2 / §16); matriz e invariante cobertas por testes.

## Fora de Escopo

- Frontend (`m2-13`).
- Eventos em tempo real (o gateway WebSocket é M3 — `m3-05`).
- Vários mestres simultâneos (decisão foi transferência, não co-mestres).

## Dependências

- `m2-04` / `m2-05` (módulo `campanha`, `validarMestre`/`validarMembro`, `CampanhaRepository`).
- `m2-01` (tabelas `campanha_membro`, `tipo_campanha_membro_papel`).
