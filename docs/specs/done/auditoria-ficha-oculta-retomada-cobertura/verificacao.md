# Retomada da auditoria de ficha oculta — 19/10/2026

## Resultado e alcance

Investigação executada sobre `f944af35205471bbcc76f11b1c128aae39f04a68`, com o
estado local existente. Nenhum código de produto foi alterado. FO-01/02/03
permanecem como entregas históricas; esta rodada não reabre nem recertifica suas
suítes completas. A [matriz original](../../done/auditoria-ficha-oculta-todos-consumidores/ficha-oculta-todos-consumidores.md)
permanece intacta.

H-01 foi discriminada por consumidor: há resíduos após reconexão no combate,
na página completa e no cabeçalho do histórico; a carga inicial atrasada do
histórico também expõe o nome após a perda de leitura. Detalhe e Investigação,
incluindo prévias, invalidaram o documento aberto. H-02 foi confirmada no
armazenamento local: uma nova leitura anônima do avatar continua possível pela
URL conhecida, mesmo com a ficha negada pelo REST.

As decisões D-01/D-02 e a política de H-02 foram respondidas pelo autor nesta
sessão. Os achados e mudanças decididas geraram cinco specs próprias no backlog;
nenhuma foi implementada automaticamente. Fechar esta investigação não fecha as
correções nem certifica a privacidade integral do produto.

## Método e ambiente

- Skills `task-flow`, `verify`, `tempo-real` e `convencoes-check`.
- PostgreSQL local existente, container `contratados-rpg-postgres`. API exclusiva
  em `3101`, SPA exclusiva em `4301`, CORS/proxy correspondentes e provedor de
  imagem explicitamente `local`. Sem acesso a dados ou storage de produção.
- Quatro contas novas e sintéticas: M mestre, A dono, B jogador com concessão,
  S espectador. Campanha `127`; fichas A `471` (nível 10) e B `472` (nível 2);
  encontro `43`, cena de combate `80`, Investigação inicial `81`, Investigação
  de reconexão `83`. Uma cena sintética intermediária foi criada numa tentativa
  de roteiro, sem alterar dados preexistentes. Fichas geradas pelo construtor
  real `ficha-padrao.ts`; imagem de teste PNG de 1 pixel, sem dados reais.
- Chromium real, contextos autenticados separados, UI Angular/Nest/Postgres
  reais. Chamadas REST montam o cenário; botões reais abrem as fichas. Para
  resposta atrasada, o navegador segura a resposta **já autorizada** de um GET
  real e a libera após a ocultação, sem fabricar o seu conteúdo.
- Reconexão real, em duas rodadas para consumidores distintos: parar apenas o
  processo confirmado da API exclusiva; alterar `oculta` somente na ficha 471,
  condicionando também nome/campanha/soft delete; reiniciar a mesma API. Não
  existe broadcast de ocultação nessa alteração. `window.__sentinela` persistiu
  nas páginas: não houve reload para obter os resultados.
- Evidência bruta em `.artifacts/auditoria-ficha-oculta-retomada-cobertura/`, local
  e ignorada, não distribuída no clone: `resultados.json`, `complementar.json`,
  `reconexao-recortes.json`, scripts de cenário, logs e capturas. `cenario.json`
  contém sessões sintéticas e não deve ser versionado. Este relatório basta
  para entender o método e os vereditos sem esses arquivos.
- Após a coleta, avatar sintético removido pelo endpoint próprio; fichas,
  campanha e quatro contas sintéticas excluídas por REST/soft delete. API/SPA
  exclusivas encerradas; frontend original em 4300 preservado.

## Decisões do autor

| Item | Decisão de 19/10/2026 | Destino |
|---|---|---|
| D-01 | Manter a rolagem pública e retirar a identidade da ficha oculta para terceiros, inclusive no histórico já publicado. Não converter para privada. Conta/autoria e texto livre não se confundem com identidade estruturada da ficha. | [Rolagem sem identidade](../../backlog/ficha-oculta-rolagem-publica-sem-identidade.spec.md) |
| D-02 | Calcular pelas fichas que **cada observador pode ver**. Pergunta adicional esclareceu que não é excluir globalmente toda ficha marcada oculta: dono e mestre têm seus respectivos recortes. | [Médias por observador](../../backlog/ficha-medias-esquadrao-recorte-do-observador.spec.md) |
| H-02 | Exigir permissão atual para novas leituras do avatar, inclusive quando a URL já é conhecida. Não prometer recolher cópias baixadas. | [Avatar autorizado](../../backlog/ficha-avatar-leitura-autorizada.spec.md) |

D-02 muda o conjunto de entrada de uma regra do jogo. O livro publicado diz
“membros ativos” em **Iniciando um Novo Agente**; não foi editado nesta auditoria.
A spec exige alinhar o livro pela Oficina, publicar/exportar e depois implementar
o cálculo personalizado, preservando fórmulas e arredondamentos não alterados
pelo autor. As três decisões são alvo aprovado para as tasks, não comportamento
já disponível no site.

## Matriz da cobertura restante

“Observado” significa app/REST/socket reais nesta rodada; “estático” não é prova
visual nem confirmação de produção. Ficha oculta de jogador, concessão,
criatura/NPC e texto autoral mantêm seus contratos distintos.

| Consumidor / hipótese | Cenário e resultado | Veredito / limite |
|---|---|---|
| Listagem e GET de ficha, M/A/B/S | Com A oculta, M/A recebem identidade e GET 200; B não recebe A na listagem e GET é 403; S não recebe A na projeção e GET é 403. | Observado; controle de autorização para H-01/H-02, sem reexecutar toda FO-03. |
| Prévia M→A / M→B / espectador | Projeção de A contém sua oculta; projeção de B a omite. UI do espectador não apresenta A. Mestre conserva a gestão. | Observado por REST e navegador em desktop/mobile. |
| Ficha flutuante no combate, conexão ativa | B abriu A pela grade sem combatente próprio; ocultar fechou o conteúdo; exibir restaurou concessão; revogar também fechou. Sentinela preservada. | Observado: caminho online funciona. A ausência histórica de assinatura no pai já foi corrigida; não repetir aquele diagnóstico antigo. |
| Ficha flutuante no combate, evento perdido | B abre A, API cai, SQL oculta A, API retorna. Grade passa a zero participantes, mas janela conserva nome, avatar, vitais e atributos. GET autorizado de B agora é 403. | **Confirmado P-130**; `reconnected-combat.png` e `mobile-reconnected-floating.png`. |
| Página completa, conexão ativa | Ocultar com B na ficha redireciona ao detalhe. | Observado; não confundir com o evento perdido. |
| Página completa, evento perdido | Mesma rodada de reconexão: B permanece em `/fichas/471`, exibindo o snapshot e “Ficha visível”, embora REST negue. Dono conserva sua ficha. | **Confirmado P-130**; `reconnected-complete.png`. |
| Página completa, GET inicial atrasado | Segurar resposta autorizada, ocultar, liberar resposta. Página termina em `/fichas`, sem `.ficha-ident__nome`. | Observado: não reproduziu retorno de conteúdo; não generalizar a outros callbacks. |
| Histórico em janela, conexão ativa | Ocultação põe estado negado e cabeçalho neutro “Ficha”. | Observado. |
| Histórico em janela, evento perdido | Refetch é negado e corpo mostra erro; cabeçalho ainda diz “Ficha de Agente Auditoria A”. | **Confirmado P-130**; limpeza da identidade precisa acompanhar todo caminho negado. |
| Histórico em janela, GET inicial atrasado | GET de ficha executado enquanto permitida; resposta retida até ocultar. A janela ainda não ingressou na sala, perde a revogação; após liberar, histórico recebe 403, mas o cabeçalho recebe nome antigo. | **Confirmado P-131**; `desktop-historico-inicial-atrasado.png`. |
| Detalhe de campanha / seleção de ficha B | A selecionada pela aba Esquadrão. Durante queda, A fica oculta. Ao reconectar seleção/documento voltam para B, sem A no documento renderizado. | Observado, desktop/mobile; sentinela preservada. |
| Prévia M→B no detalhe | A selecionada; ocultação durante queda. Volta à ficha de B, sem ampliar permissão por ser M o requisitante. | Observado, desktop/mobile. |
| Investigação do jogador | A aberta via “Ver ficha”; ocultação retira botão e fecha a janela, B conserva a própria. Nova rodada com evento perdido também fecha a janela após refetch. | Observado, quatro viewports para ocultação; desktop/mobile na reconexão. |
| Prévia da Investigação M→B | Ocultação fecha modal; resposta de GET da ficha retida até depois da ocultação não reabre nem repovoa. Evento perdido também fecha modal após refetch. | Observado; permanece só a ficha B no DOM. |
| Troca de cena | Encerrar a Investigação com A aberta leva B ao hub de cenas e destrói a janela, sem reload do documento. | Observado. |
| Janela de anotações | M/A abrem a ficha oculta e podem ler a janela; B/S recebem estado negado sem nome da ficha no cabeçalho. | Observado. Não é leitor concedido: a janela exige dono/mestre; a ocultação não retira o direito desses dois papéis. Troca de mestre/remover membro é outro contrato. |
| Acervo pessoal / seletores / agregados de campanhas | Listas passam pelo recorte autorizado; acervo é do autenticado. Não há armazenamento independente do documento oculto nesses produtores. | Conferência estática como mapa de dependências. As correções FO-03 não foram reabertas; nenhum novo defeito de H-01 foi afirmado nesses produtores. |
| Avatar conhecido, leitura nova anônima | Upload real; GET antes 200; ocultar; GET sem JWT e com query inédita/cache `no-store` ainda 200, bytes idênticos. Paralelamente GET da ficha por B é 403. | **H-02 confirmada no provedor local / P-132**; não é apenas cache já recebido. |
| Cache de avatar | Resposta estática local com `Cache-Control: public, max-age=0` e ETag; ocultar não remove/troca o objeto. | Observado nos headers + estático. Não foi feita medição de CDN/R2 ou cache offline. A correção deve cobrir revalidação e origem antiga. |
| Avatar de produção / R2 | `ArmazenamentoR2Provedor.salvarImagem` devolve URL pública durável; ocultação só altera a ficha e não revoga objeto. | Estático. ACL efetiva, domínio e TTL da CDN de produção não foram consultados: não declarar um teste de produção. A hipótese de acesso local está confirmada e a política foi decidida. |
| Rolagens REST / WS / histórico D-01 | Rolagem 261 criada visível; ocultar; rolagem 262 criada oculta. B e S recebem ambas com `fichaId=471`, `nomeFicha` e `corFicha`, via socket e REST. | Observado; comportamento atual diverge da decisão nova. Não foi alterado. Prévias/feeds apresentam o mesmo contrato; callbacks e invalidadores entram na spec própria. |
| Quantidade/médias D-02 | B recebe uma ficha visível de nível 2, mas agregado devolve quantidade 2 e média 6, incluindo A nível 10 oculta. | Observado; decisão de cálculo por observador ainda não implementada. |
| Criatura/NPC, inventários, cadernos, documentos, presença, log/ordem/turno do encontro | Contratos e consumidores continuam os apontados na matriz histórica. Suspensão por ocultação é só para JOGADOR em campanha; não se transporta essa regra para revelação de criatura/NPC nem texto autoral. | Limite deliberado desta retomada: sem nova rodada FO-01/02/03, sem certificar esses fluxos ou fórmulas. O filho da flutuante também carrega criatura, mas o defeito dinâmico de reconexão aqui foi reproduzido com JOGADOR; a spec pede regressão dos dois tipos. |

## Causas e encaminhamentos

### P-130 — Revalidação de leitores após reconexão

`ficha-flutuante-conteudo.component.ts` faz GET inicial e ingressa na sala; o pai
`ficha-flutuante.component.ts` fecha com `acessoRevogado$`. Nenhum faz refetch
próprio no `reconexao$`. No combate, a remoção do combatente da grade não fecha
a janela. Já `painel-sem-iniciativa-jogador.page.ts` acompanha o recorte e chama
`fecharSeAlvo`; isso explica por que Investigação se comportou diferentemente.

`visualizar.page.ts` refaz o GET no `reconexao$` com apenas callback `next`; a
negação não apaga o snapshot nem chama `expulsar`. O histórico trata erro com
`acessoNegado`, porém não neutraliza `contexto` naquele caminho. Não é falha do
árbitro REST nem justificativa para reenviar o documento a quem perdeu leitura.

Destino: [leitores após reconexão](../../backlog/fix-ficha-oculta-leitores-apos-reconexao.spec.md).

### P-131 — Cabeçalho do histórico após carga inicial atrasada

Em `historico-rolagens-janela.page.ts`, o callback inicial define `contexto` e só
então conecta/ingressa na sala. A ocultação anterior à entrega do GET não pode
ser recebida como revogação. A chamada posterior de `listarPorFicha` nega a
leitura; o erro não neutraliza o cabeçalho. O guard existente nas páginas de
histórico em voo protege `itens`, mas não cobre essa carga inicial de identidade.

Destino: [histórico e resposta atrasada](../../done/fix-ficha-oculta-historico-resposta-atrasada.spec.md).

### P-132 — Objeto de avatar acessível fora da autorização da ficha

`backend/src/main.ts` expõe `/uploads` como assets estáticos. O provedor local
grava o objeto e devolve esse caminho; o provedor R2 retorna URL pública. A
permissão de upload/exclusão não autoriza o GET estático. Ocultar a ficha não
apaga o avatar do dono e não deve ser confundido com excluí-lo.

Destino e política escolhida: [avatar com leitura autorizada](../../backlog/ficha-avatar-leitura-autorizada.spec.md).

## Observação visual e limites

Sem criação de UI/estilo: as referências foram as próprias telas canônicas
`FichaVisualizar`, `CampanhaDetalheJogador`, `PainelSemIniciativaJogador`,
`PreviaInvestigacaoJogador` e `HistoricoRolagensJanela`, comparadas entre o
estado autorizado e o estado posterior à perda de leitura. Não se criou um
novo análogo nem um layout para corrigir nesta auditoria.

M/A/B/S e prévias observados a **1920×1080 e 360×800**; Investigação e prévia
também a **960×1080 e 1366×768**. Inspeção pessoal das capturas renderizadas
confirmou a ficha preservada indevidamente no combate e na página completa,
o nome residual do histórico, e a limpeza no detalhe/Investigação/prévias.
Nenhum overflow de documento foi medido nas capturas da rodada principal e
complementar. Isso não certifica a legibilidade de todo controle: a janela
flutuante estreita no desktop comprime a ficha em colunas, preexistente e fora
do contrato de ocultação; não houve auditoria completa de foco/contraste nem
revisão estética do produto. Sem alteração visual a entregar, não houve
correção de layout ou comparação de um novo componente.

Os testes de corrida e de reconexão não representam todas as ordenações
possíveis de rede. Os casos concretos confirmados viram regressões nas specs;
nada aqui promete recolher uma resposta que o usuário já recebeu nem limpar
armazenamento externo sob controle dele. R2/CDN/produção, browsers adicionais,
remoção de membro e transferência de mestre não foram testados nesta rodada.

## Gates

1. Backend: `npm run test --workspace=backend -- src/modules/ficha/ficha.service.spec.ts src/modules/ficha/ficha.repository.spec.ts src/modules/campanha-projecao/campanha-projecao.service.spec.ts src/core/armazenamento/armazenamento-local.provedor.spec.ts src/core/armazenamento/armazenamento-r2.provedor.spec.ts`
   — **5 arquivos, 256 testes aprovados**.
2. Frontend: `npm exec --workspace=frontend -- ng test --watch=false --include=src/app/modules/ficha/componentes/ficha-flutuante/*.spec.ts --include=src/app/modules/ficha/paginas/historico-rolagens-janela/*.spec.ts --include=src/app/modules/cena/paginas/previa-investigacao-jogador/*.spec.ts --include=src/app/modules/campanha/paginas/detalhe-jogador/*.spec.ts`
   — **5 arquivos, 74 testes aprovados**. Testes existentes não detectaram os
   defeitos de rede confirmados; não tomados como prova de ausência de vazamento.
3. Primeiras tentativas de ambas as suítes falharam com EPERM no rename do cache
   temporário do sandbox, sem executar testes. Execução autorizada fora dessa
   restrição passou. Falha ambiental, não falha de produto.
4. API compilada por `nest start`; SPA e testes Angular compilados com êxito.
   Sem build de produção/lint global: diff exclusivamente documental; nenhuma
   mudança de produto a validar por esses comandos.
5. Revisão `convencoes-check`: escopo documental, critérios/decisões e destinos
   conferidos; histórico original e arquivos concorrentes preservados. Saídas
   brutas/sessões fora do Git.
6. `npm run repo:test` — **14 testes aprovados**. Primeira tentativa no sandbox
   impediu `git init` da fixture temporária por Permission denied; repetição
   autorizada passou. `npm run repo:verificar` aprovou organização e espelhos;
   `git diff --check` sem erros. Sem commit/staging nesta tarefa, portanto
   `repo:verificar -- --staged` não se aplica.

## Fecho

Cobertura H-01 por consumidor e H-02 local tratadas com evidências e limites;
decisões do autor registradas e cinco specs de implementação abertas. A retomada
encerra a investigação solicitada, não as pendências de produto P-130/131/132,
D-01/D-02. A rodada de 29/09 continua sendo um registro histórico parcial; este
relatório é o complemento, sem reescrever a matriz antiga.
