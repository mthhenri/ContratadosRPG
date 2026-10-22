# Impacto — consumidores da ficha

Recorte executado pelo subagente: `frontend/src/app/modules/ficha/**`. A inspeção visual integrada e os gates de compilação/testes ficam com o agente principal; este registro não os declara cumpridos.

## Referência e método

Análogos aprovados: os próprios controles da ficha antes desta adoção e o uso adjacente de `app-icone nome="editar"`/`nome="excluir"` na ficha de criatura, seletor e inventário. Permanecem shell, densidade, hierarquia, espaçamento, classes BEM, tamanho/API do botão, estados, foco, tooltips, rótulos acessíveis, eventos e responsividade. Só o conteúdo gráfico muda.

Fontes consultadas: spec da adoção, inventário e ocorrências históricos, `DESIGN.md`, skills `design-fidelity` e `gerenciamento-de-impacto`. Busca no módulo por caracteres e conferência individual do botão/indicador e sua ação. `npm run impacto -- --icone` executado antes da edição para menu-acoes (1 literal homônimo ao componente, falso positivo), cancelar-edicao, fechar-painel, mover-acima, mover-abaixo, janela-maximizar, janela-restaurar, rolagem-encadeada e restaurar-padrao (zero consumidores antes da adoção); excluir (48 consumidores, 2 testes, glifo existente preservado).

## Mapa de consumidores

Todos os consumidores alterados são **pedido**; não há alteração de glifo compartilhado neste recorte.

| Consumidor em `modules/ficha/` | Decisão semântica |
|---|---|
| `componentes/cartao-ficha-acervo` | Menu de ações → menu-acoes |
| `paginas/visualizar` | Menu de ações móvel → menu-acoes |
| `paginas/criar` | Fechar resumo operacional → fechar-painel |
| `componentes/criatura-visualizacao` | Cancelar edição da classificação → cancelar-edicao |
| `componentes/ficha-campanha-card` | Cancelar remoção de fragmento → cancelar-edicao; pedir remoção → excluir |
| `componentes/ficha-visualizacao` | Mesmo par de fragmento na ficha completa |
| `componentes/ficha-combos` | Cancelar remoção → cancelar-edicao; remover combo/passo → excluir; reordenar passo → mover-acima/mover-abaixo |
| `componentes/ficha-flutuante` | Alternância maximizada → janela-restaurar/janela-maximizar |
| `componentes/ficha-habilidade-seletor` | Fechar seletor → fechar-painel; remover habilidade → excluir |
| `componentes/ficha-habilidades` | Remover habilidade → excluir; fechar diálogo → fechar-painel |
| `componentes/ficha-inventario` | Fechar busca → fechar-painel; cancelar remoção → cancelar-edicao; remover item/efeito → excluir |
| `componentes/ficha-rolagens` | Indicador encadeado → rolagem-encadeada; cancelar remoção → cancelar-edicao; remover preset/passo → excluir |
| `componentes/ficha-sanidade` | Remover sequela/trauma/lesão → excluir |
| `componentes/guia-equipamento-loja` | Remover item do kit → excluir |
| `componentes/npc-visualizacao/npc-equipamento` | Remover item/modificação → excluir |

Cancelar remoção desfaz apenas a intenção/rascunho de remoção, antes de persistir, mantendo o mesmo retorno ao estado anterior do controle de cancelamento. Excluir continua sendo a ação de remover conteúdo, nunca um fechamento.

## Preservados e limites

- Parar execução de combo conserva o caractere: interromper um processo não é cancelar uma edição.
- Limpar filtro de categoria conserva `↺`: não altera valores padrão.
- Matemática, quantidade `×`, operadores de aumentar/diminuir, setas editoriais, estados e demais ícones de domínio ficam fora.
- `Icone` já era importado nos consumidores; a única nova importação standalone foi em `FichaCombos`.
- HTMLs tocados formatados com Prettier usando `frontend/.prettierrc.json`; `git diff --check` sem erro no recorte.
- Fecho do principal em 22/10: gates integrados e inspeção pessoal executados; [matriz, componentes sem consumidor atual e limites](verificacao.md). A observação real não é certificada pelo relato original deste recorte delegado.
