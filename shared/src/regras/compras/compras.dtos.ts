import {
  FragmentoModuloEnum,
  FragmentoTipoEnum,
  ItemCategoriaEnum,
  ModificacaoEfeitoTipoEnum,
  PatenteEnum,
} from '../../enums';

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

/**
 * Um efeito **mecânico** de uma modificação custom — um dos arquétipos de
 * `ModificacaoEfeitoTipoEnum`, com os campos que o tipo usa. Cada empilhamento
 * aplica o efeito uma vez, então o total escala com os empilhamentos. Uma mod
 * custom carrega uma **lista** de efeitos (combos, como Incendiária = dano +
 * condição). As mods do catálogo têm efeito próprio, embutido no motor.
 *
 * `valor` é a magnitude por empilhamento e serve à maioria dos tipos (dano fixo,
 * nº de dados, degraus, resistência, alcance, raio, turnos, inventário,
 * perfuração, bônus). Os demais campos são específicos do tipo (ver abaixo).
 */
export interface ModificacaoEfeitoDto {
  readonly tipo: ModificacaoEfeitoTipoEnum;
  /** Magnitude por empilhamento (pode ser negativa em `RESISTENCIA`, ex.: Camuflada). */
  readonly valor?: number;
  /** Faces do dado — `DANO_DADOS`. */
  readonly faces?: number;
  /** Tipo de dano/resistência — `DANO_DADOS`, `PERFURACAO`, `RESISTENCIA` (vazio = todas). */
  readonly tipoDano?: string;
  /** Sub-modo do efeito — `BONUS_TESTE` (`DADO`/`FIXO`) ou `DEFESA` (`Esquiva`/`Bloqueio`/`Defesa`). */
  readonly variante?: string;
  /** Nome da condição aplicada — `CONDICAO` (ex.: `Sangramento`). */
  readonly condicao?: string;
  /** Atributo da DT da condição — `CONDICAO` (ex.: `Força`). */
  readonly atributoDt?: string;
  /** Duração em turnos — `CONDICAO`. */
  readonly duracaoTurnos?: number;
}

/** Uma modificação aplicada a um item do carrinho, com sua quantidade de empilhamentos. */
export interface ModificacaoAplicadaDto {
  readonly nome: string;
  /** Empilhamentos aplicados (o antigo `stacks`). O primeiro adquire `empilhamentosIniciais`. */
  readonly empilhamentos: number;
  /**
   * Nota da modificação em texto livre — **só nas modificações custom** (as do catálogo têm a
   * descrição em `MODIFICACOES`). Opcional; complementa os efeitos estruturados com flavor.
   */
  readonly descricao?: string;
  /**
   * Efeitos **mecânicos** da modificação custom, aplicados de fato pelo motor ao stat do item
   * (dano/resistência/inventário) e/ou descritos no chip. Lista vazia/ausente = a mod é só rótulo.
   * Ver `ModificacaoEfeitoDto`.
   */
  readonly efeitos?: readonly ModificacaoEfeitoDto[];
  /**
   * Teto de empilhamentos da modificação **custom** (as do catálogo têm o seu em `MODIFICACOES`).
   * Definido por quem cria a mod: quantas vezes ela pode empilhar (a mod entra em 1× e sobe até aqui).
   */
  readonly empilhamentoMaximo?: number;
  /**
   * Marca a mod como **fora do limite total** da arma: seus empilhamentos não contam no total de
   * modificações permitido pela patente (não somam no contador nem marcam a arma como excedente).
   */
  readonly ignoraLimiteTotal?: boolean;
  /**
   * Marca a mod como **fora do próprio teto**: pode empilhar além do `empilhamentoMaximo` (catálogo ou
   * custom) e do limite de stack por mod da patente, sem ser barrada nem marcada como excedente por isso.
   */
  readonly ignoraLimiteProprio?: boolean;
  /**
   * Marca esta mod como **originada de um fragmento Potencializador** (m3-35) — distingue do
   * chip/UI sem depender de string-matching em `nome`, e é o que o fluxo de "remover" (desacoplar)
   * usa para saber que custa Energia × 2 do módulo. Ausente = mod comum (catálogo ou custom livre).
   */
  readonly origemFragmento?: {
    readonly tipo: FragmentoTipoEnum;
    readonly modulo: FragmentoModuloEnum;
  };
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
  /**
   * Nome que o jogador dá a **esta instância** do item (ex.: "Espada Excalibur" numa
   * Arma Branca Média) — puramente de exibição (m3-33). `resolverDadosItem`/`calcularStatItem`
   * continuam resolvendo pelo `nome` (chave do catálogo); o motor de cálculo nunca lê `apelido`.
   */
  readonly apelido?: string;
  /**
   * Só para `PROTECOES` (m3-36): `true` = vestida/em uso — só as equipadas entram na soma de
   * resistências da aba Combate (`shared/regras/agente/resistencia`). Ausente/`false` = na mochila,
   * não conta. Ignorado nas demais categorias.
   */
  readonly equipado?: boolean;
  readonly modificacoes: readonly ModificacaoAplicadaDto[];
  /**
   * Descrição em texto livre — **só nos itens custom** (os do catálogo têm a descrição em
   * `CATALOGO_ITENS`, resolvida na exibição). Opcional e ignorada pelo motor de cálculo; registra
   * "o que é/faz" o item que o jogador inventou, já que ele não existe no catálogo.
   */
  readonly descricao?: string;
  // ── Stats do item custom (espelham `ItemCatalogo`) — só nos itens custom ──────
  // O motor (`calcularStatItem`/`calcularTotaisCarrinho`) resolve os dados do item pelo catálogo
  // quando ele existe lá; para um item custom (fora do catálogo) usa estes campos, então o dano /
  // resistência / bônus do item inventado **funcionam de verdade** como os do catálogo.
  /** Notação de dano base (armas/explosivos/exóticos/fragmento-arma), ex.: `"3D6+FOR [Físico]"`. */
  readonly dano?: string;
  /** Informação auxiliar da arma/explosivo: alcance, área, munição, etc. */
  readonly informacao?: string;
  /** Resistências base (proteções), ex.: `"14 [Físico], 3 [Balístico]"`. */
  readonly resistencia?: string;
  /** Bônus de inventário base (armazenamento), ex.: `"+6 inv."`. */
  readonly bonus?: string;
  /**
   * Categoria cujas modificações o item aceita, além das próprias. Exóticos custom informam aqui a
   * categoria em que "se encaixam" (ex.: uma manopla exótica que recebe mods de Corpo a Corpo); um
   * Fragmento Construtor informa aqui a **forma base** que tomou.
   */
  readonly categoriaEmprestada?: ItemCategoriaEnum;
  /** Módulo do fragmento (I–V) — só nas categorias de Fragmento. */
  readonly modulo?: FragmentoModuloEnum;
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
