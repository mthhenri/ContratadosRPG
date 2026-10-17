# Desativação da transcrição integrada — 2026-10-17

## Decisão e alcance

O autor abandonou a integração porque o fluxo Python pessoal, executado no próprio
computador, já resolve a necessidade. A desativação remove registros de execução,
sem apagar dados ou investir em uma implementação substituta.

O `TranscricaoModule` não integra mais o `AppModule`. Seus oito controllers e
providers deixam de ser instanciados pela aplicação. Código, contratos compartilhados,
schemas gerados, testes históricos, migrations 0037–0039 e aplicativo Windows ficam
preservados como implementação inativa. Nenhum arquivo Python foi alterado.

As quatro rotas Angular, o atalho Transcrições da campanha, o proxy de desenvolvimento
e a categoria Transcrições do Swagger foram retirados. O gerador histórico de contratos
permanece intacto; seus schemas não registram endpoints na aplicação NestJS.

Guarda-chuva e tasks 02/04–09 foram arquivados em `done/` com aviso ABANDONADA,
expressamente sem alegar entrega. Anexos acompanham as specs; ponteiros foram corrigidos.
01/03 preservam requisitos e decisões, com mudanças somente nos destinos dos links.

## Mapa de impacto

Busca inicial: `npm run impacto -- backend/src/modules/transcricao/transcricao.module.ts`
e `npm run impacto -- frontend/src/app/modules/transcricao/transcricao.page.ts`.
Ambos têm um consumidor produtivo direto. Busca complementar cobriu rotas,
controllers, OpenAPI, proxy, menus, contexto e specs; não há módulo de transcrição
importado por outro módulo de produção.

| Consumidor | Classe | Resultado |
|---|---|---|
| `backend/src/app.module.ts` | pedido | Módulo removido, cobrindo sessões, faixas, glossário, identidades, vínculo, dispositivos, intenções e aplicativo |
| `frontend/src/app/app.routes.ts` | pedido | Quatro rotas removidas, sem redirecionamento de compatibilidade |
| `detalhe-mestre.page.html` | pedido | Atalho removido da coluna, inclusive sua forma mobile |
| `frontend/proxy.conf.json` | acompanha, dentro da desativação integral | Regra exclusiva da transcrição removida |
| `openapi.document.ts` | acompanha, dentro da desativação integral | Categoria retirada; zero endpoints de transcrição no documento real |
| `desktop/transcriber/` | acompanha, dentro da desativação integral | Python preservado; README avisa que o vínculo web não está disponível |
| Contratos, migrations e tabelas | preservado | Sem rollback, exclusão ou alteração de contratos/dados |
| Specs e contexto | pedido | Abandono explícito e retirada da fila de tarefas |

## Verificação automatizada

| Comando | Resultado |
|---|---|
| `npm run build --workspace=backend` | Passou |
| `npm run build --workspace=frontend` | Passou; aviso de orçamento inicial existente: 596,95 kB para orçamento de aviso de 450 kB |
| `npm run test --workspace=shared` | 76 arquivos, 1.335 testes passaram |
| `npm run test --workspace=backend` | 72 arquivos passaram, oito ignorados; 1.220 testes passaram, 99 ignorados |
| `npm run test --workspace=frontend -- --watch=false` | 279 arquivos, 3.493 testes passaram; mais 89 testes do normalizador passaram |
| `npm run lint` | Passou nos três workspaces, incluindo tipos do backend; zero erros, avisos de convenções já existentes |
| `git diff --check` | Passou |
| `npm run repo:verificar` | Passou: organização e espelhos |

As primeiras tentativas de build frontend/testes no sandbox falharam antes da execução
por acesso negado do esbuild a diretórios ancestrais. Reexecução com acesso concedido
passou; não foi alteração de produto. Não há falha funcional nova conhecida.

## Aplicação real e gate visual

Skills `verify` e `design-fidelity`. PostgreSQL local saudável, migrations existentes
aplicadas no banco local. Backend compilado na porta 3101 e frontend de desenvolvimento
na 4301, com origem CORS e proxy casados, sem interferir no stack do autor em 3100.
Cenário criado por REST com conta e campanha temporárias; as duas campanhas e contas
das rodadas foram removidas por soft delete pelos endpoints do próprio produto.

- `/health`: 200; documento OpenAPI real sem caminhos `/transcricao/*` e sem a categoria.
- As 36 operações históricas foram chamadas com seus métodos originais e identificadores
  substituídos por `1`: 36 sem token + 36 com JWT válido = **72 respostas 404**.
  Inclui inicialização pública de vínculo e todas as rotas de dispositivo/aplicativo.
- As quatro URLs web antigas foram abertas em ambos os viewports: nenhum componente
  de transcrição/glossário é carregado. Sem rota de compatibilidade; URLs não reconhecidas
  seguem o comportamento existente do router.
- Campanha observada em **1920×1080** e **360×800**: estado vazio, coluna retraída,
  coluna expandida no desktop e modal Membros aberto em ambos. Sem link de transcrição
  e sem overflow horizontal. Nome comprido conserva a elipse canônica no celular.

Análogo escolhido antes da edição: o próprio Detalhe do Mestre e sua coluna de ações
aprovada, inspecionados no código. Comparação pessoal das capturas renderizadas:
mesmo shell, densidade, hierarquia, espaçamentos, controles, ícones e estados;
aparência coerente com o produto, sem HTML/CSS novo. Biblioteca, Cenas, Membros e
Convites permanecem nos controles canônicos. A barra mobile mantém seus alvos de
toque; contraste e comportamento de foco dos controles remanescentes não sofreram
alteração. O modal Membros abre com o mesmo primitivo, sem corte nos dois tamanhos.
Nenhuma divergência introduzida exigiu correção visual.

Capturas e resultados brutos são **evidências locais**, ignoradas pelo Git, em
`.artifacts/transcricoes-desativacao/`: campanha desktop/mobile, coluna expandida,
modal Membros, respostas HTTP, logs de build/testes/lint. O presente relatório
registra os resultados sem exigir esses arquivos no clone.

## Revisão e limites

Passe `convencoes-check`: leitura manual do diff de código e documentação contra a
spec; alterações produtivas são somente remoções de registros e de um controle.
Não há SQL, DTO, regra de jogo, primitivo visual ou evento alterado. Nenhum hardcode
ou responsabilidade nova foi introduzido; os espelhos de agentes/skills permanecem iguais.
Conferência dos links Markdown locais em 32 documentos do conjunto arquivado:
zero destinos ausentes. Lint/tipos do backend reconferidos após retirar a categoria
Swagger: zero erros. O arquivo preexistente `.claude/launch.json` foi preservado.

Os 99 testes condicionais do backend não foram habilitados; parte deles documenta
justamente a API antiga, agora desativada. A evidência atual de retirada é a aplicação
real com as 72 chamadas 404, não esses testes históricos. Não se executou inferência,
empacotamento Windows ou testes do Python, pois não foram alterados.

Sem publicação/deploy nesta tarefa. Os endpoints deixam de existir em produção quando
estas alterações forem implantadas. Nenhuma pendência de implementação ou gate desta
desativação; o desenvolvimento da feature integrada permanece abandonado.
