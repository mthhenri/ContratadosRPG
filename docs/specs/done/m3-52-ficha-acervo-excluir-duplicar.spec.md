# m3-52-ficha-acervo-excluir-duplicar.spec.md

> Task 49 do milestone `m3-ficha-jogador.spec.md`. Lote de refino da ficha (`m3-40`…`m3-56`).

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).

## Objetivo

Na **tela de acervo de fichas** (a "tela separada de fichas" da `m3-28`), permitir **excluir** uma
ficha e **duplicar** uma ficha.

## Entregáveis

1. **Excluir ficha (item 6).** O backend já expõe `DELETE /ficha/:id` → soft delete
   (`FichaService.excluirFicha` → `executarSoftDelete`, exige permissão de edição). Falta a
   **affordance na UI de acervo**: ação de excluir no bloquinho da ficha, com **confirmação**, e
   remoção otimista da lista. Reusar o `FichaService` do frontend.
2. **Duplicar ficha (item 26) — net-new.** Novo fluxo de clonagem:
   - Backend: novo endpoint `POST /ficha/:id/duplicar` → `FichaService.duplicarFicha` (reusa
     `criarFicha` internamente): clona o JSONB `dados`, define nome "(cópia)" e **não herda**
     acessos (`usuario_ficha_acesso`) nem, por padrão, a campanha (nasce solta, coerente com a
     `m3-28`); dono = solicitante. Repository no padrão `INSERT ... SELECT ... RETURNING`.
   - Contrato: DTOs em `shared/src/dtos/ficha/ficha-operacao.dtos.ts` conforme necessário
     (seguir a skill `dto-conventions`).
   - Frontend: ação "Duplicar" **só na tela de acervo**, criando o clone e refletindo na lista.
3. Ambas as ações respeitam permissão (só dono/mestre da ficha original; o clone pertence a quem
   duplicou).

## Critérios de Aceite

- Excluir uma ficha no acervo (com confirmação) some da lista e faz soft delete no backend.
- Duplicar cria uma nova ficha com os mesmos `dados`, nome "(cópia)", sem acessos herdados,
  pertencente a quem duplicou.
- Duplicar/excluir aparecem **só** na tela de acervo, não dentro da campanha.

## Fora de Escopo

- Exportar ficha (é a `m3-53`).
- Duplicar levando junto os acessos de visualização (o clone nasce sem acessos).

## Dependências

- `m3-28` (acervo de fichas desacoplado — a tela separada), `m3-03` (CRUD de ficha).

## Adaptação de escopo (implementado — a `m3-28` ainda não existe)

**A `m3-28` (acervo `/fichas`, `campanha_id` nullable) nunca foi implementada neste código** —
continua no backlog, sem migration, sem rota `/fichas`, sem `listarMinhasFichas`. Esta task
pressupunha essa tela; a pedido do autor, o escopo foi restrito ao que dá pra fazer **sem** ela:

- **Excluir** — affordance na **própria tela da ficha** (`/painel/:campanhaId/ficha/:id`,
  `FichaVisualizar`): novo item "Excluir ficha" no menu (kebab) do cabeçalho, com uma dialog de
  confirmação (mesmo padrão `.dialogo` da gestão de acesso); confirmar chama
  `FichaService.excluirFicha` (endpoint `DELETE /ficha/:id`, que já existia) e navega de volta ao
  detalhe da campanha. **Entregue conforme a spec original** (esse entregável não dependia da
  `m3-28`).
- **Duplicar** — affordance **só no painel da campanha** (`CampanhaDetalhe`, mini-card de cada
  ficha — `m2-16`), gated por `podeAjustarFicha` (dono/mestre da ficha, mesma regra §14). Novo
  endpoint `POST /ficha/:id/duplicar` → `FichaService.duplicarFicha` (reusa `criarFicha` por
  inteiro): clona `dados`, nome vira `"<nome> (cópia)"`, dono = quem duplicou, sem herdar acessos
  de visualização. **Divergência da spec original:** como `campanha_id` continua `NOT NULL`, o
  clone **não nasce solto** — nasce na **mesma campanha** da ficha original (única opção possível
  sem a coluna nullable), aparecendo no mini-card do dono do clone. Documentado também no
  comentário de `FichaService.duplicarFicha` (backend).

**Pendente para quando a `m3-28` existir:**

- A tela de acervo (`/fichas`, `FichaAcervo`) em si — listar todas as fichas do usuário, com e sem
  campanha — não foi criada.
- `campanha_id` nullable (migration) e `FichaCriarDto.campanhaId` opcional — não implementados.
- `GET /ficha/minhas` (`listarMinhasFichas`) — não implementado.
- Duplicar nascendo **solto** (sem campanha) — hoje nasce sempre na campanha da ficha original.
- "Atribuir a campanha" / "Remover da campanha" (dropdown do acervo) — não existem, pois dependem
  do acervo e da coluna nullable.

Quando a `m3-28` for implementada, revisitar `FichaService.duplicarFicha` para nascer solto por
padrão (ou oferecer a escolha) e mover/replicar as duas affordances para a nova tela de acervo.
