# editor-markdown-usabilidade-rodada-2.spec.md

> Task solta. Segunda revisão de usabilidade do `app-editor-markdown` (2026-09-23), depois de
> `editor-markdown-desfazer-e-tabelas` e `editor-markdown-barra-e-mobile`. Esta task aplica só os
> itens que não dependem de decisão do autor; os pendentes estão em Fora de Escopo.

## Objetivo

Tirar da barra do editor as surpresas e os passos escondidos que a revisão ao vivo encontrou:
botão de código com dois comportamentos, ações de tabela e Desfazer fora da tela no celular,
rótulos ambíguos e "Linha acima" bloqueada sem explicação.

## Entregáveis

1. **Código só em linha.** `</>` alterna a marca de código em linha: com seleção, no trecho; sem
   seleção, no texto que vier a seguir. Nunca converte o parágrafo em bloco de código. Dentro de
   um bloco de código, o botão continua devolvendo o bloco a parágrafo. A dica ensina o bloco:
   "digite ``` para um bloco de código".
2. **Desfazer/Refazer fixos.** Ficam numa área própria à esquerda da barra, fora da rolagem
   lateral, em todos os tamanhos.
3. **Uma faixa por vez no celular dentro de tabela.** Com o cursor numa tabela, no mobile, a
   barra mostra só a faixa de tabela (uma linha) e um botão de texto "Formatar"/"Tabela", ao lado de
   Desfazer/Refazer, que troca entre ela e a faixa de formatação. Ao entrar numa tabela, volta a
   mostrar a de tabela. No desktop as duas faixas continuam visíveis.
4. **Ordem e rótulos da faixa de tabela.** "Texto abaixo" primeiro (sair da tabela é o mais
   necessário no celular); depois "+ Linha abaixo", "+ Linha acima", "Remover linha",
   "+ Coluna à direita", "+ Coluna à esquerda", "Remover coluna" e "Apagar tabela" por último —
   rótulos completos, sem título de grupo (no celular o título rolava para fora da tela e
   "Remover" ficava ambíguo). *Ajustado na verificação ao vivo:* a primeira versão tinha
   "+ Abaixo"/"Remover" sob títulos "Linha"/"Coluna" e o botão de troca se chamava "Texto", ao
   lado de "Texto abaixo".
5. **"+ Acima" no cabeçalho funciona.** Em vez de ficar desabilitado sem explicação, cria um
   cabeçalho novo vazio e o cabeçalho antigo vira a primeira linha do corpo. "Inserir tabela"
   fica desabilitado com o cursor numa tabela (o schema não aceita tabela dentro de célula).
6. **Cada ação da barra é um passo próprio do histórico** (achado na verificação ao vivo):
   ações em sequência rápida (< 500 ms) se fundiam entre si e com a digitação, e desfazer um
   "Apagar tabela" voltava para antes da tabela. A barra fecha o passo antes e depois de cada
   ação (`closeHistory`; `stopCapturing` do Yjs no Esquadrão).

## Critérios de Aceite

- Testes com o Milkdown real: código em linha sem seleção não cria bloco; "+ Acima" no cabeçalho
  gera tabela GFM válida com o cabeçalho novo vazio.
- Testes de componente: Desfazer/Refazer fora da faixa rolável; troca Texto/Tabela; ordem e
  rótulos da faixa de tabela.
- Suíte do frontend e lint sem falhas novas.
- `verify` em 1920×1080 e 360×800: caderno fora e dentro de tabela, com foco no mobile; conferir
  que Desfazer e "Texto abaixo" ficam visíveis sem rolar.

## Fora de Escopo

Pendentes de decisão do autor: hover grudado no toque (`app-botao-icone`, afeta o app inteiro);
esconder o topo do caderno (escopo/busca/filtros) durante a edição no mobile; barra só com foco
nos campos compactos.

## Dependências

`editor-markdown-barra-e-mobile.spec.md` (done).
