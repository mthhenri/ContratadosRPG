# Verificação — vínculo do Caderno à Biblioteca

Data: 2026-10-19. Spec e ampliação opcional dos primitivos aprovadas pelo autor nesta sessão.

## Resultado

Implementação funcional, testes, lint, build de produção e gate visual verificados.
O build passou com o contorno já documentado da P-111, desabilitando cache só na execução.
Não houve alteração de schema, permissões ou fórmulas do jogo.

## Implementação e fronteiras

- `CadernoVinculoBiblioteca` concentra escolha e leitura, usando `BuscaDocumentos`,
  `ListaDocumentos`, `LeitorDocumento`, `Modal` e `BibliotecaLeituraStore` existentes.
  Só monta ao escolher/abrir um vínculo; abrir o Caderno não carrega documentos.
- Markdown comum: `[texto selecionado](#biblioteca-documento-123)`. Não copia título,
  conteúdo ou URL de imagem do documento. O texto é de autoria da página.
- A API existente continua autoritativa. O seletor usa o recorte da campanha e revalida
  `recuperar` antes de aplicar; também confere a campanha. O leitor só abre IDs presentes
  na Biblioteca atual. Ocultação/exclusão retiram título e conteúdo em tempo real.
- Editor aplica uma marca ProseMirror, preservando formatação, histórico e texto. A seleção
  acompanha transações locais e posições relativas Yjs; remoção/substituição a invalida.
  Trocar página, escopo, campanha ou recolher o Caderno cancela a seleção.
- Ampliações de editor/menu são opcionais. A propagação imediata de Markdown está ligada
  somente no Caderno colaborativo; os demais consumidores mantêm o listener anterior.
- O leitor auxiliar não publica presença: `informarPresenca: false` evita apagar a leitura
  da Biblioteca que já esteja aberta no mesmo socket. O padrão dos consumidores existentes é `true`.

## Impacto e revisão

Buscas: `npm run impacto -- frontend/src/app/shared/ui/editor-markdown/editor-markdown.component.ts`,
o mesmo comando para `menu-acoes.component.ts` e `biblioteca-leitura.store.ts`.

| Item | Consumidores | Decisão |
|---|---|---|
| Editor | Caderno | Pedido: liga vínculo e interceptação; emissão imediata só no colaborativo |
| Editor | Edição/leitura de documento, anotações de ficha, ataques/habilidades de criatura, habilidades e visualização de ficha, descrição de habilidade, conduta e visualização de NPC | Dez consumidores preservados: recursos novos desligados por padrão; suíte frontend aprovada |
| Menu | Publicação da Oficina | Preservado: `contextual=false`; testes do fluxo anterior aprovados |
| Menu | Caderno/editor | Pedido: abertura pelo ponteiro em top layer, sem clipping do painel |
| Store da Biblioteca | Painel, página do jogador e página do espectador | Preservados: presença ligada por padrão |
| Store da Biblioteca | Leitor/seletor do Caderno | Pedido: recorte e invalidação existentes, sem competir pela presença |

Revisão independente por subagente Codex, modelo herdado: encontrou a disputa de presença;
correção reproduzida por teste de abrir/reconectar/fechar/destruir o leitor auxiliar.
Após o achado novo de sincronização, revisão apenas desse delta não encontrou falha concreta.
Revisão manual do diff: sem novo DTO, SQL, regra de domínio ou ícone; controles novos usam
primitivos e seus inputs; nenhuma alteração preexistente do autor foi revertida.

## Testes e checagens

| Comando | Resultado |
|---|---|
| `npm run test --workspaces --if-present` | Shared: 76 arquivos / 1.335 testes; backend: 72 arquivos / 1.220 testes, com 8 arquivos / 99 testes pulados; frontend: 283 arquivos / 3.540 testes na primeira rodada; 89 testes dos scripts de regras também passaram |
| `npx ng test --watch=false` (frontend, após correções funcionais) | 283 arquivos / **3.548 testes aprovados** |
| Testes focados editor Milkdown real, componente e menu | **82 aprovados**, incluindo atualização Yjs e publicação síncrona do snapshot |
| Testes focados store de leitura e seletor | **38 aprovados**, incluindo ausência de emissão de presença, campanha alheia, acesso revogado e IDs inválidos |
| `npm run lint --workspace=shared`, `backend`, `frontend` | Sem erros. Avisos existentes e de estilo (principalmente aspas) mantidos; 6.057 / 4.828 / 28.766 avisos na rodada ampla |
| ESLint `--quiet` dos arquivos alterados | Sem erros |
| `npx tsc --noEmit -p tsconfig.app.json` (frontend) | Aprovado |
| `CI=true NG_BUILD_MAX_WORKERS=2 npm run build --workspace=frontend` (variáveis definidas pelo PowerShell) | **Aprovado**, 20,387s; bundle inicial 599,02 kB, acima do aviso de 450 kB e abaixo do teto de 1 MB |
| Prettier somente HTML/SCSS tocados | Aplicado |
| `npm run repo:verificar` | Organização e espelhos aprovados |

As primeiras execuções do Vitest dentro do sandbox falharam por `EPERM` ao renomear seu
cache temporário. A execução autorizada fora do sandbox passou; não era falha do produto.
`jsdom` avisa que navegação entre documentos não é implementada em testes existentes;
isso não causou testes reprovados.

## Aplicação real e gate visual

Skill `verify`: Postgres local existente; API isolada em `3101`, frontend em `4301`, origem
CORS e proxy casados. Três usuários, uma campanha e documentos/páginas descartáveis próprios.
Sem dados de produção. Navegador Chromium real com barra de rolagem habilitada.

Análogos inspecionados no código e no app: Caderno flutuante/janela externa e Biblioteca
flutuante, incluindo seus cartões, busca e leitor. A ação contextual usa o `MenuAcoes`
canônico; o seletor usa o `Modal` canônico (folha inferior no mobile).

| Viewport | Estados e resultados |
|---|---|
| 1920×1080 | Botão direito, menu, seletor, busca com resultado/vazia/erro e retry, leitor, ocultação e exclusão com leitor aberto; janela externa e painel flutuante com Biblioteca simultânea |
| 360×800 | Seleção no editor, **tap real no botão equivalente**, busca com resultado/vazia, escolha, leitura e persistência após recarregar; botão de vínculo medido com 51px de altura; sem overflow |
| 960×1080 | Seletor, busca, leitura e recarga com vínculo persistido; sem overflow |
| 1366×768 | Seletor, busca, leitura e recarga; ações visíveis com altura menor; sem overflow |

Comparação pessoal do agente principal: mesma família visual, densidade e hierarquia dos
análogos; campo/cartões/leitor e estados canônicos, sem formulário HTML genérico. Modal contém
o foco e fecha por Escape; botão também acionado por teclado. Links receberam texto `--text`,
sublinhado com `--accent` e foco visível somente nos editores que ligam o recurso. Confirmados
`rgb(230, 232, 235)` e `text-decoration: underline` nos dois viewports obrigatórios.

Colaboração: duas sessões de jogadores na mesma página do Esquadrão. Inserção remota antes
do trecho enquanto o seletor estava aberto manteve o alvo exato. O vínculo apareceu nos dois
editores; snapshot GET e recarga mantiveram o Markdown. Remover o trecho na outra sessão
durante a escolha recusou a operação e mostrou instrução para selecionar novamente.

Permissões reais: documento oculto retorna **404**, sem título/conteúdo; outro jogador
recebe **403** ao tentar ler página privada. O documento oculto não aparece no seletor.
Ocultação e exclusão do alvo aberto removeram os metadados do modal, preservando o texto
da página. Documento de outra campanha também é coberto pelo teste unitário do seletor.

## Achados corrigidos durante o trabalho

1. A store auxiliar competia pela presença da Biblioteca no mesmo socket. Desativada a
   publicação de presença apenas no consumidor auxiliar; todos os usos antigos mantidos.
2. O envio colaborativo ocorria em 180ms, antes do listener Markdown (~200ms). O estado Yjs
   já continha o link, mas sua projeção persistida ainda podia ser anterior. O opt-in de
   emissão síncrona no Caderno colaborativo elimina essa corrida sem ampliar o debounce.
3. O link herdava somente a cor de tema, insuficiente para distinguir o novo controle em
   todos os presets. Texto principal e sublinhado no recurso opcional corrigem a leitura.

## Limites e pendências

- **Falha ambiental contornada (P-111).** O servidor Angular compilou e executou a aplicação, e o
  TypeScript passou. O primeiro build de produção falhou na consulta a fontes Google
  (`ENOTFOUND` no sandbox); novas execuções fora do sandbox, inclusive desenvolvimento,
  encerraram com código nativo `3221225477` / `0xC0000005`, sem diagnóstico TypeScript/Angular.
  Também testados menos workers, runtime do Codex e saída isolada, sem sucesso. O contorno já
  documentado na P-111 (`CI=true`) aprovou o build de produção. Nenhuma configuração de cache
  foi alterada e nenhum cache foi removido. A causa interna da P-111 continua fora desta task.
- Toque emulado com `hasTouch`/`isMobile` e `tap`; seleção textual preparada no DOM do editor.
  Não houve teste em aparelho físico nem de teclado virtual de sistema operacional.
- Evidências brutas e capturas são **locais**, ignoradas pelo Git, em
  `.artifacts/caderno-vincular-trecho-biblioteca/`. Este relatório registra métodos/resultados
  sem depender da presença dessas imagens no clone.
- Commit local autorizado pelo autor após a entrega; sem push, deploy ou alteração de dados de produção.
- Cenário descartável removido por soft delete (campanha, documentos, páginas e contas próprias).
  API e frontend isolados desta verificação encerrados; processos preexistentes preservados.
