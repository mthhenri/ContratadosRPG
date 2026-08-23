/**
 * Estágio da Habilidade de Personalidade de um agente (`docs/core/sistema-v4.1.0.md` —
 * "Identidade" e "Fortificação de Traços"; m3-78): a Base, definida com o Mestre logo após a
 * criação, e as duas Fortificações, obtidas nos níveis 7 e 14. Conteúdo de JSONB `ficha.dados` —
 * sem tabela `tipo_*` (§10.3).
 */
export enum PersonalidadeEstagioEnum {
  BASE = 'BASE',
  FORTIFICACAO_1 = 'FORTIFICACAO_1',
  FORTIFICACAO_2 = 'FORTIFICACAO_2',
}

/** Rótulos legíveis (pt-BR) de cada estágio — reusado pelo seletor da aba Extras da ficha. */
export const ROTULOS_PERSONALIDADE_ESTAGIO: Readonly<Record<PersonalidadeEstagioEnum, string>> = {
  [PersonalidadeEstagioEnum.BASE]: 'Base',
  [PersonalidadeEstagioEnum.FORTIFICACAO_1]: '1ª Fortificação',
  [PersonalidadeEstagioEnum.FORTIFICACAO_2]: '2ª Fortificação',
};
