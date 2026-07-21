import { TipoDanoEnum } from '../../enums';
import {
  calcularStatItem,
  interpretarNotacaoResistencia,
  type AmplificadorAplicadoDto,
  type CarrinhoItemDto,
} from '../compras';
import { empilhamentosAmplificador } from './amplificador';

/**
 * Resistências a dano da aba Combate (m3-36; amplificadores generalizados em ajuste posterior) —
 * **sempre mostra os cinco tipos** (`TipoDanoEnum`), somando o que vem do **equipamento** (itens
 * equipados + modificações, incluindo Fragmento aplicado — m3-35) com uma base **manual editável**
 * (persistida em `FichaDerivadosDto.resistencias`, mesmo modelo `stored + editável` de m3-10). O
 * total exibido é `manual + equipamento` — **pode ficar negativo** (uma Defesa muito empilhada
 * derruba a resistência abaixo de 0; o documento não veda isso, e o motor não deve mascarar).
 *
 * **Amplificadores**: os dois que mexem em resistência (`Resistente`/`Defesa`, doc —
 * "⬡ Amplificadores") são tratados aqui por nome (mesmo padrão de `Blindada`/`Hazmat` em
 * `calcularStatItem`) via `empilhamentosAmplificador` de `./amplificador` — o módulo que
 * generaliza o efeito de amplificador pras demais stats (Defesa/Esquiva/Bloqueio/Deslocamento/
 * Inventário/Vida/Energia/testes de atributo).
 *
 * Fonte: docs/core/sistema-v4.1.0.md — "⬦ Resistências", "Tipos de Dano" e "⬡ Amplificadores"
 * (Resistente: "+1 de resistência a Dano Geral, a partir do 2º empilhamento -1 de Defesa a cada
 * empilhamento" — o bônus de resistência é fixo, não escala com empilhamento; Defesa: "+1 em
 * Defesa, a partir do 2º empilhamento -1 de resistência a tipos de dano a cada empilhamento" — a
 * penalidade de resistência escala com os empilhamentos além do primeiro, sobre **todos** os tipos).
 */

/** Uma linha de resistência — sempre uma das cinco de `TipoDanoEnum`. */
export interface ResistenciaLinhaDto {
  readonly tipo: TipoDanoEnum;
  /** Base manual, editável (stored em `derivados.resistencias`). */
  readonly manual: number;
  /** Soma do equipamento (itens equipados + mods, incluindo Fragmento aplicado, + amplificadores). */
  readonly equipamento: number;
  /** `manual + equipamento` — sem piso, pode negativar. */
  readonly total: number;
}

/** Entrada de `montarResistencias`. */
export interface ResistenciasMontarDto {
  readonly itens: readonly CarrinhoItemDto[];
  readonly amplificadores: readonly AmplificadorAplicadoDto[];
  /** Base manual por tipo — ausente = 0 em todos (ficha nova/anterior à edição manual). */
  readonly manual?: Partial<Record<TipoDanoEnum, number>>;
}

/** Ordem canônica de exibição — mesma ordem de `TipoDanoEnum`. */
const ORDEM_TIPOS: readonly TipoDanoEnum[] = [
  TipoDanoEnum.FISICO,
  TipoDanoEnum.BALISTICO,
  TipoDanoEnum.EXPLOSAO,
  TipoDanoEnum.QUIMICO,
  TipoDanoEnum.GERAL,
];

/** Soma da resistência do equipamento (itens equipados, mods, Fragmento aplicado) por tipo. */
function calcularResistenciaEquipamento(itens: readonly CarrinhoItemDto[]): Map<string, number> {
  const totais = new Map<string, number>();
  const somar = (tipo: string, valor: number): void => {
    totais.set(tipo, (totais.get(tipo) ?? 0) + valor);
  };

  itens
    .filter((item) => item.equipado === true)
    .forEach((item) => {
      const stat = calcularStatItem({ item });
      if (!stat?.resistencia) {
        return;
      }
      interpretarNotacaoResistencia(stat.resistencia).forEach((entrada) => somar(entrada.tipos, entrada.valor));
    });

  return totais;
}

/**
 * Monta as cinco linhas de resistência (sempre todas, mesmo em 0) — `manual` vem do stored da
 * ficha, `equipamento` soma itens equipados + Fragmento aplicado + os dois amplificadores que
 * mexem em resistência.
 */
export function montarResistencias(dto: ResistenciasMontarDto): readonly ResistenciaLinhaDto[] {
  const doEquipamento = calcularResistenciaEquipamento(dto.itens);

  const resistente = empilhamentosAmplificador(dto.amplificadores, 'Resistente');
  if (resistente > 0) {
    doEquipamento.set(TipoDanoEnum.GERAL, (doEquipamento.get(TipoDanoEnum.GERAL) ?? 0) + 1);
  }
  const defesaStacks = empilhamentosAmplificador(dto.amplificadores, 'Defesa');
  if (defesaStacks > 1) {
    const penalidade = defesaStacks - 1;
    ORDEM_TIPOS.forEach((tipo) => doEquipamento.set(tipo, (doEquipamento.get(tipo) ?? 0) - penalidade));
  }

  return ORDEM_TIPOS.map((tipo) => {
    const manual = dto.manual?.[tipo] ?? 0;
    const equipamento = doEquipamento.get(tipo) ?? 0;
    return { tipo, manual, equipamento, total: manual + equipamento };
  });
}
