# icones-identidade-cards-agente.spec.md

> Spec avulsa. Pedido do autor em 2026-10-14: colocar os ícones da classe, do arquétipo e da
> subclasse (Experimento, Civil, Agente…) onde a classe aparece, a começar pelos cards de jogador.

## Objetivo

Onde a identidade de um agente é exibida em texto ("Combatente - Lutador", "Experimento - Bestial",
"Civil"), mostrar também os ícones da família de identidade já aprovada (m10-03), ao lado do texto.

## Situação atual (levantada em 2026-10-14)

- Glifos já existem em `app-icone`: `combatente`, `especialista`, `suporte`, os nove arquétipos
  (`lutador`…`comandante`), `bestial`, `artificial`, `hibrido`, `civil`, `npc`, além de `agente`
  (navegação). **Não há** glifo genérico de "Experimento".
- O único mapa é textual: `modules/regras/blocos/regras-identidade-icone.ts` (nome normalizado → ícone),
  usado no leitor de Regras. Não há mapa por `ClasseEnum`/`ArquetipoEnum`.
- Rótulos: `perfilClasseRotulos`/`rotuloClasseCompleto` (`modules/ficha/rotulos-ficha.ts`) — classe base +
  subclasse (arquétipo, ou Bestial/Artificial/Híbrido).
- Onde a classe aparece em texto: `ficha-campanha-card` (linha "patente · classe · subclasse" e bloco de
  identidade), `espectador-ficha-card`, `esquadrao-cena-jogador`, `detalhe-jogador` (Esquadrão),
  `cartao-ficha-acervo`, `seletor-combatentes`, leituras do encontro (`encontro-leitura.util.ts`).

## Entregáveis

1. Mapas por enum em `shared/icone/icones-dominio.ts`: `ICONE_CLASSE` (`ClasseEnum` → ícone, com os
   Experimentos apontando para a subclasse) e `ICONE_ARQUETIPO`, com teste de cobertura total. Avaliar
   (impacto) fazer `regras-identidade-icone.ts` delegar a eles sem mudar o que o leitor exibe.
2. Lista de consumidores com proposta de onde e como entra o ícone (só classe base, classe + subclasse,
   tamanho, ícone antes do texto com `appTooltip`), **aprovada pelo autor** antes de aplicar.
3. Aplicação nos consumidores aprovados, começando pelos cards de jogador (Esquadrão da campanha, card da
   ficha, Investigação, Acervo).

## Decisões em aberto (autor)

1. **Ícone de "tipo" do personagem** (Agente / Experimento / Civil) além da classe: o pedido cita
   "agente". Opções: (a) não mostrar tipo, a classe já diz; (b) usar `agente` para agentes e criar um
   glifo "Experimento" (prancha para voto); (c) usar a marca `scp` para Experimento.
2. Experimento mostra só a subclasse (`bestial`…) ou um ícone de Experimento + a subclasse.
3. Em quais telas além dos cards (encontro, seletor de combatentes, ficha completa).

## Critérios de Aceite

- Toda classe/arquétipo com ícone no mapa (teste); nenhuma tela do leitor de Regras muda.
- Gate visual (`design-fidelity` + `verify`) em `1920×1080` e `360×800`, análogo: o ícone de identidade
  dos dossiês do leitor de Regras e a linha de recursos do `espectador-ficha-card` (ícone + texto); nome
  longo de classe sem overflow nem truncamento novo. Testes, lint, build, `npm run repo:verificar`.

## Fora de Escopo

Redesenhar os glifos de m10-03, ícones de criatura/NPC (ver `icones-criatura-vd-tenacidade`).

## Dependências

`docs/specs/done/m10-03-icones-identidade.spec.md`; skill `gerenciamento-de-impacto`.
