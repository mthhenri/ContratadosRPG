# pn-11-resumo-e-navegacao-entre-versoes.spec.md

> Task 5/5 do guarda-chuva `pn-revisao-pagina-patchnotes.spec.md`. É a última; fecha o guarda-chuva.

## Objetivo

O resumo da versão aparece **no topo** da nota, logo após o cabeçalho. O fim da nota leva tanto à
versão **anterior** quanto à **próxima**. Um botão **"Voltar ao topo"** (pedido do autor em 2026-10-06,
acrescentado a esta task) aparece depois de rolar a página.

## Entregáveis

1. **Resumo em destaque, no topo**:
   - o grupo com `publico === 'resumo'` (`pn-07`) sai do fim da nota e vira um cartão logo após o
     cabeçalho da nota, com o rótulo `// Resumo da versão`;
   - o cartão tem o mesmo Markdown seguro, filete de `--accent` à esquerda e superfície `--bg`
     sobre o cartão da nota;
   - o resumo não aparece duas vezes;
   - a âncora do capítulo é preservada, então links antigos para o resumo continuam funcionando;
   - no sumário (`pn-09`) ele é o primeiro item, "Resumo";
   - nota sem `# RESUMO…`: nada muda e nenhum cartão vazio aparece.

   A posição é **Topo** em todas as larguras, decisão da bancada. A variante "trilho" foi
   avaliada e não entra.
2. **Anterior e próxima**:
   - o rodapé da nota mostra "← v1.3.0" com o título da anterior e "v1.4.1 →" com o título da
     próxima, alinhadas às pontas;
   - usa `app-botao` `estilo="link"` com `[tamanho]` e o título como linha de apoio;
   - na mais recente aparece só a anterior, e na mais antiga só a próxima;
   - substitui o link "(anterior)" atual;
   - a navegação sobe ao topo da nota de destino.
3. **Voltar ao topo** (pedido do autor, 2026-10-06):
   - aparece depois de rolar ~400px e some ao voltar ao topo;
   - em três zonas, é um `app-botao` no fim do trilho direito (sob o sumário), fixo na rolagem; abaixo
     de ~1240px é um `app-botao-icone` flutuante no canto inferior direito;
   - o clique **limpa o fragmento da URL** (`replaceUrl`, sem empilhar histórico), zera o capítulo ativo
     do sumário e rola suavemente ao topo (`auto` com `prefers-reduced-motion`);
   - ícone: `chevron` girado 180° (não há seta para cima no catálogo; precedente em `hub-cenas`).
4. **Troca de versão sobe ao topo**: ao abrir outra versão (rodapé, lista ou URL) sem fragmento, a página
   volta ao topo da nota de destino; recarga da mesma versão (reiniciar cache) não rola.
5. **Fechamento do guarda-chuva**:
   - mover `pn-revisao-pagina-patchnotes.spec.md` para `done/`;
   - atualizar a seção "Versão e patchnotes" do `CONTEXT.md` (pn-01…pn-11);
   - registrar em `HISTORY.md`.

## Critérios de Aceite

1. Testes:
   - resumo no topo e ausente do fim;
   - nota sem resumo;
   - âncora do resumo;
   - rodapé com anterior e próxima, só uma nas pontas e destino correto;
   - voltar ao topo: aparece/some com a rolagem, limpa o fragmento e zera o destaque;
   - troca de versão sobe ao topo e a recarga da mesma versão não rola.
2. Suítes e lint de `frontend` verdes.
3. **Gate visual final do guarda-chuva** (`verify` + `design-fidelity`) em `1920×1080`,
   `1366×768`, `960×1080` e `360×800`, com a página completa contra o conjunto **Definido** da
   bancada:
   - trilhos;
   - sumário com *scroll-spy*;
   - lista de versões com título, linha e "Novo";
   - resumo no topo;
   - rodapé;
   - botão de voltar ao topo (trilho e flutuante);
   - link com fragmento;
   - troca de versão;
   - estados 404, 503, vazio e carregando;
   - visitante e ADMIN (reiniciar cache funcionando).

## Fora de Escopo

- Resumo no trilho direito.
- Destacar o resumo de outra forma no sumário.
- Mudar o formato `# RESUMO…` das notas.

## Dependências

`pn-07`, `pn-08`, `pn-09` e `pn-10` concluídas.
