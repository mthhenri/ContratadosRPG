import { ClasseEnum } from '@contratados-rpg/shared/enums';
import type {
  FichaAtributosDto,
  FichaDerivadosDto,
  FichaHabilidadeDto,
} from '@contratados-rpg/shared/dtos/ficha';
import {
  ajusteBloqueioAmplificadores,
  ajusteDanoFurtivoAmplificadores,
  ajusteDefesaAmplificadores,
  ajusteDeslocamentoAmplificadores,
  ajusteEsquivaAmplificadores,
  ajusteInventarioAmplificadores,
  aplicarLimitesPorClasse,
  calcularAreaPercepcao,
  calcularBonusDefesaEquipamento,
  calcularContraAtaque,
  calcularDanoCorpo,
  calcularDanoFurtivo,
  calcularDefesa,
  calcularDeslocamento,
  calcularInventario,
  calcularLimiteHabilidadesPorTurno,
  calcularProficiencia,
  incrementarDanoFurtivo,
  obterLimitesClasse,
} from '@contratados-rpg/shared/regras/agente';
import type { AmplificadorAplicadoDto, CarrinhoItemDto } from '@contratados-rpg/shared/regras/compras';
import type { PatenteDados } from '@contratados-rpg/shared/regras/dados';
import { obterPatente } from '@contratados-rpg/shared/regras/patente';

import { ROTULOS_PATENTE } from '../simulacao/rotulos';

/**
 * Status derivado da ficha compartilhado pela **exibição** (`FichaVisualizacao`) e pela **edição**
 * (`FichaFormulario`). **Nenhuma regra vive aqui**: só orquestra chamadas a `shared/regras` (fonte
 * única — proibições #26/#27) e resolve o **valor efetivo** de cada derivado — o **stored** (`dados.
 * derivados`, m3-10) tem precedência; ausente, cai no **calculado**. Cada linha carrega `bruto` (valor
 * cru p/ edição no próprio lugar) e `display` (formatado p/ leitura).
 *
 * **Amplificadores** (`shared/regras/agente/amplificador`) somam **por cima** do `bruto` só no
 * `display` — nunca entram no valor editável, pelo mesmo motivo de `atributosEfetivos` (lesão): se
 * o delta do amplificador fosse commitado de volta como override manual, a próxima leitura somaria
 * o mesmo bônus/penalidade de novo (drift). Editar sempre mexe na base; o amplificador é sempre
 * recalculado ao vivo.
 */

/** Texto exibido no lugar de uma stat que a classe não possui (ex.: Civil sem defesa/furtivo). */
const INDISPONIVEL = 'N/A';

/** Chave editável do bloco `derivados` exibida na coluna "Informações Extras". */
export type ChaveInfoExtra = Extract<
  keyof FichaDerivadosDto,
  | 'defesa'
  | 'esquiva'
  | 'bloqueio'
  | 'contraAtaque'
  | 'deslocamento'
  | 'proficiencia'
  | 'danoCorpoACorpo'
  | 'danoFurtivo'
  | 'percepcao'
  | 'inventarioMaximo'
  | 'habilidadesPorTurno'
>;

/** Linha da coluna "Informações Extras" — rótulo, valor de leitura e valor cru editável. */
export interface InfoExtra {
  readonly chave: ChaveInfoExtra;
  readonly rotulo: string;
  /** Valor formatado para leitura (com unidade/sinal), ou `N/A`. */
  readonly display: string;
  /** Valor cru para edição; `null` = indisponível para a classe (não editável). */
  readonly bruto: string | number | null;
  readonly tipo: 'numero' | 'texto';
}

/**
 * Entrada já normalizada aos limites da classe (os cinco atributos que a maioria das fórmulas
 * consome, `+ luta`/`+ intelecto` — usados só por `calcularContraAtaque`/`calcularInventario`
 * ("Mochileiro"); clampados aqui do mesmo jeito, mas fora de `aplicarLimitesPorClasse` porque essa
 * função também serve a Simulacao pública, que não tem campo de Luta no formulário).
 */
export type EntradaAgente = {
  readonly classe: ClasseEnum;
  readonly luta: number;
  readonly intelecto: number;
} & ReturnType<typeof aplicarLimitesPorClasse>;

/**
 * Normaliza classe/nível/atributos aos limites da classe, devolvendo só o recorte que
 * `shared/regras/agente` consome. Garante que valores fora dos bounds nunca escapem ao cálculo.
 */
export function normalizarEntrada(
  classe: ClasseEnum,
  nivel: number,
  atributos: FichaAtributosDto,
): EntradaAgente {
  const normalizado = aplicarLimitesPorClasse({
    classe,
    nivel,
    vigor: atributos.vigor,
    destreza: atributos.destreza,
    forca: atributos.forca,
    vontade: atributos.vontade,
    sentidos: atributos.sentidos,
  });
  const limitesAtributo = obterLimitesClasse({ classe });
  const luta = Math.min(
    limitesAtributo.atributoMaximo,
    Math.max(limitesAtributo.atributoMinimo, atributos.luta),
  );
  const intelecto = Math.min(
    limitesAtributo.atributoMaximo,
    Math.max(limitesAtributo.atributoMinimo, atributos.intelecto),
  );
  return { classe, luta, intelecto, ...normalizado };
}

/**
 * Linhas da coluna "Informações Extras" — o **stored** (`derivados`) vence o **calculado**; o
 * amplificador soma por cima só na leitura (ver docstring do módulo). Cada uma é editável no
 * próprio lugar (m3-10) e persiste como override em `derivados[chave]` (o `bruto`, sem o delta do
 * amplificador).
 *
 * **Equipamento** (`itens`, m3-43): Esquiva/Bloqueio/Defesa somam também o bônus de itens de
 * Proteções **equipados** (`calcularBonusDefesaEquipamento` — mods "Flexível"/"Resistente" e
 * efeito custom `DEFESA`), mesma filosofia "por cima, nunca persistido" do amplificador.
 *
 * **Bônus de Defesa cascateia nas reações**: doc (`docs/core/sistema-v4.1.0.md` — "Defesa") define
 * Esquiva/Bloqueio/Contra-Ataque como a "Defesa Final" (Defesa Base + Habilidades/Fragmentos) somada
 * ao bônus de cada reação. Todo bônus que mexe na Defesa (amplificador "Defesa", "Resistente", ou o
 * bônus de equipamento) entra também em `bonusDefesa` e soma nas três reações, além do próprio bônus
 * específico de cada uma (Reflexos/Resiliência, Flexível/Resistente).
 */
export function montarInformacoesExtras(
  entrada: EntradaAgente,
  habilidades: readonly FichaHabilidadeDto[],
  derivados?: FichaDerivadosDto,
  amplificadores: readonly AmplificadorAplicadoDto[] = [],
  itens: readonly CarrinhoItemDto[] = [],
): InfoExtra[] {
  const defesaCalc = calcularDefesa(entrada);
  const proficienciaCalc = calcularProficiencia(entrada);
  const bonusEquipamento = calcularBonusDefesaEquipamento(itens);
  // doc — "Defesa": a Defesa Base complementada por Habilidades/Fragmentos vira a "Defesa Final", e é
  // sobre ela que Esquiva/Bloqueio/Contra-Ataque somam seus próprios bônus de reação. Todo bônus de
  // Defesa (amplificador "Defesa", equipamento) precisa então valer também para as três reações.
  const bonusDefesa = ajusteDefesaAmplificadores(amplificadores) + bonusEquipamento.defesa;

  const linhaNumero = (
    chave: ChaveInfoExtra,
    rotulo: string,
    calculado: number | null,
    formatar: (valor: number) => string,
    ajusteAmplificador = 0,
  ): InfoExtra => {
    const stored = derivados?.[chave];
    const valor = typeof stored === 'number' ? stored : calculado;
    const efetivo = valor === null ? null : valor + ajusteAmplificador;
    return {
      chave,
      rotulo,
      display: efetivo === null ? INDISPONIVEL : formatar(efetivo),
      bruto: valor,
      tipo: 'numero',
    };
  };

  const linhaTexto = (
    chave: ChaveInfoExtra,
    rotulo: string,
    calculado: string | null,
    incrementoMarcosAmplificador = 0,
  ): InfoExtra => {
    const stored = derivados?.[chave];
    const valor = typeof stored === 'string' ? stored : calculado;
    const efetivo =
      valor !== null && incrementoMarcosAmplificador > 0
        ? incrementarDanoFurtivo(valor, incrementoMarcosAmplificador)
        : valor;
    return { chave, rotulo, display: efetivo ?? INDISPONIVEL, bruto: valor, tipo: 'texto' };
  };

  return [
    linhaNumero('defesa', 'Defesa', defesaCalc?.defesa ?? null, (valor) => String(valor), bonusDefesa),
    linhaNumero(
      'esquiva',
      'Esquiva',
      defesaCalc?.esquiva ?? null,
      (valor) => String(valor),
      bonusDefesa + ajusteEsquivaAmplificadores(amplificadores) + bonusEquipamento.esquiva,
    ),
    linhaNumero(
      'bloqueio',
      'Bloqueio',
      defesaCalc?.bloqueio ?? null,
      (valor) => String(valor),
      bonusDefesa + ajusteBloqueioAmplificadores(amplificadores) + bonusEquipamento.bloqueio,
    ),
    linhaNumero(
      'contraAtaque',
      'Contra-ataque',
      calcularContraAtaque({
        luta: entrada.luta,
        vigor: entrada.vigor,
        defesa: defesaCalc?.defesa ?? null,
        habilidades,
      }),
      (valor) => String(valor),
      bonusDefesa,
    ),
    linhaNumero(
      'deslocamento',
      'Deslocamento',
      calcularDeslocamento(entrada),
      (valor) => `${valor}m`,
      ajusteDeslocamentoAmplificadores(amplificadores),
    ),
    linhaNumero('proficiencia', 'Proficiência', proficienciaCalc, (valor) => `+${valor}`),
    linhaTexto('danoCorpoACorpo', 'Dano C. a C.', calcularDanoCorpo(entrada)),
    linhaTexto(
      'danoFurtivo',
      'Dano Furtivo',
      calcularDanoFurtivo(entrada),
      ajusteDanoFurtivoAmplificadores(amplificadores),
    ),
    linhaNumero('percepcao', 'Percepção', calcularAreaPercepcao(entrada), (valor) => `${valor}m`),
    linhaNumero(
      'inventarioMaximo',
      'Inventário',
      calcularInventario({ ...entrada, habilidades }),
      (valor) => `${valor} máx`,
      ajusteInventarioAmplificadores(amplificadores),
    ),
    linhaNumero(
      'habilidadesPorTurno',
      'Hab. / Turno',
      calcularLimiteHabilidadesPorTurno(entrada),
      (valor) => String(valor),
    ),
  ];
}

/** Patente legível derivada do Prestígio (`shared/regras/patente`). */
export function rotuloPatente(prestigio: number): string {
  return ROTULOS_PATENTE[obterPatente({ prestigio }).patente];
}

/** Salário da patente derivada do Prestígio (m3-34) — nunca persistido, só exibição. */
export function salarioPatente(prestigio: number): number {
  return obterPatente({ prestigio }).salario;
}

/** Linha completa da tabela de patentes (faixa, salário, limites) derivada do Prestígio — Extras. */
export function patenteDetalhada(prestigio: number): PatenteDados {
  return obterPatente({ prestigio });
}

/** Faixa de Prestígio da patente, com `∞` no teto sem limite superior (Líder Operacional). */
export function faixaPrestigioPatente(patente: PatenteDados): string {
  const teto = patente.prestigioMaximo === Number.POSITIVE_INFINITY ? '∞' : String(patente.prestigioMaximo);
  return `${patente.prestigioMinimo}–${teto}`;
}
