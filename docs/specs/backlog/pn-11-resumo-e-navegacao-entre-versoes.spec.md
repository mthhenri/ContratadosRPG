# pn-11-resumo-e-navegacao-entre-versoes.spec.md

> Task 5/5 do guarda-chuva `pn-revisao-pagina-patchnotes.spec.md`. É a última; fecha o guarda-chuva.

## Objetivo

O resumo da versão aparece **no topo** da nota, logo após o cabeçalho. O fim da nota leva tanto à
versão **anterior** quanto à **próxima**.

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
3. **Fechamento do guarda-chuva**:
   - mover `pn-revisao-pagina-patchnotes.spec.md` para `done/`;
   - atualizar a seção "Versão e patchnotes" do `CONTEXT.md` (pn-01…pn-11);
   - registrar em `HISTORY.md`.

## Critérios de Aceite

1. Testes:
   - resumo no topo e ausente do fim;
   - nota sem resumo;
   - âncora do resumo;
   - rodapé com anterior e próxima, só uma nas pontas e destino correto.
2. Suítes e lint de `frontend` verdes.
3. **Gate visual final do guarda-chuva** (`verify` + `design-fidelity`) em `1920×1080`,
   `1366×768`, `960×1080` e `360×800`, com a página completa contra o conjunto **Definido** da
   bancada:
   - trilhos;
   - sumário com *scroll-spy*;
   - lista de versões com título, linha e "Novo";
   - resumo no topo;
   - rodapé;
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
