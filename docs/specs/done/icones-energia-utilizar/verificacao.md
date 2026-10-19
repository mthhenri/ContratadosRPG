# Verificação — Energia em Utilizar

**Concluída.** Análogo/impacto em [implementação](implementacao.md).

Nos oito pares viewport/tema, ficha completa com Impulso custo 3 e habilidade custo zero: ícone Energia nos dois botões, texto preservado e zero desabilitado. Enter no desktop/toque emulado no celular descontam 3 de Energia de verdade, confirmado por GET após persistência; feedback existente preservado. Foco e estado desabilitado conferidos, sem overflow. Testes existentes de variável/pressão longa seguem aprovados, sem alteração da lógica.

No FichaCampanhaCard, Habilidades aberta nos oito pares: `ajustavelAmplo=false` torna o componente somente leitura, sem Utilizar. Ausência confirmada/preservada; não se abriu permissão para testar.

Comparação com botão aprovado: mesma caixa, gap, cor de Energia, hierarquia e densidade; SVG não desloca texto/ações. Capturas em `.artifacts/icones-energia-utilizar/energia-utilizar-*.png`; matriz `.artifacts/icones-maestria-adocao/visual-final.log`; confirmação do card em `.artifacts/icones-tooltips-recursos-t3/visual-complementar.log` e `habilidades-card-leitura-*.png`.

## Gates integrados — 18/10/2026

Frontend: 282 arquivos / 3.526 testes aprovados. Recorte Maestria/Crítico: 89; recursos: 229 e, após os atributos de foco, 187 em dois arquivos. Mudanças posteriores de estilo foram conferidas no navegador e no build final. Shared: 76 arquivos / 1.335 testes aprovados. Backend: 72 arquivos / 1.220 testes; 8 arquivos / 99 testes ignorados pela configuração existente.

Lint dos três workspaces sem erros: frontend 28.607 avisos; shared 6.057; backend 4.828. Sem limpeza global fora do escopo. Build frontend final aprovado após a correção visual; alerta de bundle 599,02 kB para orçamento 450 kB (P-004 existente). Prettier nos HTML/SCSS tocados e leitura manual do diff: sem regras novas, hardcodes de tema ou API de primitivos ampliada. Receitas existentes ou inputs completos de shared/ui preservados. `git diff --check` e `npm run repo:verificar` aprovados.

Logs integrados em `.artifacts/icones-maestria-adocao/`: `testes-integracao.log`, `testes-focados.log`, `testes-shared.log`, `testes-backend.log`, `lint*.log`, `build-final.log`, `repo.log`. Recursos/foco: `.artifacts/icones-tooltips-recursos-t3/testes-{depois,acessibilidade}.log`.

## Ambiente e limites

Aplicação real: API local 3101, SPA 4301, Postgres local, cenário descartável próprio, removido por soft delete após a inspeção. Chromium com barras de rolagem; 1920×1080, 1366×768, 960×1080 e 360×800, escuro e claro. Agente principal inspecionou pessoalmente as capturas renderizadas e comparou com os análogos, além das verificações automatizadas de estado. Toque emulado; sem aparelho físico ou leitor de tela físico. Commit autorizado pelo autor em 19/10/2026; sem publicação. Trabalhos anteriores de identidade/criatura preservados fora destas quatro entregas.
