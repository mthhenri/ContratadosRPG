# editor-markdown-espaco-para-escrever.spec.md

> Task solta, rodada 3 da revisão do editor Markdown (2026-09-23). Os três itens eram os pendentes
> de decisão da `editor-markdown-usabilidade-rodada-2`; o autor viu protótipos visuais (capturas do
> app real com CSS injetado) e decidiu: aplicar os três, com a barra dos campos curtos embaixo.

## Objetivo

Devolver espaço de escrita onde o editor ficava apertado — caderno no celular com teclado aberto e
campos curtos de formulário — e parar de mostrar formato desligado como se estivesse ligado no toque.

## Entregáveis

1. **`app-botao-icone` sem hover no toque.** Os blocos de hover do primitivo (base, `mini`,
   `preenchido`, `ativo`) só valem com `@media (hover: hover)`. No toque o `:hover` grudava depois
   do toque e, com ícone/borda em `--accent`, lia como `--ativo`.
2. **Caderno no celular, escrevendo.** Com o foco no texto editável e a vista de conteúdo aberta,
   escopo (Meu caderno/Esquadrão/Jogadores) e busca com filtros saem da frente; voltam ao sair do
   texto. Somente leitura não esconde nada (mestre lendo caderno de jogador). O editor ganha a
   saída `focadoChange` para o caderno saber do foco.
3. **Campos curtos (`[compacto]`).** A barra só aparece com o campo em uso, numa linha, **embaixo**
   do texto (em cima ela empurrava o texto ~30px ao aparecer). Quem rola é a área de texto, para a
   barra não sumir quando o usuário redimensiona o campo (`resize: vertical` dos consumidores). No
   celular, com foco, a barra continua presa acima do teclado.

## Critérios de Aceite

- Testes: `focadoChange` (entra/sai, sem repetir); caderno esconde escopo/busca só no mobile e só
  escrevendo; suíte do frontend e lint sem erros novos.
- `verify`: toque desliga o negrito e o botão volta à cor neutra; mouse mantém o hover; caderno
  360×470 com mais espaço de texto; campo curto 1920×1080 sem barra fora de uso, barra embaixo em
  uso sem mover o texto, visível com o campo redimensionado; campo curto 360×800 com barra ancorada.

## Fora de Escopo

Variantes de severidade (`_variantes.scss`, compartilhadas com `app-botao`); rodapé do caderno
("Salvar agora") durante a edição; teclado virtual real (não reproduzível no Playwright).

## Dependências

`editor-markdown-usabilidade-rodada-2.spec.md` (done).
