# Decisões do autor — 2026-10-18

| Item | Decisão | Próximo passo |
|---|---|---|
| Maestria | B — Atributo coroado | Concluída em task própria: `icones-maestria-adocao`. |
| Crítico | A — Dado excepcional; substituir os riscos por estrelinhas | [Refino](prancha-critico-refino.html); task própria `icones-critico-adocao`. |
| Energia em Utilizar | Aprovar o ícone `energia` existente | Task própria `icones-energia-utilizar`. |
| Tooltips | T3 — nome em barras, fichas, cards e resumos; por extenso somente nos custos avulsos de Energia do inventário e das habilidades de NPC | Recorte aprovado; task própria `icones-tooltips-recursos-t3` concluída. |
| Ações genéricas | Sem votos recebidos | Prancha de ações continua aberta. |

O autor determinou: **“Aprovações de desenho geram task própria; não autorizam
implementação nesta rodada.”** Posteriormente autorizou executar as quatro specs.
Maestria, Crítico, Energia em Utilizar e T3 implementados e verificados em
18/10/2026, specs em done. A prancha original permanece
intacta. O refino usa duas estrelas de quatro pontas no lugar dos riscos externos
do dado, preservando suas faces e a família de contorno. Desenho original Codex
(OpenAI), sem asset externo.

## Recorte T3 aprovado

- Barras, fichas, cards e resumos: manter somente “Vida”, “Energia” ou “Defesa”
  no tooltip, junto aos valores já visíveis. Não concatenar valor atual/máximo.
- Custos avulsos de Energia do inventário (`ficha-inventario.component.html`)
  e das habilidades de NPC (`npc-habilidades-lista.component.html`): tooltip
  por extenso, no formato “3 de Energia”, usando o custo correspondente.
- Ícones do leitor de regras ficam fora desse recorte.
- Aprovação explícita do autor em resposta à proposta desta divisão. Registra
  a revisão do contrato original por extenso nesses consumidores; não autoriza
  troca global nem ampliação da API de primitivos nesta rodada.

## Entregas autorizadas posteriormente

- [icones-maestria-adocao](../../done/icones-maestria-adocao.spec.md)
- [icones-critico-adocao](../../done/icones-critico-adocao.spec.md)
- [icones-energia-utilizar](../../done/icones-energia-utilizar.spec.md)
- [icones-tooltips-recursos-t3](../../done/icones-tooltips-recursos-t3.spec.md)

## Votos das ações e glifos genéricos — 2026-10-20

Prancha [prancha-acoes.html](prancha-acoes.html) votada pelo autor (14 conceitos). O desenho de cada um está aprovado;
**o alcance (onde cada glifo substitui o caractere de hoje) e a execução ficam na task própria**
[icones-acoes-genericas-adocao](../../done/icones-acoes-genericas-adocao.spec.md), como a spec exige.

| Conceito | Voto |
|---|---|
| Menu de ações | B — Três módulos |
| Alça de arrastar | A — Seis apoios |
| Apagar último termo | B — Termo retirado |
| Rolagem encadeada | B — Fluxo |
| Minimizar janela | A — Traço inferior |
| Maximizar janela | B — Quatro cantos |
| Restaurar janela | A — Quadros sobrepostos |
| Mover peça acima | A — Seta e lista |
| Mover peça abaixo | A — Seta e lista |
| Rolar ao início | B — Duas etapas |
| Rolar ao fim | B — Duas etapas |
| Fechar painel | A — Cruz aberta |
| Cancelar edição | B — Interromper |
| Restaurar valores padrão | B — Ciclo e referência |
