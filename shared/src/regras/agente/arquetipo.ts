import { ArquetipoEnum, ClasseEnum } from '../../enums';
import type { FichaAtributosDto } from '../../dtos/ficha';

/** Bônus de atributo por arquétipo/subclasse — parcial: só as chaves que recebem pontos. */
export type BonusAtributos = Partial<Record<keyof FichaAtributosDto, number>>;

/** Entrada de `obterBonusAtributos`: a classe (base/subclasse/civil) e o arquétipo, quando houver. */
export interface BonusAtributosObterDto {
  readonly classe: ClasseEnum;
  readonly arquetipo: ArquetipoEnum | null;
}

/**
 * Atributos Bônus **fixos** de cada arquétipo (doc — "Classes e Arquétipos"). Os pontos marcados
 * como "à escolha" no documento (Engenheiro/Assassino: +1 em um de dois; Acadêmico/Híbrido: +1 livre)
 * **não** entram aqui — só a parte determinística; a distribuição da escolha fica com o jogador.
 * Fonte: docs/core/sistema-v4.1.0.md (o documento vence — proibição #27).
 */
const BONUS_ARQUETIPO: Record<ArquetipoEnum, BonusAtributos> = {
  // Combatente
  [ArquetipoEnum.LUTADOR]: { luta: 1, forca: 1 },
  [ArquetipoEnum.MERCENARIO]: { pontaria: 1, destreza: 1 },
  [ArquetipoEnum.VANGUARDA]: { vigor: 1, forca: 1 },
  // Especialista (o 2º ponto é "à escolha" — só o fixo)
  [ArquetipoEnum.ENGENHEIRO]: { intelecto: 1 },
  [ArquetipoEnum.ASSASSINO]: { destreza: 1 },
  [ArquetipoEnum.ACADEMICO]: { intelecto: 1 },
  // Suporte
  [ArquetipoEnum.PARAMEDICO]: { medicina: 1, vontade: 1 },
  [ArquetipoEnum.DIPLOMATA]: { social: 1, intelecto: 1 },
  [ArquetipoEnum.COMANDANTE]: { intelecto: 1, vontade: 1 },
};

/**
 * Atributos Bônus **fixos** das subclasses (Experimentos) — que funcionam como o "arquétipo" da
 * classe (doc — "Subclasses"). O Híbrido tem os dois pontos "à escolha", então nada é fixo.
 */
const BONUS_SUBCLASSE: Partial<Record<ClasseEnum, BonusAtributos>> = {
  [ClasseEnum.EXPERIMENTO_BESTIAL]: { forca: 1, vigor: 1 },
  [ClasseEnum.EXPERIMENTO_ARTIFICIAL]: { intelecto: 1, sentidos: 1 },
  [ClasseEnum.EXPERIMENTO_HIBRIDO]: {},
};

/**
 * Bônus de atributo **fixos** concedidos pela especialização atual (arquétipo de uma classe base,
 * ou a própria subclasse Experimento). Civil e classe base sem arquétipo não concedem nada. Base do
 * ajuste automático ao trocar de arquétipo/subclasse na ficha (m3-08): o delta entre o bônus antigo
 * e o novo entra/sai dos atributos.
 */
export function obterBonusAtributos(dto: BonusAtributosObterDto): BonusAtributos {
  const daSubclasse = BONUS_SUBCLASSE[dto.classe];
  if (daSubclasse) {
    return daSubclasse;
  }
  return dto.arquetipo ? BONUS_ARQUETIPO[dto.arquetipo] : {};
}
