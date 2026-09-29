import { CenaStatusEnum, TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import { UnauthorizedAccessException } from '../../core/exceptions';

/**
 * Política única de **quais cenas cada papel lê** — consumida por `CenaService` (recuperar/listar),
 * `CenaDocumentoService` (coluna Documentos) e `EncontroService` (encontro da cena, na leitura REST
 * e no broadcast). Nenhum desses serviços decide por conta própria (proibição #28): todos passam
 * por aqui, então o encontro legado e os documentos nunca abrem uma cena que a própria cena recusa.
 *
 * - `MESTRE`: todas — planejadas, a atual e o histórico.
 * - `JOGADOR`: **só a `ATIVA`** (decisão do autor de 2026-09-29, `jogador-acesso-somente-cena-atual`,
 *   que substitui para o jogador o histórico previsto na m7-22).
 * - `ESPECTADOR`: a `ATIVA` e as `ENCERRADA` — a política da m7-22 continua valendo; a do
 *   espectador é de spec própria e não se amplia por inferência.
 *
 * `PLANEJADA` é sempre exclusiva do mestre (trava anti-vazamento, m7-22).
 */
const STATUS_VISIVEIS_POR_PAPEL: Readonly<Record<TipoCampanhaMembroPapelEnum, readonly CenaStatusEnum[]>> = {
  [TipoCampanhaMembroPapelEnum.MESTRE]: [
    CenaStatusEnum.PLANEJADA,
    CenaStatusEnum.ATIVA,
    CenaStatusEnum.ENCERRADA,
  ],
  [TipoCampanhaMembroPapelEnum.JOGADOR]: [CenaStatusEnum.ATIVA],
  [TipoCampanhaMembroPapelEnum.ESPECTADOR]: [CenaStatusEnum.ATIVA, CenaStatusEnum.ENCERRADA],
};

/** `true` quando o papel pode ler uma cena nessa situação. */
export function cenaVisivelAoPapel(
  papel: TipoCampanhaMembroPapelEnum,
  status: CenaStatusEnum,
): boolean {
  return STATUS_VISIVEIS_POR_PAPEL[papel]?.includes(status) ?? false;
}

/** Recusa (403, nunca payload vazio) a leitura de uma cena que o papel não vê. */
export function validarCenaVisivelAoPapel(
  papel: TipoCampanhaMembroPapelEnum,
  status: CenaStatusEnum,
): void {
  if (!cenaVisivelAoPapel(papel, status)) {
    throw new UnauthorizedAccessException();
  }
}

/** Recorte das listagens (cenas e encontros) para o papel — os filtros que o SQL aplica. */
export function recorteCenasDoPapel(papel: TipoCampanhaMembroPapelEnum): {
  incluirPlanejadas: boolean;
  incluirEncerradas: boolean;
} {
  return {
    incluirPlanejadas: cenaVisivelAoPapel(papel, CenaStatusEnum.PLANEJADA),
    incluirEncerradas: cenaVisivelAoPapel(papel, CenaStatusEnum.ENCERRADA),
  };
}
