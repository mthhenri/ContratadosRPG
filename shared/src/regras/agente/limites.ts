import { ClasseEnum } from '../../enums';
import {
  AgenteNormalizadoDto,
  LimitesClasseAplicarDto,
  LimitesClasseDto,
  LimitesClasseObterDto,
} from './agente.dtos';

/** Nível máximo de um agente (doc — "Progressão": impossível ultrapassar o 20). */
const NIVEL_MAXIMO_AGENTE = 20;

/** Treinamento máximo de um Civil (doc — "Jogando como um Civil" > "Treinamentos": 0–5). */
const NIVEL_MAXIMO_CIVIL = 5;

/** Bounds de atributo aceitos pela calculadora (clamps de input, não fórmula do documento). */
const ATRIBUTO_MINIMO = -5;
const ATRIBUTO_MAXIMO_PADRAO = 7;
const ATRIBUTO_MAXIMO_CIVIL = 3;
const ATRIBUTO_MAXIMO_EXPERIMENTO_ARTIFICIAL = 8;

/** Restringe `valor` ao intervalo [minimo, maximo]. */
function restringir(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor));
}

/**
 * Bounds de Nível e atributo para a classe. Nível máximo é regra do documento
 * (20 agente / 5 civil); os bounds de atributo reproduzem os clamps de input da
 * calculadora antiga (−5 a 7; 8 para Experimento Artificial; 3 para Civil).
 */
export function obterLimitesClasse(dto: LimitesClasseObterDto): LimitesClasseDto {
  const ehCivil = dto.classe === ClasseEnum.CIVIL;

  let atributoMaximo = ATRIBUTO_MAXIMO_PADRAO;
  if (ehCivil) {
    atributoMaximo = ATRIBUTO_MAXIMO_CIVIL;
  } else if (dto.classe === ClasseEnum.EXPERIMENTO_ARTIFICIAL) {
    atributoMaximo = ATRIBUTO_MAXIMO_EXPERIMENTO_ARTIFICIAL;
  }

  return {
    nivelMinimo: 0,
    nivelMaximo: ehCivil ? NIVEL_MAXIMO_CIVIL : NIVEL_MAXIMO_AGENTE,
    atributoMinimo: ATRIBUTO_MINIMO,
    atributoMaximo,
  };
}

/**
 * Normaliza Nível e atributos brutos aos bounds da classe (contraparte pura do
 * `aplicarLimitesPorClasse` do script.js, que clampava os inputs no DOM).
 */
export function aplicarLimitesPorClasse(dto: LimitesClasseAplicarDto): AgenteNormalizadoDto {
  const limites = obterLimitesClasse({ classe: dto.classe });

  return {
    nivel: restringir(dto.nivel, limites.nivelMinimo, limites.nivelMaximo),
    vigor: restringir(dto.vigor, limites.atributoMinimo, limites.atributoMaximo),
    destreza: restringir(dto.destreza, limites.atributoMinimo, limites.atributoMaximo),
    forca: restringir(dto.forca, limites.atributoMinimo, limites.atributoMaximo),
    vontade: restringir(dto.vontade, limites.atributoMinimo, limites.atributoMaximo),
    sentidos: restringir(dto.sentidos, limites.atributoMinimo, limites.atributoMaximo),
  };
}
