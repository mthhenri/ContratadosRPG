/**
 * Tipo de dano (m3-18). Os valores são **exatamente as strings** já usadas hoje no `tipoDano` das
 * modificações de item (`compras`, `ModificacaoEfeitoDto`), então adotar o enum **não migra nenhum
 * dado**. Conteúdo de jogo dentro do `ficha.dados` JSONB — sem tabela `tipo_*` (§10.3).
 *
 * Fonte: docs/core/sistema-v4.1.0.md — "Tipos de Dano". **Composto** (junção de dois tipos
 * bloqueáveis, dividido 50/50 com o resto para o primeiro) e o alcance de **Geral** (irredutível)
 * são regras de agrupamento, não membros do enum.
 */
export enum TipoDanoEnum {
  FISICO = 'Físico',
  BALISTICO = 'Balístico',
  EXPLOSAO = 'Explosão',
  QUIMICO = 'Químico',
  GERAL = 'Geral',
}

/**
 * Tipos que podem ser **bloqueados/resistidos** — os únicos válidos num **Composto** (Geral, por ser
 * irredutível, fica de fora). Ordem canônica para exibição.
 */
export const TIPOS_DANO_BLOQUEAVEIS: readonly TipoDanoEnum[] = [
  TipoDanoEnum.FISICO,
  TipoDanoEnum.BALISTICO,
  TipoDanoEnum.EXPLOSAO,
  TipoDanoEnum.QUIMICO,
];
