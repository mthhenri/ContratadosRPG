# ficha-campanha-card-resistencias-coloridas.spec.md

> Task solta, pedida em conversa (com uma imagem de referência anexada pelo autor, não salva no
> repositório) sobre o glance de Reações/Resistências do `FichaCampanhaCard` (visão de campanha do
> jogador). Revisa a decisão de `ui-34-ficha-completa-redesenho.spec.md` ("Fora de Escopo:
> `FichaCampanhaCard`... decidir depois") só para o recorte de cor das Resistências — o resto do
> redesenho daquela spec continua exclusivo da ficha completa.

## Objetivo

Aproximar o glance de Reações/Resistências do `FichaCampanhaCard` da referência visual do autor:
uma única legenda "só leitura" cobrindo os dois blocos (sem divisor entre eles) e cada Resistência
colorida pelo próprio tipo de dano, em vez do cinza neutro atual.

## Entregáveis

1. **Legenda única.** Os dois `<p class="ficha-cartao__subrotulo...">` de hoje ("Reações" + nota
   "só leitura" / "Resistências" + nota "só leitura") viram um só, texto "Reações e Resistências",
   com a mesma nota "só leitura" condicionada a `!ajustavelAmplo()`. O `<div class="ficha-cartao__divisor">`
   que hoje separa o bloco de Reações do bloco de Resistências sai; os dois blocos (`ficha-combate-rapido`
   e `ficha-resistencias`) passam a viver seguidos, sob a legenda única.
2. **Cor por tipo de dano em `.ficha-resistencia`.** Cada caixa de resistência ganha um modificador
   BEM por `TipoDanoEnum` (`--fisico`/`--balistico`/`--explosao`/`--quimico`/`--geral`), mesmo padrão
   já usado em `resultado-rolagem.component.scss` (`__grupo--<tipo>`, `_tokens.scss`): cor do tipo
   (`--dano-<tipo>`) no valor (`__valor`), borda sutil (`--dano-<tipo>-border`, 40% opacidade) na
   caixa. Sem glow (reservado ao chip de resumo da rolagem) e sem mudar abreviação, fonte do dado ou
   cálculo do total.
3. **Helper de classe no componente.** `FichaCampanhaCard` ganha um método/mapa análogo a
   `SUFIXO_TIPO_DANO`/`classeGrupo` de `resultado-rolagem.component.ts` para montar a classe
   `ficha-resistencia ficha-resistencia--<tipo>` a partir de `resistencia.tipo`.

## Critérios de Aceite

1. Teste focado de `ficha-campanha-card.component.spec.ts` cobre: a legenda única "Reações e
   Resistências" (com/sem nota "só leitura" — hoje sempre com, já que `ajustavelAmplo()` é sempre
   `false` neste componente); ausência do divisor entre os dois blocos; cada uma das 5 resistências
   com a classe de cor correspondente ao seu `TipoDanoEnum`. Suíte completa do `frontend` passa.
2. Verificação ao vivo (skill `verify`) nos 4 viewports padrão (`1920×1080`, `960×1080`, `1366×768`,
   `360×800`) num consumidor real do `FichaCampanhaCard` (ex.: `previa-jogador`/`detalhe-jogador`):
   legenda única sem divisor entre Reações e Resistências, as 5 caixas de Resistências com cor/borda
   por tipo, sem overflow em nenhum viewport.
3. Nenhuma mudança em `FichaVisualizacao`, `ficha-visualizacao.component.scss` ou qualquer outro
   consumidor além de `FichaCampanhaCard`.

## Fora de Escopo

- `FichaVisualizacao`/`visualizar.page` — meta de `ui-34-ficha-completa-redesenho.spec.md`, que
  continua aberta e independente desta task.
- Mudar abreviação (`abreviacaoResistencia`), cálculo, fonte do dado de Resistência ou a lógica de
  edição (inatingível aqui, já que `ajustavelAmplo()` é sempre `false` no card de campanha).
- Extrair `SUFIXO_TIPO_DANO`/`classeGrupo` para um helper compartilhado entre `resultado-rolagem` e
  `ficha-campanha-card` — duplicar o mapa (5 entradas) é aceitável nesta task; se o padrão se repetir
  numa terceira tela, registra-se ideia própria em `IDEAS.md`.
- Qualquer outro ajuste do bloco de Identidade (avatar, chips de classe, Dinheiro/Salário/Patente).

## Dependências

Nenhuma. Tokens `--dano-fisico`/`--dano-balistico`/`--dano-explosao`/`--dano-quimico`/`--dano-geral`
e as variantes `-border`/`-dim` já existem em `docs/design/tema/_tokens.scss`. Padrão de referência
de implementação: `frontend/src/app/shared/resultado-rolagem/resultado-rolagem.component.ts`
(`SUFIXO_TIPO_DANO`, `classeGrupo`) e `.scss` (`&__grupo--<tipo>`).
