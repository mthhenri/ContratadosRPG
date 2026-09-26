# m9-03-backend-busca-documento.spec.md

> Terceira task do milestone `m9-documentos-campanha.spec.md` — backend. Constrói sobre o vetor e o
> índice de `m9-01` e sobre o módulo de `m9-02`. Não bloqueia a `m7-25`: a Investigação só precisa de
> `m9-02` (backend) e `m9-04` (leitor).

## Objetivo

Busca textual sobre os documentos de uma campanha, em PostgreSQL, **recortada pelo papel de quem
busca antes de a consulta rodar**: o jogador e o espectador nunca encontram um documento oculto — nem
no resultado, nem na contagem, nem na paginação.

## Estado atual

- **A busca do caderno é o molde:** `GET campanha/:campanhaId/busca`
  (`PaginaCadernoController.buscar`) → `PaginaCadernoService.buscarCampanha` → `PaginaCadernoRepository`
  (`buscarCampanha`, `pagina-caderno.repository.ts:296`). Padrões a repetir: `websearch_to_tsquery(
  'public.contratados_portugues'::regconfig, :termo)` em um `WITH consulta`, `ts_rank` sobre a coluna
  `busca`, `ts_headline` com `'StartSel=⟦, StopSel=⟧, MaxWords=28, MinWords=12'` sobre
  `concat_ws(' ', titulo, conteudo_markdown)`, `executarConsultaPaginada` com contagem separada,
  ordenação `relevancia DESC, "updatedDate" DESC, id`. Termo vazio devolve página vazia sem consultar;
  termo acima de `BUSCA_CAMPANHA_TERMO_MAXIMO` (200) e limite fora de 1…`BUSCA_CAMPANHA_LIMITE_MAXIMO`
  (50) → `BusinessException`.
- A busca do caderno é **outra**: seu resultado mistura páginas e anotações de ficha e rejeita o
  espectador. A dos documentos tem papel e recorte próprios (o espectador **pode** buscar o revelado),
  então ganha endpoint e DTOs próprios em vez de uma fonte nova em `BuscaCampanhaFonteEnum` — decisão
  do guarda-chuva (`DocumentoBuscarDto`), mantida.
- O vetor `documento.busca` (título peso `A`, markdown peso `B`) e o índice GIN já existem (`m9-01`).
  Um documento `IMAGEM` só tem o título no vetor.
- Os limites de termo e de página estão em `shared/src/validators/pagina-caderno.validators.ts`; nesta
  task são **reusados**, não redeclarados (são os mesmos por decisão — uma busca nunca aceita um termo
  maior que a outra).

## Entregáveis

1. **DTOs** (`shared/src/dtos/documento/`): `DocumentoBuscarDto { campanhaId, termo, pagina?, limite? }`
   e `DocumentoBuscaResultadoDto { id, titulo, tipo: TipoDocumentoEnum, trecho, revelado, updatedDate,
   relevancia }`; a resposta é `PaginatedResult<DocumentoBuscaResultadoDto>`. Interno
   (`documento-interno.dtos.ts`): `DocumentoBuscaInternoDto { campanhaId, termo, apenasRevelados,
   pagina, limite }`. `revelado` vem no resultado para a tela do mestre distinguir o oculto do
   revelado sem uma segunda consulta (para os demais papéis é sempre `true`).
2. **`DocumentoRepository.buscarDocumentos`** — uma consulta só (`documento` `CROSS JOIN consulta`)
   com `documento.busca @@ consulta.valor`, `campanha_id = :campanhaId`, `is_deleted = false` e, **no
   próprio `WHERE`**, `(:apenasRevelados = false OR documento.revelado = true)`. O filtro de revelado
   não é um `filter` depois: a contagem (`sqlContagem`) usa o mesmo `WHERE`, então o total e o número de
   páginas nunca deixam adivinhar quantos ocultos existem.
3. **`DocumentoService.buscarDocumentos`**: papel por `recuperarMembro` (não-membro →
   `UnauthorizedAccessException`); `apenasRevelados = !podeLerNaoReveladas(papel)` — **a mesma função
   de recorte** da `m9-02`, sem segunda regra; validações de termo/página/limite como as do caderno;
   termo vazio → `PaginatedResult` vazio sem tocar no repository.
4. **Endpoint** `GET campanha/:campanhaId/documento/busca?termo=&pagina=&limite=` no
   `DocumentoController` (`pagina` padrão 1, `limite` padrão 20, como o do caderno), documentado no
   OpenAPI (`npm run openapi:gerar-contratos -w backend`).

## Critérios de Aceite

- Testes de service: mestre busca sem `apenasRevelados`; jogador e espectador com
  `apenasRevelados = true`; não-membro → 403; termo vazio, termo longo e limite inválido como no
  caderno; o repository **nunca** é chamado com `apenasRevelados = false` para quem não é mestre.
- **Contra o Postgres real** (os testes de repository mockam o banco — `I-034` —, então o SQL só é
  provado ao vivo; rodar pela skill `verify` com dados de verdade):
  - acento e caixa: `cafe` acha o título "Café da manhã";
  - radical: `documentos` acha "documento";
  - sintaxe do `websearch_to_tsquery`: `"carta cifrada"` casa a frase e `carta -mapa` exclui os que
    trazem "mapa";
  - o título pesa mais que o corpo: um termo que aparece no título de A e só no corpo de B ordena A
    primeiro;
  - a paginação é estável (mesma ordem em duas chamadas) e `totalItens` bate com a soma das páginas;
  - **o jogador e o espectador nunca recebem um oculto**: dois documentos com o mesmo termo, um
    oculto — o jogador vê `totalItens = 1`; ao ocultar o segundo, some da busca dele na chamada
    seguinte;
  - o `trecho` traz os marcadores `⟦ ⟧` em volta do termo e não contém o conteúdo de nenhum documento
    fora do resultado.
- `EXPLAIN (ANALYZE)` num volume representativo (ex.: uma campanha de teste com ~10 000 documentos,
  inserida numa transação e revertida) mostra `Bitmap Index Scan` em `ix_documento_busca`; se o plano
  preferir varredura sequencial nesse volume, registrar o plano no `HISTORY.md` e avaliar o índice
  parcial `WHERE is_deleted = false`.
- `npm run test -w shared`, `-w backend` e `npm run lint -w backend` verdes.

## Fora de Escopo

- Qualquer tela de busca — o componente compartilhado nasce na `m9-05`.
- Unificar esta busca com a do caderno (`GET campanha/:id/busca`) — o resultado, o papel e o recorte
  são outros; se o autor quiser uma caixa de busca única, é uma ideia à parte (`IDEAS.md`).
- Filtros (por tipo, por revelado), busca dentro de PDF, busca semântica, Elasticsearch.
- Realce do trecho no cliente — só o contrato dos marcadores `⟦ ⟧`, que já é o do caderno.

## Dependências

`m9-01` (coluna `busca` e índice GIN), `m9-02` (módulo, service, função de recorte por papel),
`0018` (configuração `contratados_portugues`), a busca do caderno como molde.

## Decisões tomadas na implementação

1. **Forma do filtro de revelado:** `(NOT :apenasRevelados::boolean OR documento.revelado = true)`,
   a mesma da `listarPorCampanha` da `m9-02`, no lugar do `(:apenasRevelados = false OR ...)` escrito
   acima. O efeito é o mesmo; o módulo fica com uma forma só.
2. **`updatedDate` do resultado** sai no texto ISO com microssegundos do resto do módulo
   (`dataComoTexto`), não como `timestamptz` cru como no caderno. A ordenação `"updatedDate" DESC`
   continua cronológica, porque o formato é fixo e em UTC.
3. **Índice parcial não criado.** Com 10 000 documentos, um termo seletivo usa
   `Bitmap Index Scan on ix_documento_busca` (1,7 ms). Um termo presente em ~98% das linhas cai em
   varredura sequencial (4,6 ms), que é a escolha certa do planner. Um índice parcial
   `WHERE is_deleted = false` só tiraria ~2% das linhas e não mudaria nenhum dos dois planos.
   Planos no `HISTORY.md`.
