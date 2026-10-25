import type { FichaRolagemDto } from "@contratados-rpg/shared/dtos/ficha";

/**
 * Preset de rolagem de Iniciativa (m3-47), gerado automaticamente em toda criação de ficha —
 * fonte única no backend para não duplicar com o wizard do frontend. `DESd6` usa a gramática de
 * atributo-como-fonte-de-dados (m3-29): cada ponto de Destreza é 1d6 rolado na Iniciativa.
 */
export const PRESET_INICIATIVA_PADRAO: FichaRolagemDto = {
  nome: "Iniciativa",
  formula: "DESd6",
  descricao:
    "Quantidade de dados rolados para a iniciativa. Essa quantidade é relativa ao seu atributo " +
    "de DESTREZA, sendo cada ponto neste atributo 1 dado de 6 faces (D6) a ser rolado na " +
    "Iniciativa, somando todos para obter o valor total.",
};
