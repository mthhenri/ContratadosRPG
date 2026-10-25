# regras-flutuante-layout-e-redimensionamento.spec.md

> Task avulsa solicitada pelo autor em 24/10/2026. Prévia visual aprovada no chat;
> implementação autorizada expressamente. Não altera o conteúdo dos livros.

## Objetivo

Organizar a janela flutuante de Regras conforme a prévia aprovada e permitir
alterar sua largura e altura por arraste, mantendo os padrões do produto.

## Entregáveis

1. Barra com Sumário à esquerda e Sistema/Guia à direita, com respiro interno;
   campo “Pesquisar no livro…” numa linha própria abaixo, sem lupa isolada.
   Reutilizar pesquisa, destaques, contador e resultados existentes; o sumário
   mantém a lista de resultados, sem duplicar o campo no painel compacto.
2. Alça de redimensionamento no canto inferior direito, análoga ao Caderno;
   dimensões limitadas ao viewport e mínimo utilizável. Maximizar/restaurar
   preserva o tamanho escolhido; no celular, permanece folha cheia.
3. Página completa e Oficina preservam sua apresentação e comportamento.
4. Relatório de verificação em `regras-flutuante-layout-e-redimensionamento/`;
   capturas e saídas locais em `.artifacts/regras-flutuante-layout-e-redimensionamento/`.

## Critérios de Aceite

- Testes de arraste de tamanho, limites, restauração e ausência da alça no celular.
- Teste do campo acessível na barra apenas no painel compacto, sem duplicação;
  limpar/Enter/Escape e navegação entre ocorrências continuam funcionando.
- Aplicação real observada em 1920×1080, 1366×768, 960×1080 e 360×800:
  painel inicial/redimensionado/maximizado/restaurado, Sistema/Guia, sumário,
  pesquisa com e sem resultados, foco, leitura e página completa.
- Comparação com prévia aprovada e Caderno (moldura/alça), com controles
  canônicos, densidade equivalente e sem overflow.
- Build, testes, lint e `npm run repo:verificar` aprovados, com limites registrados.

## Fora de Escopo

Regras de jogo, conteúdo publicado, publicação/deploy, redesign dos primitivos,
outros utilitários flutuantes e mudança do mecanismo de pesquisa.

## Dependências

`docs/SYSTEM.SPEC.md`, `docs/CONVENTIONS.md`, `docs/design/DESIGN.md`,
`docs/design/tema/` e prévia aprovada pelo autor no chat.
