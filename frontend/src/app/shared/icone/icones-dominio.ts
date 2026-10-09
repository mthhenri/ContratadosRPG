import { HabilidadeCategoriaEnum, TipoDanoEnum } from '@contratados-rpg/shared/enums';

import type { IconeNome } from './icone.component';

/**
 * Qual ícone acompanha cada conceito do sistema (`icones-dano-habilidade-fragmento-reacao`).
 * É a única ponte entre o enum/rótulo do domínio e o nome em `IconeNome` — as telas consomem
 * estas funções em vez de repetir o mapa. O ícone fica **ao lado** do texto do conceito.
 */
export const ICONE_TIPO_DANO: Readonly<Record<TipoDanoEnum, IconeNome>> = {
  [TipoDanoEnum.FISICO]: 'dano-fisico',
  [TipoDanoEnum.BALISTICO]: 'dano-balistico',
  [TipoDanoEnum.EXPLOSAO]: 'dano-explosao',
  [TipoDanoEnum.QUIMICO]: 'dano-quimico',
  [TipoDanoEnum.GERAL]: 'dano-geral',
};

/** Composto (dois tipos bloqueáveis) não é membro do enum: tem ícone próprio. */
export const ICONE_DANO_COMPOSTO: IconeNome = 'dano-composto';

export const ICONE_CATEGORIA_HABILIDADE: Readonly<Record<HabilidadeCategoriaEnum, IconeNome>> = {
  [HabilidadeCategoriaEnum.GERAL]: 'habilidade-geral',
  [HabilidadeCategoriaEnum.GERAL_MELHORADA]: 'habilidade-geral-melhorada',
  [HabilidadeCategoriaEnum.CLASSE]: 'habilidade-classe',
  [HabilidadeCategoriaEnum.ARQUETIPO]: 'habilidade-arquetipo',
  [HabilidadeCategoriaEnum.SUBCLASSE]: 'habilidade-subclasse',
  [HabilidadeCategoriaEnum.OUTRA_CLASSE]: 'habilidade-outra-classe',
  [HabilidadeCategoriaEnum.PERSONALIDADE]: 'habilidade-personalidade',
  [HabilidadeCategoriaEnum.ESPECIALIDADE]: 'habilidade-especialidade',
  [HabilidadeCategoriaEnum.CIVIL]: 'habilidade-civil',
  [HabilidadeCategoriaEnum.UNICA]: 'habilidade-unica',
};

export const ICONE_REACAO = {
  esquiva: 'reacao-esquiva',
  bloqueio: 'reacao-bloqueio',
  contraAtaque: 'reacao-contra-ataque',
} as const satisfies Record<string, IconeNome>;

/** Ícone do tipo de dano, ou `null` para um texto que não é um dos tipos (ex.: valor livre). */
export function iconeTipoDano(tipo: string | null | undefined): IconeNome | null {
  return tipo && Object.hasOwn(ICONE_TIPO_DANO, tipo) ? ICONE_TIPO_DANO[tipo as TipoDanoEnum] : null;
}

/**
 * Ícone de uma defesa exibida (`Defesa`/`Esquiva`/`Bloqueio`/`Contra`/`Contra-ataque`) a partir do
 * rótulo que o encontro já usa; `null` para qualquer outro texto.
 */
export function iconeDefesa(rotulo: string): IconeNome | null {
  switch (rotulo) {
    case 'Defesa':
      return 'defesa';
    case 'Esquiva':
      return ICONE_REACAO.esquiva;
    case 'Bloqueio':
      return ICONE_REACAO.bloqueio;
    case 'Contra':
    case 'Contra-ataque':
      return ICONE_REACAO.contraAtaque;
    default:
      return null;
  }
}
