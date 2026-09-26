import type { CenaStatusEnum, CenaTipoEnum } from '../../enums';

/**
 * DTOs do módulo `cena` (m7-cenas) — a raiz tipada da mesa, da qual o `encontro` (iniciativa) é
 * uma estrutura opcional. Nesta task só o contrato de criação; os DTOs de condução
 * (abrir/encerrar/reordenar/resumo) nascem em `m7-22` junto com o seu consumidor.
 */

/**
 * Entrada da criação da cena — o `campanhaId` vem da rota. `ativarImediatamente` cria a cena já
 * `ATIVA` (encerrando a ativa atual da campanha); caso contrário nasce `PLANEJADA`.
 */
export interface CenaCriarDto {
  readonly nome: string;
  readonly tipo: CenaTipoEnum;
  readonly ativarImediatamente: boolean;
}

/** Saída da criação — a cena recém-criada. */
export interface CenaCriadaDto {
  readonly id: number;
  readonly campanhaId: number;
  readonly nome: string;
  readonly tipo: CenaTipoEnum;
  readonly status: CenaStatusEnum;
}
