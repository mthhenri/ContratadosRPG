/** Valores de um agente já autorizado; a seleção do observador pertence à service. */
export interface FichaMediaReferenciaDto {
  readonly nivel: number | null;
  readonly prestigio?: number | null;
}

/** Entrada do agregado puro, sem identidade ou regras de permissão no motor. */
export interface FichaMediasEsquadraoCalcularDto {
  readonly fichas: readonly FichaMediaReferenciaDto[];
}
