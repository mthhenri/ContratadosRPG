# P-097-01 — Sistema v4.1.3: implementação e verificação

Data: 2026-10-06. Spec `p-097-01-critico-e-sistema-v4.1.3.spec.md` concluída.

## Escopo e fontes

[Revisão do documento](p-097-sistema-v4.1.3.md): somente três parágrafos mudaram
conteúdo; demais diferenças são formatação da exportação. Nova fonte publicada
consumida sem reescrever `docs/core/`. Skills `task-flow`, `regras-do-jogo`,
`verify`, `design-fidelity` e `convencoes-check` exercitadas. A skill de regras e
as instruções AGENTS/CLAUDE apontam à versão nova, com cópias idênticas verificadas.

## Implementação e revisão

- Motor puro reconhece a notação de teste já existente, usa margem natural 1,
  respeita margem explícita e soma `CRÍTICO 2` uma vez no detalhamento. Descartados
  não contam. O comando de crítico em teste não dobra dados/fixos/atributos.
- Pools de resultado preservam duplicação e exceção PROF/NIV; `cm` não dispara
  bônus de teste em dano tipado, em vários pools ou em keep de vários dados.
  Nenhum DTO, endpoint, coluna ou responsabilidade de permissão foi criado.
- Média do montador agora pesa os possíveis valores de um único mantido e consulta
  o próprio motor para o total. Não replica +2/margem/identificação de teste no
  frontend. `2d20kh1` tem média 14,02 e máximo 22; com cm2 a média é 14,205;
  em dano tipado a média continua 13,825. Desvantagem de três dados: 5,51275.
- Corpus existente: 50 casos de 15 fórmulas de teste atualizados após comparação
  individual das diferenças; interpretações e resultados fora desse recorte
  preservados. Testes novos independentes documentam a regra, sem usar snapshot
  como única evidência. A montagem de fórmula e os dados históricos não são migrados.
- Leitor, preparação, verificação de publicação, assets e ignore passam a usar
  `sistema-v4.1.3.pdf`. Cópia servida e cópia do build idênticas ao PDF canônico.
- Diff lido contra a spec; nenhum controller/SQL/enum novo, fórmula local de
  compensação, herança de DTO, alteração de estilo/template ou controle novo.
  O componente extenso do motor recebe uma função pura específica de classificação;
  não acumula nova responsabilidade de I/O ou apresentação. No montador, o cálculo
  de distribuição permanece na responsabilidade estatística já existente.

## Gates automatizados

| Gate | Resultado |
|---|---|
| Teste novo antes da correção | 6 falhas de comportamento esperadas; 10 casos de isolamento passaram |
| Focado motor/corpus após correção | 93/93 |
| Focado montador após correção | 20/20 |
| `npm run test --workspace=shared` | 65 arquivos, 1.089 testes passaram |
| `npm run test --workspace=backend` | 52 arquivos, 959 passaram, 1 ignorado |
| `npm run test --workspace=frontend` | 213 arquivos, 2.956 passaram |
| `npm run typecheck --workspace=shared` | passou |
| Builds shared/backend/frontend | passaram; assets PDF e worker conferidos |
| `npm run lint` | três workspaces sem erros; avisos de aspas/comprimento de linha |
| Lint final shared/frontend com `--quiet` | ambos exit 0 |
| `git diff --check` no recorte | passou |

Total: 5.004 testes passaram, 1 ignorado. Suite frontend emite avisos conhecidos
de canvas no ambiente simulado; renderização real de PDF foi observada no navegador.
Build frontend mantém o aviso de budget inicial (556,51 kB para aviso em 450 kB),
dívida já registrada como P-004. Não elevar budget nesta task.

## Verificação na aplicação real

API e SPA locais existentes em 3100/4300 reutilizadas. Ficha de verificação avulsa
186, usuário próprio de verificação, sem alterar dados do autor. Aleatoriedade
controlada somente nesse navegador para reproduzir os exemplos; registros reais
POST/201 conferidos com total igual ao apresentado. Ficha removida por soft delete
após as capturas. Credenciais e scripts temporários não integram os artefatos.

Análogos: componentes atuais `ResultadoRolagem`, `GuiaFormula` e `LeitorDocumentos`.
Mesmos shells, densidade, tipografia, espaçamento, ícones, controles e responsividade;
nenhum primitivo novo ou receita local. O bônus reutiliza a legenda de contribuições.

| Viewport | Estados observados |
|---|---|
| 1920×1080 | crítico 31, normal 22, cm2 30, ajuda, PDF nativo renderizado |
| 360×800 | mesmos resultados; ajuda completa rolável; PDF renderizado em canvas |
| 960×1080 | resultados, ajuda, leitor nativo renderizado, navegação adaptada |
| 1366×768 | resultados, ajuda, leitor nativo renderizado, menor altura disponível |

Inspeção pessoal das capturas: bônus legível e separado de PROF; um 20 mantido,
outro descartado; nenhum badge “crítico ×2” em teste. Estado normal sem contribuição
de crítico. Margem ampliada destaca 19 e soma +2. Sem overflow horizontal; controles
mantêm foco/contraste e alvos móveis do produto. Ajuda em três colunas no desktop e
uma coluna rolável no celular, com as duas explicações inteiras. PDF carregado com
77 páginas. Visor nativo exige Chromium com renderização completa: no headless o
iframe fica vazio; verificação refeita com navegador fora da área visível, sem
alterar código para contornar o ambiente de teste.

Capturas e [medidas](p-097/verificacao.json) em `docs/reviews/p-097/`:
[crítico desktop](p-097/critico-1920.png), [crítico mobile](p-097/critico-360.png),
[margem ampliada](p-097/margem-ampliada-360.png), [ajuda](p-097/guia-360.png),
[PDF desktop](p-097/leitor-1920.png) e [PDF mobile](p-097/leitor-360.png).

## Pendências preservadas

m4-19 aguarda a revisão do Guia de Mestre v4.2.0, que apareceu no workspace ao
final desta rodada; nenhum dadinho, ajuste, DTO ou fórmula de NPC implementado.
Ponteiros atuais e pipeline/leitor também alinhados a esse novo PDF, sem alterar
suas regras. Build final refeita e teste do leitor 11/11; ambos PDFs publicados e
comparados byte a byte com `docs/core/`. P-095/P-096 permanecem abertos: passaram nesta rodada, mas suas
fixtures continuam usando relógio real e aguardam as specs próprias. Cabeçalho
interno do Sistema ainda diz 4.1.1; nome publicado é 4.1.3, consumido integralmente.

Conferência documental encontrou um ponteiro preexistente em MEMORY para a spec de
auditoria de ficha oculta já movida a `done/`. Registrado P-098, fora do escopo;
links novos desta implementação validados separadamente.
