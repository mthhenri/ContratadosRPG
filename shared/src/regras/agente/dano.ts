import { ClasseEnum } from '../../enums';
import { DanoCorpoCalcularDto, DanoFurtivoCalcularDto } from './agente.dtos';

/** Níveis que concedem +1D6+1 de dano furtivo (doc — tabela de "Progressão"). */
const MARCOS_DANO_FURTIVO: readonly number[] = [3, 6, 9, 12, 15, 18];

/**
 * Expressão de dano de Corpo (dado + tipo). A saída é uma notação de dado pronta
 * para exibição — os consumidores (calculadora, ficha) apenas a mostram.
 *
 * Agente (doc — "Corpo e Pontuação Corporal"): a Pontuação Corporal é Força +
 * Vigor e mapeia para a tabela abaixo. Civil (doc — "Jogando como um Civil"):
 * dano de corpo = Força − 1 (mínimo 0).
 */
export function calcularDanoCorpo(dto: DanoCorpoCalcularDto): string {
  if (dto.classe === ClasseEnum.CIVIL) {
    const dano = Math.max(dto.forca - 1, 0);
    return `${dano} [Físico]`;
  }

  const pontuacao = dto.forca + dto.vigor;
  if (pontuacao < 0) return '0 Dano';
  if (pontuacao <= 1) return '1 [Físico]';
  if (pontuacao <= 3) return '1D3 [Físico]';
  if (pontuacao <= 5) return '1D4 [Físico]';
  if (pontuacao <= 7) return '1D6 [Físico]';
  if (pontuacao <= 9) return '2D6 [Físico]';
  if (pontuacao <= 11) return '3D6 [Físico]';
  if (pontuacao === 12) return '4D6 [Físico]';
  return '4D6+7 [Físico]';
}

/**
 * Expressão do dano Furtivo do agente. Inicia em 1D6+1 no Nível 0 e ganha +1D6+1
 * a cada marco (Níveis 3, 6, 9, 12, 15 e 18) — doc "Progressão". Civis não
 * possuem dano furtivo (doc — "Jogando como um Civil"), retorna `null`.
 */
export function calcularDanoFurtivo(dto: DanoFurtivoCalcularDto): string | null {
  if (dto.classe === ClasseEnum.CIVIL) {
    return null;
  }
  const marcosAtingidos = MARCOS_DANO_FURTIVO.filter((marco) => marco <= dto.nivel).length;
  const dados = 1 + marcosAtingidos;
  return `${dados}D6+${dados}`;
}
