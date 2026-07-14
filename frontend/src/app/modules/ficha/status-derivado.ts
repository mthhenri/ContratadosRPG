import { ClasseEnum } from '@contratados-rpg/shared/enums';
import type { FichaAtributosDto, FichaDerivadosDto } from '@contratados-rpg/shared/dtos/ficha';
import {
  aplicarLimitesPorClasse,
  calcularAreaPercepcao,
  calcularDanoCorpo,
  calcularDanoFurtivo,
  calcularDefesa,
  calcularDeslocamento,
  calcularInventario,
  calcularLimiteHabilidadesPorTurno,
  calcularProficiencia,
} from '@contratados-rpg/shared/regras/agente';
import { obterPatente } from '@contratados-rpg/shared/regras/patente';

import { ROTULOS_PATENTE } from '../calculadora/rotulos';

/**
 * Status derivado da ficha compartilhado pela **exibição** (`FichaVisualizacao`) e pela **edição**
 * (`FichaFormulario`). **Nenhuma regra vive aqui**: só orquestra chamadas a `shared/regras` (fonte
 * única — proibições #26/#27) e resolve o **valor efetivo** de cada derivado — o **stored** (`dados.
 * derivados`, m3-10) tem precedência; ausente, cai no **calculado**. Cada linha carrega `bruto` (valor
 * cru p/ edição no próprio lugar) e `display` (formatado p/ leitura).
 */

/** Texto exibido no lugar de uma stat que a classe não possui (ex.: Civil sem defesa/furtivo). */
const INDISPONIVEL = 'N/A';

/** Chave editável do bloco `derivados` exibida na coluna "Informações Extras". */
export type ChaveInfoExtra = Extract<
  keyof FichaDerivadosDto,
  | 'defesa'
  | 'esquiva'
  | 'bloqueio'
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

/** Entrada já normalizada aos limites da classe (os cinco atributos que as fórmulas consomem). */
export type EntradaAgente = { readonly classe: ClasseEnum } & ReturnType<typeof aplicarLimitesPorClasse>;

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
  return { classe, ...normalizado };
}

/**
 * Linhas da coluna "Informações Extras" — o **stored** (`derivados`) vence o **calculado**. Cada uma
 * é editável no próprio lugar (m3-10) e persiste como override em `derivados[chave]`.
 */
export function montarInformacoesExtras(
  entrada: EntradaAgente,
  derivados?: FichaDerivadosDto,
): InfoExtra[] {
  const defesaCalc = calcularDefesa(entrada);
  const proficienciaCalc = calcularProficiencia(entrada);

  const linhaNumero = (
    chave: ChaveInfoExtra,
    rotulo: string,
    calculado: number | null,
    formatar: (valor: number) => string,
  ): InfoExtra => {
    const stored = derivados?.[chave];
    const valor = typeof stored === 'number' ? stored : calculado;
    return {
      chave,
      rotulo,
      display: valor === null ? INDISPONIVEL : formatar(valor),
      bruto: valor,
      tipo: 'numero',
    };
  };

  const linhaTexto = (
    chave: ChaveInfoExtra,
    rotulo: string,
    calculado: string | null,
  ): InfoExtra => {
    const stored = derivados?.[chave];
    const valor = typeof stored === 'string' ? stored : calculado;
    return { chave, rotulo, display: valor ?? INDISPONIVEL, bruto: valor, tipo: 'texto' };
  };

  return [
    linhaNumero('defesa', 'Defesa', defesaCalc?.defesa ?? null, (valor) => String(valor)),
    linhaNumero('esquiva', 'Esquiva', defesaCalc?.esquiva ?? null, (valor) => String(valor)),
    linhaNumero('bloqueio', 'Bloqueio', defesaCalc?.bloqueio ?? null, (valor) => String(valor)),
    linhaNumero('deslocamento', 'Deslocamento', calcularDeslocamento(entrada), (valor) => `${valor}m`),
    linhaNumero('proficiencia', 'Proficiência', proficienciaCalc, (valor) => `+${valor}`),
    linhaTexto('danoCorpoACorpo', 'Dano C. a C.', calcularDanoCorpo(entrada)),
    linhaTexto('danoFurtivo', 'Dano Furtivo', calcularDanoFurtivo(entrada)),
    linhaNumero('percepcao', 'Percepção', calcularAreaPercepcao(entrada), (valor) => `${valor}m`),
    linhaNumero('inventarioMaximo', 'Inventário', calcularInventario(entrada), (valor) => `${valor} máx`),
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
