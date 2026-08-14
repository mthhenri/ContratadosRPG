import { ModificadorCriaturaEnum } from '../../enums';
import type { AtributoEfetivoCalcularDto, ValorModificadorCalcularDto } from './criatura.dtos';

/**
 * Valor de um Modificador de criatura para o VD informado (docs/core/guia_de_mestre-v4.0.0.md
 * — "Guia de Criação de Ameaças" > "Modificadores" > "Valores"). Base em VD 5, com incremento
 * a cada +5 de VD acima disso; valores não-inteiros são arredondados para baixo (regra
 * explícita do documento).
 *
 * DIVERGÊNCIA DOCUMENTADA vs. exemplo "A Estátua": para VD 30 esta fórmula dá Fraco = -2 +
 * 5×1,5 = 5,5 → 5, mas o exemplo do guia mostra "Fraco +6" para os três atributos Fraco da
 * Estátua (Intelecto, Medicina, Vontade). Forte (0+5×2,5=12,5→12), Médio (-1+5×2=9) e Frágil
 * (-3+5×1=2) do mesmo exemplo batem exatamente com a fórmula — só o valor de Fraco diverge,
 * o que aponta para um erro de transcrição no exemplo, não na fórmula geral (que vem com uma
 * regra de arredondamento explícita logo abaixo da tabela). A fórmula geral vence (decisão de
 * abertura da m4-02) — ver `a-estatua.spec.ts`.
 */
const MODIFICADOR_BASE_VD5: Readonly<Record<ModificadorCriaturaEnum, number>> = {
  [ModificadorCriaturaEnum.FORTE]: 0,
  [ModificadorCriaturaEnum.MEDIO]: -1,
  [ModificadorCriaturaEnum.FRACO]: -2,
  [ModificadorCriaturaEnum.FRAGIL]: -3,
};

const MODIFICADOR_INCREMENTO_POR_5_VD: Readonly<Record<ModificadorCriaturaEnum, number>> = {
  [ModificadorCriaturaEnum.FORTE]: 2.5,
  [ModificadorCriaturaEnum.MEDIO]: 2,
  [ModificadorCriaturaEnum.FRACO]: 1.5,
  [ModificadorCriaturaEnum.FRAGIL]: 1,
};

export function calcularValorModificador(dto: ValorModificadorCalcularDto): number {
  const passos = (dto.vd - 5) / 5;
  const valor = MODIFICADOR_BASE_VD5[dto.tipo] + passos * MODIFICADOR_INCREMENTO_POR_5_VD[dto.tipo];
  return Math.floor(valor);
}

/** Atributo Efetivo = Atributo Final + valor do Modificador — usado em testes, reações e ataques. */
export function calcularAtributoEfetivo(dto: AtributoEfetivoCalcularDto): number {
  return dto.atributoFinal + calcularValorModificador({ tipo: dto.modificador, vd: dto.vd });
}
