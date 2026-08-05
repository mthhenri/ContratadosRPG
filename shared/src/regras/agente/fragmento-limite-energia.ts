import type { LimiteMinimoEnergiaMaximaFragmentosCalcularDto } from './agente.dtos';

/**
 * "Limite mínimo de Energia" e o estado derivado "Anomalia Biológica" (doc —
 * "⬥ Afinidade com Fragmentos" > "⬦ Limite mínimo de Energia"; m3-67).
 *
 * **Não confundir com `calcularLimiteEnergia`** (`agente/saude.ts`): aquela função é sobre o quanto
 * a **Energia atual** pode ficar negativa antes de penalidade (`Destreza × 2` pra agente, só
 * `Destreza` pra Civil — doc, seção "Energia" > "Limites de Energia"). Esta aqui é sobre o teto da
 * **Energia Máxima**, especificamente no contexto de portar Fragmentos, e usa
 * `(Vigor + Destreza) × 2` de verdade — a fórmula "ingênua" que o docstring de `calcularLimiteEnergia`
 * já registra ter descartado pra aquele outro conceito. Os dois nascem da mesma frase do documento
 * ("Vigor + Destreza"), mas resolvem perguntas diferentes; nomeada `limiteMinimoEnergiaMaximaFragmentos`
 * (não `calcularLimiteEnergia...`) de propósito, pra não repetir a confusão.
 */

/**
 * Limite mínimo de Energia Máxima abaixo do qual portar Fragmentos empurra o agente pra "Anomalia
 * Biológica" — `(Vigor + Destreza) × 2` (doc: "⬦ Limite mínimo de Energia").
 */
export function limiteMinimoEnergiaMaximaFragmentos(
  dto: LimiteMinimoEnergiaMaximaFragmentosCalcularDto,
): number {
  return (dto.vigor + dto.destreza) * 2;
}

/**
 * `true` quando a Energia Máxima **atual** (já reduzida pelos Fragmentos portados) está abaixo do
 * limite mínimo — o agente **está** em "Anomalia Biológica" (doc). Estado 100% derivado dos números
 * atuais, sem campo persistido de "decisão do jogador" (mesma filosofia de `m3-10`): a conta bate ou
 * não bate; o jogador decide narrativamente "largar" um Fragmento (sai do estado) ou continuar
 * (nada acontece no motor — só o aviso/exibição informativa que este módulo alimenta).
 */
export function emAnomaliaBiologica(
  energiaMaximaAtual: number,
  limiteMinimoEnergiaMaxima: number,
): boolean {
  return energiaMaximaAtual < limiteMinimoEnergiaMaxima;
}

/**
 * Penalidade fixa em todos os testes durante Anomalia Biológica (doc). **Informativa** — não é
 * aplicada ao motor de rolagem (nenhuma alteração em `calcularDefesa`/rolagem por pedido explícito
 * da spec, risco desproporcional); a ficha só exibe o valor, aplicação é manual.
 */
export const PENALIDADE_TESTES_ANOMALIA_BIOLOGICA = -15;

/** Penalidade fixa em Defesa durante Anomalia Biológica (doc). Mesma ressalva de aplicação manual. */
export const PENALIDADE_DEFESA_ANOMALIA_BIOLOGICA = -10;

/** Percentual da Vida Máxima que trava a Vida atual durante Anomalia Biológica (doc: "10%"). */
const PERCENTUAL_TETO_VIDA_ANOMALIA_BIOLOGICA = 0.1;

/**
 * Teto de Vida atual durante Anomalia Biológica — "vida atual não pode ficar superior a 10% da sua
 * vida máxima" (doc). Arredondado pra baixo, mesmo critério de `calcularVida`/`calcularEnergia`.
 */
export function tetoVidaAnomaliaBiologica(vidaMaxima: number): number {
  return Math.floor(vidaMaxima * PERCENTUAL_TETO_VIDA_ANOMALIA_BIOLOGICA);
}

/**
 * Nome do trauma aplicado a quem passa uma cena em Anomalia Biológica (doc). **Nunca auto-aplicado**
 * — o doc condiciona a julgamento do Mestre ("passar uma cena nesse estado"); este módulo só expõe
 * nome/descrição prontos pro atalho de registro manual na aba Sanidade (m3-12).
 */
export const TRAUMA_LIMIAR_HUMANIDADE_NOME = 'Limiar da Humanidade';

/** Descrição/efeitos do trauma "Limiar da Humanidade" (doc), pro atalho de registro pré-preencher. */
export const TRAUMA_LIMIAR_HUMANIDADE_DESCRICAO =
  '+2 ao custo da habilidade de Personalidade; -5 em todas as resistências (podendo negativá-las); ' +
  'tratamento custa 3× mais que um trauma convencional.';
