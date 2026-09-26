import { CenaTipoEnum } from '../../enums';

const TIPOS_COM_INICIATIVA: ReadonlySet<CenaTipoEnum> = new Set([
  CenaTipoEnum.COMBATE,
  CenaTipoEnum.FURTIVA,
  CenaTipoEnum.PERSEGUICAO,
]);

/**
 * Se uma cena deste tipo conduz ordem de iniciativa — e portanto tem um `encontro`. Fonte única
 * dessa decisão para backend e frontend (`m7-cenas`, decisão #3).
 */
export function cenaTemIniciativa(tipo: CenaTipoEnum): boolean {
  return TIPOS_COM_INICIATIVA.has(tipo);
}
