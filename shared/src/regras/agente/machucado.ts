/** Entrada de {@link resolverMachucadoPelaVida}. */
export interface MachucadoPelaVidaDto {
  readonly vidaAtual: number;
  /** Ausente em ficha sem snapshot de máximos (retrocompat) — sem máximo não há como decidir. */
  readonly vidaMaxima?: number;
  /** Valor atual da condição, mantido quando a Vida está na faixa intermediária. */
  readonly machucado: boolean;
}

/**
 * Resolve a condição **Machucado** a partir da Vida (`sistema-v4.1.0.md` — "Condições": tirou
 * metade da Vida; "só é removido ao recuperar 100% da Vida"). Tem histerese: liga com Vida ≤ 50%
 * da máxima, mantém o valor atual entre 50% e 99% e só desliga em 100%. Ficha sem `vidaMaxima`
 * mantém o valor recebido.
 *
 * Chamada só quando a **Vida muda**: o toggle manual (ex.: Anestesia) vale até a próxima mudança
 * de Vida.
 */
export function resolverMachucadoPelaVida(entrada: MachucadoPelaVidaDto): boolean {
  const { vidaAtual, vidaMaxima, machucado } = entrada;
  if (vidaMaxima === undefined || vidaMaxima <= 0) {
    return machucado;
  }
  if (vidaAtual >= vidaMaxima) {
    return false;
  }
  if (vidaAtual * 2 <= vidaMaxima) {
    return true;
  }
  return machucado;
}
