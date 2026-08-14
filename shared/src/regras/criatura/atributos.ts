import type { BaseLimiteAtributosDto, BaseLimiteAtributosObterDto, RealocacaoAtributosValidarDto } from './criatura.dtos';

/**
 * Base, Limite de Atributo e Pontos de Ajuste por faixa de Valor de Desafio
 * (docs/core/guia_de_mestre-v4.0.0.md — "Guia de Criação de Ameaças" > "Atributos" > "Base,
 * Limite e Pontos de Ajuste"). Limite é Base + 3 na maioria das faixas, exceto 80–100 (Base +
 * 4) e 100+ (Base + 5) — por isso a tabela vem com `limite` já resolvido por faixa, em vez de
 * uma fórmula genérica "+3" com dois casos especiais.
 *
 * As faixas do documento ("de 0 a 20", "de 20 a 40", ...) são lidas com o limite superior
 * inclusive na própria faixa (ex.: VD 20 cai em "0 a 20", não em "20 a 40") — convenção
 * assumida na ausência de marcação explícita de aberto/fechado; consistente com o exemplo "A
 * Estátua" (VD 30 cai em "20 a 40" → Base 2, Limite 5, confirmado pelo documento).
 */
const FAIXAS_BASE_LIMITE: readonly { readonly vdMaximo: number; readonly base: number; readonly limite: number }[] = [
  { vdMaximo: 20, base: 1, limite: 4 },
  { vdMaximo: 40, base: 2, limite: 5 },
  { vdMaximo: 60, base: 3, limite: 6 },
  { vdMaximo: 80, base: 4, limite: 7 },
  { vdMaximo: 100, base: 5, limite: 9 },
  { vdMaximo: Infinity, base: 5, limite: 10 },
];

export function obterBaseELimitePorVd(dto: BaseLimiteAtributosObterDto): BaseLimiteAtributosDto {
  const faixa = FAIXAS_BASE_LIMITE.find((item) => dto.vd <= item.vdMaximo) ?? FAIXAS_BASE_LIMITE[FAIXAS_BASE_LIMITE.length - 1];
  return { base: faixa.base, limite: faixa.limite, pontosAjuste: Math.floor(dto.vd / 5) };
}

/**
 * Valida que os dez atributos finais (Base + Pontos de Ajuste + Realocação) respeitam o
 * Limite da faixa de VD e não caem abaixo de 0 — a Realocação pode retirar até 3 pontos de um
 * atributo e zerá-lo, mas não negativá-lo (doc: "pode cair abaixo da base, inclusive até
 * zero"). Retorna a lista de violações (vazia = ficha coerente), mesmo padrão de
 * `validarDistribuicaoAtributos` em `shared/regras/agente/criacao.ts`.
 */
export function validarRealocacaoAtributos(dto: RealocacaoAtributosValidarDto): readonly string[] {
  const violacoes: string[] = [];
  for (const [atributo, valor] of Object.entries(dto.atributosFinal)) {
    if (valor < 0) violacoes.push(`${atributo}: valor abaixo de 0`);
    if (valor > dto.limite) violacoes.push(`${atributo}: valor acima do limite (${dto.limite})`);
  }
  return violacoes;
}
