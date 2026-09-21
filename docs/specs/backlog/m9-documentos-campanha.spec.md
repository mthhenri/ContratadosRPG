# m9-documentos-campanha.spec.md

> **Milestone M9 (número sugerido, não decisão de roadmap) — Documentos e Anotações de Campanha.**
> Promove a `I-014` de `docs/context/IDEAS.md` a spec de milestone. Nasce de dois pedidos que se
> encontram: o do autor em 2026-08-11 (biblioteca de documentos da campanha, materiais de sessão,
> pistas, handouts) e o de 2026-09-21 (a cena de Investigação do `m7-cenas.spec.md` precisa
> apresentar documentos aos jogadores, junto das fichas). Este arquivo é guarda-chuva: implementar
> somente pelas tasks numeradas quando o milestone começar. Os **cadernos privados**, que antes
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

## Modelo de dados (esboço — fechar em `SCHEMA.md` na primeira task)

- **`documento`** — BaseEntity + `campanha_id` (fk), `titulo`, `tipo_documento_id` (fk,
  `tipo_documento`: `TEXTO | IMAGEM`), `conteudo_markdown` (nullable, só `TEXTO`),
  `imagem_url`/`imagem_foco` (nullable, só `IMAGEM`, mesmo formato de `FichaImagemArquivoDto`/
  `FichaImagemFocoDto`), `revelado` (BOOLEAN), `ordem` (INTEGER). Índice por `campanha_id`. Soft
  delete, como todo o projeto.
- Busca: coluna `tsvector` gerada (`titulo` + `conteudo_markdown`) com índice GIN, seguindo o
  desenho já esboçado na `I-014`.

## DTOs (`shared/src/dtos/documento/` — seguindo `dto-conventions`)

- `DocumentoCriarDto`/`DocumentoCriadoDto`, `DocumentoAlterarDto`/`DocumentoAlteradoDto`,
  `DocumentoRemoverDto`, `DocumentoRecuperarDto { id }`/`DocumentoRecuperadoDto` (conteúdo
  completo), `DocumentoResumoDto` (item de listagem, sem `conteudoMarkdown`/`imagemUrl` cheios se a
  listagem não precisar).
- `DocumentoRevelarDto { id }`/`DocumentoOcultarDto { id }` — mestre-only, cada um seu endpoint,
  seguindo o padrão de ação pontual já usado por `EncontroIniciarDto`/`EncontroEncerrarDto`.
- `DocumentoBuscarDto { campanhaId, termo }`/`DocumentoBuscaResultadoDto`.
- Imagem: reusar `FichaImagemArquivoDto`/`FichaImagemFocoDto` de `shared/src/dtos/ficha/` — não
  duplicar o contrato de imagem.

## Tempo real

- Evento novo `documento:alterado`, emitido pela `DocumentoService` **depois** de salvar, na sala
  `campanha:<id>` (broadcast-only, §9). Cobre criar/alterar/revelar/ocultar/remover.
- Revelar um documento é o evento que a cena de Investigação (`m7-25`) escuta para exibir o cartão
  "Documento apresentado" no painel do jogador — sem acoplar `DocumentoService` a `EncontroService`
  ou `CenaService`; a dependência é de leitura (a cena consulta/chama o `DocumentoService`), nunca o
  inverso.

## Backend / Frontend (esboço)

- **Backend** `backend/src/modules/documento`: controller fino, service (permissão + revelação +
  emissão), repository (SQL bruto, `is_deleted = false`, soft delete). Criar/editar/revelar/ocultar
  restritos ao **mestre** da campanha; leitura para membros, recortada pela decisão #3.
- **Frontend** `frontend/src/app/modules/documento`: biblioteca do mestre (lista, criar/editar,
  toggle revelar/ocultar, busca), biblioteca do jogador/espectador (lista só do revelado, leitor) e
  um leitor de documento compartilhado pelas duas (Markdown via `EditorMarkdown` em modo leitura,
  imagem com zoom/foco). Passe mobile (~360px) dedicado ao fim do milestone.

## Quebra em tasks (esboço — detalhar ao iniciar o milestone)

| Task | Camada | Conteúdo |
|---|---|---|
| `m9-01` | shared + banco | Contrato (DTOs, enum `TipoDocumentoEnum`), migration (`documento`, `tsvector`/GIN). |
| `m9-02` | backend | CRUD + revelar/ocultar + upload de imagem (`core/armazenamento`) + `documento:alterado`. |
| `m9-03` | backend | Busca textual (`tsvector`, recortada por permissão). |
| `m9-04` | frontend | Biblioteca do mestre (lista, criar/editar, revelar/ocultar, busca). |
| `m9-05` | frontend | Biblioteca do jogador/espectador + leitor compartilhado. |
| `m9-06` | responsivo | Passe mobile (~360px) das duas bibliotecas e do leitor. |

`m9-02` é o mínimo que `m7-25` precisa para começar (contrato + revelar/ocultar); `m9-04`/`m9-05`
podem seguir em paralelo com `m7-25` uma vez que `m9-02` estiver pronta.

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
