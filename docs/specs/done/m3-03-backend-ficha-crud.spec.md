# m3-03-backend-ficha-crud.spec.md

> Task 3/9 do milestone `m3-ficha-jogador.spec.md`.

## Objetivo

Módulo `ficha` (backend) — **CRUD da ficha de jogador** com a matriz de permissões (§14) e a
**validação dos dados salvos contra o motor de regras** (`shared/regras`). É o coração do
backend do M3.

## Entregáveis

1. **DTOs de operação** em `shared/src/dtos/ficha/` (CONVENTIONS / `dto-conventions`): criar
   (`FichaCriarDto`) / criada, listar / `FichaResumoDto`, recuperar (`{ id }`) / recuperada,
   alterar (id no DTO interno — nunca `alterar(id, dados)`) / alterada, excluir (`{ id }`).
   O campo `dados` reusa `FichaJogadorDadosDto` (`m3-01`). Listagens leem `dados->>'campo'`
   (nome/classe/nível…) — §10.4.
2. **`criarFicha`** (service): jogador cria a **própria** ficha; o mestre também pode criar
   ficha de jogador na sua campanha (§14). Insere `ficha` do tipo `JOGADOR`, dono = usuário,
   na campanha. O repositório traduz `codigo ↔ id` de `tipo_ficha` no SQL (§10.2.12).
3. **`listarFichas`** (por campanha, respeitando permissões), **`recuperarFicha`**,
   **`alterarFicha`** e **`excluirFicha`** (soft delete via `executarSoftDelete`).
4. **Matriz de permissões §14** no service (único árbitro — proibição #28): dono vê/edita a
   própria; mestre da campanha vê/edita **qualquer** ficha da campanha; outro membro vê só
   com linha em `usuario_ficha_acesso` (concessão em `m3-04`) e **nunca** edita.
   `UnauthorizedAccessException` quando barrado.
5. **Validação dos dados via `shared/regras`** antes de persistir (§11 camada 2): HP atual ≤
   máximo calculado (classe/nível/atributos), atributo dentro do limite da classe/nível,
   stacks de modificação dentro do permitido pela patente, etc. → `BusinessException`. **O
   documento vence** (§16 #27); reusa as fórmulas do M1, sem reimplementar regra.
6. **Camadas:** controller burra; service com regra/permissão/validação; repository só SQL
   (SELECT sempre com `is_deleted = false`; INSERT `... SELECT ... RETURNING`; JSONB `dados`;
   parâmetros nomeados; dono das queries de `ficha` — proibição #23).
7. **Testes de service** cobrindo a matriz de permissões (REST) e a rejeição de dados
   incoerentes com o motor de regras.

## Critérios de Aceite

- CRUD completo funciona ponta a ponta contra o Postgres.
- Matriz de permissões coberta por testes (dono / mestre / outro membro, ver × editar).
- Backend rejeita ficha salva com dados incoerentes com `shared/regras` (critério do
  milestone).
- SQL segue todas as regras (§10.2 / §16).

## Fora de Escopo

- Concessão/revogação de acesso de visualização (`m3-04`).
- Tempo real / emissão de eventos WebSocket — a **emissão pela service** é cabeada em
  `m3-05` (task de tempo real).
- Frontend; criatura/NPC (M4).

## Dependências

- `m3-01` (contrato `FichaJogadorDadosDto`), `m3-02` (tabelas `ficha`/`tipo_ficha`).
- M2 (`@ActiveUser()`, guard global, service/permissões de campanha).
- M1 (`shared/regras` para a validação autoritativa).
