/**
 * Porte de uma criatura — o espaço físico que ela ocupa no campo de combate (quadrados de
 * 1m×1m) e seu Alcance Natural, de Minúsculo (inferior a 1×1m) a Colossal (12×12m ou mais)
 * (`docs/core/guia_de_mestre-v4.0.0.md` — "Guia de Criação de Ameaças" > "Porte"). Ortogonal
 * à Tenacidade — uma criatura colossal pode ser frágil. Conteúdo de JSONB `ficha.dados` —
 * sem tabela `tipo_*` (§10.3).
 */
export enum PorteCriaturaEnum {
  MINUSCULO = 'MINUSCULO',
  MEDIO = 'MEDIO',
  GRANDE = 'GRANDE',
  ENORME = 'ENORME',
  GIGANTE = 'GIGANTE',
  TITANICO = 'TITANICO',
  COLOSSAL = 'COLOSSAL',
}
