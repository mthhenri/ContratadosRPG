import { FormacaoParametroEnum } from '@contratados-rpg/shared/enums';
import { FORMACOES } from '@contratados-rpg/shared/regras/identidade';
import type { FormacaoDefinicaoDto, FormacaoGrupo } from '@contratados-rpg/shared/regras/identidade';

/**
 * Opções do `<select>` de **Formação** (m3-25) — as 21 linhas de `FORMACOES` (m3-23) agrupadas por
 * Combate/Movimento/Perícia/Equipamento/Logística, na ordem do documento. Puro reagrupamento de UI
 * do catálogo já existente — nenhuma regra de jogo aqui (proibições #26/#27).
 */

/** Ordem de exibição dos grupos no `<select>` (`docs/core/sistema-v4.1.0.md` — "⬦ Formação"). */
const ORDEM_GRUPOS_FORMACAO: readonly FormacaoGrupo[] = [
  'Combate',
  'Movimento',
  'Perícia',
  'Equipamento',
  'Logística',
];

/** Grupo de linhas de Formação do `<select>` (um `optgroup`). */
export interface GrupoFormacao {
  readonly rotulo: FormacaoGrupo;
  readonly opcoes: readonly FormacaoDefinicaoDto[];
}

/** As 21 linhas de `FORMACOES`, agrupadas para o `<select>` de Formação da Origem. */
export const GRUPOS_FORMACAO: readonly GrupoFormacao[] = ORDEM_GRUPOS_FORMACAO.map((grupo) => ({
  rotulo: grupo,
  opcoes: Object.values(FORMACOES).filter((definicao) => definicao.grupo === grupo),
}));

/** Rótulo legível do tipo de parâmetro que uma linha de Formação exige. */
const ROTULO_PARAMETRO: Record<FormacaoParametroEnum, string> = {
  [FormacaoParametroEnum.ATRIBUTO]: 'Atributo',
  [FormacaoParametroEnum.CATEGORIA_ARMA]: 'Categoria de arma',
  [FormacaoParametroEnum.TIPO_DANO]: 'Tipo de dano',
  [FormacaoParametroEnum.ESQUIVA_OU_BLOQUEIO]: 'Esquiva ou Bloqueio',
  [FormacaoParametroEnum.CONDICAO]: 'Condição',
};

/** Rótulo legível do tipo de parâmetro (rótulo do campo extra que aparece no editor de Formação). */
export function rotuloParametroFormacao(parametro: FormacaoParametroEnum): string {
  return ROTULO_PARAMETRO[parametro];
}
