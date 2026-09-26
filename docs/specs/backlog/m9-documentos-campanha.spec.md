# m9-documentos-campanha.spec.md

> **Milestone M9 (número sugerido, não decisão de roadmap) — Documentos e Anotações de Campanha.**
> Promove a `I-014` de `docs/context/IDEAS.md` a spec de milestone. Nasce de dois pedidos que se
> encontram: o do autor em 2026-08-11 (biblioteca de documentos da campanha, materiais de sessão,
> pistas, handouts) e o de 2026-09-21 (a cena de Investigação do `m7-cenas.spec.md` precisa
> apresentar documentos aos jogadores, junto das fichas). Este arquivo é guarda-chuva: implementar
> somente pelas tasks `m9-01`…`m9-06`, cada uma com a sua spec em `docs/specs/backlog/` (quebra feita
> em 2026-09-26 — ver "Quebra em tasks" e "Ajustes da quebra"). Os **cadernos privados**, que antes
> faziam parte desta ideia, já foram especificados separadamente
> (`docs/superpowers/specs/2026-08-12-cadernos-campanha-busca-design.md`) e não são reabertos aqui.

## Objetivo

Dar ao mestre uma biblioteca de documentos da campanha — texto e imagem — que ele cadastra, edita e
revela seletivamente aos jogadores, e aos jogadores uma biblioteca própria com o que já foi
revelado. É o contrato que `m7-25` (painel de Investigação) consome para apresentar documentos numa
cena; a M9 não depende de `m7-cenas` para existir — pode ser construída e usada isoladamente, como
uma aba/seção de campanha.

## Decisões de produto fechadas

1. **Dois formatos no MVP: texto em Markdown e imagem.** Texto reaproveita o `EditorMarkdown`
   (`shared/ui/editor-markdown/`, Milkdown) já usado pelo Caderno e pelos campos de texto livre da
   ficha — mesmo sanitizador, sem um segundo editor. Imagem reaproveita `core/armazenamento`
   (provedor R2) — mesmo mecanismo já usado por avatar de ficha e imagem de combatente avulso
   (`m7-*`). **PDF fica fora do MVP** — vira upgrade que reaproveita o leitor de PDF que os
   documentos de regras já usam (`shared/leitor-documentos/`), sem reescrevê-lo.
2. **Visibilidade binária.** Um documento tem `revelado: boolean` — visível a toda a campanha
   (qualquer jogador/espectador, sujeito às respectivas permissões de papel) ou só ao mestre. Não
   há revelação por jogador específico nesta versão; quem entrar na campanha depois de um documento
   já revelado o enxerga normalmente. Revelação por jogador é upgrade futuro, registrado em "Fora de
   escopo".
3. **Duas superfícies de biblioteca.** A do mestre lista tudo (revelado e oculto, inclusive
   rascunho); a do jogador/espectador lista só o revelado. Mesmo padrão de recorte por papel que o
   `m8` já aplica a fichas e rolagens — o backend filtra, o frontend não esconde por CSS.
4. **PostgreSQL é a fonte de verdade e a busca inicial.** Busca textual via `tsvector`/índice GIN,
   sempre recortada pelas permissões da campanha antes de responder — nenhuma dependência externa
   no MVP. Elasticsearch permanece uma evolução futura (ver "Fora de escopo"), só se volume ou
   sofisticação de relevância justificarem.
5. **Sem pastas/tags nem versionamento no MVP.** Uma lista simples por campanha, ordenável
   manualmente, com busca. Organização estruturada é upgrade — decidir formato ao demandar.
6. **Fonte única para quem consome um documento.** Um consumidor (como a cena de Investigação)
   nunca guarda uma segunda cópia de `revelado`/conteúdo — só um vínculo (`documentoId` + metadados
   próprios do consumidor, como ordem/foco). Apresentar um documento numa cena chama
   `DocumentoService.revelar`, não grava um segundo estado. Mesmo princípio de fonte única já usado
   por `vidaAtual` (m3-10) e pelo Encontro (`m7-01`).

## Modelo de dados (fechado na `m9-01`)

- **`documento`** — BaseEntity + `campanha_id` (fk), `titulo`, `tipo_documento_id` (fk,
  `tipo_documento`: `TEXTO | IMAGEM`), `conteudo_markdown` (nullable, só `TEXTO`), `imagem_url`
  (nullable, só `IMAGEM`), `revelado` (BOOLEAN), `ordem` (INTEGER). Índice por `(campanha_id,
  ordem)`. Soft delete, como todo o projeto. **Sem `imagem_foco`** — ver "Ajustes da quebra".
- Busca: coluna `busca TSVECTOR` mantida por trigger (`titulo` peso `A` + `conteudo_markdown` peso
  `B`, configuração `contratados_portugues` da migration `0018`) com índice GIN — o mesmo desenho da
  `pagina_caderno`.

## DTOs (`shared/src/dtos/documento/` — seguindo `dto-conventions`; repartidos entre `m9-01`, `m9-02` e `m9-03`)

- `DocumentoCriarDto`/`DocumentoCriadoDto`, `DocumentoAlterarDto`/`DocumentoAlteradoDto`,
  `DocumentoRemoverDto`, `DocumentoRecuperarDto { id }`/`DocumentoRecuperadoDto` (conteúdo
  completo), `DocumentoResumoDto` (item de listagem, sem `conteudoMarkdown`, com `imagemUrl` para a
  miniatura) — `m9-01`.
- `DocumentoRevelarDto { id }`/`DocumentoOcultarDto { id }` — mestre-only, cada um seu endpoint,
  seguindo o padrão de ação pontual já usado por `EncontroIniciarDto`/`EncontroEncerrarDto`;
  `DocumentoReordenarDto`, imagem e o payload do evento — `m9-02`.
- `DocumentoBuscarDto { campanhaId, termo }`/`DocumentoBuscaResultadoDto` — `m9-03`.
- Imagem: reusar `FichaImagemArquivoDto` de `shared/src/dtos/ficha/` — não duplicar o contrato de
  imagem.

## Tempo real

- Evento novo `documento:alterado`, emitido pela `DocumentoService` **depois** de salvar
  (broadcast-only, §9). Cobre criar/alterar/revelar/ocultar/remover/reordenar. **O payload não leva
  conteúdo** (só `campanhaId`, `documentoId` e o tipo da alteração): quem precisa do dado o busca por
  REST, já recortado por papel.
- **Trava anti-vazamento**, no molde da que a `m7-22` fez para a cena `PLANEJADA`: um documento
  **oculto** só gera evento para `campanha:<id>:mestre`; revelado (ou que acabou de ser ocultado, para a
  mesa retirá-lo) vai para `campanha:<id>` e `campanha:<id>:espectador`. Tabela completa na `m9-02`.
- Revelar um documento é o evento que a cena de Investigação (`m7-25`) escuta para exibir o cartão
  "Documento apresentado" no painel do jogador — sem acoplar `DocumentoService` a `EncontroService`
  ou `CenaService`; a dependência é de leitura (a cena consulta/chama o `DocumentoService`), nunca o
  inverso.

## Backend / Frontend

- **Backend** `backend/src/modules/documento`: controller fino, service (permissão + revelação +
  emissão), repository (SQL bruto, `is_deleted = false`, soft delete). Criar/editar/revelar/ocultar
  restritos ao **mestre** da campanha; leitura para membros (mestre, jogador e espectador), recortada
  pela decisão #3 — uma única função de recorte por papel, usada por listagem, leitura e busca.
- **Frontend** `frontend/src/app/modules/documento`, rótulo "Biblioteca": página do mestre (lista,
  criar/editar, revelar/ocultar, reordenar), do jogador e do espectador (lista só do revelado), busca
  nas três, e um `LeitorDocumento` compartilhado (Markdown via `EditorMarkdown` em modo leitura,
  imagem com alternância de zoom). Passe mobile (~360px) dedicado ao fim do milestone.

## Quebra em tasks

| Task | Spec | Camada | Conteúdo | Depende de |
|---|---|---|---|---|
| `m9-01` | [`m9-01-contrato-migration-documento`](m9-01-contrato-migration-documento.spec.md) | shared + banco | `TipoDocumentoEnum`, limites, DTOs da entidade, migration (`tipo_documento`, `documento`, `tsvector`/GIN). | — |
| `m9-02` | [`m9-02-backend-documento`](m9-02-backend-documento.spec.md) | backend + tempo real | CRUD + reordenar + revelar/ocultar + upload de imagem (`core/armazenamento`) + `documento:alterado` com a trava anti-vazamento. | `m9-01` |
| `m9-03` | [`m9-03-backend-busca-documento`](m9-03-backend-busca-documento.spec.md) | backend | Busca textual (`tsvector`, recortada por permissão antes da consulta). | `m9-02` |
| `m9-04` | [`m9-04-frontend-biblioteca-mestre`](m9-04-frontend-biblioteca-mestre.spec.md) | frontend | Biblioteca do mestre (lista, criar/editar, revelar/ocultar, reordenar) + **`LeitorDocumento`** compartilhado. | `m9-02` |
| `m9-05` | [`m9-05-frontend-biblioteca-jogador-espectador`](m9-05-frontend-biblioteca-jogador-espectador.spec.md) | frontend | Biblioteca do jogador e do espectador + **busca** nas três visões. | `m9-03`, `m9-04` |
| `m9-06` | [`m9-06-refinamento-mobile-biblioteca`](m9-06-refinamento-mobile-biblioteca.spec.md) | responsivo | Passe mobile (`360×800`, mais `960×1080` e `1366×768`) das bibliotecas, do leitor e da busca. | `m9-04`, `m9-05` |

**Ordem:** `m9-01 → m9-02` é o caminho crítico. **`m7-25` só precisa de `m9-02` (backend) e de
`m9-04` (o `LeitorDocumento`)** — não espera a busca nem a visão do jogador: `m9-03` pode andar em
paralelo com `m9-04`, e `m9-05` fecha depois das duas.

## Ajustes da quebra (2026-09-26)

Ao detalhar as tasks contra o código, o esboço do guarda-chuva mudou em pontos que valem registro:

1. **`LeitorDocumento` nasce na `m9-04`, não na `m9-05`.** O mestre lê e edita no mesmo lugar, então a
   primeira tela já o precisa; e a `m7-25` o consome — assim ela não espera a visão do jogador.
2. **A busca (UI) vai para a `m9-05`**, num componente usado pelas três visões; a `m9-04` fica sem
   depender da `m9-03`, encurtando o caminho da `m7-25`. O backend da busca continua na `m9-03`.
3. **`imagem_foco` saiu do MVP.** O esboço a previa "no formato do avatar", mas nenhuma tela do
   milestone a consome (a miniatura é centralizada por `object-fit`; o leitor mostra a imagem inteira
   com zoom do cliente) — contrato sem consumidor. Volta como ideia se o autor quiser o enquadramento.
4. **Reordenar** entra no backend (`m9-02`) e na lista do mestre (`m9-04`): a decisão #5 fala em lista
   "ordenável manualmente" e o esboço não a atribuía a nenhuma task. Mesmo desenho da reordenação de
   cenas (`m7-22`/`m7-23`).
5. **Sem `DELETE documento/:id/imagem`.** A imagem é o conteúdo de um documento `IMAGEM`: troca-se por
   upload, some-se removendo o documento. Evita o estado "revelado sem imagem".
6. **Nome do payload do evento:** `DocumentoBibliotecaAlteradaDto` (o evento continua `documento:alterado`),
   porque `DocumentoAlteradoDto` já é a saída do `PUT` — e o do evento não pode carregar conteúdo.
7. **Rótulo "Biblioteca" na interface**, porque "Documentos" já é o leitor de PDFs das regras na
   topbar. Rota e código seguem o domínio (`documentos`, `documento`).
8. **Busca própria**, com endpoint e DTOs próprios (`GET campanha/:id/documento/busca`), sem estender a
   busca do caderno: o papel (o espectador busca o revelado) e o recorte são outros.

### Decisões confirmadas pelo autor (2026-09-26)

- **O espectador lê os documentos revelados** (decisão #3 daqui) — é a **revisão explícita** da
  decisão #4 do `m8` ("nunca vê cadernos…"), que falava do caderno, não de documentos que o mestre
  escolheu revelar. Custo de reverter: uma função de recorte na `m9-02` e o item 3 da `m9-05`.
- **A URL da imagem é pública e não revogável** (é como o `core/armazenamento` já serve o avatar):
  ocultar depois de revelar não invalida uma URL que um jogador já viu. Sigilo forte exigiria proxy
  autenticado ou URL assinada — upgrade, com custo de tráfego (`m9-02`).
- **Teto de imagem em 10 MB** (o do avatar é 2 MB; o autor subiu dos 5 MB propostos).
- **Salvar explícito** no editor do mestre (sem autosave) e **revelar sem confirmação** (`m9-04`).

## Critérios de aceite do módulo

- O mestre cria um documento de texto e um de imagem, ambos ocultos por padrão; nenhum jogador os
  vê na própria biblioteca.
- Revelar um documento o faz aparecer, ao vivo, na biblioteca de todos os jogadores/espectadores
  conectados, com o conteúdo correto no leitor.
- Ocultar um documento já revelado o remove da biblioteca dos jogadores.
- Busca por termo encontra documentos pelo título e pelo conteúdo, recortada pelas permissões de
  quem busca (jogador nunca encontra um documento oculto).
- `npm run test -w shared`, `-w backend` e `-w frontend` verdes.
- Verificação pela skill `verify` em `1920×1080` e `360×800`: criar, revelar, ocultar e ler os dois
  formatos, nas duas bibliotecas.

## Fora de escopo

- PDF como formato de documento — upgrade que reaproveita `shared/leitor-documentos/`.
- Revelação por jogador específico (hoje é campanha inteira ou nada) — upgrade futuro.
- Pastas, tags e versionamento de documento.
- Elasticsearch/busca semântica — evolução futura só se volume ou relevância exigirem; PostgreSQL
  continua autoritativo mesmo se isso acontecer (projeção reconstruível, sincronizada e filtrada
  pelas permissões antes da consulta).
- URL assinada/proxy autenticado para a imagem e limpeza de imagens órfãs no armazenamento (ver
  "Ajustes da quebra") — upgrades.
- Enquadramento (`imagem_foco`) da miniatura de um documento de imagem.
- **Mesa investigativa/mapa mental** (posicionamento livre de itens, conexões visuais entre pistas,
  colaboração em tempo real numa superfície) — evolução futura distinta do tabletop tático da
  `I-016`/M11 (que é sobre mapas, tokens e posição espacial de combate). Registrada como upgrade,
  não implementada nesta milestone.

## Dependências

- **M2** — campanha e membros (permissão por papel).
- **`core/armazenamento`** — upload/armazenamento de imagem, já usado por avatar de ficha e
  combatente avulso.
- **`shared/ui/editor-markdown`** — editor de texto Markdown já promovido para `shared/ui/`.
- Tempo real (`CampanhaGateway`, broadcast-only).
- Consumida por **`m7-cenas.spec.md`** (`m7-25`, painel de Investigação) — não depende dela.
