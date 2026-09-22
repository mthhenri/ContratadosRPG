/**
 * Custo de ação de um ataque ou habilidade — Ação Livre, Movimento, Padrão, Completa ou Turno
 * (`docs/core/guia_de_mestre-v4.0.0.md` — "Ações e Habilidades"). Conceito genérico de
 * ação em combate, não exclusivo de criatura — nome sem prefixo de entidade para ficar
 * reutilizável por outros consumidores do mesmo conceito. Conteúdo de JSONB `ficha.dados` —
 * sem tabela `tipo_*` (§10.3).
 *
 * `ACAO_LIVRE`/`TURNO` (pedido do autor, 2026-09-18) — o guia já cita os dois conceitos ("Ações
 * Livres" no texto de turno, "Turno" como coluna de dano de referência do turno inteiro), mas
 * nenhum ataque individual podia ser marcado com eles antes desta task; o documento oficial ainda
 * não formaliza o uso de `TURNO` como custo de uma ação isolada — ver nota em `ataques.ts`.
 */
export enum CustoAcaoEnum {
  ACAO_LIVRE = 'ACAO_LIVRE',
  MOVIMENTO = 'MOVIMENTO',
  PADRAO = 'PADRAO',
  COMPLETA = 'COMPLETA',
  TURNO = 'TURNO',
}
