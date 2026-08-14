import { RegeneracaoIntensidadeEnum, RegeneracaoModoEnum } from '../../enums';
import type { ValorRegeneracaoCalcularDto } from './criatura.dtos';

/** % da Vida Máxima recuperado por Intensidade e Modo (docs/core/guia_de_mestre-v4.0.0.md —
 * "Guia de Criação de Ameaças" > "Regeneração Natural" > "Intensidades" / "Regeneração
 * Condicional"). Condicional soma o % da Passiva equivalente + 15 pontos percentuais fixos
 * — tabulado direto em vez de recalculado, porque o documento já publica os dois valores
 * finais lado a lado. */
const PERCENTUAL_REGENERACAO: Readonly<Record<RegeneracaoIntensidadeEnum, Readonly<Record<RegeneracaoModoEnum, number>>>> = {
  [RegeneracaoIntensidadeEnum.RESIDUAL]: { [RegeneracaoModoEnum.PASSIVA]: 0.05, [RegeneracaoModoEnum.CONDICIONAL]: 0.2 },
  [RegeneracaoIntensidadeEnum.MODERADA]: { [RegeneracaoModoEnum.PASSIVA]: 0.1, [RegeneracaoModoEnum.CONDICIONAL]: 0.25 },
  [RegeneracaoIntensidadeEnum.ALTA]: { [RegeneracaoModoEnum.PASSIVA]: 0.15, [RegeneracaoModoEnum.CONDICIONAL]: 0.3 },
  [RegeneracaoIntensidadeEnum.SEVERA]: { [RegeneracaoModoEnum.PASSIVA]: 0.25, [RegeneracaoModoEnum.CONDICIONAL]: 0.4 },
  [RegeneracaoIntensidadeEnum.IMPARAVEL]: { [RegeneracaoModoEnum.PASSIVA]: 0.35, [RegeneracaoModoEnum.CONDICIONAL]: 0.5 },
};

/** Valor absoluto de Regeneração Natural, calculado uma vez na criação e registrado como
 * número fixo na ficha (`FichaCriaturaRegeneracaoDto.valor`). */
export function calcularValorRegeneracao(dto: ValorRegeneracaoCalcularDto): number {
  return Math.floor(dto.vidaMaxima * PERCENTUAL_REGENERACAO[dto.intensidade][dto.modo]);
}
