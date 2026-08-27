import { ItemCategoriaEnum, TipoDanoEnum } from '../../enums';
import type { FichaAtributosDto, FichaHabilidadeDto } from '../../dtos/ficha';
import {
  calcularStatItem,
  interpretarNotacaoResistencia,
  resolverDadosItem,
  type AmplificadorAplicadoDto,
  type CarrinhoItemDto,
} from '../compras';
import { empilhamentosAmplificador } from './amplificador';

/**
 * Resistências a dano da aba Combate (m3-36; amplificadores generalizados em ajuste posterior; bônus
 * de Formação em m3-41) — **sempre mostra os cinco tipos** (`TipoDanoEnum`), somando o que vem do
 * **equipamento** (itens equipados + modificações, incluindo Fragmento aplicado — m3-35) com uma
 * base **manual editável** (persistida em `FichaDerivadosDto.resistencias`, mesmo modelo
 * `stored + editável` de m3-10) e o bônus de **Formação da Origem** (`obterResistenciaFormacao`,
 * `shared/regras/identidade`). O total exibido é `manual + equipamento + formacao` — **pode ficar
 * negativo** (uma Defesa muito empilhada derruba a resistência abaixo de 0; o documento não veda
 * isso, e o motor não deve mascarar).
 *
 * **Amplificadores**: os dois que mexem em resistência (`Resistente`/`Defesa`, doc —
 * "⬡ Amplificadores") são tratados aqui por nome (mesmo padrão de `Blindada`/`Hazmat` em
 * `calcularStatItem`) via `empilhamentosAmplificador` de `./amplificador` — o módulo que
 * generaliza o efeito de amplificador pras demais stats (Defesa/Esquiva/Bloqueio/Deslocamento/
 * Inventário/Vida/Energia/testes de atributo).
 *
 * Fonte: docs/core/sistema-v4.1.0.md — "⬦ Resistências", "Tipos de Dano" e "⬡ Amplificadores"
 * (Resistente: "+1 de resistência a Dano Geral, a partir do 2º empilhamento -1 de Defesa a cada
 * empilhamento" — o bônus de resistência **escala com os empilhamentos** (mesma regra geral de
 * `amplificador.ts`), a penalidade cruzada em Defesa só entra do 2º empilhamento em diante; Defesa:
 * "+1 em Defesa, a partir do 2º empilhamento -1 de resistência a tipos de dano a cada empilhamento"
 * — a penalidade de resistência escala com os empilhamentos além do primeiro, sobre **todos** os
 * tipos).
 */

/** Uma linha de resistência — sempre uma das cinco de `TipoDanoEnum`. */
export interface ResistenciaLinhaDto {
  readonly tipo: TipoDanoEnum;
  /** Base manual, editável (stored em `derivados.resistencias`). */
  readonly manual: number;
  /**
   * Soma do equipamento (itens equipados + mods, incluindo Fragmento aplicado, + amplificadores e,
   * quando aplicável, o bônus de Maestria de Vigor de cada Proteção).
   */
  readonly equipamento: number;
  /** Bônus de Formação da Origem no tipo (`COMBATE_RESISTENCIA_TIPO_DANO`, m3-41). */
  readonly formacao: number;
  /** Bônus da Maestria de Vigor — presente somente quando a ficha possui essa Maestria. */
  readonly maestria?: number;
  /** `manual + equipamento + formacao` — `maestria`, quando presente, já compõe `equipamento`. */
  readonly total: number;
}

/** Entrada de `montarResistencias`. */
export interface ResistenciasMontarDto {
  readonly itens: readonly CarrinhoItemDto[];
  readonly amplificadores: readonly AmplificadorAplicadoDto[];
  /** Habilidades permanentes que alteram Proteções (`Tanque`: +3 por Proteção equipada). */
  readonly habilidades?: readonly FichaHabilidadeDto[];
  /** Base manual por tipo — ausente = 0 em todos (ficha nova/anterior à edição manual). */
  readonly manual?: Partial<Record<TipoDanoEnum, number>>;
  /** Bônus de Formação por tipo (`obterResistenciaFormacao`, m3-41) — ausente = 0 em todos. */
  readonly formacao?: Partial<Record<TipoDanoEnum, number>>;
  /** Maestria adquirida pela ficha; apenas `vigor` altera as resistências. */
  readonly maestria?: keyof FichaAtributosDto | null;
  /** Valor atual de Vigor da ficha, usado pela Maestria de Vigor. */
  readonly vigor?: number;
}

/**
 * Aplica a Maestria de Vigor à notação de resistência de uma Proteção. A Maestria pertence à
 * ficha, não ao catálogo: por isso o valor persistido do item não é alterado e consumidores sem
 * contexto de personagem (como a calculadora pública) continuam vendo a base canônica.
 */
export interface ResistenciaProtecaoBonificarDto {
  /** Resistência final: base já fundida às modificações. */
  readonly resistencia: string | undefined;
  readonly categoria: ItemCategoriaEnum;
  /** Resistência canônica antes das modificações; define os tipos que recebem os bônus. */
  readonly resistenciaBase: string | undefined;
  readonly maestria: keyof FichaAtributosDto | null;
  readonly vigor: number;
  readonly habilidades: readonly FichaHabilidadeDto[];
}

/** Expande a notação composta de uma resistência em seus tipos de dano declarados. */
function listarTiposResistencia(resistencia: string | undefined): ReadonlySet<string> {
  return new Set(
    interpretarNotacaoResistencia(resistencia ?? '')
      .flatMap((entrada) => entrada.tipos.split('/'))
      .map((tipo) => tipo.trim()),
  );
}

/**
 * Aplica Maestria de Vigor e Tanque somente aos tipos nativos da Proteção. A resistência final já
 * contém as modificações, mas `resistenciaBase` preserva o recorte semântico exigido pelo sistema.
 */
export function aplicarBonusProtecaoNaResistencia(dto: ResistenciaProtecaoBonificarDto): string | undefined {
  if (!dto.resistencia || dto.categoria !== ItemCategoriaEnum.PROTECOES) {
    return dto.resistencia;
  }

  const tiposNativos = listarTiposResistencia(dto.resistenciaBase);
  const bonusMaestria = dto.maestria === 'vigor' ? dto.vigor : 0;
  const bonusTanque = dto.habilidades.some((habilidade) => habilidade.nome === 'Tanque') ? 3 : 0;
  if (tiposNativos.size === 0 || bonusMaestria + bonusTanque === 0) {
    return dto.resistencia;
  }

  return interpretarNotacaoResistencia(dto.resistencia)
    .flatMap((entrada) => {
      const grupos = new Map<number, string[]>();
      entrada.tipos.split('/').forEach((tipoBruto) => {
        const tipo = tipoBruto.trim();
        const valor = entrada.valor + (tiposNativos.has(tipo) ? bonusMaestria + bonusTanque : 0);
        grupos.set(valor, [...(grupos.get(valor) ?? []), tipo]);
      });
      return [...grupos.entries()].map(([valor, tipos]) => `${valor} [${tipos.join('/')}]`);
    })
    .join(', ');
}

/** Ordem canônica de exibição — mesma ordem de `TipoDanoEnum`. */
const ORDEM_TIPOS: readonly TipoDanoEnum[] = [
  TipoDanoEnum.FISICO,
  TipoDanoEnum.BALISTICO,
  TipoDanoEnum.EXPLOSAO,
  TipoDanoEnum.QUIMICO,
  TipoDanoEnum.GERAL,
];

/**
 * Soma da resistência do equipamento (itens equipados, mods, Fragmento aplicado) por tipo — inclui
 * armaduras/escudos **equipados** (`item.equipado === true`) e armazenamentos **vestidos**
 * (`item.categoria === ARMAZENAMENTO && item.guardada === false`, m3-43: a resistência embutida ou
 * de mod como "Camadas Extras" de uma mochila só vale enquanto ela está sendo usada, mesma regra de
 * `calcularTotaisCarrinho`/`bonusInventario` — guardada não conta).
 */
function calcularResistenciaEquipamento(
  itens: readonly CarrinhoItemDto[],
  habilidades: readonly FichaHabilidadeDto[],
  maestria: keyof FichaAtributosDto | null,
  vigor: number,
): { readonly equipamento: Map<string, number>; readonly maestria: Map<string, number> } {
  const totais = new Map<string, number>();
  const maestrias = new Map<string, number>();
  const temTanque = habilidades.some((habilidade) => habilidade.nome === 'Tanque');
  const somar = (tipo: string, valor: number): void => {
    totais.set(tipo, (totais.get(tipo) ?? 0) + valor);
  };
  const somarMaestria = (tipo: string, valor: number): void => {
    maestrias.set(tipo, (maestrias.get(tipo) ?? 0) + valor);
  };

  itens
    .filter(
      (item) =>
        item.equipado === true ||
        (item.categoria === ItemCategoriaEnum.ARMAZENAMENTO && item.guardada === false),
    )
    .forEach((item) => {
      const stat = calcularStatItem({ item });
      if (!stat?.resistencia) {
        return;
      }
      const tiposNativos = listarTiposResistencia(resolverDadosItem(item)?.resistencia);
      // Escudos usam notação composta "[Tipo/Tipo]" (catalogo.dados.ts) pra dizer que o valor cheio
      // vale pros dois tipos — cada lado do "/" precisa virar sua própria entrada em `totais`, senão
      // a chave composta nunca bate com nenhum `TipoDanoEnum` de `ORDEM_TIPOS`.
      const bonusMaestria = item.categoria === ItemCategoriaEnum.PROTECOES && maestria === 'vigor' ? vigor : 0;
      const bonusTanque = temTanque && item.categoria === ItemCategoriaEnum.PROTECOES ? 3 : 0;
      interpretarNotacaoResistencia(stat.resistencia).forEach((entrada) =>
        entrada.tipos
          .split('/')
          .forEach((tipo) => {
            const tipoNormalizado = tipo.trim();
            const bonusNativo = tiposNativos.has(tipoNormalizado) ? bonusTanque + bonusMaestria : 0;
            somar(tipoNormalizado, entrada.valor + bonusNativo);
            if (bonusMaestria > 0 && tiposNativos.has(tipoNormalizado)) {
              somarMaestria(tipoNormalizado, bonusMaestria);
            }
          }),
      );
    });

  return { equipamento: totais, maestria: maestrias };
}

/**
 * Monta as cinco linhas de resistência (sempre todas, mesmo em 0) — `manual` vem do stored da
 * ficha, `equipamento` soma itens equipados + Fragmento aplicado + os dois amplificadores que
 * mexem em resistência.
 */
export function montarResistencias(dto: ResistenciasMontarDto): readonly ResistenciaLinhaDto[] {
  const maestriaVigor = dto.maestria === 'vigor' ? (dto.vigor ?? 0) : 0;
  const calculado = calcularResistenciaEquipamento(
    dto.itens,
    dto.habilidades ?? [],
    dto.maestria ?? null,
    maestriaVigor,
  );
  const doEquipamento = calculado.equipamento;

  const resistente = empilhamentosAmplificador(dto.amplificadores, 'Resistente');
  if (resistente > 0) {
    doEquipamento.set(TipoDanoEnum.GERAL, (doEquipamento.get(TipoDanoEnum.GERAL) ?? 0) + resistente);
  }
  const defesaStacks = empilhamentosAmplificador(dto.amplificadores, 'Defesa');
  if (defesaStacks > 1) {
    const penalidade = defesaStacks - 1;
    ORDEM_TIPOS.forEach((tipo) => doEquipamento.set(tipo, (doEquipamento.get(tipo) ?? 0) - penalidade));
  }

  return ORDEM_TIPOS.map((tipo) => {
    const manual = dto.manual?.[tipo] ?? 0;
    const equipamento = doEquipamento.get(tipo) ?? 0;
    const formacao = dto.formacao?.[tipo] ?? 0;
    const maestria = calculado.maestria.get(tipo);
    return {
      tipo,
      manual,
      equipamento,
      formacao,
      ...(maestria === undefined ? {} : { maestria }),
      total: manual + equipamento + formacao,
    };
  });
}
