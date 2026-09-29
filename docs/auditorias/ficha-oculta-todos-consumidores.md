# Auditoria de ficha oculta — todos os consumidores

Data: 2026-09-29. Revisão-base: `f308f02df88c67a4f1299cfa4172e57a2c61ab40`, incluindo o estado de trabalho local. As linhas abaixo são dessa leitura, não de uma implementação futura.

**Estado: investigação parcial, spec em active.** O mapa estático dos produtores e consumidores foi percorrido e três divergências foram confirmadas. A cobertura dinâmica completa ainda está aberta. Nenhum código, contrato, schema, estilo ou teste versionado foi alterado.

## Contrato e método

O pedido do autor exige ausência da ficha oculta de terceiros, inclusive identidade e marcadores; dono e mestre mantêm sua visão. Conta/membro não é ficha. Não se censura texto livre. A concessão anterior e a publicação de rolagens têm semânticas históricas próprias: conflitos são documentados, sem decidir implicitamente uma nova política.

Foram rastreados `oculta`, `fichaId`, `ficha_id`, DTOs de resumo, serviços de leitura e assinantes de tempo real em backend, frontend e shared. As buscas abrangeram todos os módulos do backend; referências em Documento são a ocultação do documento, não enumeradores de fichas. Caderno usa consultas próprias de busca em fichas e foi examinado separadamente.

Legenda: **observado** = resposta REST/socket real; **estático** = caminho comprovado no código; **pendente** = hipótese/cenário sem observação suficiente. Teste unitário com mocks não comprova SQL nem experiência visual.

[Respostas e eventos sanitizados da rodada local](ficha-oculta-evidencias-rest-ws.json).

## Matriz de consumidores

| Consumidor | Origem e recorte | Observador / conclusão | Evidência e cobertura restante |
|---|---|---|---|
| Esquadrão: carteirinhas e membros | `CampanhaRepository.listarMembros`, linhas 404–456; filtro mestre/dono/não oculta antes de `json_agg` | B não recebe ficha oculta, mesmo por concessão; contas continuam listadas | Observado B sem concessão: fichas `[]`. Agrupamento `campanha-equipe.util.ts` usa recorte recebido; não deduz identidade da ficha ausente. Transições visuais pendentes |
| Listagem de fichas / seletores | `FichaService.listarFichas` 212–233; `FichaRepository.listarVisiveisParaUsuario` 212–230 | Dono/mestre mantidos; concessão ignora `oculta` | Observado: M/A recebem 12, B recebe `[]`; após concessão B recebe 12. FO-03 |
| Acervo pessoal | `FichaService.listarAcervo`, repository `listarPorUsuario` 264 | Consulta por dono autenticado | Estático: preservar própria oculta; não enumera terceiros |
| Lista de campanhas: quantidade, crítica, última alteração | `CampanhaRepository.listarPorUsuario` 171–188 | Agregado próprio/concedido/mestre, sem teste de ocultação no ramo concessão | Estático: acompanha FO-03; conta de membros é distinta da ficha |
| Médias para novo agente | `GET ficha/medias-esquadrao`; service 337–349; repository 244–255 | Todos os jogadores recebem quantidade/médias de todos os agentes | Estático: inclui ocultos sem concessão; decisão D-02 |
| Prévia de jogador: listas, membros e ficha | `CampanhaProjecaoService.recuperarPreviaJogador` / `recuperarFichaPreviaJogador`; `FichaService.listarFichasParaAlvo` / `recuperarFichaParaAlvo` 297–326 | Identidade do alvo, mas regra de concessão continua sem `oculta` | Estático: FO-03. Dono alvo deve manter sua ficha; mestre requisitante não amplia recorte. REST adicional pendente |
| Espectador: agentes e prévia | `FichaService.listarFichasParaEspectador` 275–281 | Só JOGADOR não oculta; sem exceção de dono | Estático e teste existente; comportamento não herdado pelo encontro, FO-01 |
| Investigação / cena sem iniciativa | `EncontroPainelDadosService.carregar` 368+; `PainelCenaSemIniciativaMestre/Jogador` | Grade do mestre usa fichas; jogador usa própria ficha; equipe futura não existe | Estático: produtores listagem/membros acima. Não atribuir à equipe futura vazamento atual |
| Combate / ordem / turno / resumo e cards | `EncontroService.montarEstadoParaUsuario` 1091–1109 e `ocultarNaoRevelados` 103–125 | B e espectador recebem nome e ids de ficha oculta | Observado REST M/A/B/S e WS B: FO-01. Cards imprimem `combatente().nome`, `cartao-combatente.component.html:116`; `iniciativa-leitura` e `resumo-combatente` consomem o mesmo DTO |
| Encontro legado e projeções de encontro ativo | `GET encontro/:id`; `recuperarEncontroAtivoParaAlvo/Espectador` 1121–1161 | Mesmo recorte defeituoso; mestre conserva estado completo | Estático: FO-01; prévias dinâmicas pendentes |
| Log do encontro | `ocultarNaoRevelados` 116–124 | Eventos associados a combatentes sem números são removidos | Estático: protege texto desses eventos; `ordemRodada`/índice continuam intactos e precisam acompanhar FO-01. Texto livre de evento não é automaticamente censurável |
| Pedido de iniciativa | Gateway 686–691 e `EncontroService` emissor | Sala campanha, chamado de encontro, sem DTO de ficha | Estático: evento não enumera ficha; tela resolve combatentes pelo estado FO-01 |
| Ficha completa, criatura, URLs e anotações da ficha | `FichaService.recuperarFicha/recuperarFichaCriatura`, núcleo `avaliarVisibilidadePara` 1366–1400 | Sem concessão nega; com concessão ignora ocultação | Observado abertura B com concessão; FO-03. Páginas `visualizar`, `visualizar-criatura`, `anotacoes-janela`, `historico-rolagens-janela` dependem desse árbitro |
| Ficha flutuante e seleção | `FichaFlutuanteConteudo` 61+ carrega uma vez; `FichaFlutuante` mantém alvo | Sem assinatura própria de revogação/reconexão/visibilidade | Estático: pendência H-01; não afirmar vazamento visual reproduzido. Hospedeiros e requisições atrasadas precisam ser exercitados |
| Avatar / preview | URL em resumo/membros/encontro; upload/remover imagem exigem edição | URL omitida em carteirinha oculta; concessão pode recuperá-la via ficha; encontro oculto zera avatar mas conserva nome | Estático: FO-01/03. Não há leitura de avatar autenticada por ficha neste controller; URL já conhecida e armazenamento exigem análise adicional H-02 |
| Inventários / pegar e mandar para base | `FichaService.pegarItemInventario/mandarItemInventarioParaBase`; inventário de campanha | Operação sobre ficha exige edição; lista de itens não é lista de destinatários/fichas | Estático: não encontrado seletor de transferência direta entre agentes. Texto de item é conteúdo livre; não censurar |
| Rolagens: campanha, ficha, cena, janela, notificações | `RolagemRepository.colunasResumo` 34–41; `listarPorCampanha` 140+ / `listarPublicasPorCampanha` 169+; gateway 519–532 | Pública inclui `fichaId`, `nomeFicha`, `corFicha` para B/espectador, independente de ocultação | Estático confirmado como comportamento; decisão D-01 antes de classificar publicação como defeito. Histórico por ficha usa árbitro FO-03. `autoria-rolagem.util.ts`, cards e feeds apenas apresentam payload |
| Busca / caderno pessoal e de esquadrão | `PaginaCadernoService.fontesPermitidas` 325+; repository fontes MINHAS_FICHAS 419–422, FICHAS_CAMPANHA 428–430 | Jogador busca próprias; mestre todas; espectador rejeitado | Estático: não enumera ficha alheia pelo índice. Cadernos compartilhados contêm texto livre, autor é usuário e não ficha |
| Biblioteca / presença de leitura | Documento e DocumentoLeituraService | Presença de usuário para mestre; não ficha | Estático: fora da ocultação de agente, preservar conta/membro |
| WS criação / vínculo / saída / visibilidade | Gateway 335–388; `FichaService.atribuirCampanha` 1245–1254 | Sala campanha contém terceiros; criação envia resumo e saída/visibilidade enviam fichaId | FO-02. Visibilidade observado; vínculo de oculta e saída confirmados estaticamente, reprodução adicional interrompida |
| WS ficha completa / concessão e revogação | Entrada gateway 135–154 usa recuperarFicha; alteração 313–322; revogação 427–438 | Concessão permite entrar oculta; ocultar não expulsa leitor como revogar acesso | Estático: FO-03. Revogação remove socket do alvo, mas seus cenários reais ainda pendentes |
| WS encontro e reconexão | Gateway 586–612 monta por usuário; telas campanha e cena refazem GET via `reconexao$` | Transporte por usuário correto, conteúdo depende FO-01/03; invalidação mínima sem fichaId usa apenas flags/campanha | WS B observado; reconexão e cache/ficha flutuante pendentes. Investigação assina `ficha:alterada`, mas não todos eventos de criação/visibilidade: verificar H-01 |

## FO-01 — Identidade da ficha oculta na iniciativa

**Confirmado por REST e WebSocket, sem concessão.** Em campanha local 4, ficha 12 de A oculta, encontro 2, combatente 1: `GET encontro/2` por B e S retornou `{ id: 1, fichaId: 12, nome: "Agente Oculto Auditoria", revelado: false }`. Mestre e dono receberam o mesmo combatente com `revelado: true`, comportamento a preservar. Na mudança visível→oculta B também recebeu `encontro:alterado` contendo nome/fichaId.

Causa: `ocultarNaoRevelados` faz `map`, e `ocultarCombatente` mantém nome/id/cor/iniciativa/ordem mesmo sem identidade visível; só retira números e avatar. O retorno espalha o estado original, deixando ordem e índice originais. `encontro-revelacao.spec.ts:197` testa avatar/dono/classe ausentes, sem exigir ausência do combatente.

Correção encaminhada: [fix-ficha-oculta-identidade-encontro](../specs/backlog/fix-ficha-oculta-identidade-encontro.spec.md).

## FO-02 — Eventos identificam ficha oculta para a sala ampla

**Confirmado em WS para visibilidade; vínculo/saída confirmados por código.** B recebeu `ficha:visibilidade-alterada` com `{ fichaId: 12, campanhaId: 4 }` nas duas transições. O evento não informa o booleano, mas entrega o identificador que o contrato exige omitir.

`emitirFichaCriada` 365–388 não avalia `oculta`. `atribuirCampanha` 1245–1247 chama-o para JOGADOR ao vincular uma ficha já oculta, enviando nome, dono e recursos para todos os jogadores. `emitirFichaRemovidaDaCampanha` 335–338 envia fichaId mesmo se sempre esteve oculta. Um resumo enviado e depois descartado na UI continua sendo exposição de payload.

Correção encaminhada: [fix-ficha-oculta-eventos-campanha](../specs/done/fix-ficha-oculta-eventos-campanha.spec.md) — **corrigido em 2026-09-29**: invalidadores sem `fichaId` e vínculo de oculta sem resumo, observado com sockets reais M/A/B/S (ver `HISTORY.md`).

## FO-03 — Concessão anterior supera ocultação em leitura e listagem

**Confirmado por REST; conflito de política explicitamente aberto.** Sem concessão, B recebe lista vazia. A concedeu acesso a B com a ficha já oculta: listagem B passou a incluir 12 e `GET ficha/12` devolveu "Agente Oculto Auditoria". A carteirinha de membros aplica uma regra diferente: oculta de terceiro não entra, independente da concessão.

Causas: `listarVisiveisParaUsuario` 219–227 usa dono OU concessão sem `oculta`; `avaliarVisibilidadePara` 1393–1400 também aceita concessão sem ocultação. A lista de campanhas 178–187 repete o ramo concessão. Isso repercute nas prévias, encontro, histórico da ficha, URLs e ingresso na sala de ficha.

A matriz histórica §14 permite concessão; o pedido novo exige ausência. A implementação dessa mudança deve resolver formalmente a precedência antes de corrigir. Não generalizar para criaturas/NPCs nem para ficha avulsa.

Correção encaminhada, com decisão anterior à implementação: [fix-ficha-oculta-concessao-e-leitura](../specs/done/fix-ficha-oculta-concessao-e-leitura.spec.md) — **corrigido em 2026-09-29**. Decisão do autor: a ocultação **suspende** a concessão (gravada, sem efeito, volta ao exibir), só para ficha de JOGADOR em campanha; registrada em SYSTEM.SPEC §14. Árbitro, listagem, agregado de campanhas, prévias, sala `ficha:<id>` e leitores abertos (coluna do detalhe, ficha flutuante, janela de histórico) observados com REST/WS e Playwright (ver `HISTORY.md`).

## Decisões e hipóteses pendentes

- **D-01 — Rolagem pública de agente oculto:** o backend publica nome/fichaId/cor por desenho da visibilidade PUBLICA. Decidir se preserva publicação sem identidade, bloqueia publicação ou mantém divulgação deliberada. Não trocar para PRIVADA automaticamente nesta auditoria. Considerar rolagens antigas e feed já carregado.
- **D-02 — Quantidade/médias:** `calcularMediasEsquadrao` inclui todos JOGADOR; num cenário só com oculta, B pode inferir existência por quantidade 1. Decidir se o cálculo do novo agente continua usando equipe real e recebe um recorte de apresentação distinto ou se a regra de cálculo deve mudar. Não modificar fórmula de jogo como consequência implícita da privacidade.
- **H-01 — Estado aberto/atrasado:** ficha flutuante sem assinatura própria e grade de investigação sem todos invalidadores. Reproduzir ficha aberta, revogar/ocultar, resposta GET atrasada, mudança de cena e reconexão; classificar cada consumidor antes de gerar correção adicional. Páginas completas têm `acessoRevogado$` e refetch de reconexão; isso não demonstra limpeza de todo estado.
- **H-02 — URL de avatar conhecida:** examinar acesso ao objeto persistido, cache e eventual política de URL; a auditoria de REST de ficha não comprova autorização do arquivo. Não prometer revogar conteúdo já recebido pelo usuário.

## Verificações executadas e limites

1. Testes existentes: `npm run test --workspace=backend -- src/modules/encontro/encontro-revelacao.spec.ts src/modules/ficha/ficha.service.spec.ts src/modules/ficha/ficha.repository.spec.ts src/modules/campanha-projecao/campanha-projecao.service.spec.ts src/core/gateway/campanha.gateway.spec.ts` — **5 arquivos, 280 testes passaram**. Primeira tentativa falhou ao carregar config por restrição de filesystem; repetida com execução autorizada fora dessa restrição. Não é falha de produto.
2. Stack existente: API 3100, SPA 4300 e container `contratados-rpg-postgres` saudável no início. Cenário criado exclusivamente por REST com quatro contas `audit_oculta_1790657680622_{M,A,B,S}`; campanha 4, ficha 12, encontro 2. Dados sintéticos derivados da fixture existente, sem ler/copiar ficha real. Não alterados dados preexistentes.
3. REST observado: listagem M/A/B, membros B, encontro M/A/B/S e concessão/leitura B. WS observado: sala campanha B, eventos de visibilidade e encontro nas transições. Dados/credenciais de teste estão apenas em arquivos temporários locais; nenhum token/senha neste relatório.
4. Cenários adicionais não concluídos: socket não completou nova conexão; nova tentativa limitada a 12s expirou; REST posterior retornou `fetch failed`. Não reiniciado/interrompido o backend do usuário para tentar recuperar o ambiente.
5. Browser real aberto pelo fluxo normal de login com conta B. Formulário não concluiu autenticação; não se atribui a falha ao contrato de ocultação. **Não observadas telas autenticadas em 1920×1080/360×800.** Gate de observação continua aberto.
6. Não rodados build/lint gerais: documentação apenas, sem mudança de aplicação. Os testes focados foram evidência complementar da investigação, não validação de uma correção.

## Roteiro de retomada

Restabelecer API local e confirmar contas/campanha de teste ainda existentes; se o banco tiver sido reiniciado, recriar o cenário separado. Exercitar visível sem concessão, visível com concessão, oculta de A, criatura não revelada e revelada em todos os recortes M/A/B/S e prévias M→A/B/S. Validar acesso direto sem concessão, vínculo/saída de oculta, concessão/revogação, leitor aberto, reconexão e resposta atrasada. Não derrubar serviço compartilhado para testar reconexão; usar instância isolada ou coordenar com o autor.

Observar campanhas, combate, investigação, ficha/preview/flutuante, histórico e busca em 1920×1080 e 360×800. Para cada cenário marcar observado, negado ou não aplicável; registrar payload, resultado visual e resíduos de seleção/cache. Resolver D-01/D-02 e confirmar H-01/H-02. Só mover a auditoria para done quando esses recortes obrigatórios estiverem resolvidos ou tiverem um limite de escopo explicitamente acordado.
