# m9-02-backend-documento.spec.md

> Segunda task do milestone `m9-documentos-campanha.spec.md` — backend + tempo real. Constrói sobre o
> schema e o contrato de `m9-01`. **É o mínimo que `m7-25` precisa do backend** (documento +
> revelar/ocultar + `documento:alterado`).

## Objetivo

O módulo `documento` do backend: criar, listar, recuperar, alterar, remover e reordenar documentos,
revelar/ocultar para a mesa, enviar a imagem de um documento `IMAGEM` e avisar a mesa em tempo real —
com a trava que impede um documento **oculto** de vazar aos jogadores e aos espectadores, por REST
ou por socket.

## Estado atual

- **Padrão de módulo:** `PaginaCadernoController` (`backend/src/modules/pagina-caderno/`) é o molde —
  controller fino com `@DocumentarController('Caderno')` e `@ActiveUser()`, ids de `@Param` só mesclados
  ao DTO (`service.alterarPagina({ ...dto, id }, usuarioAtivo)`). A service resolve o papel por
  `CampanhaRepository.recuperarMembro` e pelos predicados de `CampanhaService`
  (`ehMestre`/`ehJogador`/`ehEspectador`, `campanha.service.ts:745-757`) — nenhum módulo compara
  `papel === ...` por conta própria (proibição #28). `CampanhaService.validarMestre` é **privado**.
  Versão defasada: `ResourceConflictException` (409), como em `alterarPagina`.
- **Papéis:** `ESPECTADOR` é membro da campanha (`m8`). `PaginaCadernoService.recuperarPapelMembro`
  o **rejeita** (caderno é conteúdo de jogo, decisão #4 do `m8`). Aqui ele **lê o revelado** — é a
  revisão de uma decisão do `m8`, explicitada em "Decisões assumidas".
- **Upload de imagem:** `FichaService.alterarImagem` (`ficha.service.ts:759`) valida MIME e tamanho na
  service (`BusinessException`), grava por `ArmazenamentoProvedor.salvarImagem`, apaga a anterior e só
  então persiste; o endpoint é `POST ficha/:id/imagem` com `FileInterceptor('arquivo')` e o
  controller só monta o `FichaImagemArquivoDto` a partir do `Express.Multer.File`.
- **`core/armazenamento`:** as duas implementações (`ArmazenamentoLocalProvedor` em
  `backend/uploads/`, `ArmazenamentoR2Provedor` no bucket) chamam `construirChaveImagemFicha`, que
  **fixa a pasta `agentes/`**. Ambas devolvem uma **URL pública** (`/uploads/...` ou a URL do R2) —
  quem tem o endereço lê a imagem sem autenticar. O nome do arquivo é um UUID.
- **Tempo real:** `CampanhaGateway` tem três salas por campanha — `campanha:<id>` (mestre e jogador),
  `campanha:<id>:mestre` e `campanha:<id>:espectador` (`campanha.gateway.ts`, `entrarSalaCampanha`).
  `emitirCenaAlterada` roteia pela **visibilidade** do que mudou (`PLANEJADA` só para a sala do mestre;
  o resto para a sala cheia e a do espectador) — é o molde da trava desta task, exatamente como a
  `m7-22` fez para a cena. O gateway é broadcast-only: a service emite **depois** de persistir.
- **Transação:** `TransacaoService` (`backend/src/database/transacao.service.ts`, `m7-22`); convenção
  em `docs/CONVENTIONS.md` ("Escrita atômica"): a service envolve as escritas, a emissão fica fora do
  callback.
- **OpenAPI:** todo controller novo entra em `TAGS_POR_CONTROLLER`
  (`backend/tools/gerar-openapi-contratos.ts`) e na lista de tags de
  `backend/src/core/openapi/openapi.document.ts`; `npm run openapi:gerar-contratos -w backend` regera
  `contratos-gerados.ts` (a `m7-22` o alterou).

## Entregáveis

1. **DTOs restantes** (`shared/src/dtos/documento/`, mais `documento-interno.dtos.ts` para o que só
   trafega entre service e repository) e um enum:
   - `DocumentoListarDto { campanhaId }`;
   - `DocumentoRevelarDto { id }` / `DocumentoReveladoDto { id, revelado, updatedDate }` e
     `DocumentoOcultarDto { id }` / `DocumentoOcultadoDto { id, revelado, updatedDate }`;
   - `DocumentoReordenarDto { campanhaId, ordem: readonly number[] }` — **todos** os ids ativos da
     campanha, na nova ordem (como `CenaReordenarDto`); a resposta é a lista `DocumentoResumoDto[]`;
   - `DocumentoImagemAlterarDto { id, arquivo: FichaImagemArquivoDto }` e
     `DocumentoImagemAlteradaDto { id, imagemUrl, updatedDate }` (reusa o value object de imagem da
     ficha — não duplica);
   - `DocumentoAlteracaoEnum` (`shared/src/enums/documento-alteracao.enum.ts`): `CRIADO | ALTERADO |
     REVELADO | OCULTADO | REMOVIDO | REORDENADO` (enum de conteúdo, sem tabela `tipo_*`);
   - `DocumentoBibliotecaAlteradaDto { campanhaId, documentoId: number | null, alteracao }` — o payload
     de `documento:alterado`. **Sem título, sem conteúdo, sem `imagemUrl`**: o evento só avisa que algo
     mudou; quem precisa do dado o busca por REST, já recortado por papel. (O nome foge do padrão do
     evento porque `DocumentoAlteradoDto` já é a saída do `PUT` — `m9-01`.)
2. **`DocumentoRepository`** (`backend/src/modules/documento/documento.repository.ts`, estende
   `BaseRepository`): `criarDocumento` (calcula a `ordem` no próprio `INSERT ... SELECT`, `MAX(ordem) +
   1` da campanha; `revelado = false`), `recuperarPorId`, `listarPorCampanha({ campanhaId,
   apenasRevelados })` (ordenado por `ordem`, `id`), `listarIdsPorCampanha`, `alterarDocumento`
   (`UPDATE ... WHERE id = :id AND updated_date = :updatedDate`, devolve nada se defasado),
   `alterarRevelado`, `alterarImagem`, `alterarOrdem`; remoção por `executarSoftDelete`. Só SQL,
   parâmetros nomeados, `is_deleted = false` em todo `SELECT`, `tipo_documento` traduzido
   `codigo ↔ id` no SQL.
3. **`DocumentoService`** (`documento.service.ts`) — o papel vem de `recuperarMembro`; não-membro →
   `UnauthorizedAccessException`:
   - `criarDocumento` (**mestre**): nasce **oculto**; `TEXTO` grava o markdown (`''` se omitido),
     `IMAGEM` nasce sem imagem e sem markdown (recusa `conteudoMarkdown` informado). Título aparado,
     1–`DOCUMENTO_TITULO_MAXIMO`; markdown até `DOCUMENTO_CONTEUDO_MAXIMO` (`BusinessException`).
   - `listarDocumentos`: mestre recebe todos; jogador e espectador recebem **só `revelado = true`** —
     o filtro vai para o SQL (`apenasRevelados`), nunca um `filter` depois da consulta.
   - `recuperarDocumento`: mestre lê qualquer um; jogador/espectador só um revelado. Oculto (ou
     inexistente) para quem não é mestre → **`ResourceNotFoundException`**, não 403: a resposta não
     confirma que o documento existe.
   - `alterarDocumento` (**mestre**): título e, para `TEXTO`, o markdown; `IMAGEM` recusa markdown; o
     tipo não muda. `updatedDate` defasado → `ResourceConflictException`.
   - `revelarDocumento` / `ocultarDocumento` (**mestre**): idempotentes (repetir não emite nada).
     Um `IMAGEM` **sem imagem** não pode ser revelado (`BusinessException`).
   - `removerDocumento` (**mestre**): soft delete, revelado ou não.
   - `reordenarDocumentos` (**mestre**): `ordem` precisa ser exatamente o conjunto dos ids ativos da
     campanha (faltar, sobrar ou repetir → `BusinessException`); as escritas em
     `transacaoService.executar`.
   - `alterarImagemDocumento` (**mestre**): só para `IMAGEM`; MIME e tamanho pelas constantes de
     `m9-01`; grava na pasta `documentos/` (item 5), apaga a imagem anterior e persiste.
   - **Uma única função de recorte** (`podeLerNaoReveladas(papel)` — verdadeira só para o mestre)
     decide a leitura em todos os métodos; tirar o espectador do conjunto dos que leem o revelado é
     mudar uma linha aqui e ignorar a `m9-05` no lado dele.
4. **`DocumentoController`** (`@DocumentarController('Documentos')`, fino, sem `if`/`try`):
   `POST campanha/:campanhaId/documento`, `GET campanha/:campanhaId/documento`,
   `PUT campanha/:campanhaId/documento/ordem`, `GET documento/:id`, `PUT documento/:id`,
   `DELETE documento/:id`, `POST documento/:id/revelar`, `POST documento/:id/ocultar`,
   `POST documento/:id/imagem` (multipart, `FileInterceptor('arquivo')`, o controller só monta o
   `FichaImagemArquivoDto`). **Não há `DELETE documento/:id/imagem`**: a imagem é o conteúdo do
   documento — troca-se por upload, some-se removendo o documento (e evita-se o estado "revelado sem
   imagem").
5. **`core/armazenamento` com pasta parametrizada:** `ArmazenamentoImagemSalvar` ganha a pasta
   (`agentes` | `documentos`) e `construirChaveImagemFicha` vira uma função genérica de chave
   (`<pasta>/<uuid>.<extensão>`); os dois provedores a usam. A `FichaService` continua gravando em
   `agentes/` (caminhos já persistidos não mudam). `DocumentoModule` importa o `ArmazenamentoModule`.
6. **Tempo real — `documento:alterado`.** `CampanhaGateway.emitirDocumentoAlterado(evento,
   visivelParaMesa)`, chamado pela service **depois** de persistir (e fora de qualquer transação). A
   sala depende de o documento ser — ou ter sido — visível à mesa:

   | `alteracao` | Sala(s) |
   |---|---|
   | `CRIADO` (nasce oculto) | só `campanha:<id>:mestre` |
   | `ALTERADO`, `REMOVIDO` de documento **oculto** | só `campanha:<id>:mestre` |
   | `ALTERADO`, `REMOVIDO` de documento **revelado** | `campanha:<id>` + `campanha:<id>:espectador` |
   | `REVELADO` | `campanha:<id>` + `campanha:<id>:espectador` |
   | `OCULTADO` | `campanha:<id>` + `campanha:<id>:espectador` (quem já o via precisa retirá-lo) |
   | `REORDENADO` (`documentoId: null`) | `campanha:<id>` + `campanha:<id>:espectador` |

   O mestre está na sala cheia **e** na sua, então recebe cada evento uma vez em qualquer linha.
7. **Módulo e integração:** `DocumentoModule` registrado em `app.module.ts` e **exportando a
   `DocumentoService`** — a `m7-25` (Investigação) apresenta um documento chamando
   `revelarDocumento`/`ocultarDocumento`/`recuperarDocumento` dessa service, nunca o repository, e
   `DocumentoModule` não importa `CenaModule` (a dependência é só de leitura, da cena para o
   documento). OpenAPI regerado (`contratos-gerados.ts`) com a tag "Documentos".

## Critérios de Aceite

- **Matriz de permissões** com teste para cada endpoint × {mestre, jogador, espectador, não membro}:
  mutações só do mestre (403 para os demais, inclusive chamada direta sem UI); listagem do jogador e
  do espectador sem nenhum oculto; `GET documento/:id` de um oculto por jogador/espectador →
  404 (mesma resposta de um id que não existe).
- **Trava de tempo real** (teste do gateway, no molde de `campanha.gateway.spec.ts`): cada linha da
  tabela do item 6 emite exatamente nas salas listadas — em especial, criar e editar um documento
  **oculto** não emite nada para a sala cheia nem para a do espectador.
- **Ao vivo** (skill `verify`; a task é só backend, então com REST + `socket.io-client` cru, sem tela):
  mestre cria um `TEXTO` → jogador e espectador não o listam, `GET documento/:id` dá 404 e nenhum
  evento chega a eles; mestre revela → os dois recebem `documento:alterado` `REVELADO`, listam e leem;
  mestre edita o revelado → recebem `ALTERADO`; oculta → recebem `OCULTADO` e voltam a dar 404;
  reordena → recebem `REORDENADO`.
- **Imagem:** JPEG/PNG/WEBP até o limite grava em `backend/uploads/documentos/`; a troca apaga o
  arquivo anterior; tipo inválido ou acima do limite → 400 sem gravar nada; upload num `TEXTO` → 400;
  revelar `IMAGEM` sem imagem → 400. O avatar de ficha continua indo para `agentes/` (teste dos dois
  provedores).
- Reordenar com id faltando, sobrando ou repetido → 400 e a ordem no banco não muda; reordenar
  válido persiste e a listagem reflete.
- Conflito: dois `PUT documento/:id` com o mesmo `updatedDate` — o segundo dá 409 e não sobrescreve.
- `npm run test -w shared`, `-w backend` e `npm run lint -w backend` verdes;
  `npm run openapi:gerar-contratos -w backend` sem diff residual.

## Fora de Escopo

- A busca textual — `m9-03`.
- Qualquer tela — `m9-04`/`m9-05`.
- A integração com a cena (`cena_documento`, "Apresentar", o cartão "Documento apresentado") —
  `m7-25`.
- Apagar o arquivo do armazenamento quando o **documento** é removido: o soft delete espelha o
  banco e a remoção continua recuperável; a faxina de imagens órfãs é uma ideia futura (registrar em
  `IDEAS.md` ao fechar a task).
- URL assinada ou proxy autenticado para a imagem (ver "Decisões assumidas").
- PDF, revelação por jogador específico, pastas/tags, versionamento.

## Dependências

`m9-01` (schema, enum, limites e DTOs da entidade), `M2` (papéis de campanha, `recuperarMembro`),
`m8-02` (sala do espectador e predicados de papel), `m7-22` (`TransacaoService` e o molde de roteamento
por visibilidade de `emitirCenaAlterada`), `core/armazenamento`, `docs/CONVENTIONS.md`,
`dto-conventions`.

## Decisões assumidas ao especificar (confirmadas pelo autor em 2026-09-26)

1. **O espectador lê os documentos revelados.** É o que o guarda-chuva da M9 diz (decisão #3 e
   critérios), mas contradiz a decisão #4 do `m8` ("nunca vê cadernos…"), que é sobre o caderno, não
   sobre documentos que o mestre escolheu revelar. Tratado como **revisão explícita do `m8`**, no
   mesmo espírito da `m8-07`. Se o autor preferir só jogador, o custo é uma linha (a função de
   recorte) mais retirar a rota do espectador da `m9-05`.
2. **A URL da imagem é pública e não revogável.** O `core/armazenamento` já é assim para o avatar:
   quem tem o endereço (um UUID, não adivinhável) lê o arquivo. Um documento `IMAGEM` **oculto** nunca
   tem a URL enviada a quem não é mestre (REST recortado, evento sem URL), mas **ocultar depois de
   revelar não invalida uma URL que um jogador já viu**. Aceitável para o MVP; a alternativa (proxy
   autenticado `GET documento/:id/imagem` que devolve os bytes, ou URL assinada com validade) fecha o
   buraco ao custo de tráfego pelo Cloud Run — vira upgrade se o autor quiser sigilo forte.
3. **Teto de imagem: 10 MB** (`m9-01`; o autor subiu dos 5 MB propostos).

## Riscos e Mitigação

- **Vazamento pelo evento ou pelo recorte** é o risco central (o mesmo da `m7-22`). O teste do
  gateway e o teste ao vivo acima existem para isso; `imagemUrl` e `conteudoMarkdown` de um oculto não
  podem aparecer em nenhuma resposta a não-mestre — incluindo mensagens de erro.
- **Upload sem teto no interceptor:** o `FileInterceptor` do avatar não limita o tamanho (a service
  valida depois de o arquivo já estar em memória). Para o documento, passar `limits.fileSize` ao
  interceptor um pouco acima do máximo e conferir que o erro do Multer sai como resposta de negócio,
  não como 500.
- **`shared/dist` desatualizado:** o backend importa `@contratados-rpg/shared/*` pelo `dist`. Rodar
  `npm run build -w shared` antes de subir o backend para a verificação ao vivo (armadilha
  documentada na skill `verify`).
