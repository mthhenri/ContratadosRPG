import { calcularStatItem, interpretarNotacaoResistencia, type CarrinhoItemDto } from '../compras';

/**
 * Agregação de resistências a dano da aba Combate (m3-33) — soma a resistência de todo item
 * **equipado** (`CarrinhoItemDto.equipado`, hoje só Proteções), agrupada por tipo de dano. Reusa
 * `calcularStatItem`/`interpretarNotacaoResistencia` de `shared/regras/compras` — mesma fonte que já
 * soma bônus de modificações (incluindo as de Fragmento aplicado, m3-32); zero motor duplicado.
 *
 * Fonte: docs/core/sistema-v4.1.0.md — "⬦ Resistências" e "Tipos de Dano" (Dano Geral: "impossível de
 * ser burlada e/ou reduzida... reduz qualquer um [os tipos convencionais]" — aqui ele só entra como
 * mais uma entrada agregada; a semântica de "reduz qualquer tipo" é resolução de dano, fora de escopo
 * desta task, que só soma e exibe).
 */

/** Uma resistência agregada — `tipo` é a string do documento (`Físico`, `Balístico`, ..., `Geral`). */
export interface ResistenciaAgregadaDto {
  readonly tipo: string;
  readonly valor: number;
}

/** Entrada de `calcularResistencias`. */
export interface ResistenciasCalcularDto {
  readonly itens: readonly CarrinhoItemDto[];
  /**
   * Bônus já resolvidos de fora do inventário (ponto de extensão — ainda não populado por nada;
   * reservado pra quando Formação, `m3-25`, precisar injetar resistência sem quebrar a assinatura).
   */
  readonly bonusExternos?: readonly ResistenciaAgregadaDto[];
}

/**
 * Soma a resistência de todo item `equipado === true`, agrupada por tipo — só entradas com total
 * positivo aparecem. Itens sem resistência computável (armas, itens não equipados) não contribuem.
 */
export function calcularResistencias(dto: ResistenciasCalcularDto): readonly ResistenciaAgregadaDto[] {
  const totais = new Map<string, number>();
  const somar = (tipo: string, valor: number): void => {
    totais.set(tipo, (totais.get(tipo) ?? 0) + valor);
  };

  dto.itens
    .filter((item) => item.equipado === true)
    .forEach((item) => {
      const stat = calcularStatItem({ item });
      if (!stat?.resistencia) {
        return;
      }
      interpretarNotacaoResistencia(stat.resistencia).forEach((entrada) => somar(entrada.tipos, entrada.valor));
    });

  (dto.bonusExternos ?? []).forEach((bonus) => somar(bonus.tipo, bonus.valor));

  return Array.from(totais.entries())
    .filter(([, valor]) => valor > 0)
    .map(([tipo, valor]) => ({ tipo, valor }));
}
