# Contratados Transcriber — revisão documental e mapa de implementação

Revisão de 2026-10-14 sobre `master` no commit
`f1e1d58295deb9986a6d2f6d71d6857047899782`. Spec proprietária:
[transcricoes.spec.md](../transcricoes.spec.md).

**Alcance:** revisão/preparação documental; nenhuma tarefa de implementação iniciada.
01–07 continuam no backlog como primeira entrega local, dependentes de aprovação.
08–09 permanecem **bloqueadas** até nova autorização da fase nuvem. Aprovar/mesclar
um PR documental não equivale a autorizar código, migrations ou deploy.

## Fontes e método

Leitura integral de `AGENTS.md`, `CLAUDE.md`, `docs/SYSTEM.SPEC.md`,
`docs/CONVENTIONS.md`, `docs/SCHEMA.md`, `docs/design/DESIGN.md`,
`docs/specs/TEMPLATE.spec.md`, `docs/specs/README.md` e
`.agents/skills/task-flow/SKILL.md`. AGENTS/CLAUDE são idênticos nesta base.
Leitura integral dos 14 Markdown do ZIP: guarda-chuva, nove tasks, decisões,
LEIA-ME e os dois pedidos. O segundo pedido é condicionado a autorização futura.

Inspeção adicional: contexto vigente nas seções de fila/auth/campanha/decisões,
P-003/P-126, mapa MEMORY, histórico relevante, árvore de specs, skill `verify`,
rotas Angular, módulos NestJS, autenticação/guard de autorização, campanha,
DocumentoService/DTOs, transação, armazenamento local/R2, interceptor do JWT,
OpenAPI/gerador, package.json e configurações de CI/deploy. O contexto não foi
reescrito nem foi lido todo o histórico acumulado. Não houve acesso a banco,
produção, credenciais, Drive, áudio real ou hardware Windows.

O script `transcrever.py` é **mencionado**, não incluído no ZIP nem localizado no
clone. Não confirmar equivalência com ele sem obtê-lo. O pacote também não traz
WAV Craig ou corpus com referência humana; validação real fica pendente.

Os originais auxiliares permanecem preservados, com conteúdo íntegro:
[decisões](decisoes-originais.md), [LEIA-ME](pacote-original.md),
[pedido 1](pedido-01-original.md), [pedido 2](pedido-02-original.md).
Os caminhos neles são históricos do ZIP; os destinos vigentes são este anexo e
as dez specs ao lado. Specs foram ampliadas para aceite e integração, sem
promover recomendações a decisões de produto.

## Compatibilidade e conflitos encontrados

| Tema | Evidência da árvore atual | Ajuste/recomendação nas specs |
|---|---|---|
| Campanha e papel | `backend/src/modules/campanha/campanha.service.ts`: `validarMembro`, `ehMestre`, transferência; `validarMestre` privado | Autorizar pelo Mestre **atual** e campanha ativa; reusar service/repository dono, sem chamar método privado nem comparar papel global |
| Sessão de gravação | `SCHEMA.md`/módulos: não há entidade de gravação; `SessaoTokenService`/`SessaoService` são login, `cena` é mesa | Propor domínio próprio em D-01; não modelar gravação como login ou cena ativa obrigatória |
| Biblioteca | `DocumentoService`: TEXTO/IMAGEM, revelação à mesa, busca e presença; parte da mídia usa URL pública | Reusar composição visual, não armazenamento/visibilidade de documento; transcrição não ganha botão Revelar |
| Auth vigente | `app.module.ts`, `autorizacao.guard.ts`: JWT global + consulta de conta/tokenVersao; sessão-token emite token do site | Vínculo/credencial restrita do app ainda não existem; D-03 precisa especificar integração com guards sem abrir endpoints de resultado como públicos |
| Validação estrutural | SYSTEM §11 descreve class-validator/ValidationPipe; `main.ts`, interfaces DTO e P-003 mostram decisão vigente sem pipe nem dependências | Conflito explícito: validar payloads do app no recorte da nova service, manter DTO readonly; reversão global só com autor, sem “consertar” o resto do projeto |
| UI atual | SYSTEM §2, DESIGN e `frontend/package.json`: biblioteca própria; AGENTS ainda menciona PrimeNG 21 | Consumir `shared/ui/`; não instalar PrimeNG. Não editar fontes globais nesta revisão para resolver divergência legada |
| Migração | CONVENTIONS cita próxima `0009`, mas árvore já avançou | Consultar próximo número disponível quando implementação for autorizada; somente `.sql` UP/DOWN e schema sincronizado nessa task futura |
| OpenAPI | `@DocumentarController` + mapa estático `TAGS_POR_CONTROLLER` no gerador | Cadastro explícito e geração são gates da 01 e de qualquer contrato posterior; interfaces TS não validam input em runtime |
| Storage | `main.ts`: `/uploads` estático; provedores devolvem caminho local público/URL R2 pública; interface é imagem/texto | V1 não envia WAV; 09 precisa storage **privado**, não apenas pasta aleatória no bucket público |
| Retenção | Faxina atual é de imagens órfãs, carência 30d/simulação | Não serve para 24h/7d/14d/30d e uploads inativos 24h. Remover blob fisicamente é distinto de DELETE SQL proibido |
| Importação 02 | Exige UI “no aplicativo”, enquanto shell só nasce na 03 | Corrigida dependência 02→03; ordem executável 01→03→02→04→05→06→07, sem renumerar nem mover produto entre fases |
| Glossário | `regras-glossario.spec.md` trata de cartão/definições no leitor público | Não é dependência nem fonte automática do vocabulário privado por campanha da 02 |
| Offline | App/fila/outbox ainda não existem; site é SPA autenticada sem promessa de edição offline | Offline abrange inferência e resultados locais já autorizados; não acrescentar editor/PWA offline nem renovação de auth fictícia |
| Reprodução | Browser hospedado não tem acesso arbitrário ao disco; interceptor injeta JWT em toda chamada | D-04 escolhe reseleção explícita ou ponte segura; ponte deve evitar vazamento de JWT web e não ler qualquer path |
| Tempo/edição/exportação | Pacote permite offsets negativos e SRT, mas não define origem/negativos; reenvio deve proteger correções | D-05 fecha formato/unidade/política; add testes de conflito, correção vazia, snapshot e execuções alternativas sem clamp silencioso |
| Verificação visual | DESIGN e `verify`: **quatro** tamanhos, não apenas dois | Acrescentados 1366×768 e 960×1080; claro/escuro, estados interativos, teclado/44px e comparação pessoal com análogo |
| Hardware | Pacote 04 admitia ambiente representativo; 07 exige gate de hardware | Esclarecido que mocks/VM não certificam CUDA físico; simulação não encerra gate físico faltante |
| Trabalho existente | `montador-rolagem-experimento` ativo; demais frentes em backlog | Nenhuma spec existente é encerrada/reordenada; numeração Transcriber não substitui prioridade do autor |
| Publicação | `docs/DEPLOY.md` registra previews para branches/PRs; CI não controla deploy nativo | Branch/commit local e patch são opção sem deploy; publicar só com evidência de exclusão documental ou autorização compatível |

### Responsabilidades recomendadas (sujeitas a D-01/D-02/D-03)

- `shared/src/dtos/`/`enums`/`validators`: contratos de domínio e constantes puras.
  Não colocar fila, persistência ou autorização em `shared/regras/` (exceção só do jogo).
- Novo módulo backend de transcrições: controller fina → service com validação/
  autorização → repository SQL, usando `CampanhaService` e `TransacaoService`.
  Mutação REST; eventos, se necessários, somente depois de commit para Mestre.
- Novo módulo Angular lazy por campanha, análogo do hub/Biblioteca; guard de
  papel para UX e autorização verdadeira na API. Não ampliar detalhamento da
  página existente sem responsabilidade delimitada e avaliação de impacto.
- App Windows: importação, WAVs, inferência, fila e outbox em disco local,
  separados por conta. Shell PySide6/PyInstaller/Inno Setup e vínculo aprovados em 2026-10-14; [desenho da 03](../../active/transcricoes-03-agente-windows-e-vinculo/design.md). Worker aguarda 04.
- Futuro adaptador cloud/storage privado: responsabilidade exclusiva 08–09;
  compatibilidade de saída na 01 não autoriza implementar nuvem antecipadamente.

## Decisões pendentes para aprovação

D01 foi aprovada na 01; D02/D03 foram aprovadas em 2026-10-14 conforme o
[desenho da 03](../../active/transcricoes-03-agente-windows-e-vinculo/design.md).
As demais opções são **recomendações**, não decisões assumidas. Ao responder,
registrar escolha/data/consequência no anexo proprietário antes do código dependente.
Nenhum requisito aprovado do pacote foi retirado para contornar essas pendências.

| ID | Decisão e recomendação | Alternativas/consequências | Bloqueia |
|---|---|---|---|
| D-01 | Modelo de sessão/resultado e operação de arquivar: recomendar raiz de gravação por campanha com faixas→execuções→segmentos e seleção explícita | Reusar `cena` imporia ciclo de mesa; reusar `documento` importaria revelação. Arquivamento não tem semântica aprovada: definir se distinto de exclusão. Aprovar nomes/cardinalidades/rotas antes da migration futura | 01 |
| D-02 | Stack, instalador, local do app no monorepo e distribuição Windows: recomendar shell com worker Python empacotado, sem Python manual | Python UI empacotada reduz ponte de processos; shell nativo/webview pode melhorar UI, aumenta binários/IPC. Aprovar manutenção, licença, assinatura/custo, origem dos downloads e atualizações; não assumir Tauri/Electron/MSIX nem quarto workspace | 03 |
| D-03 | Vínculo, escopo/vida da credencial, renovação, revogação e abertura: recomendar aprovação no site e credencial própria restrita/revogável | Copiar JWT web amplia privilégio e não satisfaz credencial limitada. Não há refresh/device auth atual; definir integração com guards e armazenamento protegido Windows, troca de conta/cache, resolução de resultado de sessão excluída, e se vínculo pode nascer por sessão impersonada. Revogação offline só se descobre ao reconectar; não prometer apagar cópias já baixadas | 03/05 |
| D-04 | Reprodução de WAV local: recomendar reseleção explícita no navegador, sem upload | Menor superfície de ataque, exige selecionar novamente/validar identidade do WAV. Ponte com app ativo melhora continuidade, exige protocolo/origin/CSRF/replay e testes reais de browser. Não decidir sem autor nem prometer acesso automático ao disco | 06 (protocolo na 03 se escolhida ponte) |
| D-05 | Unidade/precisão, origem temporal e negativos; correção/seleção de execução e snapshot | Recomendar milissegundos inteiros e `tempoSessao = tempoFaixa + offset`, desempate por identidade estável; aprovar quantização. SRT não representa tempo negativo: recomendar validação explícita antes de exportar, ou origem global deslocada documentada; não truncar silenciosamente. Aprovar revisão otimista e escopo de seleção por faixa, sem histórico completo | contrato na 01; detalhes antes de 06/07 |
| D-06 | Duplicidade/identificação e formatos de saída: confirmar identidade de arquivo, normalização de termo, uma pessoa em várias faixas, nomes e JSON | Recomendar sugerir sem fusão silenciosa, distinguir faixa/participante e preservar Unicode; export individual por faixa com identidade no nome. Definir escolha de agrupamento por participante, TXT com rótulo/tempo, falante no SRT e versão/schema JSON. Não adicionar limite comercial | 02/07 |
| D-07 | **Futuro:** provedor BYOK, executor/custódia, escopo da chave e custos de infraestrutura | Recomendar chave pessoal não transferível automaticamente com campanha; cifrar se servidor custodiar. Browser/app evita custódia mas altera execução e segredo em cliente. BYOK não significa storage/tráfego grátis. Definir custos/segurança e retenção do provedor sem cobrar inferência da plataforma | 08, somente após nova autorização |
| D-08 | **Futuro:** store privado, upload grande, worker/agendador, lease e regras complementares de exclusão | Valores 24h/7d/14d/30d e inatividade 24h já aprovados. Falta efeito da mudança sobre objetos existentes, exclusão antecipada durante job ativo, relógio/lease/timeout e objeto usado por vários jobs. Recomendar prazos registrados por objeto, heartbeat recuperável, limpeza idempotente de blob/partes e observação de atraso, sem prazo/cota novos | 09, somente após nova autorização |

**Evidências a obter**, sem inventar produto: script histórico, amostra Craig autorizada,
corpus com referência e Windows x64 CPU/GPU real. Proposta automática de configuração
Faster-Whisper precisa dessas medições antes de prometer qualidade/compatibilidade.
`shared/ui/` não tem garantia de cobrir player/timeline/progresso: na abertura de cada
UI mapear controles; se faltar primitivo, AGENTS exige proposta e aprovação do autor
antes de criar/ampliar, sem contorno HTML/CSS local. A avaliação mínima de conformidade
não autoriza formulários de consentimento/notificação que o pacote adiou.

## Matriz de autorização

Aplica-se a listagem/busca, sessão/faixa/execução/segmento, mapeamentos, glossário,
edição, offsets, seleção de resultado, export, exclusão e futuro áudio remoto.
Validar conta, dispositivo quando aplicável e cadeia de pais do recurso na API;
ids do cliente não são autoridade. Transferência de papel segue campanha, não autor
original da gravação: quem perdeu `MESTRE` perde acesso online; novo Mestre é o papel
atual. Credenciais BYOK pessoais são questão separada D-07.

| Ator/estado | Resultado esperado |
|---|---|
| Conta autenticada viva, MESTRE atual da campanha, ids coerentes | Acesso do recorte permitido; operações do app ainda exigem vínculo válido |
| JOGADOR ou ESPECTADOR da campanha | Nenhum conteúdo/metadado privado, evento ou export; rota direta não concede acesso |
| MESTRE somente de outra campanha | Mesmo bloqueio, sem usar mapeamento/glossário alheio |
| ADMIN/TESTER global sem MESTRE nessa campanha | Papel global não concede acesso ao Transcriber |
| Visitante, token expirado/tokenVersao revogado, conta excluída | 401, sem ler/gravar resultado/recibo; app conserva pendência local |
| Dispositivo expirado/revogado ou vinculado à outra conta | Não resolve intenção/contexto nem submete; não devolver recibo de ingestão sem autorização |
| Ex-Mestre após transferência, membro removido | Não lê/edita/exporta/sincroniza com antiga autorização; tela invalida leitura |
| Campanha/sessão/faixa/execução excluída ou ids combinados de pais diferentes | Não ler nem gravar/reativar; resposta sem revelar existência de recurso restrito |
| Replay de intenção/chave de ingestão adulterada | Rejeitar intenção; ingestão mesma chave/conteúdo retorna recibo autorizado; conteúdo diferente conflita |

A arquitetura atual permite impersonação administrativa auditável (m6-08).
ADMIN direto não é bypass, mas sessão legitimamente impersonada usa identidade do
alvo: esta revisão não revoga funcionalidade existente. D-03 precisa explicitar
vínculo de dispositivo nesse contexto; não prometer isolamento contra administradores
de infraestrutura ou remoção remota de WAVs/cópias locais.

Recomendação anti-enumeração: 404 uniforme para recurso privado inacessível/excluído
ou inexistente, como Documento oculto; falta de conta válida é 401. Gate da campanha
pode recusar operação sem detalhe do recurso. Não emitir texto, nome de arquivo ou
contagem privada na sala cheia `campanha:<id>`, na sala espectador, em prévias,
notificações públicas, buscas/estatísticas gerais ou logs.

## Mapa final de implementação

| Task | Entrega verificável | Predecessoras em done | Decisões antes do recorte | Evidência principal |
|---|---|---|---|---|
| [01](../../active/transcricoes-01-sessoes-e-contratos.spec.md) | Modelo/contratos, CRUD mínimo privado e autorização; futura migration/schema/OpenAPI | Nenhuma task do módulo; guarda-chuva é fonte, não predecessor executável | D-01, fundamento D-05 | REST real, SQL/transação/UP-DOWN em banco de testes, pais trocados e matriz |
| [03](../../active/transcricoes-03-agente-windows-e-vinculo.spec.md) | Shell instalável x64, vínculo e abertura contextual | 01 | D-02/D-03 aprovadas; sem ponte HTTP | Windows limpo, revogação/replay/origem/contas, ausência de credenciais na URI |
| [02](../transcricoes-02-importacao-e-glossario.spec.md) | Importação no shell, confirmação de mapeamento, offset/glossário da campanha | 01 e 03 | D-06, contrato D-05 | WAV/corpus, rede sem áudio, confirmação/glossário privado |
| [04](../transcricoes-04-motor-local-e-fila.spec.md) | Faster-Whisper, automático/avançado, fila persistente por arquivo | 02 e 03 | Configurações base justificadas por corpus; dependências D-02 | Windows físico CPU/GPU, kill/restart/cancel/disco/OOM, baseline |
| [05](../transcricoes-05-sincronizacao-offline.spec.md) | Outbox, recibo idempotente e proteção editorial | 01, 03 e 04 (02 transitiva) | D-03, identidade da 01 | Resposta perdida pós-commit, concorrência/retry/revogação sem WAV |
| [06](../transcricoes-06-revisao-e-linha-do-tempo.spec.md) | Editor individual/consolidado, execução selecionada, player condicionado | 01, 02 e 05 | D-04/D-05 e aprovação de primitivo faltante | Duas abas/409/texto vazio, offset bruto/player, 4 viewports/2 bases |
| [07](../transcricoes-07-exportacao-e-fecho-v1.spec.md) | TXT/SRT/JSON/ZIP, uso/documentação e jornada local inteira | 01–06 | Fechar D-05/D-06 | Reabrir exports, snapshot, nomes/Unicode, E2E e hardware real |
| [08](../transcricoes-08-nuvem-credenciais-byok.spec.md) | **BLOQUEADA** — chave BYOK/adapter, sem envio de WAV nesta task | 07 + nova autorização da nuvem | D-07 | Segurança de credenciais, rotação, transferência, adapter |
| [09](../transcricoes-09-nuvem-trabalhos-e-retencao.spec.md) | **BLOQUEADA** — jobs, WAV privado e exclusão física/limpeza | 01–08 + autorização da fase | D-07/D-08 | Relógio, blob ausente, multipart, lease/crash e texto preservado |

Sequência local sem ciclo: **01 → 03 → 02 → 04 → 05 → 06 → 07**.
Futuro: **07 → autorização específica → 08 → 09**. Cada predecessor precisa dos
seus gates antes de fechar; simulação não permite pular aceite físico/visual.
Não criar nove implementações paralelas nem ativar guarda-chuva como task de código.

## Gates de implementação

Estes gates são **futuros**, não evidência de produto entregue nesta revisão.

1. Abrir só a task autorizada (`backlog → active`) com seus anexos, consultar
   baseline atualizado e decidir os bloqueios correspondentes. Diffs além do
   escopo vão ao autor; aplicar `gerenciamento-de-impacto` em item compartilhado.
2. Contratos/SQL: DTOs readonly e enums/validators canônicos, service validando
   entrada do agente, repository dono com SQL normativo, BaseEntity/soft delete,
   transação atômica e eventos pós-commit. Qualquer migration apenas em banco de
   testes na implementação autorizada, nunca produção nesta preparação.
3. Testes proporcionais: `npm run build --workspace=shared` antes de consumidores;
   `npm run test --workspace=shared -- <arquivo>` e
   `npm run test --workspace=backend -- <arquivo>` nos recortes;
   `npm run test --workspace=frontend -- --include=<arquivo>` conforme `task-flow`.
   DTO/endpoint novo exige `npm run openapi:gerar-contratos --workspace=backend`,
   revisão de diff/schemas/erros (inclusive 409, se usado) e teste do documento.
4. Gate integrado/fecho: builds dos workspaces afetados, `npm run lint` e
   `npm run test --workspaces --if-present`, além de testes do app/worker
   (comandos exatos só após D-02). Não alegar teste do Python/instalador inexistente.
   `npm run repo:test`, `npm run repo:verificar` e, após stage,
   `npm run repo:verificar -- --staged`; não repetir sem mudança/risco novo.
5. UI web: análogos hub de Cenas/Biblioteca/Campanha, inspecionados no código e
   aplicação real; consumir biblioteca com API completa. `verify` em 1920×1080,
   1366×768, 960×1080 e 360×800, claro/escuro, fluxo normal e erros/conflitos/
   sem app/sem mídia; teclado/foco e 44px mobile. Agente principal compara
   pessoalmente densidade, hierarquia, controles, estados e overflow. App
   Windows: instalação, vínculo, fila/erro/cancel/offline, DPI/teclado na máquina
   real; não aplicar viewport mobile como promessa de app Windows móvel.
6. Rede/segurança: verificar tráfego ao servidor/provedor, inclusive erro/retry,
   sem WAV/path local/segredo na V1. Downloads de modelos não são upload de áudio.
   Matriz inclui papel global, pais cruzados, revogação e transferência. Strings
   de transcrição são conteúdo não confiável; nunca executar HTML/comando.
7. Fila/outbox: crash, resultado parcial, resposta perdida após commit, envio
   duplicado/conflitante e confirmação autorizada. CPU/GPU físicas e corpus
   representativo são requisitos do fecho local. Dados privados e saídas brutas
   em `.artifacts/<tarefa>/`, sem commit; fixtures sintéticas reproduzíveis são
   fontes de teste definidas na task e podem ser versionadas.
8. Fechar só com evidência: spec/anexos para done, HISTORY no topo, CONTEXT
   apenas seção afetada e demais ponteiros quando pertinentes. Sem hardware,
   corpus ou aplicação real exigidos, task permanece aberta. Nuvem não entra
   por antecipação de integração.

## Verificação desta preparação

Resultados/comandos e limites estão em [verificacao.md](verificacao.md).
A revisão verifica documentação e código por leitura; não atesta funcionamento
futuro da API, do agente, editor, exportador ou nuvem. Não foram executados testes
funcionais do produto, migrations, API com banco, instalação Windows, inferência,
verificação visual real ou deploy. Não há suporte cloud entregue.

## Autorização posterior

Em 2026-10-14 o autor autorizou começar a V1 local e aprovou o desenho
da [01](../../active/transcricoes-01-sessoes-e-contratos/design.md): domínio próprio,
arquivamento reversível, execução selecionada por faixa e milissegundos.
D-01 e a parte estrutural de D-05 estão resolvidos; demais decisões mantidas.
08–09 continuam bloqueadas; branch local/sem publicação preservados.
