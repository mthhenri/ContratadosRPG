import { ClasseEnum } from '../../enums';
import type { FichaHabilidadeDto } from '../../dtos/ficha';

/**
 * DTOs de entrada e value-objects de saída das fórmulas do agente
 * (`regras/agente`, m1-02). São "dados tipados" do motor de regras (SYSTEM.SPEC
 * §6.6): funções puras recebem sempre um DTO tipado, nunca uma cascata de
 * primitivos soltos. Seguem as convenções de DTO — entrada `<Conceito>CalcularDto`
 * (verbo no infinitivo), saída como recorte computado / value-object sem verbo.
 *
 * Fonte das fórmulas: docs/core/sistema-v4.1.0.md. Em conflito com o código, o
 * documento vence (proibição #27).
 */

// ── Entradas ────────────────────────────────────────────────────────────────

/** Entrada de `calcularVida`: Vida = base(classe) + Vigor e progressão por Nível. */
export interface VidaCalcularDto {
  readonly classe: ClasseEnum;
  readonly nivel: number;
  readonly vigor: number;
}

/** Entrada de `calcularEnergia`: Energia = base(classe) + Destreza e progressão por Nível. */
export interface EnergiaCalcularDto {
  readonly classe: ClasseEnum;
  readonly nivel: number;
  readonly destreza: number;
}

/** Entrada de `calcularLimiteEnergia`: Destreza × 2 (agente) ou Destreza (civil). */
export interface LimiteEnergiaCalcularDto {
  readonly classe: ClasseEnum;
  readonly destreza: number;
}

/** Entrada de `calcularDefesa`: Defesa Base = 10 + Nível; Esquiva soma Destreza, Bloqueio soma Vigor. */
export interface DefesaCalcularDto {
  readonly classe: ClasseEnum;
  readonly nivel: number;
  readonly destreza: number;
  readonly vigor: number;
}

/**
 * Entrada de `calcularContraAtaque`: Luta e Vigor (o chamador aplica os bounds da classe antes de
 * passar — ver `obterLimitesClasse`) + as habilidades da ficha, usadas só para achar a habilidade
 * "Contra-Ataque" e resolver qual variante de fórmula se aplica (doc — "Habilidades Gerais
 * [Melhoradas]": Geral, Lutador Melhorada, Vanguarda Melhorada têm fórmulas diferentes).
 */
export interface ContraAtaqueCalcularDto {
  readonly luta: number;
  readonly vigor: number;
  readonly habilidades: readonly FichaHabilidadeDto[];
}

/** Entrada de `calcularProficiencia`: +Nível (agente); civil não possui. */
export interface ProficienciaCalcularDto {
  readonly classe: ClasseEnum;
  readonly nivel: number;
}

/** Entrada de `calcularDeslocamento`: faixa de metros por Destreza (civil tem tabela própria). */
export interface DeslocamentoCalcularDto {
  readonly classe: ClasseEnum;
  readonly destreza: number;
}

/** Entrada de `calcularDanoCorpo`: Pontuação Corporal = Força + Vigor (civil = Força − 1). */
export interface DanoCorpoCalcularDto {
  readonly classe: ClasseEnum;
  readonly forca: number;
  readonly vigor: number;
}

/** Entrada de `calcularDanoFurtivo`: escala com marcos de Nível (agente); civil não possui. */
export interface DanoFurtivoCalcularDto {
  readonly classe: ClasseEnum;
  readonly nivel: number;
}

/** Entrada de `calcularInventario`: Força × 5 (agente) ou Força × 3 (civil). */
export interface InventarioCalcularDto {
  readonly classe: ClasseEnum;
  readonly forca: number;
}

/** Entrada de `calcularAreaPercepcao`: 5 + Sentidos × 5 (≤ 0 vira 3 m). */
export interface AreaPercepcaoCalcularDto {
  readonly sentidos: number;
}

/** Entrada de `calcularSanidade`: limite de traumas e recuperação de sequelas por Vontade. */
export interface SanidadeCalcularDto {
  readonly classe: ClasseEnum;
  readonly vontade: number;
}

/** Entrada de `calcularLimiteHabilidadesPorTurno`: base 4 + ganhos por Nível (civil = 3). */
export interface LimiteHabilidadesTurnoCalcularDto {
  readonly classe: ClasseEnum;
  readonly nivel: number;
}

/** Entrada de `calcularBeneficiosNivel` e `calcularProgressaoAcumulada`. */
export interface ProgressaoCalcularDto {
  readonly classe: ClasseEnum;
  readonly nivel: number;
}

/** Entrada de `obterLimitesClasse`: bounds de Nível e atributo por classe. */
export interface LimitesClasseObterDto {
  readonly classe: ClasseEnum;
}

/** Entrada de `aplicarLimitesPorClasse`: valores brutos a normalizar dentro dos bounds da classe. */
export interface LimitesClasseAplicarDto {
  readonly classe: ClasseEnum;
  readonly nivel: number;
  readonly vigor: number;
  readonly destreza: number;
  readonly forca: number;
  readonly vontade: number;
  readonly sentidos: number;
}

// ── Saídas (recortes computados / value-objects) ────────────────────────────

/**
 * Valores defensivos do agente. `defesa` é a Defesa Base (10 + Nível); `esquiva`
 * e `bloqueio` somam Destreza e Vigor respectivamente. Civis não possuem defesa
 * (doc — "Jogando como um Civil" > "Defesa e Reações"), então `calcularDefesa`
 * retorna `null` para a classe Civil.
 */
export interface DefesaDto {
  readonly defesa: number;
  readonly esquiva: number;
  readonly bloqueio: number;
}

/**
 * Sanidade do agente. `limiteTraumas` é Vontade + 1 (doc — "Traumas"); civil não
 * tem limite de traumas na calculadora, então vem `null`. `sequelasRemovidasPorMissao`
 * é Vontade (doc — "Sequelas": remove Vontade sequelas ao encerrar a missão).
 */
export interface SanidadeDto {
  readonly limiteTraumas: number | null;
  readonly sequelasRemovidasPorMissao: number;
}

/**
 * Contagem acumulada de ganhos de progressão até o Nível informado. Para agentes,
 * `habilidadesCivis` é 0; para Civis, apenas `atributos`, `habilidadesClasse` e
 * `habilidadesCivis` são preenchidos.
 */
export interface ProgressaoAcumuladaDto {
  readonly atributos: number;
  readonly habilidadesGerais: number;
  readonly habilidadesClasse: number;
  readonly habilidadesClasseOuArquetipo: number;
  readonly habilidadesOutraClasse: number;
  readonly fortificacoes: number;
  readonly habilidadesCivis: number;
}

/**
 * Bounds de entrada por classe. `nivelMaximo` é 20 (agente, doc — "Progressão")
 * ou 5 (civil, treinamentos 0–5). `atributoMinimo`/`atributoMaximo` são os limites
 * de input da calculadora (−5 a 7; 8 para Experimento Artificial; 3 para Civil) —
 * clamps da ferramenta, não fórmula do documento.
 */
export interface LimitesClasseDto {
  readonly nivelMinimo: number;
  readonly nivelMaximo: number;
  readonly atributoMinimo: number;
  readonly atributoMaximo: number;
}

/** Saída de `aplicarLimitesPorClasse`: os mesmos campos de entrada, já normalizados aos bounds da classe. */
export interface AgenteNormalizadoDto {
  readonly nivel: number;
  readonly vigor: number;
  readonly destreza: number;
  readonly forca: number;
  readonly vontade: number;
  readonly sentidos: number;
}
