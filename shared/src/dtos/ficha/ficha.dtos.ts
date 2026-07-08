import type { ArquetipoEnum, ClasseEnum, HabilidadeCategoriaEnum, SeveridadeLesaoEnum } from '../../enums';
import type { AmplificadorAplicadoDto, CarrinhoItemDto } from '../../regras/compras';

/**
 * Contrato tipado do documento JSONB `ficha.dados` para a **ficha de jogador**
 * (m3-01). Forma final derivada de `docs/core/sistema-v4.1.0.md` — o documento
 * vence o código (proibição #27). É a fundação consumida pelo backend (validação
 * autoritativa via `shared/regras`, m3-03) e pelo frontend (cálculo/exibição ao
 * vivo). Camada `shared/` pura: nenhuma migration, service ou endpoint aqui.
 *
 * ── Modelo relacional × JSONB (SYSTEM.SPEC §10.4) ────────────────────────────
 * Identidade, posse e permissão são colunas de `ficha` (campanha, dono, tipo,
 * nome). Tudo abaixo é **conteúdo de jogo** e vive só no JSONB `dados`.
 *
 * ── Nada de derivado é persistido (entregável #4) ────────────────────────────
 * Vida máxima, Energia máxima, limite de Energia negativa, Defesa/Esquiva/
 * Bloqueio, Deslocamento, Dano de Corpo, Dano Furtivo, Inventário máximo, Área
 * de Percepção, DT de atributo, Proficiência, Sanidade (não é barra), Patente,
 * Salário e Limite de Modificações **não entram** neste documento — são funções
 * de classe/nível/atributos calculadas por `shared/regras` no front (exibição) e
 * no back (coerência do estado salvo). Ex.: a Patente é derivada do Prestígio; a
 * Área de Percepção é `5 + Sentidos × 5`.
 *
 * ── Validação estrutural (SYSTEM.SPEC §11, camada 1) ─────────────────────────
 * Este contrato é um `interface readonly` puro, como todos os DTOs do shared. A
 * validação estrutural com class-validator (`@IsEnum`/`@IsInt`/ranges) da forma
 * do documento é aplicada quando o backend liga o `ValidationPipe` (m3-02/m3-03);
 * as faixas válidas ficam documentadas campo a campo abaixo. A coerência de
 * domínio (HP ≤ máximo, atributo dentro do limite de classe/nível, stacks de
 * modificação dentro da patente…) é a camada 2, via `shared/regras` (m3-03).
 *
 * ── Escopo desta task ────────────────────────────────────────────────────────
 * A spec fixa o casamento 1:1 com o documento em **classe / atributos / estado /
 * inventário** (+ arquétipo, nível, prestígio, habilidades, anotações). Domínios
 * que o documento define mas que a spec não listou — Identidade (Personalidade,
 * Origem), Dinheiro, Maestrias, Peculiaridade de Experimento — ficam **de fora**
 * deste contrato inicial e entram quando as tasks de formulário/ficha do M3 os
 * exigirem. Ver SCHEMA.md.
 */

/**
 * Os dez atributos de um agente (`docs/core/sistema-v4.1.0.md` — "Atributos").
 * O documento agrupa cinco como Físicos (Destreza, Força, Luta, Pontaria, Vigor)
 * e cinco como Mentais (Intelecto, Medicina, Sentidos, Social, Vontade), mas isso
 * é só um agrupamento de leitura — todos moram no mesmo bloco.
 *
 * "Sentidos" é um atributo (não um campo à parte): a Área de Percepção é derivada
 * dele (`5 + Sentidos × 5`) e não é guardada. Cada atributo inicia com 1 ponto
 * base; na criação distribuem-se 4 pontos (máx. 3 num único atributo, 2 nos
 * demais), teto por atributo que sobe para 6 após finalizar a ficha; a Maestria
 * (única na ficha) leva um atributo além disso. Lesões podem reduzir atributos.
 */
export interface FichaAtributosDto {
  readonly destreza: number;
  readonly forca: number;
  readonly luta: number;
  readonly pontaria: number;
  readonly vigor: number;
  readonly intelecto: number;
  readonly medicina: number;
  readonly sentidos: number;
  readonly social: number;
  readonly vontade: number;
}

/**
 * Uma sequela: instabilidade mental **temporária** (`sistema-v4.1.0.md` —
 * "Saúde" > Sanidade). Ganha ao falhar num teste de Vontade; removida ao voltar à
 * base ou num descanso longo e confortável. O limite (Vontade) e os efeitos
 * mecânicos são domínio de `shared/regras`; aqui guarda-se só a entrada nomeada.
 */
export interface FichaSequelaDto {
  readonly nome: string;
  readonly descricao?: string;
}

/**
 * Um trauma: versão **permanente** de uma sequela (`sistema-v4.1.0.md` — Sanidade).
 * Não é removível, apenas **tratável** (o tratamento reduz a penalidade, não some
 * com o trauma) — daí `tratado`. O limite de traumas não-tratados (Vontade + 1;
 * Experimentos Vontade − 1) é validado por `shared/regras`.
 */
export interface FichaTraumaDto {
  readonly nome: string;
  readonly descricao?: string;
  /** `true` se já recebeu tratamento (penalidade reduzida). O trauma permanece na ficha. */
  readonly tratado: boolean;
}

/**
 * Uma lesão física (`sistema-v4.1.0.md` — "Lesões"): remove pontos de um atributo
 * conforme a severidade. Guarda-se qual atributo foi afetado, quantos pontos
 * restam removidos (pode ser reduzido por tratamento/reabilitação) e se já se
 * tornou permanente (após entrar em "Morrendo" o suficiente enquanto lesionado).
 */
export interface FichaLesaoDto {
  /** Atributo afetado — uma das chaves de `FichaAtributosDto`. */
  readonly atributo: keyof FichaAtributosDto;
  /** Pontos de atributo removidos por esta lesão (LEVE 1 / GRAVE 3 / MORTAL 5 na origem; reduzível por tratamento). */
  readonly pontos: number;
  readonly severidade: SeveridadeLesaoEnum;
  /** `true` quando a lesão se tornou irreversível (afeta todo cálculo que usa o atributo). */
  readonly permanente: boolean;
}

/**
 * Uma habilidade da ficha (`sistema-v4.1.0.md` — "Habilidades"). Sem catálogo
 * tipado de habilidades no `shared/regras` (diferente de compras), a ficha guarda
 * a habilidade de forma desnormalizada: nome, custo de Energia, categoria de
 * origem e o texto do efeito.
 */
export interface FichaHabilidadeDto {
  readonly nome: string;
  readonly categoria: HabilidadeCategoriaEnum;
  /**
   * Custo em Energia (a notação `[N E]` do documento). `0` para habilidades
   * gratuitas (`[0 E]`); `null` para custo variável (`[X E]`).
   */
  readonly custoEnergia: number | null;
  readonly descricao: string;
}

/**
 * Inventário do agente — **reusa o formato do carrinho da calculadora M1**
 * (entregável #2): itens (com suas modificações) + amplificadores acoplados, os
 * mesmos contratos tipados de `shared/regras/compras` (`CarrinhoItemDto` já
 * carrega as `modificacoes`). Nenhum tipo duplicado; `regras/` continua zero-dep.
 * O limite de inventário (`Força × 5`) e a validação de custo/peso/limites de
 * modificação por patente são domínio de `shared/regras`, não deste documento.
 */
export interface FichaInventarioDto {
  readonly itens: readonly CarrinhoItemDto[];
  readonly amplificadores: readonly AmplificadorAplicadoDto[];
}

/**
 * Estado mutável de saúde do agente durante o jogo (`sistema-v4.1.0.md` —
 * "Saúde"). Vida e Energia atuais são valores correntes (os máximos são
 * derivados). A Sanidade não é uma barra: materializa-se nas listas de sequelas
 * (temporárias) e traumas (permanentes). As lesões físicas removem atributos.
 */
export interface FichaEstadoDto {
  /** Vida corrente. O máximo é derivado (classe + Vigor + progressão); zerá-la dispara "Morrendo". */
  readonly vidaAtual: number;
  /** Energia corrente. Pode **negativar** (o documento permite gastar além de 0, com penalidades). */
  readonly energiaAtual: number;
  readonly sequelas: readonly FichaSequelaDto[];
  readonly traumas: readonly FichaTraumaDto[];
  readonly lesoes: readonly FichaLesaoDto[];
}

/**
 * Documento completo `ficha.dados` de uma ficha de jogador — a forma final do
 * JSONB (m3-01). Consumível por backend e frontend sem redefinição.
 */
export interface FichaJogadorDadosDto {
  /**
   * Classe do agente. `ClasseEnum` já codifica o eixo inteiro: as três classes
   * base (`COMBATENTE`/`ESPECIALISTA`/`SUPORTE`), as três subclasses Experimento
   * (`EXPERIMENTO_BESTIAL`/`_ARTIFICIAL`/`_HIBRIDO`) e o registro `CIVIL`. Por
   * isso **não há campo `subclasse` à parte** — reusa o enum existente (proibição
   * #21). Um Civil não tem classe base jogável, mas o valor `CIVIL` o representa.
   */
  readonly classe: ClasseEnum;
  /**
   * Arquétipo escolhido — presente **só** quando `classe` é uma das três classes
   * base. `null` quando o agente tomou uma subclasse (Experimento) ou é `CIVIL`,
   * pois nesses casos não há arquétipo (a subclasse ocupa o lugar do arquétipo).
   */
  readonly arquetipo: ArquetipoEnum | null;
  /** Nível do agente. Faixa 0–20 inteiro (o documento veda ultrapassar 20; todos iniciam em 0). */
  readonly nivel: number;
  /**
   * Prestígio do agente — determina a Patente (derivada, não guardada). Inteiro;
   * **pode ser negativo** (Experimentos iniciam com −1 no nível 0). Sem teto fixo.
   */
  readonly prestigio: number;
  readonly atributos: FichaAtributosDto;
  readonly estado: FichaEstadoDto;
  readonly habilidades: readonly FichaHabilidadeDto[];
  readonly inventario: FichaInventarioDto;
  /** Anotações livres do jogador/mestre sobre a ficha. */
  readonly anotacoes: string;
}
