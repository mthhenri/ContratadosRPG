# biblioteca-pastas.spec.md

> Spec avulsa, **concluída em 2026-10-20** (era rascunho) (autor, 2026-10-16; modelo por cargo corrigido pelo autor no mesmo dia).
> Todas as decisões respondidas pelo autor; permanece no backlog até ele pedir a movimentação.

## Objetivo

Permitir organizar a Biblioteca da campanha em **pastas**, com **duas organizações independentes,
uma por cargo**:

- **Mestre**: tem a sua árvore de pastas, que só ele vê e edita.
- **Jogadores e espectadores**: veem **uma única** organização compartilhada na campanha. Os
  jogadores a editam como quiserem (o que um cria, renomeia ou move aparece para todos); os
  espectadores apenas a veem.

Cada cargo nunca enxerga a organização do outro. Os documentos continuam sendo um conjunto só da
campanha (a revelação segue com o mestre); o que muda por cargo é **em que pasta** cada documento
aparece. Documento sem vínculo fica na raiz.

## Situação atual (levantada em 2026-10-16)

- Documento: tabela `documento` (`docs/SCHEMA.md`, m9-01), por campanha, com `ordem` manual única da
  biblioteca (`ix_documento_campanha_ordem`) e `revelado` (jogador/espectador só leem `revelado = true`).
- Backend: `backend/src/modules/documento/` (controller → service → repository, leitura/presença em
  `documento-leitura.service.ts`). Frontend: `frontend/src/app/modules/documento/`, páginas do mestre
  e do jogador/espectador e painel flutuante `BibliotecaFlutuante` (corpo em `BibliotecaCorpo`,
  `ListaDocumentos`, `DocumentoCartao`).
- Hoje a lista é plana, igual para todos os leitores, e a ordem é única e do mestre.

## Entregáveis (a confirmar pelas decisões)

1. **Contrato** em `shared/` (DTOs `DocumentoPasta*Dto`, validadores de nome) e schema novo
   (skill `sql-migrations`): tabela `documento_pasta` por campanha com a coluna de **cargo** da
   organização (`MESTRE` ou `JOGADOR`, onde `JOGADOR` cobre jogadores e espectadores; decidir entre
   tabela `tipo_*` e enum conforme a convenção), nome, pasta-mãe (aninhamento) e `ordem`; e
   vínculo documento↔pasta, no máximo um por documento e por cargo. Documentos nunca ganham coluna
   de pasta.
2. **Backend**: criar, renomear, reordenar, excluir (soft delete) pasta e mover documento. O cargo do
   usuário na campanha define qual organização ele lê e escreve; nunca a do outro. Espectador só lê
   (toda escrita na organização compartilhada é recusada para ele). Pasta
   compartilhada só aceita documento revelado; quando o mestre oculta ou exclui um documento, o
   vínculo some da visão dos jogadores sem vazar título.
3. **Frontend** nas três visões da Biblioteca (página do mestre, página do jogador/espectador e
   painel flutuante): árvore/lista de pastas, criar/renomear/excluir, mover documento (arrastar no
   desktop; ação equivalente por menu no toque), pasta recolhível, busca respeitando as pastas. Para o
   espectador, só a navegação (sem controles de edição).
4. **Tempo real** (skill `tempo-real`): a organização dos jogadores é compartilhada, então a mutação
   é emitida à sala dos jogadores/espectadores da campanha (nunca ao mestre); a do mestre é emitida só
   às sessões dele. Cuidar de edição simultânea (dois jogadores movendo/renomeando ao mesmo tempo:
   vence a última gravação, sem estado corrompido) e de reconexão.
5. Gravação das regras em `SYSTEM.SPEC.md` (Biblioteca), `SCHEMA.md` e `DESIGN.md`.

## Decisões do autor (2026-10-16)

1. **Aninhamento**: pastas podem conter pastas, sem limite de nível definido pela spec (a
   implementação fixa um teto razoável de profundidade e o registra em `SCHEMA.md`).
2. **Documento novo ou recém-revelado**: aparece na **raiz**, sem destaque de "não organizado".
3. **Espectador**: vê a mesma organização dos jogadores (um só cargo `JOGADOR`).
4. **Organização do mestre**: só dele; os jogadores não a herdam.
5. **Ordem manual** (`documento.ordem`): vale dentro de cada pasta.
6. **Excluir pasta com documentos** (e subpastas): tudo volta à raiz do mesmo cargo; a exclusão
   nunca é bloqueada.
7. **Documento criado ou importado** (m9-08): sempre nasce na raiz, mesmo com uma pasta aberta.
8. **Espectador**: apenas vê a organização compartilhada; só jogadores a editam.
9. **Excluir pasta compartilhada**: qualquer jogador pode, sem confirmação.
10. **Ordem inicial na visão dos jogadores**: ordem de criação (não herda a do mestre).

Sem pontos em aberto: a spec fica no backlog até o autor mandar movê-la para `active/`.

## Critérios de Aceite (provisórios)

- Teste de permissão no backend: espectador não escreve na organização compartilhada; o mestre não lê nem altera a organização dos jogadores, e jogador/
  espectador não lê nem altera a do mestre; usuário de fora da campanha não acessa nenhuma.
- Duas sessões de jogadores diferentes veem a mesma organização e se atualizam em tempo real
  (verificar ao vivo com dois usuários, skill `verify`); o mestre não recebe esses eventos.
- Excluir ou ocultar um documento não deixa vínculo órfão visível para ninguém.
- Gate visual em `1920×1080` e `360×800` (inclusive o caminho por toque), análogo: a lista atual da
  Biblioteca e o seletor de pastas/páginas do Caderno. Primitivos de `shared/ui/` com a API completa;
  se faltar um (ex.: árvore), parar e perguntar ao autor.
- Testes, lint, build e `npm run repo:verificar`.

## Fora de Escopo

Organização individual por usuário, pastas controladas pelo mestre para os jogadores, permissão por
pasta, tags e filtros salvos.

## Andamento (2026-10-20)

Movida para `active/` a pedido do autor. Decisões de implementação, autorizadas pelo autor em
2026-10-20: primitivo novo `app-pasta-linha` em `shared/ui/` e ícones `pasta`/`pasta-aberta`.

**Decisões assumidas na implementação** (dentro das 10 do autor):

- Cargo = tabela `tipo_documento_organizacao` (`MESTRE`, `JOGADOR`); vínculo em
  `documento_pasta_vinculo`; teto de 5 níveis, nome até 60 caracteres (migration `0040`).
- Rotas: `GET campanha/:id/documento-organizacao`, `POST campanha/:id/documento-pasta`,
  `PUT documento-pasta/:id` (renomear), `PUT documento-pasta/:id/posicao` (mover/reposicionar),
  `DELETE documento-pasta/:id`, `PUT documento/:id/pasta` (documento ↔ pasta). Nenhuma recebe a
  organização: o papel decide. Espectador escreve → 403; pasta do outro cargo → 404.
- Tempo real: `documento:organizacao-alterada` dataless; a dos jogadores usa `except` da sala do
  mestre (a sala cheia contém o mestre).
- Ocultar limpa só o vínculo `JOGADOR`; excluir limpa os dois; documento revelado de novo cai na raiz.
- Raiz da mesa ordena por id (criação); raiz do mestre por `documento.ordem`. Dentro de pasta, a
  ordem do vínculo; só o mestre tem setas de ordem de documento, a mesa reordena soltando em pasta
  (vai ao fim). Pastas sobem/descem pelo menu de qualquer editor.
- Frontend: a organização é provida pelo `BibliotecaCorpo` (`BibliotecaOrganizacaoStore`), então
  mestre, jogador, espectador e painel flutuante ganham pastas sem mudar as três visões. O seletor
  de documento do Caderno **não** provê a store e continua plano.

**Feito e verificado:** contrato em `shared/`; migration `0040`; `DocumentoPastaRepository`/
`Service`/`Controller`; gateway; frontend (primitivo, árvore, store, dialogs, busca com caminho);
testes (backend 1344, frontend documento/ícones/Caderno 385, `tsc`, ESLint sem erros);
`repo:verificar`; DESIGN, SCHEMA e SYSTEM.SPEC.

**Verificação ao vivo (2026-10-20):** concluída; relatório em
[`biblioteca-pastas/verificacao.md`](biblioteca-pastas/verificacao.md). A migration `0040` rodou num
PostgreSQL real, a API e o tempo real foram verificados com mestre, dois jogadores e espectador, e a
UI foi inspecionada em `1920×1080` e `360×800`. O achado da verificação (ícone `mais` no gatilho e
faixa "Soltar na raiz" que empurrava os alvos) foi corrigido; `opcoes` (três pontos) entrou como
terceiro ícone novo.
