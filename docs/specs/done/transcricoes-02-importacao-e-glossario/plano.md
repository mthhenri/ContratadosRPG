# Plano da task 02 — importação e glossário

Proposta de 2026-10-15, **aprovada pelo autor no mesmo dia** (decisões da §1 em [design.md](design.md); a spec foi para `active/`).
O andamento fica no Ledger ao fim deste arquivo.
Base: `master` com a 03 em `done/`. Spec: [transcricoes-02](../transcricoes-02-importacao-e-glossario.spec.md);
gates comuns: [revisao.md](../../done/transcricoes/revisao.md#gates-de-implementação).

## O que já existe (entregue pela 01 e pela 03)

- Backend `transcricao`: sessão (CRUD, arquivamento), **faixa** (`POST/GET /transcricao/sessao/:id/faixa`, `GET /transcricao/faixa/:id`)
  com `nome_arquivo`, `participante` (texto livre), `deslocamento_milissegundos` assinado. Autorização pelo Mestre atual (JWT web).
- Dispositivo/vínculo/intenção (03): o app resolve o contexto da sessão com a credencial do dispositivo (`DispositivoGuard`).
- Desktop (PySide6): shell, vínculo, `Session`/`SecureStore` por origem+conta, URI opaca, tema. **Sem** leitura de WAV, sem lote, sem glossário.
- Lacunas: não há atualização de faixa (confirmar identidade, ajustar offset), nem mapeamento reutilizável por campanha, nem glossário,
  nem rota de faixa para o app (credencial de dispositivo), nem contrato de entrega ao motor.

## 1. Decisões que preciso que você aprove (bloqueiam o código)

| ID | Proposta (recomendação) | Alternativa |
|---|---|---|
| D-06a | **Duplicidade de arquivo** na sessão: mesmo nome de origem **e** mesmo tamanho **e** mesma duração = duplicado; avisa e pede escolha (manter/ignorar), nunca une sozinho. O hash do conteúdo é calculado e **fica só no app** (detecta "arquivo alterado/renomeado"); não vai à API | enviar também o hash (facilita deduplicar entre máquinas, mas expõe uma impressão digital do áudio) |
| D-06b | **Identidade**: o rótulo do participante é guardado como digitado (Unicode NFC). A **comparação** para sugerir/detectar conflito ignora caixa e acento. "João" e "Joao" **não** são fundidos: criar o segundo exige confirmação explícita e mostra o parecido. Uma pessoa pode ter várias faixas; faixa e participante são coisas distintas. Participante sem conta continua válido | unicidade estrita (bloquear "Joao" se existe "João") — mais seguro, mais chato |
| D-06c | **Termo do glossário**: único por campanha por (NFC + trim + espaços colapsados + caixa ignorada). Duplicata devolve 409 apontando o termo existente. **Acento diferente = termo diferente** (não funde), com dica não bloqueante. Limite técnico por termo (80 caracteres); sem limite comercial de quantidade. O que o motor recebe é a lista ordenada de forma determinística; truncar pelo orçamento do prompt é decisão da 04 | termo case-sensitive |
| D-09 | **Onde cada coisa vive**: *app* = importar WAVs, validar, sugerir/confirmar identidade, ajustar offset (ele tem os arquivos). *Site* = glossário da campanha (CRUD pelo Mestre) e visão somente-leitura das faixas/identidades. O app **lê** o glossário e **grava** faixas/identidades por rotas próprias de dispositivo, limitadas à sessão aberta pela intenção | glossário editável também no app (duplica UI; adiar) |
| D-10 | **Snapshot do glossário por execução**: a 02 define o formato (`glossarioEfetivo`, lista de termos + versão) e a coluna `glossario_efetivo` (JSONB, nula) em `execucao_transcricao`; quem preenche é a ingestão da 05. Editar o glossário nunca muda execuções antigas | só definir o formato na 02 e criar a coluna na 05 |
| D-05+ | Offset em **milissegundos inteiros**, manual por faixa, nunca alterado por silêncio/VAD (já aprovado na 01); a 02 só acrescenta o campo `silencioInicialMs` **informativo** (medido, não aplicado) | — |

Ainda preciso de duas coisas suas, que a spec lista como dependência e eu não tenho: o **`transcrever.py`** de referência e, se quiser validar
com áudio real, uma **amostra Craig autorizada** (origem conhecida). Sem elas, o cálculo temporal é provado só com fixtures sintéticas e
a task **não afirma** compatibilidade com o Craig real.

## 2. Tarefas numeradas

Convenção do projeto: tarefa = recorte verificável, com seus testes. `→` = depende de.

| # | Tarefa | Entrega e prova | Depende |
|---|---|---|---|
| 02.0 | Fechar decisões e abrir a task | §1 respondida e registrada em `design.md`; spec `backlog → active` com anexos; pedir `transcrever.py` | — |
| 02.1 | **Contratos puros em `shared/`** | normalização (NFC, caixa, acento), regra de sugestão de identidade a partir do nome do arquivo + associações, regra de duplicidade, DTOs (glossário, identidade/mapeamento, faixa alterar, pacote de trabalho do motor, `glossarioEfetivo`), validators. Testes: vazio, duplicado, diacríticos, Unicode, caixa | 02.0 |
| 02.2 | **Backend: glossário da campanha** | migration `0039` (+UP/DOWN, `SCHEMA.md`), repository/service/controller, OpenAPI. Só o Mestre atual; 404 uniforme; matriz de acesso (jogador, Mestre de outra campanha, ADMIN, ex-Mestre, ids cruzados). Teste em Postgres descartável | 02.1 |
| 02.3 | **Backend: identidades e atualização de faixa** | tabela de mapeamento por campanha (nome de origem → participante, `confirmada`); `PUT` de faixa (participante confirmado, offset); regra "sem associação confirmada não há reconhecimento". Web (JWT Mestre) **e** rotas do app (credencial de dispositivo, só na sessão da intenção). Pais trocados, revogação, transferência de Mestre | 02.1 |
| 02.4 | **App: leitura e validação de WAV** | parser de cabeçalho (RIFF/`fmt `/`data`), canais, taxa, duração, truncado, extensão falsa, silêncio inicial **medido sem deslocar nada**; erro isolado por faixa. Fixtures sintéticas reproduzíveis (válido, corrompido, canais/taxa, silêncio inicial, atraso conhecido, Unicode, repetido). Testes portáveis em Linux/Windows | 02.0 |
| 02.5 | **App: sessão de importação e contrato do motor** | lote preservando nomes/metadados; alerta de faixa faltante/duplicada; sugestão → confirmação/correção; offset manual; persistência por origem+conta; cliente das rotas de dispositivo; **pacote de trabalho** (seleção, mapeamentos, idioma, glossário, offsets) com teste de que o glossário de uma campanha não vaza para outra. Teste de rede: só metadados, **nunca** WAV nem caminho absoluto | 02.1, 02.3, 02.4 |
| 02.6 | **App: telas Qt** | seleção de arquivos, lista de faixas, sugestão/confirmação, offset, erros por faixa, estados ocupado/offline; tema e controles equivalentes aos do site. Fecha as pendências herdadas da 03: **U1–U5** (DPI real, janela, teclado, Narrador, ocupado) e **S1** (2º usuário Windows) | 02.5 |
| 02.7 | **Site: glossário e leitura das faixas** | tela do Mestre na campanha (CRUD de termos, erros de duplicidade/vazio, estado vazio), faixas/identidades somente-leitura; primitivos de `shared/ui/` com a API completa (se faltar algum, eu **paro e pergunto**). Gate visual nos 4 viewports, claro/escuro, teclado/44 px, comparado ao análogo (Perfil/Biblioteca) | 02.2, 02.3 |
| 02.8 | **Integração e fecho** | gates comuns (builds, `npm run lint`, testes, `repo:verificar`), rede/segurança, **V8/V9** num Edge/Chrome reais, Windows real/Sandbox, revisão independente, `HISTORY`/`CONTEXT`/`PROBLEMS`, spec e anexos para `done/` | 02.1–02.7 |

Ordem sugerida: **02.0 → 02.1 → (02.2, 02.3 e 02.4 em paralelo, pois não tocam os mesmos arquivos) → 02.5 → (02.6 e 02.7 em paralelo) → 02.8.**
02.4 só depende de 02.0 e pode começar antes de 02.1.

## 3. Riscos e o que **não** vou fazer

- Sem o `transcrever.py` e sem amostra Craig, nada do que a task faz prova o comportamento do Craig real; o relatório dirá isso.
- Mudança estrutural (tabela nova, rotas de dispositivo) é irreversível em produção só depois do deploy; aqui tudo roda em banco descartável e **nada é publicado**.
- Fora de escopo, como na spec: glossário global/por sessão, diarização, reconhecimento mágico de identidades, conversão de formatos, normalizar/regravar originais.
- Se `shared/ui/` não cobrir uma tela (ex.: tabela editável, seletor de arquivos), eu paro e proponho opções antes de contornar com HTML/CSS local.
- A 04 (motor) continua separada: a 02 entrega o **contrato** do pacote de trabalho, não o reconhecimento.

## Ledger

- 2026-10-15 — **02.0 feita.** Decisões D-06a/b/c, D-09, D-10 e D-05+ aprovadas e registradas em `design.md`; spec `backlog → active`; ponteiros das
  outras specs corrigidos. Sem `transcrever.py` e sem amostra Craig: fixtures sintéticas.
- 2026-10-15 — **02.1 feita.** `shared/src/validators/transcricao-importacao.validators.ts` (normalização, chaves de termo e de "parecido", validação de
  termo/participante, conflito de termo, sugestão de identidade, duplicidade de arquivos, participantes sem faixa, glossário efetivo, pacote do motor) e
  `shared/src/dtos/transcricao/importacao.dtos.ts` (glossário, identidade, `FaixaTranscricaoAlterar*`, value objects do motor/snapshot). Testes novos 44/44
  (diacríticos, Unicode decomposto, emoji por ponto de código, zero-width, ZWNJ legítimo, termo de outra campanha sem vazar texto, faixa sem identidade
  confirmada, offset fora do intervalo); `shared` 1324/1324, build ok, eslint 0 erros. `npm run impacto`: arquivos novos, 2 consumidores só no próprio shared.
  Observação de projeto: ZWJ/ZWNJ são aceitos (nomes legítimos); os demais caracteres de controle/formato invisíveis são recusados.
- Próximas sem dependência entre si: 02.2 (glossário no backend), 02.3 (identidades/faixa) e 02.4 (WAV no app). 02.2 e 02.3 tocam a mesma pasta e o
  gerador OpenAPI, então vão em sequência; 02.4 é só Python e pode andar em paralelo.
- 2026-10-15 — **02.2 feita.** Migration `0039` (glossário, identidades, colunas da faixa e `glossario_efetivo`; `SCHEMA.md` atualizado), `Glossario*` sob
  `/transcricao/glossario`, só o Mestre atual, 404 uniforme, 409 em duplicata de caixa, dica `parecidoCom` em acento diferente. Verificação do Mestre extraída para
  `acesso-mestre.util` (usada também por `TranscricaoService`). Provas: service/controller (mocks), Postgres descartável com UP→DOWN→UP da 0039 e REST real com a
  matriz (jogador, espectador, ADMIN, TESTER, Mestre de outra campanha, visitante 401, transferência de Mestre). O teste de banco achou um defeito real
  (`ORDER BY … COLLATE` sobre `UNION`), corrigido com subconsulta.
- 2026-10-15 — **02.3 feita.** Web: `/transcricao/identidade` (CRUD) e `PUT /transcricao/faixa/:id` (identidade confirmada, offset manual, silêncio informativo).
  App: `/transcricao/aplicativo/{glossario,identidade,sessao/:id/faixa,faixa/:id}` sob a credencial do dispositivo (JWT web não autentica; revogado = 401; ex-Mestre
  ou Mestre de outra campanha = 404; campo extra como `wav`/`caminhoLocal`/`hashAudio` = 400). D-06b em código: participante parecido (só caixa/acento) exige
  `confirmarParecido`; a mesma pessoa pode ter várias origens; rótulo exato já conhecido não é conflito. Provas: unit 43, Postgres 12/12, REST 15/15 (e os REST antigos
  seguem verdes). Backend 1219 testes, lint 0 erros; shared 1328.
  Decisão de projeto: a rota do app **não** é limitada a uma sessão da intenção (que é de uso único e só resolve contexto); ela revalida o Mestre ATUAL da campanha do
  recurso a cada chamada, igual à rota web, e só expõe estes endpoints. Se o autor quiser amarrar a credencial a uma sessão aberta, é uma decisão nova.
- Próximas: 02.4 (WAV no app, só Python) e depois 02.5/02.6 (importação e telas Qt) e 02.7 (glossário no site).
- 2026-10-15 — **02.4 feita.** `desktop/transcriber/src/contratados_transcriber/wav.py` (só stdlib): percorre os chunks, valida PCM 8/16/24/32 e float32,
  `WAVE_FORMAT_EXTENSIBLE`, `data` de tamanho indefinido (aviso), mede duração (ms, arredondando ao mais próximo) e o silêncio inicial **sem aplicá-lo a nada**, lendo em blocos
  (20 s de silêncio localizados com exatidão). Erros isolados por faixa com código (`NAO_RIFF`, `CABECALHO_INCOMPLETO`, `TRUNCADO`, `SEM_FMT`, `SEM_DATA`, `SEM_AMOSTRAS`,
  `FORMATO_NAO_SUPORTADO`, `PARAMETROS_INVALIDOS`, `ILEGIVEL`) cuja mensagem leva só o nome do arquivo. O hash do conteúdo é função à parte e nunca entra em `InfoWav`.
  Fixtures sintéticas geradas em memória (`tests/wav_fixtures.py`, nenhum binário versionado): válido mono/estéreo/24/32/8/float, silêncio inicial e atraso conhecidos,
  faixa sem fala e limiar de -60 dBFS, truncado, extensão falsa, cabeçalho incompleto, sem fmt/data, formato não suportado, Unicode, repetido, alterado, grande. 27 testes; desktop 44/44.
  Limite documentado: um `data` com tamanho 0 seguido de outros chunks seria lido como "tamanho indefinido"; é raro e sinalizado por aviso.
- 2026-10-16 — **02.5 feita (núcleo; a tela é a 02.6).** `importacao.py`: lote de WAVs com erro isolado por faixa, sugestão sem confirmação, confirmação/correção (participante parecido
  exige `confirmar_parecido`; uma pessoa pode ter várias faixas), offset manual (nunca derivado do silêncio), alertas de duplicidade e de participante sem faixa, registro no servidor
  **só de metadados** (cria a faixa e confirma; uma faixa já criada não é recriada em nova tentativa; sem rede para e preserva; uma faixa com conflito não derruba as outras),
  associação reutilizável salva após confirmação, **pacote do motor** (`pacote_trabalho`) que recusa glossário de outra campanha e faixa não confirmada/sincronizada, e persistência local por
  conta (`<origem>/<namespace da conta>/importacao-<sessão>.json`; arquivo alterado no disco depois da confirmação perde a confirmação; arquivo sumido vira erro isolado).
  `api.py` ganhou as rotas de importação, consulta só com inteiros positivos, nome de arquivo sem caminho e `ConflitoError` para 409; `Session` ganhou `credencial()` e `pasta_da_conta()`.
  **Regras puras em dois idiomas sem divergir:** `regras_transcricao.py` espelha `shared/`, e os dois lados testam os MESMOS 225 vetores
  (`shared/src/validators/transcricao-importacao.vetores.json`, gerado do TypeScript por `shared/tools/gerar-vetores-transcricao.cjs`). Cuidado registrado: `trim`, `\s`, `\d` e `$` diferem entre JS e Python.
  **Prova de rede:** um servidor fictício registra cada requisição; nem o conteúdo do WAV, nem o caminho absoluto, nem o hash, nem chaves como `caminho`/`hash` aparecem em URL, cabeçalhos ou corpo
  (e um teste de mutação confirmou que injetar um vazamento faz o teste falhar). Provas: desktop 83/83; shared 55/55 no spec das regras. Isolamento entre contas na mesma origem testado (fecha a parte
  de código da pendência S1 herdada da 03; a prova com dois usuários do Windows continua exigindo a máquina).
  Decisão de projeto: a associação reutilizável guarda o nome de origem SEM o prefixo numérico (`3-carlos.wav` → `carlos`), para valer em sessões futuras; a sugestão compara o nome completo e o sem prefixo.
- 2026-10-16 — **02.6 feita (cartão "03 Importação"; U1–U5 e S1 seguem pendentes para a 02.8).** `painel_importacao.py` + `widgets.py` (cartão/botão/rótulo compartilhados, `RotuloElidido`) + QSS em `theme.py`; `app.py` mostra o cartão só com sessão autorizada (`sem_sessao()` o esconde em desconexão, vínculo revogado, troca de servidor e falha de abertura) e aceita arrastar WAV para a janela. Lista de faixas com nome elidido (dica com o nome inteiro), dados técnicos, estado (sugerida/confirmada/sem identidade/registrada/erro), participante + offset em ms, aviso de participante parecido (confirmação explícita, texto digitado preservado), alertas de duplicidade/participante sem faixa, idioma, "Registrar no servidor" (desabilitado sem pacote válido) e situação do pacote em português claro. 15 testes Qt; desktop 98/98.
  **Análogo registrado:** os cartões numerados da própria janela (`//`, `01`, `02`, derivados na 03 do Perfil do site), com sub-cartões `faixa` aninhados; mesmos campos `surface-2`, botões primário/secundário/perigo, rótulos mono em caixa alta.
  **Verificação visual (Qt real do Windows, `QWidget.grab()` do conteúdo inteiro; `.artifacts/`):** larguras 560 (mínimo), 640 e 1100; escala 1,5; estados: sem sessão, painel vazio, lote com erro, aviso de parecido, confirmadas, registrado. Defeitos achados e corrigidos: linha de contexto redundante; alerta de faixa faltante antes de haver arquivo; status vazio deixando vão; faixa alta demais (participante e offset agora lado a lado); dica repetida por faixa; "Limpar" ambíguo (agora "Limpar nome"); mensagem técnica do pacote; nome do arquivo repetido na mensagem de erro; "0,0 s" quebrando a unidade na largura mínima (espaço sem quebra).
  **Limites:** escala 2, foco/ordem de Tab e Narrador, o executável empacotado, o diálogo nativo de arquivos e o fluxo contra servidor real não foram exercitados aqui — ficam na 02.8 junto de U1–U5/S1.
- 2026-10-16 — **02.7 feita (site: glossário e leitura).** Rota `campanhas/:campanhaId/transcricoes/glossario` (guards de login e de Mestre, link "Glossário e faixas" na tela de Transcrições) com `GlossarioTranscricao`: cartão `//` de contexto, `01 Termos` (adicionar com validação de `shared` antes de enviar, edição no próprio lugar e exclusão com `ConfirmacaoService`, ações por item só no modo de edição, dica não bloqueante de termo parecido, 409 mostrado no campo, estado vazio), `02 Identidades conhecidas` e `03 Faixas por sessão` somente leitura (deslocamento, silêncio inicial marcado como informativo, chip de confirmação). Serviço ganhou `listarTermos/criarTermo/alterarTermo/excluirTermo/listarIdentidades/listarFaixas`; 409 passou a ser tratado na tela (sem toast duplicado). Todos os controles usam primitivos de `shared/ui` (`app-botao`, `app-botao-icone`, `app-campo`, `app-chip`, `app-estado-vazio`, `app-cartao`); nenhum primitivo faltou. 10 testes novos (frontend transcricao 18/18); eslint 0 erros; `ng build` ok (aviso de orçamento do bundle inicial já existente).
  **Análogo registrado:** a própria tela de Transcrições (cartões numerados `//`/`01`…, lista com hairline, botões médios 44 px), derivada de Perfil/Biblioteca; modo de edição por lista como nas listas da criatura.
  **Verificação visual (stack isolado: backend compilado na 53101 + `ng serve` na 4301 sobre o Postgres descartável; app do autor intocado):** 1920×1080, 1366×768, 960×1080 e 360×800, escuro e claro, sem overflow horizontal em nenhum; estados: vazio-com-dados, lista cheia, termo de 80 caracteres sem espaços, nome de arquivo longo, faixas abertas, edição com erro 409. Defeitos achados e corrigidos: toast duplicado do 409; botão "Adicionar" desalinhado do campo por causa da dica (dica movida para o texto de apoio); cabeçalho da sessão sem justificar (herdava `space-between` do grid).
  **Limites:** estado vazio real e erro de rede não foram capturados ao vivo (cobertos por teste); teclado/Narrador no navegador ficam na 02.8; só Chromium do Playwright.
