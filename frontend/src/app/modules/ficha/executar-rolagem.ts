import type { FichaAtributosDto, FichaHabilidadeDto, FichaRolagemDto } from '@contratados-rpg/shared/dtos/ficha';
import { resolverPreset, rolarPasso, type ResultadoRolagemDto } from '@contratados-rpg/shared/regras/rolagem';

/**
 * Executa um passo de um preset de rolagem (m3-37) — extraído de `FichaRolagens` pra ser reusado
 * também pelo runner de Combos (`FichaCombos`), sem duplicar a lógica de resolver+rolar+rotular+
 * debitar energia. Motor puro (`resolverPreset`/`rolarPasso`, `shared/regras/rolagem`); aqui só se
 * orquestra a chamada e monta o rótulo/energia — nenhuma regra nova.
 */

/**
 * Nome do preset de Iniciativa (m3-47) — mesmo identificador de `PRESET_INICIATIVA_PADRAO.nome` no
 * backend. Exportado porque também é usado fora daqui: `FichaRolagensPainel` o esconde da lista de
 * presets editável dentro da ficha completa (agora rolado direto da aba Informações,
 * `FichaVisualizacao.rolarIniciativa`) e o filtra de volta antes de persistir qualquer edição.
 */
export const NOME_PRESET_INICIATIVA = 'Iniciativa';

/** Entrada de `executarPassoPreset`. */
export interface ExecutarPassoPresetDto {
  readonly preset: FichaRolagemDto;
  readonly atributos: FichaAtributosDto;
  /**
   * Atributos **efetivos** (lesão, sem ajuste de teste) — usados só quando `preset.nome` é
   * `"Iniciativa"`. A Iniciativa rola pelo atributo de Destreza (`sistema-v4.1.0.md`: "definida
   * pelo seu atributo de Destreza"), não pelo atributo ajustado pra testes: `dadosTeste` (ajuste
   * manual) e a penalidade de equipamento (Armadura Pesada) só valem pra testes de atributo, e não
   * reduzem a Destreza em si. Cai em `atributos` quando ausente (fallback de quem ainda não separa
   * os dois).
   */
  readonly atributosEfetivos?: FichaAtributosDto;
  readonly proficiencia: number | null;
  readonly nivel: number;
  readonly habilidadesDisponiveis: readonly FichaHabilidadeDto[];
  /** Índice do passo a rolar (0 = primária). */
  readonly indicePasso: number;
  /** Valor de Energia informado pro custo variável (`[X E]`) do preset, se houver. */
  readonly energiaVariavel?: number;
  /** `true` quando o passo é rolado em modo **crítico** (dobra o dano; m3-30). */
  readonly critico?: boolean;
  /**
   * Dado extra de Iniciativa (amplificador `Atento` + Formação `PERICIA_DADO_INICIATIVA`) — soma na
   * contagem de `DESd6` só quando `preset.nome` é `"Iniciativa"` (mesmo padrão pontual de
   * `rolarTesteAtributo`: bumpa só a Destreza desta rolagem, sem alterar `atributos` em nenhum outro
   * lugar da ficha). Ignorado para qualquer outro preset — o bônus é específico da Iniciativa, não de
   * toda rolagem que use Destreza.
   */
  readonly dadoExtraIniciativa?: number;
}

/** Saída de `executarPassoPreset` — pronta pra jogar na `BandejaDadosService` e debitar Energia. */
export interface PassoExecutadoDto {
  readonly rotulo: string;
  readonly formula: string;
  readonly resultado: ResultadoRolagemDto;
  /** Energia a debitar — soma dos custos fixos das habilidades vinculadas **a este passo** + variável. */
  readonly energiaGasta: number;
}

/**
 * Resolve o preset e rola o passo pedido. `null` quando o passo não existe (índice fora do plano)
 * ou a fórmula do passo é inválida — o chamador decide o que fazer (a UI dos Combos mostra "preset
 * não encontrado"/passo inválido em vez de travar).
 */
export function executarPassoPreset(dto: ExecutarPassoPresetDto): PassoExecutadoDto | null {
  const plano = resolverPreset({
    preset: dto.preset,
    atributos: dto.atributos,
    proficiencia: dto.proficiencia,
    habilidades: dto.habilidadesDisponiveis,
  });
  const passo = plano.passos[dto.indicePasso];
  if (!passo) {
    return null;
  }
  const atributosParaRolar = ((): FichaAtributosDto => {
    if (dto.preset.nome !== NOME_PRESET_INICIATIVA) {
      return dto.atributos;
    }
    const base = dto.atributosEfetivos ?? dto.atributos;
    return dto.dadoExtraIniciativa
      ? { ...base, destreza: base.destreza + dto.dadoExtraIniciativa }
      : base;
  })();
  const resultado = rolarPasso(passo, atributosParaRolar, dto.proficiencia, dto.nivel, undefined, dto.critico ?? false);
  if (!resultado) {
    return null;
  }
  const encadeado = plano.passos.length > 1;
  const sufixoCritico = dto.critico ? ' · CRÍTICO' : '';
  const rotulo = (encadeado ? `${dto.preset.nome} · ${passo.nome}` : dto.preset.nome) + sufixoCritico;

  let energiaGasta = 0;
  if (passo.habilidadesVinculadas.length > 0) {
    const variavel = passo.energiaVariavel ? (dto.energiaVariavel ?? 0) : 0;
    energiaGasta = passo.energiaGasta + variavel;
  }

  return { rotulo, formula: passo.formula, resultado, energiaGasta };
}
