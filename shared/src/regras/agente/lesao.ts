import type { FichaAtributosDto, FichaLesaoDto } from '../../dtos/ficha';

/**
 * Efeito mecânico das lesões nos atributos (`sistema-v4.1.0.md` — "⬡ Lesões"): cada ponto de lesão
 * remove **1 ponto** do atributo afetado (Lesão Leve 1 / Grave 3 / Mortal 5 na origem, reduzível por
 * tratamento). O **valor base** da ficha nunca é mutado — o efetivo é **derivado**. Consequência
 * importante: a **Maestria** (ligada ao valor base, `maestria.ts`) **sobrevive** à lesão — ter 6 num
 * atributo com Maestria e tomar −1 baixa o efetivo para 5 mas mantém a Maestria. Piso 0: um atributo
 * efetivo não fica negativo.
 *
 * Fora daqui (decisão do documento, linha "Uma lesão em atributos utilizados nos cálculos de saúde não
 * afeta os mesmos"): Vida/Energia máximas **não** caem por lesão — por isso o efetivo é uma leitura à
 * parte, não substitui o base nos cálculos de saúde.
 */

/** Soma os pontos de lesão que incidem sobre um atributo. */
export function somarLesoesAtributo(
  lesoes: readonly FichaLesaoDto[],
  atributo: keyof FichaAtributosDto,
): number {
  return lesoes.reduce(
    (total, lesao) => (lesao.atributo === atributo ? total + lesao.pontos : total),
    0,
  );
}

/** Atributo efetivo = base − pontos de lesão do atributo, com piso 0. */
export function calcularAtributoEfetivo(
  base: number,
  lesoes: readonly FichaLesaoDto[],
  atributo: keyof FichaAtributosDto,
): number {
  return Math.max(0, base - somarLesoesAtributo(lesoes, atributo));
}

/** Mapa completo dos atributos efetivos (base − lesões, piso 0). O base fica intacto. */
export function calcularAtributosEfetivos(
  atributos: FichaAtributosDto,
  lesoes: readonly FichaLesaoDto[],
): FichaAtributosDto {
  const efetivos = { ...atributos };
  (Object.keys(efetivos) as (keyof FichaAtributosDto)[]).forEach((chave) => {
    efetivos[chave] = calcularAtributoEfetivo(atributos[chave], lesoes, chave);
  });
  return efetivos;
}
