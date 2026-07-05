import { ItemCategoriaEnum, PatenteEnum } from '../../enums';

/**
 * DTOs de entrada e value-objects de saída do domínio de compras
 * (`regras/compras`, m1-05). "Dados tipados" do motor de regras (SYSTEM.SPEC
 * §6.6): funções puras recebem sempre um DTO tipado. Entradas seguem o verbo no
 * infinitivo; as saídas são recortes computados (value-objects sem verbo).
 *
 * Fonte: docs/core/sistema-v4.1.0.md — "Equipamentos", "Prestígio e Patentes"
 * (limite de modificações) e "Amplificadores". Em conflito com o código, o
 * documento vence (proibição #27). As tabelas (catálogo, modificações,
 * amplificadores, custos, limites) vivem em `compras.dados` e `catalogo.dados`.
 */

// ── Estado do carrinho (value-objects de entrada) ────────────────────────────

/** Uma modificação aplicada a um item do carrinho, com sua quantidade de empilhamentos. */
export interface ModificacaoAplicadaDto {
  readonly nome: string;
  /** Empilhamentos aplicados (o antigo `stacks`). O primeiro adquire `empilhamentosIniciais`. */
  readonly empilhamentos: number;
}

/** Um amplificador acoplado ao agente, com sua quantidade de empilhamentos. */
export interface AmplificadorAplicadoDto {
  readonly nome: string;
  readonly empilhamentos: number;
}

/**
 * Um item no carrinho de compras. Reúne o item do catálogo (nome, categoria,
 * custo e peso base), a quantidade, o modo de porte de armazenamento e as
 * modificações aplicadas. A gestão do carrinho (adicionar/remover) é da página
 * (m1-10/m1-11) — aqui só se calcula a partir de um estado dado.
 */
export interface CarrinhoItemDto {
  readonly nome: string;
  readonly categoria: ItemCategoriaEnum;
  /** Custo base do item (do catálogo), sem modificações. */
  readonly custo: number;
  /** Peso base do item (do catálogo), sem modificações. */
  readonly peso: number;
  readonly quantidade: number;
  /**
   * Só para `ARMAZENAMENTO`: `true` = guardada (ocupa slots, não amplia o
   * inventário); `false` = vestida (amplia o inventário, não ocupa slots).
   * Ignorado nas demais categorias.
   */
  readonly guardada: boolean;
  readonly modificacoes: readonly ModificacaoAplicadaDto[];
}

// ── Entradas das funções ─────────────────────────────────────────────────────

/** Entrada de `obterLimiteModificacoes`: limite de modificações da patente do Prestígio informado. */
export interface LimiteModificacoesObterDto {
  readonly prestigio: number;
}

/** Entrada de `contarComprasModificacao`: cobranças de uma modificação num item (1ª compra + extras). */
export interface ComprasModificacaoContarDto {
  readonly item: CarrinhoItemDto;
  readonly modificacao: string;
  readonly empilhamentos: number;
}

/** Entrada de `obterCustoModificacao` / `obterPesoModificacao`: custo/peso por empilhamento de uma mod num item. */
export interface ModificacaoItemDto {
  readonly item: CarrinhoItemDto;
  readonly modificacao: string;
}

/** Entrada de `verificarConflitoModificacao`: uma modificação candidata contra as já aplicadas num item. */
export interface ConflitoModificacaoVerificarDto {
  readonly item: CarrinhoItemDto;
  readonly modificacao: string;
}

/** Entrada de `calcularStatItem`: o item do carrinho cujo stat (dano/resistência/armazenamento) modificado se calcula. */
export interface StatItemCalcularDto {
  readonly item: CarrinhoItemDto;
}

/** Entrada de `calcularCustoAmplificador`: quantos empilhamentos de um amplificador. */
export interface CustoAmplificadorCalcularDto {
  readonly empilhamentos: number;
}

/** Entrada de `interpretarBonusArmazenamento`: o texto de bônus do catálogo (ex.: `"+6 inv."`, `"+4,5 inv."`). */
export interface BonusArmazenamentoInterpretarDto {
  readonly texto: string | null | undefined;
}

/** Entrada de `calcularTotaisCarrinho`: o conteúdo do carrinho (itens + amplificadores). */
export interface TotaisCarrinhoCalcularDto {
  readonly itens: readonly CarrinhoItemDto[];
  readonly amplificadores: readonly AmplificadorAplicadoDto[];
}

/** Entrada de `calcularResumoCompras`: carrinho + os recursos do agente (dinheiro, Prestígio, inventário base, Vontade). */
export interface ResumoComprasCalcularDto {
  readonly itens: readonly CarrinhoItemDto[];
  readonly amplificadores: readonly AmplificadorAplicadoDto[];
  readonly dinheiro: number;
  readonly prestigio: number;
  /** Inventário base do agente (Força × 5), ao qual se soma o bônus dos armazenamentos vestidos. */
  readonly inventario: number;
  readonly vontade: number;
}

// ── Saídas das funções (value-objects computados, sem verbo) ─────────────────

/** Limite de modificações de uma patente: empilhamentos por modificação e modificações por item. */
export interface LimiteModificacoesDto {
  readonly patente: PatenteEnum;
  /** Níveis de empilhamento por modificação (o antigo `maxStack`). */
  readonly maxEmpilhamentos: number;
  /** Modificações por item, contando cada empilhamento (o antigo `maxMods`). */
  readonly maxModificacoes: number;
}

/**
 * Conflito de uma modificação candidata com as já aplicadas ao item. `bloqueada`
 * é `true` se o uso simultâneo é proibido em qualquer direção (a candidata
 * bloqueia uma ativa, ou uma ativa bloqueia a candidata).
 * Fonte: docs/core/sistema-v4.1.0.md — coluna "Bloqueia".
 */
export interface ConflitoModificacaoDto {
  readonly bloqueada: boolean;
  /** Modificações já aplicadas que bloqueiam a candidata. */
  readonly bloqueadaPor: readonly string[];
  /** Modificações já aplicadas que a candidata bloquearia. */
  readonly bloqueia: readonly string[];
}

/**
 * Stat computado de um item com suas modificações aplicadas. Só um dos campos de
 * valor vem preenchido, conforme a categoria: `dano` (armas), `resistencia`
 * (proteções) ou `bonusArmazenamento` (armazenamento). As notações de jogo
 * (`"3D8+FOR [Físico]"`) não trazem ícone/rótulo — isso é formatação de UI
 * (m1-10), como o `null`→"N/A" da aba agente (m1-02).
 */
export interface StatItemDto {
  /** Notação de dano já modificada, agrupada por tipo (ex.: `"3D10+FOR+4 [Físico] + 2D4 [Explosão]"`). */
  readonly dano?: string;
  /** Informação auxiliar da arma (alcance, munição…), possivelmente ajustada por modificação. */
  readonly informacao?: string;
  /** Resistências já modificadas (ex.: `"14 [Físico], 3 [Balístico]"`). */
  readonly resistencia?: string;
  /** Bônus de inventário já modificado (slots) para itens de armazenamento. */
  readonly bonusArmazenamento?: number;
}

/**
 * Totais brutos do carrinho: gasto total (itens + modificações + amplificadores),
 * peso ocupado no inventário, empilhamentos de amplificador somados e bônus de
 * inventário concedido pelos armazenamentos vestidos. Espelha o antigo
 * `getCmpTotals`.
 */
export interface TotaisCarrinhoDto {
  readonly gasto: number;
  readonly pesoUsado: number;
  readonly empilhamentosAmplificador: number;
  readonly bonusInventario: number;
}

/**
 * Recorte completo da aba compras a partir do carrinho e dos recursos do agente:
 * patente e seus limites, gasto e dinheiro restante, peso versus inventário
 * efetivo, empilhamentos de amplificador versus limite (Vontade × 3) e a
 * penalidade de Vontade acumulada. Espelha o antigo `renderCmpSummary`.
 */
export interface ResumoComprasDto {
  readonly patente: PatenteEnum;
  readonly limiteModificacoes: LimiteModificacoesDto;
  readonly gasto: number;
  readonly dinheiroRestante: number;
  readonly pesoUsado: number;
  /** Inventário base + bônus dos armazenamentos vestidos. */
  readonly inventarioEfetivo: number;
  readonly bonusInventario: number;
  readonly empilhamentosAmplificador: number;
  /** Limite total de empilhamentos de amplificador (Vontade × 3). */
  readonly limiteAmplificadores: number;
  /** Penalidade acumulada em testes de Vontade (−2 por empilhamento além do 1º de cada amplificador). */
  readonly penalidadeVontade: number;
}
