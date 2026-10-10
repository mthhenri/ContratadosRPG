# icones-recursos-sistema.spec.md

> **Rodada arquivada por decisão do autor em 09/10/2026:** ícones e adoção entregues,
> votação implementada em task própria. Glifos, conceitos sem ícone e divergências
> remanescentes continuam abertos em
> [icones-recursos-glifos-e-pendencias](../backlog/icones-recursos-glifos-e-pendencias.spec.md).
> O arquivo abaixo preserva o contrato e os limites da rodada; o arquivamento não
> certifica os critérios ainda sem cobertura. [Fecho](icones-recursos-sistema/fecho-documental.md).

> **Spec avulsa, fora da numeração do M10** (pedido do autor, 2026-10-06). Nasce da revisão do
> exemplão do M10 (`docs/specs/done/m10-regras/m10-regras-exemplao.html`, aba *Ícones*), onde o trio
> Vida/Energia/Defesa foi decidido. A **entrega 1** é pré-requisito da `m10-07`; as demais correm
> no seu próprio ritmo. Pode ser quebrada em tasks numeradas se o levantamento (entrega 3) crescer.

> **Antes de qualquer UI:** `docs/design/DESIGN.md` e `docs/design/tema/`; skills
> `design-fidelity` e `verify`.

## Objetivo

Dar a Vida, Energia e Defesa ícones próprios em todo o site, no lugar de "E"/"Vida"/"Defesa"
escritos, e levantar com o autor que outros ícones fariam falta ao sistema.

## Decisões já tomadas (exemplão, aba *Ícones* → *Recursos*)

- Vida, Energia e Defesa são um **trio preenchido** — exceção deliberada ao resto do `app-icone`,
  que é contorno.
- Vida: opção **A**, coração cheio **sem pulso**, com **raio cheio** na Energia.
  Confirmação explícita do autor em 08/10/2026; corrige a descrição anterior do pulso.
- Valor com ícone sempre tem **`appTooltip` por extenso** ("3 de Energia", "12 de Vida") — o ícone
  sozinho não pode ser a única leitura do valor.

## Entregáveis

1. **Trio no `app-icone`:** `vida`, `energia`, `defesa`, com o SVG decidido no exemplão; variante
   preenchida documentada em `DESIGN.md`. Teste do componente. *(pré-requisito da `m10-07`)*
2. **Adoção no site:** levantar todos os pontos onde aparecem valores de Vida, Energia e Defesa
   (ficha de jogador, criatura e NPC, encontro de combate, simulação, compras/habilidades com custo
   em Energia, calculadoras) e acrescentar o ícone + `appTooltip` ao lado do texto (decisão do autor em 09/10/2026, no
   lugar de substituí-lo; só onde há valor numérico). Relato em `icones-recursos-sistema/entrega-2-verificacao.md`.
   **Verificação ao vivo fechada em 09/10/2026** (segunda rodada no mesmo relato); o tooltip por extenso
   ficou como divergência para decisão do autor.
   Lista dos pontos no fecho, tela por tela. Sem mudar cálculo nem dado.
3. **Levantamento de outros ícones** — com o autor, antes de desenhar:
   - **Glifos de texto usados como ícone** no frontend (⬢ ⬡ ⬥ ⬦ ◈ ◻ ■ □ e afins em templates/SCSS):
     varredura com arquivo e uso de cada um, separando o que é convenção do texto do jogo (fica) do
     que faz papel de ícone de interface (candidato a `app-icone`).
   - **Conceitos do sistema sem ícone** que aparecem como rótulo repetido nas telas (tirados de
     `docs/core/` e das telas reais — nunca inventar conceito).
   - Entrega: prancha HTML nos anexos desta spec no formato da aba *Ícones* do exemplão (três
     opções por item, votação do autor/testers). Implementar só o que for aprovado, em task própria.
   **Votação dos 21 itens da prancha concluída em 09/10/2026** (`icones-recursos-sistema/votacao-prancha.md`);
   a implementação está em `docs/specs/done/icones-dano-habilidade-fragmento-reacao.spec.md`. O levantamento
   de glifos de texto e de conceitos sem ícone segue aberto aqui.

## Verificação

Entrega 1: ícones a 14/16/24px, temas escuro e claro. Entrega 2: `verify` em 1920×1080 e 360×800
em cada tela tocada, conferindo tooltip, contraste e alinhamento com o valor.

## Fora de escopo

Os ícones de identidade (`m10-03`); refino de desenho dos ícones já decididos (`IDEAS`).
