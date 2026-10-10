# m11-09-oficina-mudancas-e-publicar.spec.md

> Task 9/10 do milestone [`m11-oficina-regras.spec.md`](m11-oficina-regras.spec.md). Fecha o ciclo
> editar → conferir → publicar. Fonte visual: [`m11-oficina-exemplao.html`](m11-oficina-regras/m11-oficina-exemplao.html)
> e [`m11-modelagem.html`](m11-oficina-regras/m11-modelagem.html) (estados e comparador).

## Objetivo

Mostrar o que mudou (marcas na peça e gaveta com o comparador), publicar rascunho ou versão com
resumo, nota e número sugerido, e abrir versões antigas só para leitura (admin).

## Entregáveis

1. **Marcas de mudança**: ponto amarelo em peça alterada e verde em peça nova, sempre contra a
   versão publicada atual, calculadas pelo comparador (`m11-05`) sobre a cópia de trabalho montada
   como árvore.
2. **Gaveta "O que mudou"** com abas *Edição × publicada* (clique leva à peça) e *Histórico*
   (duas versões quaisquer); lista classificada em nova, removida, alterada (campo a campo, texto
   palavra a palavra) e movida, com caminho da peça. Reuso candidato: `gaveta`, `segmentado`.
3. **Publicar ▾**: menu suspenso com rascunho ou versão; diálogo (`app-modal`) com o resumo das
   mudanças, **número sugerido** (patch + 1 do último publicado), nota opcional "o que mudou" e as
   pendências; versão com pendência bloqueia, rascunho avisa. Chama a publicação da `m11-04`.
4. **Abrir versão antiga só para leitura** (admin): seletor de versão no leitor; faixa de aviso
   "somente leitura"; sem ferramentas da Oficina nesse modo.
5. **Estados visíveis** (em edição / rascunho publicado / versão publicada) no cabeçalho da
   Oficina, coerentes com quem vê o quê.
6. **Primitivo novo**: menu suspenso do botão Publicar **não existe** em `shared/ui/`. **Parar e
   perguntar ao autor** antes de criar ou contornar.

## Critérios de Aceite

- Testes: cálculo das marcas a partir do comparador; número sugerido (casos de patch, primeira
  publicação, número fora do padrão); publicar versão com pendência recusa; versão antiga abre sem
  ferramentas de edição.
- **Gate visual** com `verify` em `1920×1080` e `360×800`, claro/escuro: análogo registrado;
  estados percorridos (sem mudanças, com novas/alteradas/removidas/movidas, clique levando à peça,
  histórico entre duas versões, diálogo de publicar com e sem pendência, rascunho vs. versão,
  versão antiga só leitura); comparação com o exemplão; sem overflow; foco e toque.
- Verificação ao vivo ponta a ponta com dois usuários (admin publica rascunho; tester vê o
  rascunho; usuário comum continua na versão; admin publica versão; comum passa a ver a nova),
  registrada no relatório da task.
- Lint e testes dos três workspaces verdes.

## Fora de Escopo

Exportar para `docs/core/` (`m11-10`); desfazer/reverter publicação; mesclar versões; notificação
de nova versão ao leitor aberto, salvo se já entregue na `m11-04`.

## Dependências

`m11-04`, `m11-05` e `m11-06` em `done/`. Decisão do autor sobre o primitivo (item 6).

## Riscos e Mitigação

- **Cópia de trabalho muda enquanto a gaveta está aberta**: recalcular ao salvar uma peça (com
  debounce), nunca em cada tecla.
- **Comparação pesada no navegador**: medir com o Sistema inteiro; se lenta, cálculo incremental
  por peça alterada.
