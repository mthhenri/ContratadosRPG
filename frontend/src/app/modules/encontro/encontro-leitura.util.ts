import type { EncontroCombatenteResumoDto, EncontroRecuperadoDto } from '@contratados-rpg/shared/dtos/encontro';
import type { FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';
import { EncontroStatusEnum, NivelAmeacaEnum, TipoFichaEnum } from '@contratados-rpg/shared/enums';

/**
 * Derivação pura do estado de leitura de um `EncontroRecuperadoDto` — extraído de
 * `painel-encontro.page.ts` (m8-05) para não duplicar a mesma apresentação entre a tela "Iniciativa"
 * do jogador/mestre e a composição de leitura do espectador/prévia de jogador. Nenhuma regra de
 * domínio vive aqui: `ordemRodada` e a intercalação de Cadência já chegam prontas do backend
 * (`shared/regras/encontro`); o que este módulo deriva é só apresentação — de quem é a vez, quem já
 * agiu, quantas colunas a grade usa.
 */

/** Uma posição visual da rodada, mantendo o estado no combatente original. */
export interface CombatenteVisualDto extends EncontroCombatenteResumoDto {
  readonly ocorrencia: number;
  readonly totalOcorrencias: number;
  readonly indiceOrdem: number | null;
  readonly chaveVisual: string;
}

/**
 * Achata `combatentes` + `ordemRodada` numa lista visual, uma entrada por ocorrência de turno
 * (Cadência > Singular gera mais de uma). Sem `ordemRodada` (montagem, antes de todas as
 * iniciativas), cai para a ordem simples por iniciativa decrescente. Quem entrou depois do cálculo
 * da ordem (`indiceOrdem: null`) continua visível, só não tem "vez" até a próxima rodada.
 */
export function montarCombatentesVisuais(
  encontro: EncontroRecuperadoDto | null,
): readonly CombatenteVisualDto[] {
  if (!encontro) {
    return [];
  }
  if (encontro.ordemRodada.length === 0) {
    return [...encontro.combatentes]
      .sort((a, b) => (b.iniciativa ?? -Infinity) - (a.iniciativa ?? -Infinity))
      .map((combatente) => ({
        ...combatente,
        ocorrencia: 1,
        totalOcorrencias: 1,
        indiceOrdem: null,
        chaveVisual: `${combatente.id}-montagem`,
      }));
  }
  const porId = new Map(encontro.combatentes.map((combatente) => [combatente.id, combatente]));
  const totais = new Map<number, number>();
  for (const slot of encontro.ordemRodada) {
    totais.set(slot.combatenteId, (totais.get(slot.combatenteId) ?? 0) + 1);
  }
  const ordenados: CombatenteVisualDto[] = [];
  const jaIncluidos = new Set<number>();
  for (const [indiceOrdem, slot] of encontro.ordemRodada.entries()) {
    const combatente = porId.get(slot.combatenteId);
    if (combatente) {
      jaIncluidos.add(combatente.id);
      ordenados.push({
        ...combatente,
        ocorrencia: slot.ocorrencia,
        totalOcorrencias: totais.get(combatente.id) ?? 1,
        indiceOrdem,
        chaveVisual: `${combatente.id}-${slot.ocorrencia}`,
      });
    }
  }
  for (const combatente of encontro.combatentes) {
    if (!jaIncluidos.has(combatente.id)) {
      ordenados.push({
        ...combatente,
        ocorrencia: 1,
        totalOcorrencias: 1,
        indiceOrdem: null,
        chaveVisual: `${combatente.id}-pendente`,
      });
    }
  }
  return ordenados;
}

/** `true` quando é a vez deste combatente — só existe "vez" com o combate `ATIVO`. */
export function combatenteEhDaVez(
  combatente: CombatenteVisualDto,
  encontro: EncontroRecuperadoDto | null,
): boolean {
  return (
    encontro?.status === EncontroStatusEnum.ATIVO && combatente.indiceOrdem === encontro.turnoIndice
  );
}

/** `true` quando esta ocorrência visual já passou na rodada corrente. */
export function combatenteJaAgiu(
  combatente: CombatenteVisualDto,
  encontro: EncontroRecuperadoDto | null,
): boolean {
  if (!encontro || encontro.status !== EncontroStatusEnum.ATIVO) {
    return false;
  }
  // `!= null` (frouxo) cobre tanto `null` quanto `undefined` — quem monta um combatente parcial
  // sem indiceOrdem (ex.: fixture de teste) cai no mesmo fallback de quem entrou fora da ordem.
  if (combatente.indiceOrdem != null) {
    return combatente.indiceOrdem < encontro.turnoIndice;
  }
  // Sem posição na ordem calculada (entrou depois): considera agido só se nenhuma ocorrência sua
  // ainda estiver pendente na rodada — mesmo critério de `jaAgiram` em `painel-encontro.page.ts`.
  const pendentes = new Set(
    encontro.ordemRodada
      .filter((_, indice) => indice >= encontro.turnoIndice)
      .map((slot) => slot.combatenteId),
  );
  return (
    encontro.ordemRodada.some((slot) => slot.combatenteId === combatente.id) &&
    !pendentes.has(combatente.id)
  );
}

/**
 * Quantidade de colunas da grade de cartões no desktop — cresce com o número de combatentes para
 * que um grupo grande não fique espremido em 3 colunas fixas.
 */
export function calcularColunasGrade(totalCombatentes: number): number {
  if (totalCombatentes >= 13) return 5;
  if (totalCombatentes >= 9) return 4;
  return 3;
}

/**
 * Nível de Ameaça de uma criatura — só existe quando a ficha dela está na lista de fichas visíveis
 * a quem consulta (a mesma matriz §14 que já decide o resto: quem não pode ver a ficha simplesmente
 * não a acha na lista, então o rótulo "Ameaça" sai `null`, não um valor incorreto).
 */
export function resolverNivelAmeaca(
  combatente: EncontroCombatenteResumoDto,
  fichasVisiveis: readonly Pick<FichaResumoDto, 'id' | 'na'>[],
): NivelAmeacaEnum | null {
  if (combatente.tipoFicha !== TipoFichaEnum.CRIATURA || combatente.fichaId === null) {
    return null;
  }
  return fichasVisiveis.find((ficha) => ficha.id === combatente.fichaId)?.na ?? null;
}
