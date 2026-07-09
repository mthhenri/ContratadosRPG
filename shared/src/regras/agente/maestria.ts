// Regra de Maestria de atributo (sistema-v4.1.0.md — "⬥ Maestrias"), m3-10. Funções puras,
// dto-free: operam sobre pontos/mapa de atributos, para servir tanto ao front (habilitar o toggle)
// quanto ao back (rejeitar maestria inválida) sem acoplar `regras` aos DTOs.

/** Pontos mínimos de um atributo para receber a Maestria (o ápice vem de um atributo já com 6). */
export const MAESTRIA_PONTOS_MINIMO = 6;

/** `true` se um atributo com `pontos` pode receber a Maestria (≥ 6). */
export function maestriaAtingivel(pontos: number): boolean {
  return pontos >= MAESTRIA_PONTOS_MINIMO;
}

/**
 * Valida o campo `maestria` de uma ficha contra seus atributos. `null` é válido (sem Maestria);
 * caso contrário o atributo indicado precisa existir e ter 6+ pontos. A **unicidade** ("única na
 * ficha") é garantida por construção — é um único campo, não um por atributo.
 */
export function maestriaValida(atributos: object, maestria: string | null): boolean {
  if (maestria === null) {
    return true;
  }
  const pontos = (atributos as Record<string, unknown>)[maestria];
  return typeof pontos === 'number' && maestriaAtingivel(pontos);
}
