/**
 * Classes e subclasses de agente jogáveis, incluindo o registro "Civil"
 * (funcionário não-agente). Conteúdo de JSONB `ficha.dados` — sem tabela `tipo_*`
 * (§10.3). Fonte: docs/core/sistema-v4.1.0.md — "Classes e Arquétipos" e
 * "Jogando como um Civil".
 */
export enum ClasseEnum {
  COMBATENTE = 'COMBATENTE',
  ESPECIALISTA = 'ESPECIALISTA',
  SUPORTE = 'SUPORTE',
  EXPERIMENTO_BESTIAL = 'EXPERIMENTO_BESTIAL',
  EXPERIMENTO_ARTIFICIAL = 'EXPERIMENTO_ARTIFICIAL',
  EXPERIMENTO_HIBRIDO = 'EXPERIMENTO_HIBRIDO',
  CIVIL = 'CIVIL',
}
