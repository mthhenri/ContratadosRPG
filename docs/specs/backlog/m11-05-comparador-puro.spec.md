# m11-05-comparador-puro.spec.md

> Task 5/10 do milestone [`m11-oficina-regras.spec.md`](m11-oficina-regras.spec.md). Função pura no
> `shared/`; sem banco, sem API, sem UI. Pode correr em paralelo com `m11-02`…`04`.

## Objetivo

Comparar duas árvores de livro (`m11-01`) peça a peça, casando por `identificador`, e devolver a
lista de mudanças classificadas, que alimenta a gaveta "O que mudou" e o diálogo de publicação.

## Entregáveis

1. **Função** `compararLivros(anterior, atual)` em `shared/src/livro/`, pura, sem dependências.
   Resultado tipado (`LivroComparacaoDto`, value object): lista de mudanças, cada uma com
   `identificador`, `tipo` da peça, caminho legível (títulos dos ancestrais) e `situacao`:
   - **nova** (só no atual) e **removida** (só no anterior);
   - **alterada**, com `campos` alterados (caminho dentro de `dados`) e, para texto, o diff **por
     palavras** entre os trechos antes/depois;
   - **movida** (mesmo pai com `ordem` diferente, ou pai diferente), sem confundir com alterada;
   - uma peça pode ser alterada e movida ao mesmo tempo (duas entradas ou duas marcas, definido
     no teste).
2. **Diff por palavras** próprio e puro (sem biblioteca), estável, que trata o texto rico
   (`RegrasTrecho`): compara o texto corrido preservando negrito/itálico/NA/link como marcações,
   para mostrar "mudou a formatação" separado de "mudou a palavra".
3. **Resumo agregado**: contagens por situação e por tipo, usadas no diálogo de publicação e no
   contador da Oficina.
4. **Definição de "igual"**: ignora diferenças que não são conteúdo (ordem das chaves, `revisao`,
   metadados de fotografia); cobre ancora alterada como mudança da peça (e registra a âncora antiga
   como informação).
5. **Testes** com fixtures pequenas por caso e um caso grande (Sistema inteiro contra uma cópia com
   alterações conhecidas) para medir desempenho.

## Critérios de Aceite

- `npm run test --workspace=shared` verde com os casos: sem diferença; nova; removida; alterada em
  campo simples; alterada em texto rico (palavra a palavra); movida entre irmãos; movida entre
  pais; renomeada (título muda, `identificador` igual) classificada como alterada, não como
  removida+nova; alteração só de formatação.
- Comparar duas cópias do Sistema inteiro (~milhares de peças) em tempo aceitável para uso
  interativo (limite medido e registrado no teste, ordem de poucas centenas de ms).
- Determinismo: mesma entrada, mesma saída, mesma ordem.
- `npm run lint --workspace=shared` e `npm run build --workspace=shared` verdes.

## Fora de Escopo

Qualquer UI (gaveta, marcas, diálogo — `m11-09`); buscar as versões (`m11-04`); comparar versões
sem `identificador` (anteriores à importação); mesclar/desfazer mudanças.

## Dependências

`m11-01` em `done/` (contrato da árvore e `RegrasTrecho` no `shared/`).

## Riscos e Mitigação

- **Diff de texto rico ruidoso.** Normalizar para a sequência de palavras com marcações antes de
  comparar; casos reais do Sistema no teste grande.
- **Movida vs. alterada por reordenação em cascata** (inserir um item muda a `ordem` de todos os
  seguintes). Comparar a posição relativa entre irmãos que existem nos dois lados, não o índice
  bruto.
