/** Avalia a reserva da identidade de rolagem segundo o estado atual da ficha. */
export interface FichaRolagemIdentidadeAvaliarDto {
  readonly fichaId: number;
  readonly usuarioId: number | null;
}
