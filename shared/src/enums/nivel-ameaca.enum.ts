/**
 * Nível de Ameaça (NA) de uma criatura — o impacto real que ela representa se agir
 * livremente por 24 horas, **não** dificuldade de combate. Determinado pela primeira
 * pergunta em sequência que resultar "sim" (`docs/core/guia_de_mestre-v4.0.0.md` — "Guia de
 * Criação de Ameaças" > "Definindo o Nível de Ameaça (NA)"). Conteúdo de JSONB
 * `ficha.dados` — sem tabela `tipo_*` (§10.3).
 */
export enum NivelAmeacaEnum {
  NULA = 'NULA',
  BAIXA = 'BAIXA',
  MEDIA = 'MEDIA',
  ALTA = 'ALTA',
  EXTREMA = 'EXTREMA',
  CATASTROFICA = 'CATASTROFICA',
  APOCALIPTICA = 'APOCALIPTICA',
}
