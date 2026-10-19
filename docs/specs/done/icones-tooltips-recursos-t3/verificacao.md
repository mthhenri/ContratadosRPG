# Verificação — Tooltips de recursos T3

**Concluída.** [Matriz completa/análogo](implementacao.md): cada consumidor classificado em nome preservado, custo por extenso ou leitor fora do recorte.

Oito pares viewport/tema: catálogo real de Fragmentos, lista NPC e Biblioteca, com hover desktop, foco/teclado e toque informativo móvel. Inventário observado inicialmente com custo 3; Afinidade seis mostra bruto riscado 3/6 e reduzido 1/1 no Módulo V. Hosts Potencializador/Construtor anunciam “1 de Energia”, sem usar o bruto. NPC mostra “4 de Energia” e “0 de Energia”; passiva sem custo/ícone. Biblioteca usa seu próprio custo 4. Hosts focáveis têm nome acessível/tooltip coincidentes, SVG interno decorativo.

Comparação com cartões/chips aprovados: mesmo shell, controles, densidade e ícones; balões canônicos legíveis nos dois temas, contidos na janela e sem overflow. Stat/BarraRecurso preservam nome independente de valores numéricos/textuais/ausentes; testes e matriz cobrem propagação aos resumos. Sem concatenação global ou edição no leitor.

Evidências: `.artifacts/icones-tooltips-recursos-t3/visual-complementar.log`, `fragmento-reduzido-{0,1}-*.png`, `npc-zero-*.png`, `tooltip-{fragmentos,npc,biblioteca}-*.png`. Matriz geral `.artifacts/icones-maestria-adocao/visual-final.log`.

## Gates integrados — 18/10/2026

Frontend: 282 arquivos / 3.526 testes aprovados. Recorte Maestria/Crítico: 89; recursos: 229 e, após os atributos de foco, 187 em dois arquivos. Mudanças posteriores de estilo foram conferidas no navegador e no build final. Shared: 76 arquivos / 1.335 testes aprovados. Backend: 72 arquivos / 1.220 testes; 8 arquivos / 99 testes ignorados pela configuração existente.

Lint dos três workspaces sem erros: frontend 28.607 avisos; shared 6.057; backend 4.828. Sem limpeza global fora do escopo. Build frontend final aprovado após a correção visual; alerta de bundle 599,02 kB para orçamento 450 kB (P-004 existente). Prettier nos HTML/SCSS tocados e leitura manual do diff: sem regras novas, hardcodes de tema ou API de primitivos ampliada. Receitas existentes ou inputs completos de shared/ui preservados. `git diff --check` e `npm run repo:verificar` aprovados.

Logs integrados em `.artifacts/icones-maestria-adocao/`: `testes-integracao.log`, `testes-focados.log`, `testes-shared.log`, `testes-backend.log`, `lint*.log`, `build-final.log`, `repo.log`. Recursos/foco: `.artifacts/icones-tooltips-recursos-t3/testes-{depois,acessibilidade}.log`.

## Ambiente e limites

Aplicação real: API local 3101, SPA 4301, Postgres local, cenário descartável próprio, removido por soft delete após a inspeção. Chromium com barras de rolagem; 1920×1080, 1366×768, 960×1080 e 360×800, escuro e claro. Agente principal inspecionou pessoalmente as capturas renderizadas e comparou com os análogos, além das verificações automatizadas de estado. Toque emulado; sem aparelho físico ou leitor de tela físico. Commit autorizado pelo autor em 19/10/2026; sem publicação. Trabalhos anteriores de identidade/criatura preservados fora destas quatro entregas.
