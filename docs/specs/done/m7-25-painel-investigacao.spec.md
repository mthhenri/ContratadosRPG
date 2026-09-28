# m7-25-painel-investigacao.spec.md

> Quinta task do milestone `m7-cenas.spec.md` — backend + frontend. Amplia o painel de cena sem
> iniciativa que a `m7-24` construiu (`PainelCenaSemIniciativaMestre`/`...Jogador`) com a coluna
> Documentos da Investigação, consumindo a biblioteca de documentos da M9 (`m9-02`/`m9-04`) sem
> duplicar o estado de visibilidade dela. Nenhum componente novo de casca: a `m7-24` já decidiu
> (entregável 5) que Investigação usa o **mesmo** componente sem iniciativa, com a coluna
> condicionada a `cena.tipo === INVESTIGACAO`.

## Objetivo

Uma cena de Investigação ativa mostra ao mestre os documentos anexados (coluna Documentos, estado
Oculto/Revelado, focar no palco, apresentar à mesa) e a grade de agentes; apresentar um documento o
revela na biblioteca da campanha com um cartão "Documentos apresentados" no painel do jogador, sem
interromper a tela dele.

## O que foi implementado

**Contrato (`shared/src/dtos/cena/`).** `cena.dtos.ts` ganhou `CenaDocumentoAnexarDto`,
`CenaDocumentoResumoDto`, `CenaDocumentoReordenarDto`, `CenaDocumentoRemoverDto`,
`CenaDocumentoFocarDto`, `CenaDocumentoApresentarDto` e o broadcast dataless
`CenaDocumentoAlteradoDto` (`{ campanhaId, cenaId }`, molde de `CampanhaInventarioAlteradoDto`);
`cena-interno.dtos.ts` ganhou `CenaDocumentoLinhaDto`, `CenaDocumentoInternoCriarDto` e
`CenaDocumentoOrdemInternoAlterarDto`. Nenhuma subpasta nova em `shared/src/dtos/` — o domínio é o
mesmo de `cena`.

**Banco (`0035 - Tabela cena_documento.sql`).** Tabela filha simples, molde de
`usuario_ficha_acesso` (0008): `cena_id`/`documento_id` (FK), `ordem`, `em_foco`. Índice único
parcial `(cena_id, documento_id) WHERE is_deleted = false` (um vínculo por par) e
`(cena_id) WHERE is_deleted = false AND em_foco = true` (no máximo um documento em foco por cena,
mesmo molde da cena ativa única). A tabela **nunca** guarda se o documento está revelado — isso
continua só em `documento.revelado` (M9).

**Backend (`backend/src/modules/cena/`).** `CenaDocumentoRepository` (SQL puro, `JOIN` com
`documento`/`tipo_documento` para trazer título/tipo/revelado prontos) e `CenaDocumentoService`:
`listar` (mestre vê tudo; jogador/espectador só o revelado; cena `PLANEJADA` nega a quem não é
mestre — mesma trava anti-vazamento da `m7-22`), `anexar` (idempotente, valida que o documento é da
mesma campanha da cena), `remover`, `reordenar` (mesmo padrão de `reordenarCenas`/
`reordenarDocumentos`: `ordem` precisa listar exatamente os itens), `focar` (abre no palco do
mestre, não emite — não muda o que a mesa vê) e `apresentar` (chama
`DocumentoService.revelarDocumento`, então marca em foco — nunca grava um segundo booleano de
visibilidade). Toda mutação exige mestre e recusa cena `ENCERRADA` (somente leitura). `CenaModule`
importa `DocumentoModule` (mão única: `documento` nunca conhece `cena`). Rotas sob `cena/:id/documento`
(`GET`/`POST`, `PUT .../ordem`, `DELETE .../:documentoId`, `POST .../:documentoId/focar`,
`POST .../:documentoId/apresentar`). `CampanhaGateway.emitirCenaDocumentoAlterado` — dataless, vai
à sala cheia, à do espectador e à do mestre (quem recebe refaz o `GET`, já no próprio recorte);
"focar" não passa por aqui.

**Frontend.** `EncontroPainelDadosService` ganhou `documentosCena`/`carregandoDocumentos`
(carregados só quando `cena.tipo === INVESTIGACAO`, dentro de `definirCena`),
`ehInvestigacao`/`documentoEmFoco` (computeds) e os métodos `anexarDocumento`/
`removerDocumentoDaCena`/`reordenarDocumentosCena`/`focarDocumento`/`apresentarDocumento`, cada um
trocando o sinal pela resposta do backend (a mesma lista completa, sem patch local). Assina
`cenaDocumentoAlterado$` (novo em `TempoRealService`, evento `cena:documento-alterado`) filtrado
pela cena da tela e refaz o `GET`.

`PainelCenaSemIniciativaMestre` ganhou a coluna Documentos (condicionada a `ehInvestigacao()`) entre
a coluna de ações e Rolagens, usando `app-documento-cartao` (M9) com subir/descer (mesmo padrão de
`moverPlanejada` do hub de cenas), apresentar (só quando oculto) e remover; a categoria "Cena" da
coluna de ações ganhou "Anexar documento", que abre um `app-modal` listando a biblioteca da
campanha (menos o que já está anexado) via `DocumentoService.listar`. O palco ganhou
`app-leitor-documento` (M9) acima da grade de Agentes quando há um documento em foco — busca o
documento completo por `DocumentoService.recuperar` sempre que `documentoEmFoco()` muda.

`PainelCenaSemIniciativaJogador` ganhou a seção "Documentos apresentados" (só quando
`documentosCena().length`, que para o jogador já vem filtrada pelo backend) com os mesmos
`app-documento-cartao`; clicar um abre um `app-modal` com `app-leitor-documento` — nada abre
sozinho, como a spec do milestone pede.

## Decisões tomadas ao implementar

- **`PainelCenaShell` não mudou** — confirmado o texto mais recente/específico da `m7-24`
  ("a `m7-25` acrescenta a coluna de Documentos só para `INVESTIGACAO`, sem trocar de componente"),
  que já resolve a tensão com a redação mais antiga da decisão #9 do guarda-chuva ("painel próprio").
- **Espectador tratado como jogador** (ponto em aberto do milestone): mesma visão read-only —
  `documentosCena()` já vem recortada pelo backend do mesmo jeito para os dois papéis, e nenhuma
  tela distingue os dois. Convém revisitar quando a M8 tiver um cenário concreto que exija
  diferenciar os dois no contexto de Investigação.
- **"Focar" é local ao mestre, não sincroniza entre abas/dispositivos do mestre.** Persistido (
  sobrevive a um F5), mas não emite `cena:documento-alterado` — outro dispositivo do mesmo mestre só
  vê o novo foco ao recarregar. Aceitável: não é um caminho de uso real (um mestre com duas telas
  abertas na mesma cena).
- **Reordenar é por botões subir/descer**, não arrastar — mesma interação já usada no hub de cenas
  (`moverPlanejada`), sem introduzir um padrão de drag-and-drop novo no projeto.
- **"Apresentar" só aparece para documento oculto** — revelar um já revelado seria uma segunda
  chamada idempotente sem efeito visível; a ação "focar" (clicar o cartão) já cobre reabrir um
  documento revelado no palco.

## Fora de escopo (herdado do milestone)

Pistas da equipe, Eventos do Mestre, Nível de Cooperação de NPC e turnos formais de investigação —
ver `m7-cenas.spec.md`, "Fora do MVP". Passe responsivo dedicado (~360px, tokens de `m1-15`) é da
`m7-26` — esta task já verificou visualmente 360×800 e 1920×1080 sem overflow, mas não persegue
refinamento fino de mobile além disso.

## Verificação

- `npm test -w shared` (772), `-w backend` (729, incluindo 14 novos de
  `CenaDocumentoService`) e `-w frontend` (2476, incluindo os novos casos de
  `EncontroPainelDadosService`, `PainelCenaSemIniciativaMestre`, `PainelCenaSemIniciativaJogador` e
  `TempoRealService`) verdes. Lint dos três workspaces sem erros novos (só os warnings de aspas já
  pré-existentes no repositório). Build do frontend e do backend limpos.
- Migration `0035`: `db:migrate` → `db:rollback` → `db:migrate` sem erro.
- Verificação ao vivo (`verify`, Postgres nativo + backend + frontend reais, Playwright): mestre
  cria uma cena de Investigação ativa, anexa um documento oculto da biblioteca, foca-o no palco
  (leitor aparece, documento continua oculto), apresenta-o (revela + evento de tempo real) — o
  jogador, numa aba separada e sem recarregar, vê a seção "Documentos apresentados" aparecer e abre
  o documento num modal de leitura. Confirmado em `1920×1080` (mestre) e `360×800` (mestre e
  jogador): sem overflow horizontal, grade de agentes e coluna Documentos coerentes com o painel de
  Resistência (`m7-24`) e com a Biblioteca (`m9-04`/`m9-05`).
