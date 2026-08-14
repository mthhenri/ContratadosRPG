import { CustoAcaoEnum } from '../../enums';
import type { DanoReferenciaObterDto, DanoReferenciaTurnoObterDto } from './criatura.dtos';

/**
 * Tabela de dano de referência por faixa de VD e custo de ação
 * (docs/core/guia_de_mestre-v4.0.0.md — "Guia de Criação de Ameaças" > "Ações e Habilidades" >
 * "Ataques" > "Dano e Escala") — é referência, nunca teto; o Mestre pode ajustar em qualquer
 * direção, desde que preserve a distância entre colunas e nunca zere o fixo (regras
 * qualitativas, não verificáveis por este motor a partir de uma string de dano livre).
 *
 * A coluna "Turno" (dano total possível numa rodada inteira) não corresponde a um
 * `CustoAcaoEnum` — não é custo de uma ação isolada, é a soma de referência do turno completo
 * — por isso fica em `obterDanoReferenciaTurnoPorVd`, separada de `obterDanoReferenciaPorVd`.
 *
 * Mesma convenção de faixa do resto do módulo (limite superior inclusive na própria faixa) —
 * ver `atributos.ts`.
 */
const FAIXAS_DANO_REFERENCIA: readonly {
  readonly vdMaximo: number;
  readonly movimento: string;
  readonly padrao: string;
  readonly completa: string;
  readonly turno: string;
}[] = [
  { vdMaximo: 20, movimento: '2D10', padrao: '2D12+6', completa: '3D12+10', turno: '4D20' },
  { vdMaximo: 40, movimento: '3D12+4', padrao: '4D12+10', completa: '6D12+16', turno: '4D20+34' },
  { vdMaximo: 60, movimento: '5D12+4', padrao: '6D12+18', completa: '5D20+36', turno: '8D20+40' },
  { vdMaximo: 80, movimento: '6D12+10', padrao: '4D20+34', completa: '7D20+44', turno: '8D20+80' },
  { vdMaximo: 100, movimento: '5D20+10', padrao: '5D20+42', completa: '10D20+42', turno: '10D20+100' },
  { vdMaximo: Infinity, movimento: '7D20+8', padrao: '8D20+42', completa: '10D20+90', turno: '10D20+168' },
];

const CAMPO_POR_CUSTO_ACAO: Readonly<Record<CustoAcaoEnum, 'movimento' | 'padrao' | 'completa'>> = {
  [CustoAcaoEnum.MOVIMENTO]: 'movimento',
  [CustoAcaoEnum.PADRAO]: 'padrao',
  [CustoAcaoEnum.COMPLETA]: 'completa',
};

function obterFaixaDano(vd: number) {
  return FAIXAS_DANO_REFERENCIA.find((item) => vd <= item.vdMaximo) ?? FAIXAS_DANO_REFERENCIA[FAIXAS_DANO_REFERENCIA.length - 1];
}

export function obterDanoReferenciaPorVd(dto: DanoReferenciaObterDto): string {
  return obterFaixaDano(dto.vd)[CAMPO_POR_CUSTO_ACAO[dto.custoAcao]];
}

/** Referência de dano total possível numa rodada completa (coluna "Turno" da tabela) — não é
 * um `CustoAcaoEnum` isolado, ver nota do módulo. */
export function obterDanoReferenciaTurnoPorVd(dto: DanoReferenciaTurnoObterDto): string {
  return obterFaixaDano(dto.vd).turno;
}
