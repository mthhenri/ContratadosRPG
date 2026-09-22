# habilidades-busca-descricao.spec.md

> Task avulsa. Origem: `IDEAS.md` `I-028` — pesquisar na descrição da habilidade, além do nome, no
> seletor de habilidades da ficha.

## Objetivo

Permitir que a busca do seletor de habilidades do sistema (`app-ficha-habilidade-seletor`) filtre
também pelo texto da **descrição**, não só pelo nome, com o usuário escolhendo o escopo da busca.

## Entregáveis

1. Controle segmentado de 3 opções — **Título | Descrição | Ambos** — ao lado do campo de busca em
   `ficha-habilidade-seletor`, usando o primitivo `app-segmentado`/`app-segmentado-item`
   (`shared/ui/segmentado`), mesmo padrão do filtro de categorias do Inventário
   (`ficha-inventario.component.html`, `app-segmentado class="ficha-inv__filtro"`). "Título" é a
   opção padrão/ativa ao abrir o seletor — preserva o comportamento atual de quem só digita um
   nome.
2. `habilidades` (computed do componente) passa a comparar o termo contra `habilidade.nome`,
   `habilidade.descricao`, ou ambos, conforme a opção ativa. `descricao` é `string` sempre presente
   em `HabilidadeBaseDto` (não opcional); uma habilidade com descrição vazia (`''`, só usada em
   fixture de teste) simplesmente nunca casa no modo "Descrição" nem contribui nesse campo no modo
   "Ambos" — só o nome decide para ela, sem tratamento especial no código.
3. Estado do escopo de busca (`'titulo' | 'descricao' | 'ambos'`) reseta para "Título" toda vez que
   o seletor fecha e reabre, junto do reset do texto de busca já existente (`fechar.emit()`/reabrir
   já limpa `busca` — mesmo ponto).
4. Como o guia de criação (`criar.page.ts`) reusa o mesmo `app-ficha-habilidade-seletor`, o
   entregável 1–3 cobre os dois lugares citados na ideia sem trabalho adicional — não há um
   catálogo de habilidades separado no guia.

## Critérios de Aceite

1. `npm run test --workspace=frontend -- --include='**/ficha-habilidade-seletor.component.spec.ts'`
   verde, com casos novos cobrindo: busca só em "Título" não encontra por descrição; busca em
   "Descrição" encontra por trecho da descrição e não exige match no nome; busca em "Ambos"
   encontra por qualquer um dos dois; habilidade sem `descricao` não quebra o modo "Descrição".
2. Gate visual (`CLAUDE.md`): análogo aprovado é o filtro segmentado do Inventário
   (`ficha-inventario.component.html`) — mesma densidade/pill de `--accent-dim`. Rodar `verify` em
   `1920×1080` e `360×800` no seletor (aba com sub-filtro e aba sem, ex.: Gerais vs. Classe),
   comparando o novo controle lado a lado com a busca existente: sem overflow, alvo de toque OK no
   mobile, o segmentado não empurra a lista pra fora da área rolável.
3. `npm run lint --workspace=frontend` verde.

## Fora de Escopo

- Estender a busca por descrição ao campo "Buscar habilidade adicionada" de `ficha-habilidades`
  (lista do que já está na ficha) — a ideia original citava só o seletor de adicionar; se surgir
  necessidade separada, vira outra entrada em `IDEAS.md`.
- Qualquer mudança em `shared/regras`/`catalogoHabilidades` — a task é puramente de filtro no
  frontend, o dado já existe (`HabilidadeCatalogoItemDto.descricao`).
- Migrar a busca de texto (`<input>` cru) para o primitivo `app-campo`, se `shared/ui` tiver um —
  fora do escopo desta task; registrar em `PROBLEMS.md`/`IDEAS.md` se achado relevante durante a
  implementação.

## Dependências

Nenhuma.
