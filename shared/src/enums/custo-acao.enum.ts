/**
 * Custo de ação de um ataque ou habilidade — Movimento, Padrão ou Completa
 * (`docs/core/guia_de_mestre-v4.0.0.md` — "Ações e Habilidades"). Conceito genérico de
 * ação em combate, não exclusivo de criatura — nome sem prefixo de entidade para ficar
 * reutilizável por outros consumidores do mesmo conceito. Conteúdo de JSONB `ficha.dados` —
 * sem tabela `tipo_*` (§10.3).
 */
export enum CustoAcaoEnum {
  MOVIMENTO = 'MOVIMENTO',
  PADRAO = 'PADRAO',
  COMPLETA = 'COMPLETA',
}
