# Quadro de investigação — desenho

> Anexo de `quadro-investigacao-campanha.spec.md`. Sai do protótipo aprovado pelo autor em
> 2026-11-25 (`prototipo.html`, com dados fictícios). Os valores abaixo são os do protótipo e
> servem de ponto de partida. Na implementação, a interface usa os tokens do Terminal de
> Contenção, e só o objeto (cortiça, papel, pino e fio) tem cor própria.

## Mural

- **Cortiça:** base `#9a6c40`, com três camadas de pontos irregulares e uma vinheta escura nas
  bordas. Não há grade nem padrão visível de linhas.
- **Navegação:**
  - Arrastar o fundo move a vista.
  - A roda dá zoom no ponto do cursor (com Ctrl, mais rápido); a pinça de dois dedos dá zoom no
    centro dos dedos.
  - O zoom vai de 0,12 a 2,5. "Ver tudo" enquadra fichas e zonas com folga.
  - A vista (x, y, escala) é lembrada no navegador. Na primeira visita, o quadro abre enquadrado.
- **Limiar de arrasto:** 4px no mouse e 9px no toque. Abaixo disso, o gesto é toque.

## Ficha

- **Papel por tipo:** `PISTA` `#fbe7a1`, `BASTIDOR` `#dccbf2`, `ABERTO` `#f8c8a0`, `AMEACA`
  `#f3a3ad`. O texto é sempre escuro (`#1f1b16`), nos dois temas.
- **Forma:** larguras de 260, 320, 380 ou 460, e altura que acompanha o texto. Padding de
  24/16/14px, rotação de −3° a 3° com origem no topo central (o pino não sai do lugar) e
  sombra de papel. Ao arrastar, a sombra cresce e a ficha fica por cima.
- **Título:** Special Elite 20px. O texto vem em Markdown simples: parágrafo, lista e negrito.
- **Faixas do mestre:** ficam no rodapé, separadas por linha tracejada, com rótulo pequeno
  ("Bastidor", em `#dccbf2`, e "Decidir", em `#f8c8a0`).
- **"editar":** botão discreto no canto superior direito, mais visível no toque.
- **Seleção:** um toque seleciona a ficha (contorno claro) e um toque duplo abre o editor.
- **Faixas e tipo `BASTIDOR`:** só aparecem no quadro do mestre. O quadro dos jogadores usa
  `PISTA`, `AMEACA` e `ABERTO` (hipótese).
- **Só leitura** (espectador, e o mestre no quadro dos jogadores): sem "editar" e sem arrasto.

## Pino e fio

- **Pino:** fica no topo central da ficha, em (x + largura/2, y + 7). É desenhado por cima dos
  fios: um círculo de raio 8 com gradiente de `#ff6d6d` a `#b3141c` e `#55070b`, brilho pequeno e
  sombra deslocada (1,5; 4).
- **Fio:**
  - O fio é uma curva quadrática de pino a pino. O ponto de controle fica no meio, descido de
    `min(170, distância × 0,2)`, o que dá a caída.
  - O traço é `#b3141c`, com 2,4 de espessura e ponta arredondada, sobre uma sombra
    `rgba(25,8,0,.28)` deslocada (3; 6).
  - Os fios passam por cima das fichas e por baixo dos pinos.
- **Etiqueta do fio:** fica no ponto médio da curva, com fundo papel claro, borda fina, Special
  Elite 13px e rotação de −2°. Fio sem etiqueta tem um alvo invisível no meio, que aparece ao
  passar o mouse, para dar para editar.
- **Ligar:** com o modo "Ligar" ativo, toca-se a primeira ficha (contorno tracejado vermelho) e
  depois a segunda. Esc sai do modo.

## Zona

- Etiqueta de papel `#f3ead6` em Special Elite 28px, com rotação de −1,2° e duas tiras de fita
  semitransparentes nas pontas. Pode ser arrastada.
- O sumário agrupa as fichas pela zona indicada ou, sem ela, pela zona mais próxima acima da
  ficha.

## Interface sobre o mural (tokens do tema)

- **Barra:** Sumário, Nova nota, Ligar notas, Nova zona, Ver tudo, − e +. No mestre, há também o seletor "Meu quadro / Quadro dos jogadores". No celular, rola para o
  lado com rótulos curtos ("+ Nota", "Ligar", "+ Zona", "Tudo").
- **Legenda flutuante:** fica no canto inferior esquerdo, sempre visível, e recolhe e expande
  pelo título. A recolhida mostra só as cores. No celular, abre recolhida. A escolha fica
  lembrada.
- **Sumário:**
  - É um painel à direita com busca (título, texto e faixas, essas só para o mestre).
  - As fichas aparecem agrupadas por zona, com um ponto da cor do tipo.
  - Tocar no nome leva até a ficha; "renomear" edita o nome ali mesmo (Enter salva, Esc
    cancela).
  - No celular, vira uma gaveta de 66% da altura, que fecha ao ir até a ficha.
- **Editor:** campos de nome, tipo, largura, texto e as faixas. Excluir pede confirmação em dois
  toques. No celular, abre em tela cheia, com as ações fixas embaixo.
- **Aviso de estado:** pílula no rodapé central ("Abrindo o quadro…", erro de gravação, instrução
  do modo Ligar).

## Formato de importação (o do protótipo)

```json
{
  "notes": { "<id>": { "title": "", "kind": "mesa|bastidor|aberto|ameaca", "body": "",
                       "secret": "", "open": "", "x": 0, "y": 0, "w": 320, "r": 0 } },
  "links": { "<id>": { "a": "<id da nota>", "b": "<id da nota>", "label": "" } },
  "zones": { "<id>": { "title": "", "x": 0, "y": 0 } }
}
```

Mapeamento: `mesa` → `PISTA`, `ameaca` → `AMEACA`, `aberto` → `ABERTO`, `bastidor` → `BASTIDOR`;
`secret` → faixa Bastidor, `open` → faixa Decidir.
