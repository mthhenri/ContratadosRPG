import { QualidadeDescansoEnum, TipoDescansoEnum } from '../../enums';

/**
 * DTOs de entrada e value-objects de saída do domínio de descanso
 * (`regras/descanso`, m1-04). "Dados tipados" do motor de regras (SYSTEM.SPEC
 * §6.6): funções puras recebem sempre um DTO tipado. Entradas seguem o verbo no
 * infinitivo; as saídas são recortes computados (value-objects sem verbo).
 *
 * Fonte: docs/core/sistema-v4.1.0.md — "Descanso". Em conflito com o código, o
 * documento vence (proibição #27).
 */

// ── Escada de dados (die ladder) ─────────────────────────────────────────────

/** Entrada de `ajustarDado`: move `dadoBase` `modificador` passos na `ESCADA_DADOS`, com trava nos extremos. */
export interface DadoAjustarDto {
  readonly dadoBase: number;
  readonly modificador: number;
}

/** Entrada de `elevarDado`: sobe `faces` em `passos` degraus da `ESCADA_DADOS`, limitado a `limite` (ou ao topo). */
export interface DadoElevarDto {
  readonly faces: number;
  readonly passos: number;
  /** Face-teto opcional (deve ser um degrau da escada). Ausente = topo da escada. */
  readonly limite?: number;
}

/** Entrada de `descreverDado`: faces do dado a descrever (`null`/0 = sem dado). */
export interface DadoDescreverDto {
  readonly faces: number | null;
}

// ── Faixa de recuperação (aba descanso) ──────────────────────────────────────

/** Entrada de `calcularDescanso`: configuração do descanso e atributos do agente. */
export interface DescansoCalcularDto {
  readonly tipo: TipoDescansoEnum;
  readonly qualidade: QualidadeDescansoEnum;
  /** Vigor — quantidade de dados de recuperação de Vida. */
  readonly vigor: number;
  /** Destreza — quantidade de dados de recuperação de Energia. */
  readonly destreza: number;
  readonly nivel: number;
  /** Consumo de Refeição no descanso (+1 tipo de dado). */
  readonly refeicao: boolean;
  /** Descanso interrompido — recuperação final dividida por 2 (arredonda para baixo). */
  readonly interrompido: boolean;
}

/**
 * Faixa de recuperação de uma track (Energia ou Vida): o dado resolvido, os
 * componentes da fórmula `ATRIBUTO dados + (Nível × 2)` e o intervalo
 * mínimo–máximo. Com interrupção, `minimo`/`maximo` já vêm com `⌊valor ÷ 2⌋`
 * aplicado (paridade com o site antigo); `media` é o valor esperado (não exibido
 * pelo site), também dividido por 2 na interrupção.
 */
export interface RecuperacaoFaixaDto {
  /** Faces do dado após o modificador de qualidade/refeição (ex.: 3 → 1D3). */
  readonly dadoFinal: number;
  /** Quantidade de dados rolados (= atributo da track). */
  readonly quantidadeDados: number;
  /** Bônus fixo por Nível (= Nível × 2). */
  readonly bonusNivel: number;
  readonly minimo: number;
  readonly media: number;
  readonly maximo: number;
  readonly interrompido: boolean;
}

/**
 * Recorte da aba descanso: modificador total de dado aplicado e a faixa de
 * recuperação de Energia e Vida. `vida` é `null` quando o tipo não recupera Vida
 * (Descanso Curto).
 */
export interface DescansoCalculoDto {
  /** Passos somados na escada de dados (qualidade + refeição). */
  readonly modificadorDado: number;
  readonly energia: RecuperacaoFaixaDto;
  readonly vida: RecuperacaoFaixaDto | null;
}

// ── Dados extras e rolagem ───────────────────────────────────────────────────

/** Entrada de `interpretarDadosExtras`: texto livre digitado (ex.: `"1d6"`, `"3"`, vazio). */
export interface DadosExtrasInterpretarDto {
  readonly texto: string;
}

/**
 * Especificação de dados extras interpretada de um texto livre. Ou uma rolagem
 * de dados (`quantidade` × `faces`, com `bonusFixo` 0), ou um bônus fixo
 * (`quantidade`/`faces` 0 e `bonusFixo` > 0). `interpretarDadosExtras` devolve
 * `null` para texto vazio/`"0"`/inválido.
 */
export interface DadosExtrasDto {
  /** Número de dados a rolar (0 quando é bônus fixo). */
  readonly quantidade: number;
  /** Faces de cada dado (0 quando é bônus fixo). */
  readonly faces: number;
  /** Bônus fixo somado direto (0 quando é rolagem de dados). */
  readonly bonusFixo: number;
}

/** Entrada de `rolarDados`: rola `quantidade` dados de `faces` faces (utilidade de rolagem explícita — §6.6). */
export interface RolagemDadosDto {
  readonly faces: number;
  readonly quantidade: number;
}

/**
 * Entrada de `calcularResultadoDescanso`: os valores já rolados (função pura,
 * sem aleatoriedade). `rolagens` são os dados de recuperação; `dadosExtras` são
 * os dados extras já rolados (ou `[bonusFixo]` para um bônus fixo, ou `[]` se não
 * há extras).
 */
export interface ResultadoDescansoCalcularDto {
  readonly rolagens: readonly number[];
  readonly dadosExtras: readonly number[];
  readonly bonusNivel: number;
  readonly interrompido: boolean;
}

/**
 * Resultado de uma rolagem de recuperação. `soma` é o total bruto antes da
 * interrupção; `total` é o valor final (com `⌊soma ÷ 2⌋` aplicado se
 * interrompido).
 */
export interface ResultadoDescansoDto {
  readonly total: number;
  readonly soma: number;
  readonly interrompido: boolean;
}
