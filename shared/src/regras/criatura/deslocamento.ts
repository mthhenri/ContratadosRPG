import type { DeslocamentoSugeridoDto, DeslocamentoTerrestreSugerirDto } from './criatura.dtos';

/** Faixas de Deslocamento Terrestre sugerido por Destreza (docs/core/guia_de_mestre-v4.0.0.md
 * — "Guia de Criação de Ameaças" > "Deslocamento" > "Terrestre") — pura sugestão de
 * referência; o valor final é sempre declarado pelo Mestre conforme o conceito, nunca
 * calculado automaticamente a partir do atributo. Destreza acima de 10 (fora da tabela) cai
 * na última faixa como referência de teto. */
const FAIXAS_DESLOCAMENTO: readonly { readonly destrezaMaxima: number; readonly minimo: number; readonly maximo: number }[] = [
  { destrezaMaxima: 0, minimo: 4, maximo: 6 },
  { destrezaMaxima: 2, minimo: 7, maximo: 9 },
  { destrezaMaxima: 4, minimo: 10, maximo: 12 },
  { destrezaMaxima: 6, minimo: 13, maximo: 16 },
  { destrezaMaxima: 8, minimo: 17, maximo: 20 },
  { destrezaMaxima: 10, minimo: 21, maximo: 25 },
];

export function sugerirDeslocamentoTerrestre(dto: DeslocamentoTerrestreSugerirDto): DeslocamentoSugeridoDto {
  const faixa =
    FAIXAS_DESLOCAMENTO.find((item) => dto.destreza <= item.destrezaMaxima) ??
    FAIXAS_DESLOCAMENTO[FAIXAS_DESLOCAMENTO.length - 1];
  return { minimo: faixa.minimo, maximo: faixa.maximo };
}
