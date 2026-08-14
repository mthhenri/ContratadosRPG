/**
 * Tipo de uma habilidade especial de criatura — Passiva (sempre ativa, sem custo/condição),
 * Ativa (o Mestre declara e gasta uma ação) ou De Gatilho (dispara quando uma condição
 * específica é satisfeita, sem consumir ação) (`docs/core/guia_de_mestre-v4.0.0.md` — "Guia
 * de Criação de Ameaças" > "Habilidades"). Distinto de `HabilidadeCategoriaEnum` (categoria
 * de origem de uma habilidade de **jogador** — GERAL/CLASSE/…), conceito não aplicável a
 * criaturas. Conteúdo de JSONB `ficha.dados` — sem tabela `tipo_*` (§10.3).
 */
export enum HabilidadeTipoCriaturaEnum {
  PASSIVA = 'PASSIVA',
  ATIVA = 'ATIVA',
  GATILHO = 'GATILHO',
}
