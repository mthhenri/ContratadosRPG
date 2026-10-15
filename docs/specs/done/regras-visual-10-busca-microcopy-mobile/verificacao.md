# Verificação — regras-visual-10 (busca: singular e seta)

## O que mudou

`RegrasPesquisa.rotuloResultados` flexiona "1 resultado" / "N resultados" (também para zero) nos dois resumos. A ação do
outro livro passou a usar o primitivo completo: `<app-icone nome="chevron-direita">` + `posicaoIcone="direita"` no lugar da
seta `→` digitada no texto; legenda "N resultado(s) no outro documento". Navegação, foco, termo e revelação mantidos.

## Testes

- `ng test --include=src/app/modules/regras`: 302 aprovados, com novo teste de pluralização (0, 1, 2).

## Ao vivo (app real)

Contagens observadas no Sistema (trilho desktop): `Amaldiçoado` → "3 resultados"; `Mercenário` → "1 resultado";
`torturar` → vazio + "1 RESULTADO NO OUTRO DOCUMENTO"; `xyzxyz` → vazio sem ação; `Combatente` → "5 resultados" e "2 RESULTADOS NO
OUTRO DOCUMENTO".

- 360×800, Guia → gaveta do Sumário → `Mercenário`: botão com classes `botao--icone-direita`, texto e ícone na mesma linha
  (y 404/405), legenda "1 RESULTADO NO OUTRO DOCUMENTO", sem linha só com a seta. A ação trocou para o Sistema, manteve
  o termo e foi ao primeiro resultado.
- 960×1080 (trilho estreito de 248px): a legenda quebra em duas linhas e o ícone fica ao lado do bloco de texto,
  centralizado; não há linha composta só pela seta.

## Limites

- Não foi observado 1920×1080 para a busca (mesmo componente do trilho a 1366 e 960), nem a base clara, nem o painel
  flutuante maximizado.
- Capturas de tela do painel do navegador saíram corrompidas; a verificação usou geometria do DOM, sem imagem.
- As transições da gaveta ficam congeladas no navegador embutido; foram desligadas por CSS injetado só na sessão de teste.
