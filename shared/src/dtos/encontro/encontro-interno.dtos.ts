import type { FichaCriaturaDadosDto } from '../ficha/ficha-criatura.dtos';
import type { FichaJogadorDadosDto } from '../ficha/ficha.dtos';
import type { FichaImagemFocoDto } from '../ficha/ficha-operacao.dtos';
import type { CadenciaEnum, EncontroEventoTipoEnum, EncontroStatusEnum, TipoFichaEnum } from '../../enums';
import type { CondicaoCombatenteDto } from './encontro.dtos';

/**
 * DTOs **internos** do módulo `encontro` — trafegam só entre `EncontroService` e
 * `EncontroRepository`, nunca chegam ao frontend. `Interno` vem antes do verbo (CONVENTIONS).
 */

/** Linha crua de `encontro`, como o repositório a devolve. */
export interface EncontroLinhaDto {
  readonly id: number;
  readonly campanhaId: number;
  readonly nome: string;
  readonly status: EncontroStatusEnum;
  readonly rodadaAtual: number;
  readonly turnoIndice: number;
}

/**
 * Linha crua de `encontro_combatente` **já com a ficha resolvida** pelo `JOIN`. `fichaDados` é o
 * JSONB da ficha — quem interpreta a forma (jogador × criatura) é a service, que conhece os dois
 * contratos. NPC ainda não tem contrato tipado (`m4-05`): cai no ramo genérico e usa só o que é
 * comum.
 */
export interface EncontroCombatenteLinhaDto {
  readonly id: number;
  readonly encontroId: number;
  readonly fichaId: number | null;
  readonly nomeAvulso: string | null;
  readonly iniciativa: number | null;
  readonly cadencia: CadenciaEnum;
  readonly turnosPorRodada?: number;
  readonly ordem: number;
  readonly vidaMaximaAvulso: number | null;
  readonly vidaAtualAvulso: number | null;
  readonly condicoes: readonly CondicaoCombatenteDto[];
  /** Expressão de dados que sobrescreve o cálculo padrão de Iniciativa deste combatente (m7-19). */
  readonly iniciativaFormulaCustom: string | null;
  readonly fichaNome: string | null;
  readonly fichaCor: string | null;
  readonly fichaImagemUrl: string | null;
  readonly fichaImagemFoco: FichaImagemFocoDto | null;
  readonly tipoFicha: TipoFichaEnum | null;
  readonly fichaDados: FichaJogadorDadosDto | FichaCriaturaDadosDto | null;
  /**
   * Dado bruto pro recorte de identidade "de carteirinha" (m7-16) — se a ficha esconde a própria
   * identidade de quem não tem concessão (`ficha.oculta`, m3-65) e o nome de quem a possui. Nunca
   * serializado ao cliente: `EncontroService` os usa para decidir o conjunto de fichas com
   * identidade visível antes de descartar as duas colunas.
   */
  readonly fichaOculta: boolean | null;
  readonly fichaDonoNome: string | null;
  readonly corAvulso: string | null;
  readonly imagemUrlAvulso: string | null;
}

/** Entrada interna da criação do encontro — nasce em `MONTAGEM`, rodada 0, turno 0. */
export interface EncontroInternoCriarDto {
  readonly campanhaId: number;
  readonly nome: string;
  readonly status: EncontroStatusEnum;
}

/** Entrada interna da troca de situação do encontro (`MONTAGEM` → `ATIVO` → `ENCERRADO`). */
export interface EncontroInternoAlterarStatusDto {
  readonly id: number;
  readonly status: EncontroStatusEnum;
  readonly rodadaAtual: number;
  readonly turnoIndice: number;
}

/** Entrada interna do avanço/retorno de turno — só as duas colunas de posição. */
export interface EncontroInternoAlterarTurnoDto {
  readonly id: number;
  readonly rodadaAtual: number;
  readonly turnoIndice: number;
}

/**
 * Entrada interna da adição de um combatente. Ou `fichaId` preenchido (nome/vida vêm da ficha), ou
 * os três campos de avulso — o `CHECK` da tabela recusa qualquer mistura.
 */
export interface EncontroCombatenteInternoAdicionarDto {
  readonly encontroId: number;
  readonly fichaId: number | null;
  readonly nomeAvulso: string | null;
  readonly vidaMaximaAvulso: number | null;
  readonly vidaAtualAvulso: number | null;
  readonly cadencia: CadenciaEnum;
  readonly turnosPorRodada: number;
  readonly ordem: number;
  readonly corAvulso: string | null;
}

/** Entrada interna da troca de cor/imagem próprias do combatente avulso. */
export interface EncontroCombatenteIdentidadeInternoAlterarDto {
  readonly id: number;
  readonly corAvulso: string;
  readonly imagemUrlAvulso: string | null;
}

/** Entrada interna da atribuição de iniciativa a um combatente. */
export interface EncontroCombatenteInternoAlterarIniciativaDto {
  readonly id: number;
  readonly iniciativa: number;
}

/** Entrada interna da sobrescrita da expressão de dados de Iniciativa de um combatente (m7-19). */
export interface EncontroCombatenteInternoAlterarFormulaIniciativaDto {
  readonly id: number;
  readonly formula: string | null;
}

/** Entrada interna da troca das condições de um combatente (o JSONB inteiro é reescrito). */
export interface EncontroCombatenteInternoAlterarCondicoesDto {
  readonly id: number;
  readonly condicoes: readonly CondicaoCombatenteDto[];
}

/** Entrada interna do ajuste de vida de um combatente **avulso** (quem tem ficha muda na ficha). */
export interface EncontroCombatenteInternoAlterarVidaAvulsoDto {
  readonly id: number;
  readonly vidaAtualAvulso: number;
}

/** Entrada interna do registro de uma entrada do log. */
export interface EncontroEventoInternoRegistrarDto {
  readonly encontroId: number;
  readonly combatenteId: number | null;
  readonly tipo: EncontroEventoTipoEnum;
  readonly rodada: number;
  readonly turno: number;
  readonly texto: string;
}
