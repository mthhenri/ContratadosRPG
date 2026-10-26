import type { PecaFormulaDto } from '@contratados-rpg/shared/regras/rolagem';
import type { TipoDanoEnum } from '@contratados-rpg/shared/enums';
import type { FichaTermoCor } from '../ui/ficha-termo/ficha-termo.component';
import { alterarQuantidadeDado, nomeDaFonte, siglaDaFonte, TIPOS_DANO_MONTADOR } from './montador-pecas';

/** Somente apresentação/edição de uma peça já interpretada; o motor continua sendo o árbitro da fórmula. */
export function rotularPeca(peca: PecaFormulaDto, abreviado = false): string {
  switch (peca.tipo) {
    case 'DADO':
      return peca.quantidade.tipo === 'NUMERO'
        ? `${peca.quantidade.valor}d${peca.faces}`
        : peca.quantidade.tipo === 'FONTE'
          ? `${peca.quantidade.nome}d${peca.faces}`
          : `Conta d${peca.faces}`;
    case 'FONTE': {
      const nome = abreviado ? siglaDaFonte(peca.fonte) : nomeDaFonte(peca.fonte);
      return (
        nome +
        (peca.multiplicador !== undefined
          ? ` × ${peca.multiplicador}`
          : peca.divisor !== undefined
            ? ` ÷ ${peca.divisor}`
            : '')
      );
    }
    case 'NUMERO':
      return `Número ${peca.sinal === -1 ? '−' : '+'}${peca.valor}`;
    case 'CONTA':
      return peca.texto;
    case 'ATALHO':
      return peca.atalho === 'CORPO' ? 'Corpo a corpo' : 'Furtivo';
  }
}

export function lerContaPeca(peca: PecaFormulaDto): string | null {
  if (peca.tipo === 'CONTA') return peca.texto;
  if (peca.tipo === 'DADO' && peca.quantidade.tipo === 'CONTA') return peca.quantidade.texto;
  return null;
}

export function lerValorPeca(peca: PecaFormulaDto): number {
  if (peca.tipo === 'DADO' && peca.quantidade.tipo === 'NUMERO') return peca.quantidade.valor;
  if (peca.tipo === 'FONTE') return peca.divisor ?? peca.multiplicador ?? 1;
  return peca.tipo === 'NUMERO' ? peca.valor : 0;
}

export function rotularValorPeca(peca: PecaFormulaDto): string {
  if (peca.tipo === 'FONTE') return peca.divisor !== undefined ? 'Divisor (÷)' : 'Multiplicador (×)';
  return peca.tipo === 'DADO' ? 'Quantidade' : 'Valor';
}

export function alterarValorPeca(peca: PecaFormulaDto, valor: number): PecaFormulaDto {
  if (peca.tipo === 'DADO' && peca.quantidade.tipo === 'NUMERO') return alterarQuantidadeDado(peca, valor);
  const inteiro = Number.isFinite(valor) ? Math.trunc(valor) : lerValorPeca(peca);
  if (peca.tipo === 'FONTE')
    return peca.divisor !== undefined
      ? { ...peca, divisor: Math.max(1, inteiro) }
      : { ...peca, multiplicador: Math.max(1, inteiro) };
  return peca.tipo === 'NUMERO' ? { ...peca, valor: Math.max(0, inteiro) } : peca;
}

export function corTipoPeca(tipo: TipoDanoEnum | null): FichaTermoCor | null {
  return TIPOS_DANO_MONTADOR.find((opcao) => opcao.tipo === tipo)?.classe ?? null;
}
