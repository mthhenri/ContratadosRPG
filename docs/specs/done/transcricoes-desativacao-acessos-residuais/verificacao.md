# Acessos residuais da transcrição — 22/10/2026

## Resultado

O link **Dispositivos de transcrição** ainda existia no Perfil e foi retirado, junto
da classe exclusiva e do import standalone `RouterLink` sem outro consumidor na tela.
O restante da integração continua desativado no código atual e na aplicação local.

## Mapa e revisão

| Recorte | Resultado |
|---|---|
| Perfil HTML/SCSS/TS | Único acesso produtivo residual encontrado; removido, sem mudança nos formulários de conta |
| Rotas e navegação Angular, fora do módulo histórico | Nenhum acesso/import à integração após a correção |
| `AppModule` e demais módulos NestJS | Nenhum registro/import de `TranscricaoModule` |
| Proxy frontend | Sem regra de transcrição |
| OpenAPI real em `/api/docs-json` | HTTP 200; nenhum caminho nem categoria da feature |
| Configuração e scripts de execução | Sem ativação do módulo abandonado |
| Código, contratos, migrations e dados históricos | Preservados conforme decisão original de abandono |

A busca complementar percorreu `frontend/src`, `backend/src`, configurações e scripts.
Os acertos restantes foram classificados: módulo histórico desconectado; contratos e
validadores; migrations; geração histórica de schemas; documentação e testes; uma frase
ficcional de Acesso negado que usa a palavra “transcrições”, sem link nem função.
O OpenAPI conserva 49 schemas históricos sem endpoints; schemas não registram serviços.
O ramo histórico de documentação de operações não instancia controllers.

Diff do recorte lido integralmente. Nenhum primitivo, ícone ou token compartilhado
foi alterado nesta correção. Não há nova responsabilidade ou regra de negócio.

## Aplicação real

Postgres local existente, API NestJS em 3100 e Angular em 4300; Chromium/Playwright,
sessão `codex.dev` autorizada pelo autor. Sem mocks ou modificação de perfil/senha.

- **72 respostas 404:** repetidas as 36 operações históricas, com seus métodos originais,
  uma vez sem sessão e outra com JWT válido. Inclui sessões, faixas, glossário,
  identidades, vínculo, dispositivos, intenções e aplicativo.
- As quatro URLs antigas (vínculo, dispositivos, sessões da campanha e glossário)
  foram abertas em 1920×1080 e 360×800: zero componentes da feature montados.
  As rotas não registradas seguem o comportamento existente do router.
- Perfil carregado nos quatro tamanhos **1920×1080, 1366×768, 960×1080 e 360×800**,
  em **claro e escuro**: zero links para a feature e zero overflow horizontal.
  O principal inspecionou pessoalmente as oito capturas completas.

Análogo escolhido antes da edição: o próprio Perfil e os cartões Senha/Excluir conta.
Comparação: mesma família visual, shell, densidade, hierarquia e espaçamentos; campos
e botões canônicos preservados, sem aparência de HTML genérico. Não houve corte ou
overflow causado pela retirada. Contraste, alvos móveis e controles de foco existentes
permanecem; apenas o link abandonado saiu da ordem de tabulação. Nenhuma divergência
visual adicional exigiu ajuste. Skills `design-fidelity` e `verify` aplicadas.

## Gates

| Checagem | Resultado |
|---|---|
| Testes existentes de Perfil | **8/8 aprovados**; mais 89 testes do normalizador aprovados pelo comando do workspace |
| Build frontend de produção | Aprovado; aviso preexistente de orçamento: 603,33 kB para 450 kB |
| Lint frontend | Zero erros; 28.603 avisos de convenções no workspace, sem correção ampla |
| Formatação HTML/SCSS e revisão do diff | Aprovadas; retirada limitada ao link, classe e import |
| `git diff --check` | Aprovado |
| `npm run repo:verificar` | Organização e espelhos aprovados |

Evidências brutas locais e ignoradas em `.artifacts/transcricoes-desativacao-acessos-residuais/`:
capturas, medições do Perfil, respostas da API, rotas antigas, resumo OpenAPI e logs.
O relatório é suficiente para entender o resultado sem esses arquivos no clone.

## Limites

Verificação do workspace e stack local; nenhum deploy nem inspeção de produção.
Não se afirma exclusão do código histórico ou dos dados: sua preservação é requisito
da desativação original. A task de ícones tem relatório e limites próprios.
