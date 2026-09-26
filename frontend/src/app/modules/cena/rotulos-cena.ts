import { CenaStatusEnum, CenaTipoEnum } from '@contratados-rpg/shared/enums';

/**
 * Rótulos legíveis dos enums da Cena (m7-23) — puro mapa de apresentação, sem regra de jogo (mesmo
 * papel de `rotulos-encontro.ts`). Os nomes dos tipos são os títulos do capítulo "⬡ Cenas" de
 * `docs/core/sistema-v4.1.0.md`; quem decide o que cada tipo **faz** é `shared/regras/cena`.
 */

const ROTULO_TIPO: Record<CenaTipoEnum, string> = {
  [CenaTipoEnum.COMBATE]: 'Combate',
  [CenaTipoEnum.INVESTIGACAO]: 'Investigação',
  [CenaTipoEnum.FURTIVA]: 'Furtiva',
  [CenaTipoEnum.PERSEGUICAO]: 'Perseguição',
  [CenaTipoEnum.RESISTENCIA]: 'Resistência',
};

const ROTULO_STATUS: Record<CenaStatusEnum, string> = {
  [CenaStatusEnum.PLANEJADA]: 'Planejada',
  [CenaStatusEnum.ATIVA]: 'Em cena',
  [CenaStatusEnum.ENCERRADA]: 'Encerrada',
};

export const rotuloTipoCena = (valor: CenaTipoEnum): string => ROTULO_TIPO[valor];

export const rotuloStatusCena = (valor: CenaStatusEnum): string => ROTULO_STATUS[valor];

/** Os cinco tipos na ordem do capítulo — a ordem das opções do seletor de "Nova cena". */
export const TIPOS_DE_CENA: readonly CenaTipoEnum[] = [
  CenaTipoEnum.INVESTIGACAO,
  CenaTipoEnum.COMBATE,
  CenaTipoEnum.FURTIVA,
  CenaTipoEnum.PERSEGUICAO,
  CenaTipoEnum.RESISTENCIA,
];
