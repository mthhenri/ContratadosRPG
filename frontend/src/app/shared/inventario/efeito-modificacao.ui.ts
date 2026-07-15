import { ModificacaoEfeitoTipoEnum } from '@contratados-rpg/shared/enums';

/**
 * Metadados de **UI** de cada arquétipo de efeito de modificação custom (m3-14): rótulo no seletor e
 * quais campos o tipo usa no formulário. É formatação de tela — a semântica/cálculo vive em
 * `shared/regras/compras` (`ModificacaoEfeitoTipoEnum`, `descreverEfeitoModificacao`, `calcularStatItem`).
 * Compartilhado por `FichaInventario` e `ComprasPage` (mesmo cadastro nos dois), morando em
 * `app/shared` para não acoplar os módulos `ficha` ↔ `calculadora`.
 */
export interface VarianteEfeito {
  readonly valor: string;
  readonly rotulo: string;
}

export interface EfeitoTipoMeta {
  readonly tipo: ModificacaoEfeitoTipoEnum;
  /** Rótulo no seletor de tipo de efeito. */
  readonly rotulo: string;
  /** Rótulo do campo numérico `valor` (com stepper) — `null` quando o tipo não usa `valor`. */
  readonly valorRotulo: string | null;
  /** Permite `valor` negativo (só `RESISTENCIA`, ex.: Camuflada). */
  readonly valorNegativo: boolean;
  /** Mostra o campo "Faces (D)" (`DANO_DADOS`). */
  readonly faces: boolean;
  /** Mostra o campo de texto de tipo de dano/resistência. */
  readonly tipoDano: boolean;
  readonly tipoDanoRotulo: string;
  readonly tipoDanoPlaceholder: string;
  /** Opções do `<select>` de variante (`BONUS_TESTE`, `DEFESA`), ou `null`. */
  readonly variantes: readonly VarianteEfeito[] | null;
  readonly varianteRotulo: string;
  /** Mostra os campos de condição (nome / atributo da DT / duração). */
  readonly condicao: boolean;
}

const T = ModificacaoEfeitoTipoEnum;

/** Base neutra — cada tipo abaixo sobrescreve só o que usa. */
const PADRAO = {
  valorRotulo: null as string | null,
  valorNegativo: false,
  faces: false,
  tipoDano: false,
  tipoDanoRotulo: '',
  tipoDanoPlaceholder: '',
  variantes: null as readonly VarianteEfeito[] | null,
  varianteRotulo: '',
  condicao: false,
};

/** Arquétipos de efeito, na ordem de exibição do seletor. Cobre as colunas de efeito de todas as categorias. */
export const EFEITO_TIPOS: readonly EfeitoTipoMeta[] = [
  { tipo: T.DANO_FIXO, rotulo: 'Dano fixo (+N)', ...PADRAO, valorRotulo: '+ Dano' },
  {
    tipo: T.DANO_DADOS,
    rotulo: 'Dados de dano (+N D X)',
    ...PADRAO,
    valorRotulo: 'Qtd dados',
    faces: true,
    tipoDano: true,
    tipoDanoRotulo: 'Tipo do dano',
    tipoDanoPlaceholder: 'Ex.: Químico',
  },
  { tipo: T.DANO_DADOS_BASE, rotulo: 'Dados no dado base (+N)', ...PADRAO, valorRotulo: 'Qtd dados' },
  { tipo: T.ELEVAR_DADO, rotulo: 'Elevar dado (+N degraus)', ...PADRAO, valorRotulo: 'Degraus' },
  {
    tipo: T.PERFURACAO,
    rotulo: 'Perfuração (ignora resist.)',
    ...PADRAO,
    valorRotulo: 'Ignora',
    tipoDano: true,
    tipoDanoRotulo: 'Tipo da resist.',
    tipoDanoPlaceholder: 'Ex.: Balístico',
  },
  {
    tipo: T.BONUS_TESTE,
    rotulo: 'Bônus em teste',
    ...PADRAO,
    valorRotulo: 'Valor',
    variantes: [
      { valor: 'DADO', rotulo: 'Dados' },
      { valor: 'FIXO', rotulo: 'Fixo' },
    ],
    varianteRotulo: 'Como',
  },
  {
    tipo: T.RESISTENCIA,
    rotulo: 'Resistência (+N)',
    ...PADRAO,
    valorRotulo: '+ Resist.',
    valorNegativo: true,
    tipoDano: true,
    tipoDanoRotulo: 'Tipo (vazio = todas)',
    tipoDanoPlaceholder: 'Ex.: Químico',
  },
  {
    tipo: T.DEFESA,
    rotulo: 'Esquiva / Bloqueio / Defesa',
    ...PADRAO,
    valorRotulo: 'Valor',
    variantes: [
      { valor: 'Esquiva', rotulo: 'Esquiva' },
      { valor: 'Bloqueio', rotulo: 'Bloqueio' },
      { valor: 'Defesa', rotulo: 'Defesa' },
    ],
    varianteRotulo: 'Em',
  },
  { tipo: T.ALCANCE, rotulo: 'Alcance (+N níveis)', ...PADRAO, valorRotulo: 'Níveis' },
  { tipo: T.RAIO, rotulo: 'Raio (+N m)', ...PADRAO, valorRotulo: 'Metros' },
  { tipo: T.DURACAO, rotulo: 'Duração (+N turnos)', ...PADRAO, valorRotulo: 'Turnos' },
  { tipo: T.CONDICAO, rotulo: 'Condição (status)', ...PADRAO, condicao: true },
  { tipo: T.INVENTARIO, rotulo: 'Inventário (+N)', ...PADRAO, valorRotulo: 'Slots' },
];

/** Metadados do tipo (fallback no primeiro, defensivo). */
export function metaEfeitoTipo(tipo: ModificacaoEfeitoTipoEnum): EfeitoTipoMeta {
  return EFEITO_TIPOS.find((meta) => meta.tipo === tipo) ?? EFEITO_TIPOS[0];
}
