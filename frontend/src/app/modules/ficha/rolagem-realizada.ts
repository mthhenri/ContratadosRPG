import type { ResultadoRolagemDto } from '@contratados-rpg/shared/regras/rolagem';

/**
 * Payload emitido por um componente controlado de rolagem (`FichaRolagens`/`FichaInventario`)
 * quando executa uma rolagem (m3-27) — mesmo formato aceito por `BandejaDadosService.mostrar`.
 * Quem persiste (`FichaVisualizacao`, que já conhece o `fichaId`) decide a visibilidade; o
 * componente que rola não precisa saber disso.
 */
export interface RolagemRealizadaDto {
  readonly rotulo: string;
  readonly formula?: string;
  readonly resultado: ResultadoRolagemDto;
}
