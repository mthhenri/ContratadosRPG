import { ClasseEnum } from '../../enums';
import { DanoCorpoCalcularDto, DanoFurtivoCalcularDto } from './agente.dtos';

/** Níveis que concedem +1D6+1 de dano furtivo (doc — tabela de "Progressão"). */
const MARCOS_DANO_FURTIVO: readonly number[] = [3, 6, 9, 12, 15, 18];

/** Notação de dano furtivo `Nd6+M` (D6 fixo + valor fixo), tolerante a caixa/espaços. */
const PADRAO_DANO_FURTIVO = /^(\d+)\s*[dD]6\s*(?:\+\s*(\d+))?$/;

/**
 * Quantos marcos de dano furtivo (Níveis 3/6/9/12/15/18) um Nível já atingiu. O dano furtivo é
 * `(1 + marcos)D6 + (1 + marcos)`; a diferença de marcos entre dois Níveis é quantos `1D6+1` foram
 * ganhos (ou perdidos) na progressão — base do incremento ao subir de Nível (m3-10).
 */
export function contarMarcosDanoFurtivo(nivel: number): number {
  return MARCOS_DANO_FURTIVO.filter((marco) => marco <= nivel).length;
}

/**
 * Soma `incrementoMarcos` marcos de dano furtivo a uma expressão `Nd6+M` já existente — juntando
 * **D6 com D6 e fixo com fixo** (cada marco = +1D6+1), preservando qualquer ajuste manual do valor
 * stored (m3-10). Fora do formato esperado, devolve a expressão intacta (fail-safe). Nunca gera
 * componente negativo (clamp em 0).
 */
export function incrementarDanoFurtivo(expressao: string, incrementoMarcos: number): string {
  const encontrado = PADRAO_DANO_FURTIVO.exec(expressao.trim());
  if (!encontrado) {
    return expressao;
  }
  const dados = Math.max(Number(encontrado[1]) + incrementoMarcos, 0);
  const fixo = Math.max(Number(encontrado[2] ?? 0) + incrementoMarcos, 0);
  return fixo > 0 ? `${dados}D6+${fixo}` : `${dados}D6`;
}

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
  const dados = 1 + contarMarcosDanoFurtivo(dto.nivel);
  return `${dados}D6+${dados}`;
}
