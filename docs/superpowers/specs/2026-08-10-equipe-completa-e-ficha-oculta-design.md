# Equipe completa e ficha oculta — Design

**Goal:** Na visão de jogador (não-mestre), a lista "Equipe" passa a mostrar
todo mundo que está na campanha, sem exceção — inclusive quem tem ficha que
o jogador não pode acessar, exibida como uma "carteirinha" só com nome,
classe/arquétipo e foto. Além disso, o dono de uma ficha ganha a opção de
marcá-la como oculta, escondendo-a completamente (nem carteirinha) de
qualquer jogador que não seja ele mesmo ou o mestre.

## Contexto atual

- `GET /campanha/:id/membros` já retorna todos os membros da campanha, sem
  filtro de visibilidade — não é o problema.
- `GET /ficha?campanhaId=` filtra no backend: um jogador comum só recebe
  fichas que é dono ou que tem acesso concedido via `usuario_ficha_acesso`
  (`FichaService.listarFichas` → `FichaRepository.listarVisiveisParaUsuario`).
- Na tela do jogador (`detalhe.page.html`, lista "Equipe", ~linha 725), o
  `@for` itera `membrosOrdenados()` e, pra cada membro, só renderiza o `<li>`
  se `fichasPorMembro().get(membro.usuarioId)` tiver alguma entrada — como
  essa lista já vem pré-filtrada pelo backend, um colega sem ficha
  acessível simplesmente desaparece da Equipe (efeito colateral, não uma
  checagem explícita).
- Não existe hoje nenhum conceito de ficha "oculta"/privada. Visibilidade é
  binária: dono/mestre veem tudo; qualquer outro precisa de acesso
  concedido explicitamente (aba "Acesso de visualização").
- O schema do banco é gerenciado por migrations SQL numeradas em
  `backend/src/database/migrations/NNNN - Descrição.sql` (sem ORM). A
  próxima disponível é `0014`.

## Design

### 1. Equipe sempre completa

O `@for` da Equipe passa a renderizar um `<li>` por membro de
`membrosOrdenados()` incondicionalmente. Quem não tem nenhuma ficha na
campanha (nem própria, nem de terceiros visível) aparece com um estado
"Sem ficha nesta campanha" no lugar da lista de fichas.

### 2. Carteirinha (teaser) para fichas sem acesso completo

`GET /ficha?campanhaId=` **não muda** — continua devolvendo só fichas
totalmente acessíveis, do jeito que várias telas (Esquadrão do mestre,
"Ver como jogador", edição) já dependem.

Em vez disso, `CampanhaMembroResumoDto` (retornado por
`GET /campanha/:id/membros`) ganha um campo novo:

```ts
export interface CampanhaMembroResumoDto {
  readonly usuarioId: number;
  readonly nome: string;
  readonly papel: TipoCampanhaMembroPapelEnum;
  readonly fichas: readonly CampanhaMembroFichaResumoDto[]; // novo
}

export interface CampanhaMembroFichaResumoDto {
  readonly id: number;
  readonly nome: string;
  readonly classe: ClasseEnum;
  readonly arquetipo: ArquetipoEnum | null;
  readonly imagemUrl: string | null;
  readonly acessoCompleto: boolean;
}
```

`CampanhaService.listarMembros` monta esse array por membro, com a
seguinte regra de visibilidade (do ponto de vista de quem está pedindo a
lista):

- Requisitante é **mestre** → vê todas as fichas de todos os membros,
  `acessoCompleto: true`, mesmo as ocultas.
- Requisitante é **dono** da ficha → sempre a vê, `acessoCompleto: true`,
  mesmo se marcada como oculta.
- Ficha de **outro jogador**, marcada `oculta` → **não entra na lista**
  (nem como carteirinha).
- Ficha de **outro jogador**, não oculta → entra na lista;
  `acessoCompleto: true` se existir grant ativo em `usuario_ficha_acesso`
  para (ficha, requisitante), senão `false` (carteirinha).

No frontend, a lista "Equipe" usa `membro.fichas` (não mais
`fichasPorMembro()`) pra decidir o que desenhar por ficha:

- `acessoCompleto: true` → mantém o comportamento atual: botão clicável
  com nome, vida/energia (dados completos continuam vindo de
  `fichaService.listarFichas()`, cruzados por `id`).
- `acessoCompleto: false` → linha estática (sem botão, sem clique): avatar
  (`imagemUrl`), nome do agente, classe/arquétipo (`rotuloClasseCompleto`).
  **Puramente visual — não existe "pedir acesso".** Quem quer dar acesso
  a alguém usa o fluxo que já existe (dono concede via "Acesso de
  visualização"); não há como o outro jogador solicitar.

### 3. Campo `oculta` na ficha

Migration `0014 - Ficha oculta.sql`, seguindo o padrão de `0012`/`0013`
(coluna nova, `BOOLEAN`, nullable, sem `DEFAULT` — linhas existentes voltam
`NULL`/falsy, que o app trata como "não oculta"):

```sql
-- UP
ALTER TABLE ficha ADD COLUMN oculta BOOLEAN;
-- DOWN
ALTER TABLE ficha DROP COLUMN IF EXISTS oculta;
```

`FichaAlterarDto`/`FichaAlteradaDto` (e o resumo interno usado pela query
de visibilidade) ganham `oculta?: boolean` / `oculta: boolean`. Editável
via o `PUT /ficha/:id` já existente — `validarPermissaoEdicao` já
restringe a dono ou mestre, sem checagem nova necessária.

No frontend, o toggle mora na seção "Identidade" da ficha (mesmo lugar de
cor/avatar): um switch "Ocultar ficha de outros jogadores", com texto de
apoio deixando claro que isso também revoga o efeito de qualquer acesso
concedido anteriormente enquanto estiver ativo.

## Fora de escopo

- Pedir acesso a partir da carteirinha (explicitamente recusado pelo
  usuário — mantém o sistema simples; concessão continua sendo iniciativa
  exclusiva do dono).
- Notificar o dono quando alguém "olha" a carteirinha — não existe
  interação nenhuma ali, então não há evento a notificar.
- Granularidade de ocultação por campo (ex.: esconder só `história`) — já
  existe um mecanismo parecido pra grantees (`CAMPOS_PRIVADOS_FICHA`) mas
  não faz parte deste design; `oculta` é tudo ou nada.

## Casos de borda

- Membro sem ficha nenhuma na campanha → linha "Sem ficha nesta campanha"
  na Equipe, sem quebrar a ordenação dos demais.
- Ficha oculta que já tinha acesso concedido → grant continua existindo no
  banco (não é revogado), só deixa de valer enquanto `oculta = true`; se o
  dono desmarcar depois, o acesso concedido volta a valer sem precisar
  recriar.
- "Ver como jogador" (preview do mestre) **não refaz a requisição** — os
  dados de `membros`/`fichas` continuam sendo os que o mestre já buscou
  (ele vê tudo, oculta incluso). Isso é a mesma limitação já aceita desde
  o design original do preview (§ "Limitação aceita"): a emulação é fiel
  pra permissão de edição (`podeAjustarFicha`/`minhaFichaExibida`, cobertos
  por teste), mas não recalcula do zero quais membros/fichas o jogador
  emulado enxergaria — no preview, cards que deveriam ser carteirinha (ou
  nem aparecer, se ocultos) podem aparecer completos, porque a lista veio
  com a visão do mestre. Não faz parte deste design corrigir isso; fica
  registrado como a mesma limitação pré-existente, agora também cobrindo
  `oculta`/carteirinha.

## Testes

- Backend: `CampanhaService.listarMembros` — matriz de visibilidade
  (mestre vê tudo/oculto; dono vê a própria oculta; jogador vê carteirinha
  de ficha não-oculta sem grant; jogador vê completo com grant ativo;
  jogador não vê nada de ficha oculta de terceiro).
- Backend: `FichaService.alterarFicha` — dono e mestre conseguem alternar
  `oculta`; grantee não pode editar (permissão já coberta pelo teste
  existente de `validarPermissaoEdicao`, só adicionar o campo novo).
- Frontend: Equipe lista todo mundo mesmo sem ficha visível; carteirinha
  não tem botão/clique; card completo mantém comportamento atual; membro
  sem ficha mostra o estado vazio.
