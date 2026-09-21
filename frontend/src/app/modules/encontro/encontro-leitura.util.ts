import type { EncontroCombatenteResumoDto, EncontroRecuperadoDto } from '@contratados-rpg/shared/dtos/encontro';
import type { FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';
import {
  CadenciaEnum,
  CombatenteOrigemEnum,
  EncontroStatusEnum,
  NivelAmeacaEnum,
  TipoFichaEnum,
} from '@contratados-rpg/shared/enums';
import { calcularTurnosPorRodada } from '@contratados-rpg/shared/regras/encontro';

import type { FichaFlutuanteAlvo } from '../ficha/componentes/ficha-flutuante/ficha-flutuante.model';
import { rotuloClasseCompleto } from '../ficha/rotulos-ficha';

/**
 * Derivação pura do estado de leitura de um `EncontroRecuperadoDto` — extraído do antigo
 * `painel-encontro.page.ts` (m8-05, hoje `EncontroPainelDadosService`) para não duplicar a mesma
 * apresentação entre a tela "Iniciativa" do jogador/mestre e a composição de leitura do
 * espectador/prévia de jogador. Nenhuma regra de
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
  // ainda estiver pendente na rodada — mesmo critério do antigo `jaAgiram` do painel.
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
 * Quantos turnos faltam até o combatente agir: a menor distância, em slots de `ordemRodada`, do
 * turno atual até um slot dele — contando a virada de rodada (o último slot é seguido do primeiro).
 * `0` é a vez dele; um combatente de Cadência > 1 tem vários slots e vale o mais próximo. `null`
 * fora do combate ou quando ele não está na ordem calculada (entrou depois dela). Deriva da ordem
 * que o backend já entregou, não recalcula Cadência.
 */
export function turnosAteAVez(
  encontro: EncontroRecuperadoDto | null,
  combatenteId: number,
): number | null {
  if (!encontro || encontro.status !== EncontroStatusEnum.ATIVO) {
    return null;
  }
  const total = encontro.ordemRodada.length;
  const distancias = encontro.ordemRodada.flatMap((slot, indice) =>
    slot.combatenteId === combatenteId ? [(indice - encontro.turnoIndice + total) % total] : [],
  );
  return distancias.length > 0 ? Math.min(...distancias) : null;
}

/**
 * O alvo da janela flutuante de ficha para um combatente/ficha — só `JOGADOR` e `CRIATURA` têm o
 * que abrir (avulso e NPC não), e o dono vem do resumo já carregado (`fichasVisiveis`), sem nova
 * consulta. `null` quando não há o que abrir.
 */
export function resolverFichaParaAbrir(
  fichaId: number,
  tipo: TipoFichaEnum | null,
  fichasVisiveis: readonly Pick<FichaResumoDto, 'id' | 'usuarioId'>[],
): FichaFlutuanteAlvo | null {
  if (tipo !== TipoFichaEnum.JOGADOR && tipo !== TipoFichaEnum.CRIATURA) {
    return null;
  }
  const usuarioIdDono = fichasVisiveis.find((ficha) => ficha.id === fichaId)?.usuarioId;
  return usuarioIdDono === undefined ? null : { fichaId, tipo, usuarioIdDono };
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

/**
 * Quantos turnos o combatente tem na rodada — o motor puro (`calcularTurnosPorRodada`) decide; só
 * a Cadência Frenética carrega um número próprio (mínimo 4). Compartilhada pelo cartão, pela
 * trilha e pela ficha resumida do mestre para nunca divergirem sobre "Cadência N".
 */
export function turnosPorRodadaDoCombatente(
  combatente: Pick<EncontroCombatenteResumoDto, 'cadencia' | 'turnosPorRodada'>,
): number {
  return combatente.cadencia === CadenciaEnum.FRENETICA
    ? Math.max(4, combatente.turnosPorRodada ?? 4)
    : calcularTurnosPorRodada(combatente.cadencia);
}

/**
 * `true` quando a "carteirinha" do agente (avatar, dono, classe/arquétipo) chegou mesmo sem
 * `revelado` (m7-16): o backend só popula `donoNome` nesse caso, e só num agente de ficha.
 */
export function combatenteTemIdentidadeVisivel(
  combatente: Pick<EncontroCombatenteResumoDto, 'tipoFicha' | 'donoNome'>,
): boolean {
  return combatente.tipoFicha === TipoFichaEnum.JOGADOR && combatente.donoNome !== null;
}

/**
 * Linha de origem do combatente: o agente mostra quem o joga e a classe/arquétipo, em duas linhas
 * (quebra de linha `\n` — o consumidor usa `white-space: pre-line`); os demais dizem de onde
 * vieram, numa linha só.
 */
export function linhaOrigemDoCombatente(combatente: EncontroCombatenteResumoDto): string {
  if (combatenteTemIdentidadeVisivel(combatente)) {
    const classeLabel = combatente.classe
      ? rotuloClasseCompleto(combatente.classe, combatente.arquetipo)
      : 'Agente';
    return `${combatente.donoNome}\n${classeLabel}`;
  }
  if (!combatente.revelado) {
    return 'Em campo';
  }
  if (combatente.origem === CombatenteOrigemEnum.AVULSO) {
    return 'Digitado nesta sessão';
  }
  if (combatente.tipoFicha === TipoFichaEnum.CRIATURA) {
    return 'Criatura da campanha';
  }
  if (combatente.tipoFicha === TipoFichaEnum.JOGADOR) {
    return 'Agente';
  }
  return 'Adicionado pelo mestre';
}

/**
 * Uma defesa exibida — só as que o combatente realmente possui. O `rotuloCurto` é a forma do
 * mobile (`Def · Esq · Blo · Con`); os dois viajam juntos porque a troca é de largura de tela,
 * decidida no CSS.
 */
export interface DefesaExibidaDto {
  readonly rotulo: string;
  readonly rotuloCurto: string;
  /** Nome por extenso (`Contra-ataque`) — a ficha resumida tem largura para ele; o cartão, não. */
  readonly rotuloExtenso: string;
  readonly valor: number;
}

/**
 * As defesas que o combatente **de fato** possui. A criatura chega com Esquiva/Bloqueio/Contra
 * nulos (ela não reage — a regra vence o mockup), então sai só com Defesa; o avulso, com nenhuma.
 */
export function defesasDoCombatente(
  combatente: Pick<
    EncontroCombatenteResumoDto,
    'defesa' | 'esquiva' | 'bloqueio' | 'contraAtaque'
  >,
): readonly DefesaExibidaDto[] {
  const candidatas: readonly (readonly [string, string, string, number | null])[] = [
    ['Defesa', 'Def', 'Defesa', combatente.defesa],
    ['Esquiva', 'Esq', 'Esquiva', combatente.esquiva],
    ['Bloqueio', 'Blo', 'Bloqueio', combatente.bloqueio],
    ['Contra', 'Con', 'Contra-ataque', combatente.contraAtaque],
  ];
  return candidatas
    .filter(
      (quarteto): quarteto is readonly [string, string, string, number] => quarteto[3] !== null,
    )
    .map(([rotulo, rotuloCurto, rotuloExtenso, valor]) => ({
      rotulo,
      rotuloCurto,
      rotuloExtenso,
      valor,
    }));
}

/**
 * Sigla de duas letras para o avatar sem imagem: inicial da primeira e da última palavra do nome
 * (`Marco "Aço" Kessler` → `MK`); nome de uma palavra só usa as duas primeiras letras. Aspas e
 * pontuação nas bordas das palavras são ignoradas.
 */
export function siglaDoCombatente(nome: string): string {
  const palavras = nome
    .split(/\s+/)
    .map((palavra) => palavra.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter((palavra) => palavra.length > 0);
  if (palavras.length === 0) {
    return '?';
  }
  const sigla =
    palavras.length === 1
      ? [...palavras[0]].slice(0, 2).join('')
      : `${[...palavras[0]][0]}${[...palavras[palavras.length - 1]][0]}`;
  return sigla.toLocaleUpperCase('pt-BR');
}
