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
import type { AmplificadorAplicadoDto } from '@contratados-rpg/shared/regras/compras';
import { obterPatente } from '@contratados-rpg/shared/regras/patente';

import { ROTULOS_PATENTE } from '../calculadora/rotulos';

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
 * consome, `+ luta` — usado só por `calcularContraAtaque`; clampado aqui do mesmo jeito, mas fora
 * de `aplicarLimitesPorClasse` porque essa função também serve a Calculadora pública, que não tem
 * campo de Luta no formulário).
 */
export type EntradaAgente = { readonly classe: ClasseEnum; readonly luta: number } & ReturnType<
  typeof aplicarLimitesPorClasse
>;

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
  return { classe, luta, ...normalizado };
}

/**
 * Linhas da coluna "Informações Extras" — o **stored** (`derivados`) vence o **calculado**; o
 * amplificador soma por cima só na leitura (ver docstring do módulo). Cada uma é editável no
 * próprio lugar (m3-10) e persiste como override em `derivados[chave]` (o `bruto`, sem o delta do
 * amplificador).
 */
export function montarInformacoesExtras(
  entrada: EntradaAgente,
  habilidades: readonly FichaHabilidadeDto[],
  derivados?: FichaDerivadosDto,
  amplificadores: readonly AmplificadorAplicadoDto[] = [],
): InfoExtra[] {
  const defesaCalc = calcularDefesa(entrada);
  const proficienciaCalc = calcularProficiencia(entrada);

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
    linhaNumero(
      'defesa',
      'Defesa',
      defesaCalc?.defesa ?? null,
      (valor) => String(valor),
      ajusteDefesaAmplificadores(amplificadores),
    ),
    linhaNumero(
      'esquiva',
      'Esquiva',
      defesaCalc?.esquiva ?? null,
      (valor) => String(valor),
      ajusteEsquivaAmplificadores(amplificadores),
    ),
    linhaNumero(
      'bloqueio',
      'Bloqueio',
      defesaCalc?.bloqueio ?? null,
      (valor) => String(valor),
      ajusteBloqueioAmplificadores(amplificadores),
    ),
    linhaNumero(
      'contraAtaque',
      'Contra-ataque',
      calcularContraAtaque({ luta: entrada.luta, vigor: entrada.vigor, habilidades }),
      (valor) => String(valor),
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
      calcularInventario(entrada),
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
