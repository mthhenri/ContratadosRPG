/**
 * Modificador de atributo de uma criatura. Toda criatura tem exatamente 10 modificadores —
 * um por atributo — na distribuição fixa 2 Forte / 3 Médio / 3 Fraco / 2 Frágil, com valor
 * atrelado ao VD (`docs/core/guia_de_mestre-v4.2.0.md` — "Guia de Criação de Ameaças" >
 * "Modificadores" e "DTs de Atributos"). Soma um valor fixo ao resultado do teste e participa
 * da DT com metade truncada; não altera o atributo nem a quantidade de D20 (P-101-02).
 * Conteúdo de JSONB `ficha.dados` — sem tabela `tipo_*`
 * (§10.3).
 */
export enum ModificadorCriaturaEnum {
  FORTE = 'FORTE',
  MEDIO = 'MEDIO',
  FRACO = 'FRACO',
  FRAGIL = 'FRAGIL',
}
