# m2-04-campanha-crud.spec.md

> Task 4/8 do milestone `m2-auth-campanhas.spec.md`.

## Objetivo

Módulo `campanha` (backend) — CRUD de campanha com o criador virando `MESTRE`. Cobre criar,
listar (as campanhas de que o usuário é membro), recuperar, alterar e excluir (soft delete),
com as permissões de gestão restritas ao mestre.

## Entregáveis

1. **DTOs** em `shared/src/dtos/campanha/` (CONVENTIONS/`dto-conventions`): criar
   (`nome`, `descricao?`) e criada; listar e resumo (`CampanhaResumoDto` — item de listagem);
   recuperar (`{ id }`) e recuperada; alterar (id no DTO interno — nunca `alterar(id, dados)`).
2. **`criarCampanha`** (service): gera `codigo_convite` único, insere a `campanha` e cria o
   `campanha_membro` do criador com papel `MESTRE`. O repositório traduz `codigo ↔ id` da
   tabela `tipo_campanha_membro_papel` no SQL (§10.2.12) — service/DTO só veem o `codigo`.
   Uma campanha tem exatamente **um** mestre no v1 (§14).
3. **`listarCampanhas`** — só as campanhas de que o usuário autenticado é membro
   (`@ActiveUser()`); paginação padrão se aplicável (`pagina`/`itensPorPagina`/`ordenarPor`/
   `direcao`, `allRows?` — §10.5).
4. **`recuperarCampanha`**, **`alterarCampanha`** (nome/descrição — só mestre) e
   **`excluirCampanha`** (soft delete via `executarSoftDelete` — só mestre).
5. **Permissões** (§14): gestão de campanha (alterar/excluir) só pelo mestre — validada no
   service, lançando `UnauthorizedAccessException`; a service é o único árbitro (proibição #28).
6. Camadas: controller burra, service com regra/permissão, repository só SQL (SELECT sempre
   com `is_deleted = false`; INSERT `... SELECT ... RETURNING`; parâmetros nomeados).

## Critérios de Aceite

- Criar campanha cria também o `campanha_membro` do criador com papel `MESTRE`.
- Listar retorna só as campanhas de que o usuário é membro.
- Alterar e excluir só são permitidos ao mestre (não-mestre → `UnauthorizedAccessException`).
- SQL segue todas as regras (§10.2 / §16); testes de service para criação-com-mestre e para as
  permissões de gestão.

## Fora de Escopo

- Entrada por código de convite, regeneração do código e listagem de membros (m2-05).
- Fichas, tempo real (WebSocket), frontend.

## Dependências

- `m2-01` (tabelas `campanha`, `campanha_membro`, `tipo_campanha_membro_papel`).
- `m2-02` (`@ActiveUser()`, guard global).
