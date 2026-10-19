> Registro preliminar da implementação; pendências abaixo foram resolvidas no [fecho final](verificacao.md).

# Implementação — Energia em Utilizar

## Análogo registrado antes da edição

Aplicadas `gerenciamento-de-impacto` e `design-fidelity`. Análogo: o próprio botão aprovado `.habilidades__utilizar` em `FichaHabilidades`, preservando a receita local completa de tamanho/densidade: inline-flex, gap 5px, fonte 10px/600, caixa alta, padding 4px/9px e cores `--energy`. Não se adiciona `[tamanho]` para sobrepor essa receita existente nem se amplia Botao. A família `app-icone` já é importada; `energia` existente substitui somente o caractere, herdando cor/fonte/estados. Shell, hierarquia, controles, foco, comportamento responsivo, pulso de gasto e feedback numérico são os atuais.

## Impacto

`npm run impacto -- frontend/src/app/modules/ficha/componentes/ficha-habilidades/ficha-habilidades.component.ts`: dois consumidores e três testes relacionados. `ficha-visualizacao.component.html` (ficha completa) e `ficha-campanha-card.component.html` (versão compacta no painel) são **pedido/acompanha**, ambos cobertos pela aprovação do componente. Mapas dinâmicos do catálogo foram conferidos: nenhum glifo redesenhado, nenhuma instância de `energia` existente muda. Sem regra nova ou extração de responsabilidade: substituição local estritamente visual.

## Estado

Implementação/testes em andamento. Gate visual não concluído; agente principal consolidará inspeção pessoal nas duas superfícies, quatro viewports, duas bases e estados positivo/zero/variável, foco/hover/toque emulado e gasto real. Aparelho físico deve ser declarado separadamente.

## Implementação e evidência técnica

Mudança em uma linha do template: `<app-icone class="icone--texto" nome="energia" /> Utilizar`. Importação, receita de botão, cores, tamanhos, clique/pressão longa, feedback `−N E` e disabled de custo zero foram preservados; nenhum TS/SCSS/catálogo/primitivo alterado. O teste existente de custo zero/positivo foi ampliado para exigir o ícone Energia nos dois estados e ausência do relâmpago textual.

Rodada focada compartilhada com T3: `npm exec --workspace=frontend -- ng test --watch=false` com três `--include` para FichaHabilidades, FichaInventario e NpcHabilidadesListaTooltip: **3 arquivos / 229 testes aprovados**. Inclui gasto fixo/variável, Conservador e pressão longa já cobertos pela suíte existente. Antes da edição, os testes novos falharam nos cinco recortes esperados; 224 passaram. Uma tentativa inicial falhou antes dos testes por EPERM no Temp da sandbox; repetir com TEMP/TMP em `.artifacts/icones-tooltips-recursos-t3/temp` permitiu executar a suite. Saídas locais em `.artifacts/icones-tooltips-recursos-t3/testes-{antes-localtemp,depois}.log`. Não se executaram build/lint/suite global duplicados: consolidação do agente principal.

Prettier aplicado aos três HTML tocados neste recorte integrado; `git diff --check` aprovado. **Gate visual continua aberto**. Seletor para inspeção: `.habilidades__utilizar`, tanto em `app-ficha-habilidades` da ficha quanto do card compacto. Dados sugeridos: habilidades GERAL com custos `3`, `0` e `null`, Energia atual `20`; verificar “Utilizar NOME”, disabled, confirmação de variável, clique/pressão longa, flash e recurso atualizado.
