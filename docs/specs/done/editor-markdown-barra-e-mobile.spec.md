# editor-markdown-barra-e-mobile.spec.md

> Task solta, parte 2 de 2 da revisão do editor Markdown (2026-09-23). Parte 1:
> `editor-markdown-desfazer-e-tabelas.spec.md`. Decisões do autor tomadas nesta sessão: faixa
> contextual de tabela, barra colada acima do teclado no mobile, ampliar `app-botao-icone` com
> estado ativo, e H1/H2/Lista/Citação funcionando como liga/desliga.

## Objetivo

Deixar a barra do `app-editor-markdown` clara e usável — no desktop e principalmente no celular —
em todos os consumidores (caderno, campos de ficha/criatura).

## Entregáveis

1. **Primitivo.** `app-botao-icone` ganha `[ativo]` (`boolean | null`, padrão `null`): `true`/
   `false` viram `aria-pressed` e `true` aplica o destaque de item ativo (`--accent-dim`/
   `--accent-border`/`--accent`, mesma receita do `app-segmentado`). `null` não muda nada nos
   consumidores atuais. `DESIGN.md` documenta.
2. **Barra principal** só com `app-botao-icone tamanho="compacto"` (44px no mobile pelo próprio
   primitivo), em grupos: Desfazer · Refazer | H1 · H2 | Negrito · Itálico · Código | Lista ·
   Lista numerada · Citação | Inserir tabela. Ícones novos `desfazer`/`refazer` em `app-icone`
   (Tabler Icons, MIT). O botão "¶ Texto normal" sai — os formatos de bloco passam a alternar.
3. **Estado ativo** a partir do ProseMirror: negrito/itálico/código (marca ou bloco de código),
   H1/H2, lista, lista numerada e citação refletem o cursor. Desfazer/Refazer desabilitam quando
   não há o que desfazer/refazer fora do modo colaborativo; no colaborativo ficam sempre
   habilitados (a pilha do Yjs só atualiza depois da transação do ProseMirror).
4. **Liga/desliga:** H1/H2 ativos voltam a parágrafo; Lista/Lista numerada na mesma lista saem
   dela, na outra trocam o tipo da lista inteira; Citação ativa sai da citação; Código em bloco
   de código volta a parágrafo.
5. **Faixa contextual "Tabela"**, só com o cursor numa tabela, com `app-botao tamanho="pequeno"`
   rotulados por texto, em grupos: Linha (Acima · Abaixo · Remover), Coluna (Esquerda · Direita ·
   Remover), Tabela (Sair · Apagar). "Linha acima" fica desabilitada no cabeçalho (o schema GFM
   não permite linha antes dele). "Sair" cria um parágrafo logo depois da tabela.
6. **Mobile (≤ `$bp-mobile`)**: com o editor focado, as duas faixas se prendem à parte de baixo
   da área visível, acima do teclado virtual (`visualViewport`), sem depender do containing
   block (o painel flutuante tem `container-type`). As faixas rolam de lado com indicador de
   continuação (degradê na borda) em vez de esconder ações sem aviso. O conteúdo ganha margem
   inferior para o cursor não ficar atrás da barra.
7. Fora do mobile (ou sem foco no mobile), a barra continua no topo, quebrando linha em vez de
   rolar de lado.

## Critérios de Aceite

- Testes de componente/função: estado ativo, liga/desliga de título/lista/citação/código,
  troca de tipo de lista preservando itens, faixa de tabela só em tabela, "Linha acima"
  desabilitada no cabeçalho, `app-botao-icone` `[ativo]`.
- Suíte completa do frontend e lint sem falhas novas.
- Gate visual (`verify`): caderno e campo compacto de ficha em `1920×1080` e `360×800`; estados:
  fora de tabela, em tabela, formato ativo, foco no mobile (barra ancorada embaixo). Análogo:
  cabeçalho de ferramentas da Iniciativa (`app-botao-icone`) + `app-segmentado` (estado ativo).
- Teclado virtual real (iOS/Android) não é reproduzível no Playwright: fica registrado como
  verificação pendente em aparelho.

## Fora de Escopo

- Layout do caderno fora do editor (cabeçalho, lista de páginas, rodapé).
- Menu de barra "/" ou toolbar flutuante sobre a seleção.
- Alinhamento de coluna, mover linha/coluna.

## Dependências

`editor-markdown-desfazer-e-tabelas.spec.md` (parte 1). `docs/design/DESIGN.md`.
