# Verificação — Crítico

**Concluída.** Análogo/impacto em [implementação](implementacao.md).

Zero, um e três críticos observados separadamente no preview experimental, bandeja e histórico real em todos os oito pares viewport/tema. Fórmulas reais `3d6`, `1d6cm6`, `3d6cm6`; cm representa tamanho da margem, portanto cm6 em d6 torna a contagem determinística. Histórico com três registros temporários de contagens conhecidas.

Zero não renderiza indicador; um/vários mostram dado com estrelinhas, quantidade e nome acessível “1 crítico”/“3 críticos”. Badge textual, total, faces e d20 preservados. Comparado com a própria linha de dados: contorno, cor herdada, espaçamento e hierarquia coerentes, sem overflow, inclusive na bandeja móvel.

Evidências: `.artifacts/icones-critico-adocao/visual.log` e `preview-*`, `bandeja-*`, `historico-*` para zero/um/três. Montador permanece restrito a TESTER; somente a conta descartável recebeu o papel no banco local.

## Gates integrados — 18/10/2026

Frontend: 282 arquivos / 3.526 testes aprovados. Recorte Maestria/Crítico: 89; recursos: 229 e, após os atributos de foco, 187 em dois arquivos. Mudanças posteriores de estilo foram conferidas no navegador e no build final. Shared: 76 arquivos / 1.335 testes aprovados. Backend: 72 arquivos / 1.220 testes; 8 arquivos / 99 testes ignorados pela configuração existente.

Lint dos três workspaces sem erros: frontend 28.607 avisos; shared 6.057; backend 4.828. Sem limpeza global fora do escopo. Build frontend final aprovado após a correção visual; alerta de bundle 599,02 kB para orçamento 450 kB (P-004 existente). Prettier nos HTML/SCSS tocados e leitura manual do diff: sem regras novas, hardcodes de tema ou API de primitivos ampliada. Receitas existentes ou inputs completos de shared/ui preservados. `git diff --check` e `npm run repo:verificar` aprovados.

Logs integrados em `.artifacts/icones-maestria-adocao/`: `testes-integracao.log`, `testes-focados.log`, `testes-shared.log`, `testes-backend.log`, `lint*.log`, `build-final.log`, `repo.log`. Recursos/foco: `.artifacts/icones-tooltips-recursos-t3/testes-{depois,acessibilidade}.log`.

## Ambiente e limites

Aplicação real: API local 3101, SPA 4301, Postgres local, cenário descartável próprio, removido por soft delete após a inspeção. Chromium com barras de rolagem; 1920×1080, 1366×768, 960×1080 e 360×800, escuro e claro. Agente principal inspecionou pessoalmente as capturas renderizadas e comparou com os análogos, além das verificações automatizadas de estado. Toque emulado; sem aparelho físico ou leitor de tela físico. Commit autorizado pelo autor em 19/10/2026; sem publicação. Trabalhos anteriores de identidade/criatura preservados fora destas quatro entregas.
