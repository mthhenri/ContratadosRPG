/**
 * Categoria de uma habilidade na ficha de um agente — de onde ela vem no sistema.
 * O documento agrupa e concede habilidades por categoria (a progressão dá
 * habilidades específicas de cada tipo por nível), então a categoria é guardada
 * junto de cada habilidade da ficha. Conteúdo de JSONB `ficha.dados` — sem tabela
 * `tipo_*` (§10.3).
 *
 * Fonte: docs/core/sistema-v4.1.0.md — "Habilidades", "Classes e Arquétipos",
 * "Subclasse", "Identidade" (Habilidade de Personalidade) e "Jogando como um
 * Civil" (Habilidades Civis). O documento vence o código (proibição #27).
 */
export enum HabilidadeCategoriaEnum {
  /** Lista fixa de habilidades gerais disponíveis a qualquer agente. */
  GERAL = 'GERAL',
  /** Versão melhorada de uma habilidade geral, exclusiva de arquétipos (subclasses não têm). */
  GERAL_MELHORADA = 'GERAL_MELHORADA',
  /** Habilidade específica da classe base. */
  CLASSE = 'CLASSE',
  /** Habilidade específica do arquétipo (inclui a Habilidade Inicial de Arquétipo). */
  ARQUETIPO = 'ARQUETIPO',
  /** Habilidade específica da subclasse (Experimento). */
  SUBCLASSE = 'SUBCLASSE',
  /** Habilidade de outra classe/outro arquétipo, concedida nos níveis 5/10/15/20. */
  OUTRA_CLASSE = 'OUTRA_CLASSE',
  /** Habilidade derivada da Personalidade escolhida na Identidade. */
  PERSONALIDADE = 'PERSONALIDADE',
  /** Habilidade exclusiva de agentes Civis. */
  CIVIL = 'CIVIL',
}
