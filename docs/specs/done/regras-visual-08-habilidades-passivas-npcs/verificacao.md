# Verificação — regras-visual-08 (passivas de NPC na Biblioteca de Referência)

## Achado que mudou o desenho

A spec supunha reconhecer as passivas no normalizador. O dado vivo é outro: o livro é lido do **banco**, onde as ativas
são peças `HABILIDADE` (com `custo`) e as 11 passivas são peças `PARAGRAFO` com um texto único `Nome [Ex.: …]` + quebra de
linha + `Passiva — …`. O bloco de habilidade exigia custo e sempre exibia o chip de Energia, então o contrato não cobria
"sem custo". O autor decidiu (15/10/2026) **resolver só na leitura**, sem mexer em banco nem em Oficina.

## O que mudou

- `shared/src/livro/projetar-pecas-em-regras.ts`: `reconhecerPassivaDaBiblioteca` (assinatura completa: texto único, duas
  linhas, segunda iniciada por `Passiva`) aplicado apenas aos filhos da seção "Biblioteca de Referência" e **só na leitura**;
  com `incluirPecas` (Oficina) a peça segue parágrafo editável. Resultado: bloco `habilidade` com `custo: null`,
  `reacao: false`, nome e `Passiva (…) — efeito` preservados.
- `custo` passou a `number | "X" | null` (`NormalizadoHabilidade` e `regras.model`); `regras-habilidade` não desenha o selo
  de Energia quando `custo === null` (nunca 0E). Reuso do bloco das ativas: nenhuma receita visual nova.
- Impacto da projeção (5 consumidores): leitor, serviço de Regras (intencionais), Oficina (protegida pela flag), backend de
  condições (só Sistema, sem Biblioteca) e o teste de ida e volta do importador (ver abaixo).

## Testes

- `shared` `projetar-pecas`: 7/7, com três casos novos (reconhece; mantém frequência e separa da ativa; não reconhece fora da
  Biblioteca, sem assinatura completa nem na Oficina).
- `ng test` Regras 304/304 (novo `regras-habilidade.component.spec`: passiva sem chip e sem "0"; ativa com chip).
- Backend `importador`: 19 aprovados. O teste de ida e volta do Guia comparava a projeção ao JSON do normalizador; a diferença
  nova (passiva → habilidade sem custo na leitura) entrou como **diferença aceita nº 4**, calculada com o mesmo
  reconhecedor exportado, sem duplicar a regra. `lint` do backend sem erros; `tsc` do app limpo.

## Ao vivo (Guia → Biblioteca de Referência)

Inventário no DOM: 23 blocos de habilidade com `[Ex.:` = 11 passivas + 11 ativas + o modelo "Nome Neutro"; nenhum parágrafo
solto restante. Operativo 2+2, Veterano 2+2, Elite 3+3, Lendário 4+4, na ordem da fonte; tipo e frequência preservados
("Passiva", "Passiva (uma vez por rodada)", "Passiva (uma vez por combate)"); passivas sem selo e ativas com 4, 3, 6, 7, 10, 12, 8, 18, 15, 14 e 20.
Mesma fonte mono e mesma largura de cartão que as ativas.

| Viewport | Resultado |
|---|---|
| 1920×1080 | 2 colunas de 440px, sem overflow |
| 1366×768, base clara | 2 colunas; nome e efeito 8,24:1; sem overflow |
| 960×1080 | 1 coluna de 545px, sem overflow |
| 360×800 | 1 coluna de 286px, sem overflow de caixa nem de página |

## Limites

- A **Oficina** continua mostrando as passivas como parágrafos (decisão do autor); editar o texto lá reflete na leitura
  desde que a assinatura seja mantida. Se alguém reescrever fora do padrão, volta a ser parágrafo — sem erro.
- Painel flutuante (normal/maximizado) e base escura em 360/960 não foram observados à parte; o componente é o mesmo.
- Capturas de tela do painel do navegador saíram corrompidas; a verificação usou DOM, geometria e contraste calculado.
- Comparação visual lado a lado com o análogo foi estrutural (mesmas classes, fonte, largura), não por imagem.
