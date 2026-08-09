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

/** Um "slot" de bônus "à escolha": as chaves de atributo elegíveis para aquele ponto. */
export type SlotEscolhaAtributo = readonly (keyof FichaAtributosDto)[];

const TODOS_ATRIBUTOS: readonly (keyof FichaAtributosDto)[] = [
  'destreza', 'forca', 'luta', 'pontaria', 'vigor',
  'intelecto', 'medicina', 'sentidos', 'social', 'vontade',
];
const SEM_LUTA_OU_PONTARIA: SlotEscolhaAtributo = TODOS_ATRIBUTOS.filter(
  (atributo) => atributo !== 'luta' && atributo !== 'pontaria',
);

/**
 * Slots "à escolha" de cada arquétipo (doc — "Classes e Arquétipos"): Engenheiro e Assassino têm
 * um slot fechado com 2 opções; Acadêmico tem um slot livre (qualquer atributo, exceto Luta ou
 * Pontaria). Arquétipos sem ponto "à escolha" ficam de fora do mapa (`[]` no retorno da função).
 */
const SLOTS_ARQUETIPO: Partial<Record<ArquetipoEnum, readonly SlotEscolhaAtributo[]>> = {
  [ArquetipoEnum.ENGENHEIRO]: [['forca', 'destreza']],
  [ArquetipoEnum.ASSASSINO]: [['luta', 'pontaria']],
  [ArquetipoEnum.ACADEMICO]: [SEM_LUTA_OU_PONTARIA],
};

/**
 * Slots "à escolha" das subclasses (doc — "Subclasses"): só o Híbrido tem — os dois pontos de
 * `BONUS_SUBCLASSE[EXPERIMENTO_HIBRIDO]` (`{}`, todo "à escolha"). As duas escolhas são
 * independentes: repetir o mesmo atributo nas duas empilha +2 nele (não há "sem repetir" anotado
 * nessa linha do doc, ao contrário da habilidade "Mutável" da mesma subclasse).
 */
const SLOTS_SUBCLASSE: Partial<Record<ClasseEnum, readonly SlotEscolhaAtributo[]>> = {
  [ClasseEnum.EXPERIMENTO_HIBRIDO]: [SEM_LUTA_OU_PONTARIA, SEM_LUTA_OU_PONTARIA],
};

/**
 * Slots de bônus "à escolha" do perfil atual — mesma precedência de `obterBonusAtributos`
 * (subclasse vence arquétipo). `[]` quando o perfil não tem nenhum ponto "à escolha".
 */
export function obterSlotsEscolhaBonus(dto: BonusAtributosObterDto): readonly SlotEscolhaAtributo[] {
  const daSubclasse = SLOTS_SUBCLASSE[dto.classe];
  if (daSubclasse) {
    return daSubclasse;
  }
  return (dto.arquetipo ? SLOTS_ARQUETIPO[dto.arquetipo] : undefined) ?? [];
}

/**
 * Combina o bônus fixo (`obterBonusAtributos`) com as escolhas do jogador — uma por slot, na mesma
 * ordem de `obterSlotsEscolhaBonus`. Escolha `null` ou fora das opções do slot correspondente não
 * soma nada nesse slot (nunca lança; a validação de "escolha obrigatória" é do chamador).
 */
export function obterBonusAtributosComEscolha(
  dto: BonusAtributosObterDto,
  escolhas: readonly (keyof FichaAtributosDto | null)[],
): BonusAtributos {
  const bonus: Partial<Record<keyof FichaAtributosDto, number>> = { ...obterBonusAtributos(dto) };
  const slots = obterSlotsEscolhaBonus(dto);
  slots.forEach((slot, indice) => {
    const escolha = escolhas[indice];
    if (escolha && slot.includes(escolha)) {
      bonus[escolha] = (bonus[escolha] ?? 0) + 1;
    }
  });
  return bonus;
}
