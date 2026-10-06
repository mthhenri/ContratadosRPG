import type { BaseLimiteAtributosDto, BaseLimiteAtributosObterDto } from './criatura.dtos';
import type {
    CriaturaAtributosDistribuicaoCalcularDto, CriaturaAtributosDistribuicaoDto,
    CriaturaAtributosRealocacaoValidarDto,
} from "../../dtos/ficha";

/**
 * Base, Limite de Atributo e Pontos de Ajuste por faixa de Valor de Desafio
 * (docs/core/guia_de_mestre-v4.2.0.md — "Guia de Criação de Ameaças" > "Atributos" > "Base,
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

const LIMITE_REALOCACAO = 3;

/** Guia v4.2.0 > Realocação de Pontos: orçamento único entre todas as origens. */
export function calcularDistribuicaoAtributosCriatura(
    dto: CriaturaAtributosDistribuicaoCalcularDto,
): CriaturaAtributosDistribuicaoDto {
    const { base, limite, pontosAjuste } = obterBaseELimitePorVd({ vd: dto.vd });
    const violacoes: string[] = [];
    let gastos = 0;
    let pontosRealocados = 0;
    for (const [atributo, valor] of Object.entries(dto.atributosFinal)) {
        if (!Number.isInteger(valor)) {
            violacoes.push(`${atributo}: valor deve ser inteiro`);
            continue;
        }
        if (valor > limite) violacoes.push(`${atributo}: valor acima do limite (${limite})`);
        gastos += valor - base;
        pontosRealocados += Math.max(0, base - valor);
    }
    const saldo = pontosAjuste - gastos;
    if (pontosRealocados > LIMITE_REALOCACAO) {
        violacoes.push(
            `realocação: ${pontosRealocados} pontos retirados excedem o limite total de 3`,
        );
    }
    if (saldo > 0) violacoes.push(`atributos: restam ${saldo} pontos para distribuir`);
    if (saldo < 0) violacoes.push(`atributos: distribuição excede o orçamento em ${-saldo} pontos`);
    return {
        base, limite, minimo: base - LIMITE_REALOCACAO, pontosAjuste,
        pontosRealocados, limiteRealocacao: LIMITE_REALOCACAO, gastos, saldo, violacoes,
    };
}

/** Valida somente a distribuição inicial; edição de snapshots não passa por este orçamento. */
export function validarRealocacaoAtributos(
    dto: CriaturaAtributosRealocacaoValidarDto,
): readonly string[] {
    return calcularDistribuicaoAtributosCriatura(dto).violacoes;
}
