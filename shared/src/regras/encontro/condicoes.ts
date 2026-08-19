import type { CondicaoCombatenteDto } from '../../dtos/encontro';

/** Resultado da virada de rodada sobre as condições de um combatente. */
export interface CondicoesExpiradasDto {
  /** As condições que continuam valendo, já decrementadas. */
  readonly condicoes: readonly CondicaoCombatenteDto[];
  /** As que acabaram nesta virada — o service as transforma em entradas de log. */
  readonly expiradas: readonly CondicaoCombatenteDto[];
}

/**
 * Aplica a virada de rodada às condições de um combatente: decrementa `rodadasRestantes` e remove
 * as que chegaram ao fim. Condição **permanente** (`rodadasRestantes: null`) nunca expira sozinha —
 * só sai por remoção manual do Mestre.
 *
 * Devolve também as expiradas, porque quem chama precisa delas para o log do encontro
 * (`CONDICAO_EXPIRADA`). Não muta a lista recebida.
 */
export function expirarCondicoes(
  condicoes: readonly CondicaoCombatenteDto[],
): CondicoesExpiradasDto {
  const sobreviventes: CondicaoCombatenteDto[] = [];
  const expiradas: CondicaoCombatenteDto[] = [];

  for (const condicao of condicoes) {
    if (condicao.rodadasRestantes === null) {
      sobreviventes.push(condicao);
      continue;
    }
    const restantes = condicao.rodadasRestantes - 1;
    if (restantes <= 0) {
      expiradas.push(condicao);
      continue;
    }
    sobreviventes.push({ ...condicao, rodadasRestantes: restantes });
  }

  return { condicoes: sobreviventes, expiradas };
}

/**
 * Informa se o próximo turno do combatente é **consumido** por alguma condição — o marcador
 * `perdeTurno` (`Inconsciente`, `Insolação` e afins, `sistema-v4.1.0.md` > "Condições"). Quem
 * conduz o encontro pula o turno e registra o evento.
 */
export function combatentePerdeTurno(condicoes: readonly CondicaoCombatenteDto[]): boolean {
  return condicoes.some((condicao) => condicao.perdeTurno);
}
