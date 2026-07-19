import type { FichaAtributosDto, FichaHabilidadeDto, FichaRolagemDto } from '@contratados-rpg/shared/dtos/ficha';
import { resolverPreset, rolarPasso, type ResultadoRolagemDto } from '@contratados-rpg/shared/regras/rolagem';
import type { RolagemModoEnum } from '@contratados-rpg/shared/enums';

/**
 * Executa um passo de um preset de rolagem (m3-34) — extraído de `FichaRolagens` pra ser reusado
 * também pelo runner de Combos (`FichaCombos`), sem duplicar a lógica de resolver+rolar+rotular+
 * debitar energia. Motor puro (`resolverPreset`/`rolarPasso`, `shared/regras/rolagem`); aqui só se
 * orquestra a chamada e monta o rótulo/energia — nenhuma regra nova.
 */

/** Entrada de `executarPassoPreset`. */
export interface ExecutarPassoPresetDto {
  readonly preset: FichaRolagemDto;
  readonly atributos: FichaAtributosDto;
  readonly proficiencia: number | null;
  readonly habilidadesDisponiveis: readonly FichaHabilidadeDto[];
  /** Índice do passo a rolar (0 = primária). */
  readonly indicePasso: number;
  /** Valor de Energia informado pro custo variável (`[X E]`) do preset, se houver. */
  readonly energiaVariavel?: number;
}

/** Saída de `executarPassoPreset` — pronta pra jogar na `BandejaDadosService` e debitar Energia. */
export interface PassoExecutadoDto {
  readonly rotulo: string;
  readonly resultado: ResultadoRolagemDto;
  readonly modo: RolagemModoEnum;
  /** Energia a debitar (só no passo primário de um preset com habilidades vinculadas; senão `0`). */
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
  const resultado = rolarPasso(passo, dto.atributos, dto.proficiencia);
  if (!resultado) {
    return null;
  }
  const encadeado = plano.passos.length > 1;
  const rotulo = encadeado ? `${dto.preset.nome} · ${passo.nome}` : dto.preset.nome;

  let energiaGasta = 0;
  if (dto.indicePasso === 0 && plano.habilidadesVinculadas.length > 0) {
    const variavel = plano.energiaVariavel ? (dto.energiaVariavel ?? 0) : 0;
    energiaGasta = plano.energiaGasta + variavel;
  }

  return { rotulo, resultado, modo: passo.modo, energiaGasta };
}
