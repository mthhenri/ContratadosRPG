> Registro preliminar da implementação; pendências abaixo foram resolvidas no [fecho final](verificacao.md).

# Implementação — tooltips de recursos T3

## Fonte, análogo e contrato antes da edição

Decisão explícita T3 em `icones-recursos-glifos-e-pendencias/decisoes.md`: nome em barras/fichas/cards/resumos, por extenso apenas custos avulsos do inventário e habilidades NPC. Isso revisa o contrato original; não se concatena valor no Stat nem BarraRecurso. Aplicadas `gerenciamento-de-impacto` e `design-fidelity`.

Análogos: o próprio catálogo de Fragmentos aprovado no fecho de `icones-recursos-sistema` e os chips Ativa/Energia de `NpcHabilidadesLista`. Mesmos shell, densidade, cores, gaps, ícones, layout e responsividade; muda somente a entrada de `appTooltip`, primitivo canônico existente. Custo exibido é a fonte local: reduzido em cada variante de Fragmento; custo próprio da habilidade/da biblioteca em NPC. Nenhuma regra, API, cálculo ou extensão de primitivo.

## Matriz explícita de consumidores

Prefixo comum `frontend/src/app/`; os caminhos referem-se ao inventário da task de origem. “Preservar” significa nenhuma edição nesses arquivos.

| Consumidor | Classe e decisão T3 |
|---|---|
| `shared/ui/stat/stat.component.html:10` | **acompanha preservado**: somente `rotulo()`; valores ausentes/textuais/projetados continuam independentes. Propaga a fichas/resumos/criação/simulações via variante ou ícone explícito. |
| `shared/ui/barra-recurso/barra-recurso.component.html:4,8` | **acompanha preservado**: nome no ícone e dica explicativa independente no rótulo. Vida/Energia atual/máximo não entram na dica do ícone. |
| `modules/campanha/paginas/lista/lista.page.html:102` | **preservar** Vida. |
| `modules/ficha/componentes/cartao-ficha-acervo/cartao-ficha-acervo.component.html:35,42,53,58,69,73` | **preservar** Vida/Energia/Defesa nas variantes de ficha. |
| `modules/campanha/paginas/detalhe-jogador/detalhe-jogador.page.html:773,782` | **preservar** Vida/Energia da equipe. |
| `modules/cena/componentes/esquadrao-cena-jogador/esquadrao-cena-jogador.component.html:38,44` | **preservar** Vida/Energia do esquadrão. |
| `modules/ficha/componentes/criatura-visualizacao/criatura-visualizacao.component.html:253,335` | **preservar** Defesa/Vida. |
| `modules/ficha/componentes/ficha-reacoes/ficha-reacoes.component.html:15` | **preservar** Defesa. |
| `modules/campanha/componentes/espectador-ficha-card/espectador-ficha-card.component.html:68` | **preservar** Defesa do espectador. |
| `modules/campanha/componentes/criatura-esquadrao-card/criatura-esquadrao-card.component.html:46` | **preservar** Defesa da criatura no esquadrão. |
| `modules/ficha/componentes/ficha-inventario/ficha-inventario.component.html:644,668` | **pedido**: Potencializador usa `custoAcoplarPotencializadorReduzido`; Construtor usa `custoConstrutorReduzido`, cada um seguido de “ de Energia”. Não usar preço bruto riscado. |
| `modules/ficha/componentes/npc-visualizacao/npc-habilidades-lista.component.html:153,253` | **pedido**: lista usa `custoEnergia ?? 0` (mesmo fallback do valor visível); biblioteca usa o custo da habilidade do modelo. Passivas continuam sem custo/ícone. |
| `modules/regras/blocos/regras-ficha-criatura.component.html:81,95`, `regras-habilidade.component.html:30`, `regras-modulos.component.html:55`, `regras-saude.component.html:8,40` | **fora do recorte**: leitor de regras preservado. |

Impacto executado nos três componentes: FichaInventario tem dois consumidores (ficha completa e card compacto), NpcHabilidadesLista tem um consumidor de tela NpcVisualizacao (a ferramenta conta import+seletor como dois achados). Ambos recortes cobertos pela spec. Ícones dinâmicos/valores variantes foram conferidos; não há mutação do compartilhado `energia`. Nenhum outro tooltip do produto muda.

## Estado

Implementação/testes em andamento. Gate visual aberto para inspeção pessoal do agente principal. Conferir catálogo Fragmentos com Afinidade zero/alta, custos reduzidos distintos; NPC ativa positiva/zero/passiva e modal da biblioteca. Quatro viewports e duas bases conforme spec; hover/foco/toque emulado e overflow. Aparelho físico é evidência separada.

## Implementação e evidência técnica

Somente quatro bindings de `appTooltip` alterados: Potencializador reduzido, Construtor reduzido, ativa da lista NPC (fallback zero idêntico ao texto) e ativa do modelo da biblioteca. Nenhum cálculo, rótulo, controle ou cor mudou. O Prettier também condensou o bloco textual “Ativo” do amplificador no mesmo template de inventário; é somente formatação preexistente, sem mudança de conteúdo.

Testes focados: **3 arquivos, 229 testes aprovados**, rodados com `npm exec --workspace=frontend -- ng test --watch=false` e `--include` dos arquivos `ficha-habilidades.component.spec.ts`, `ficha-inventario.component.spec.ts` e `npc-habilidades-lista-tooltip.component.spec.ts`. Os novos testes confirmam custos distintos `3/6` de Módulo V sem Afinidade e reduzidos `1/1` com Afinidade alta, lista NPC `4/0/ausente` e passiva sem ícone, modelos da biblioteca com custo próprio, Stat Vida/Energia/Defesa com valor numérico/textual/ausente e BarraRecurso Vida/Energia com dica explicativa preservada. A matriz de resumos propaga os primitivos preservados; nenhuma suposição de atualização global de tooltip.

Antes da edição: cinco falhas esperadas nos novos alvos e 224 passes; depois: 229 passes. Tentativa inicial encontrou EPERM no cache temporário da sandbox antes de rodar testes; TEMP/TMP local em `.artifacts/icones-tooltips-recursos-t3/temp` resolveu sem ampliar permissão. Logs locais ignorados pelo Git: `testes-antes.log`, `testes-antes-localtemp.log`, `testes-depois.log`. Build/lint/suite global/repo gates serão consolidados pelo agente principal. **Sem declaração de gate visual concluído**.

Cenários reproduzíveis para a inspeção real:

- Inventário sem itens/amplificadores: abrir Adicionar itens → Fragmentos; primeiro cartão Módulo V mostra Potencializador `3 Energia` e Construtor `6 Energia`. Hover/foco/toque nos respectivos ícones deve ler `3 de Energia`/`6 de Energia`.
- Afinidade alta: item `{ nome: "Fragmento achado", categoria: "FRAGMENTO_POTENCIALIZADOR", modulo: "I", custo: 0, peso: 0, quantidade: 6, guardada: false, modificacoes: [] }` em `dados.inventario.itens`, amplificadores `[]`. Mesmo Módulo V mostra bruto riscado `3/6`, reduzido `1/1`; tooltip deve usar `1 de Energia` em ambos.
- NPC Operativo: lista de habilidades com `nomeNeutro`, `tipo: "ATIVA"`, `custoEnergia: 4` ou `0`, `descricao`; passiva `tipo: "PASSIVA"` sem custo. Biblioteca Operativo inclui duas ativas com custos `4`/`3`. O caso ativo sem custo só exerce o fallback já existente em teste de componente, sem recomendar persistir documento fora do contrato.
- Seletores: `.ficha-inv__cartao--fragmento .ficha-inv__cartao-fragmento-custo app-icone`; `.npc-lista__itens app-icone[nome="energia"]`; `.npc-biblioteca app-icone[nome="energia"]`. O tooltip é renderizado pelo primitivo, a verificar conforme skill `verify`. Ler custo no cartão/linha corrente antes de abrir a dica evita confundir dois ícones.
