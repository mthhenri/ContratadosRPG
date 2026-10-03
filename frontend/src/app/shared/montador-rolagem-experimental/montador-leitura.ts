import type { FichaAtributosDto } from '@contratados-rpg/shared/dtos/ficha';
import {
  type FormulaTokenizadaDto,
  interpretarFormula,
  type PecaDadoDto,
  type PecaFormulaDto,
  rolarFormula,
  type RolarDado,
} from '@contratados-rpg/shared/regras/rolagem';

import { nomeDaFonte, TIPOS_DANO_MONTADOR } from './montador-pecas';

/**
 * Leitura das versões novas do montador (`montador-exp-03`/`04`): a frase em português sob o visor, a faixa e a média
 * de uma rolagem e o valor ao vivo do campo de expressão. **Tudo que depende de regra vem do motor**: a faixa é a
 * própria rolagem do motor com o dado travado no mínimo e no máximo, e a quantidade de dados de uma conta é a que o
 * motor rolaria (inclusive a regra de atributo zerado). Aqui só há apresentação e probabilidade de dados.
 */

/** Valores da ficha que alimentam as fontes da fórmula. */
export interface AmbienteMontador {
  readonly atributos: FichaAtributosDto;
  readonly proficiencia: number | null;
  readonly nivel: number;
}

/** Faixa e média de **uma** rolagem (sem repetição). */
export interface ResumoFormulaMontador {
  readonly minimo: number;
  readonly maximo: number;
  readonly media: number;
}

const dadoMinimo: RolarDado = () => 1;

function rolarCom(texto: string, ambiente: AmbienteMontador, rolarDado: RolarDado) {
  return rolarFormula(
    { formula: texto, atributos: ambiente.atributos, proficiencia: ambiente.proficiencia, nivel: ambiente.nivel },
    rolarDado,
  );
}

/**
 * Dado "travado" por termo: o motor chama `rolarDado` termo a termo, dado a dado, na ordem da fórmula (e repete a
 * sequência a cada repetição `#N`). Sabendo quantos dados cada termo rola, cada chamada recebe o extremo que leva o
 * total para o lado pedido — 1 num termo que soma e a face máxima num termo que subtrai, ou o contrário.
 */
function dadoTravado(dadosPorTermo: readonly { quantidade: number; sinal: 1 | -1 }[], extremo: 'MINIMO' | 'MAXIMO'): RolarDado {
  const sinais = dadosPorTermo.flatMap((termo) => Array.from({ length: termo.quantidade }, () => termo.sinal));
  let chamada = 0;
  return (faces) => {
    const sinal = sinais.length > 0 ? sinais[chamada % sinais.length] : 1;
    chamada += 1;
    const baixo = (extremo === 'MINIMO') === (sinal === 1);
    return baixo ? 1 : faces;
  };
}

/** Binomial C(n, k) em ponto flutuante (n ≤ 100). */
function binomial(n: number, k: number): number {
  let resultado = 1;
  for (let indice = 1; indice <= k; indice += 1) {
    resultado = (resultado * (n - k + indice)) / indice;
  }
  return resultado;
}

/** Esperança do j-ésimo menor de `n` dados de `faces` faces (estatística de ordem, 1 ≤ j ≤ n). */
function esperancaOrdem(n: number, faces: number, j: number): number {
  let soma = 0;
  for (let valor = 1; valor <= faces; valor += 1) {
    const abaixo = (valor - 1) / faces;
    // P(X_(j) ≥ valor) = P(no máximo j−1 dados abaixo de `valor`).
    for (let i = 0; i <= j - 1; i += 1) {
      soma += binomial(n, i) * abaixo ** i * (1 - abaixo) ** (n - i);
    }
  }
  return soma;
}

/** Esperança da soma dos `mantidos` maiores (ou menores) de `n` dados. Sem manter: n·(f+1)/2. */
function esperancaPool(n: number, faces: number, mantidos: number, maiores: boolean): number {
  if (n <= 0) return 0;
  if (mantidos >= n) return (n * (faces + 1)) / 2;
  let soma = 0;
  for (let k = 0; k < mantidos; k += 1) {
    soma += esperancaOrdem(n, faces, maiores ? n - k : k + 1);
  }
  return soma;
}

/**
 * Faixa e média de uma rolagem da fórmula (texto **já com atalhos expandidos**), ou `null` se o motor a recusa ou se
 * ela explode/implode (sem teto ou piso definidos). Mínimo e máximo são rolagens do próprio motor com o dado travado
 * no extremo certo de cada termo; a média troca cada pool pela sua esperança (com manter maior/menor).
 */
export function resumirFormula(texto: string, ambiente: AmbienteMontador): ResumoFormulaMontador | null {
  const interpretacao = interpretarFormula(texto);
  const formula = interpretacao.formula;
  if (!interpretacao.valida || !formula) return null;
  if (formula.dados.some((termo) => termo.explosao !== undefined || termo.implosao !== undefined)) return null;
  const base = rolarCom(texto, ambiente, dadoMinimo);
  if (!base) return null;
  const dadosPorTermo = base.dados.map((rolado, indice) => ({
    quantidade: rolado.valores.length,
    sinal: formula.dados[indice].sinal,
  }));
  const minimo = rolarCom(texto, ambiente, dadoTravado(dadosPorTermo, 'MINIMO'));
  const maximo = rolarCom(texto, ambiente, dadoTravado(dadosPorTermo, 'MAXIMO'));
  if (!minimo || !maximo) return null;

  let media = base.total;
  formula.dados.forEach((termo, indice) => {
    const rolado = base.dados[indice];
    const n = rolado.valores.length;
    const mantidos = rolado.mantidos?.length ?? n;
    const maiores = termo.manterMaior !== undefined && !rolado.desvantagem;
    // Troca o subtotal deste pool (todos os dados em 1) pela sua esperança.
    media = media - rolado.subtotal + termo.sinal * esperancaPool(n, termo.faces, mantidos, maiores);
  });
  return { minimo: minimo.total, maximo: maximo.total, media };
}

/** Quantos dados o primeiro pool da fórmula rola com estes valores (0 se o motor a recusa). */
export function contarDadosDoPool(texto: string, ambiente: AmbienteMontador): number {
  return rolarCom(texto, ambiente, dadoMinimo)?.dados[0]?.valores.length ?? 0;
}

/** Uso do campo de expressão: quantidade de dados de um dado, ou bônus fixo. */
export type UsoExpressaoMontador = { readonly tipo: 'QUANTIDADE'; readonly faces: number } | { readonly tipo: 'BONUS' };

/** Leitura ao vivo do campo de expressão: o valor que o motor daria agora, ou o motivo de não aceitar. */
export type ExpressaoAvaliada =
  | { readonly valida: true; readonly valor: number; readonly texto: string }
  | { readonly valida: false; readonly erro: string };

/** Texto da expressão como entra na fórmula: sem espaços, em maiúsculas. */
export function normalizarExpressao(expressao: string): string {
  return (expressao ?? '').replace(/\s+/g, '').toUpperCase();
}

/**
 * Valor da expressão (`(FOR+VIG)*2`) com os valores da ficha — o que o motor faria com ela como quantidade de dados
 * (`(<conta>)dN`) ou como bônus fixo. Só números, atributos, `PROF` e `NIV` com `+ − * /` e parênteses.
 */
export function avaliarExpressaoMontador(
  expressao: string,
  uso: UsoExpressaoMontador,
  ambiente: AmbienteMontador,
): ExpressaoAvaliada {
  const texto = normalizarExpressao(expressao);
  if (!texto) return { valida: false, erro: 'Escreva uma conta, ex.: (FOR+VIG)*2.' };
  if (/D\d/.test(texto)) return { valida: false, erro: 'A conta não aceita dados — só números, atributos, PROF e NIV.' };
  const formula = uso.tipo === 'QUANTIDADE' ? `(${texto})d${uso.faces}` : `0+(${texto})`;
  const interpretacao = interpretarFormula(formula);
  if (!interpretacao.valida) return { valida: false, erro: interpretacao.erro ?? 'Conta inválida.' };
  const resultado = rolarCom(formula, ambiente, dadoMinimo);
  if (!resultado) return { valida: false, erro: 'Conta inválida.' };
  const valor = uso.tipo === 'QUANTIDADE' ? resultado.dados[0].valores.length : resultado.total;
  return { valida: true, valor, texto };
}

// ── Frase em português ───────────────────────────────────────────────────────

function nomeTipo(tipo: string): string {
  return TIPOS_DANO_MONTADOR.find((item) => item.tipo === tipo)?.nome ?? tipo;
}

function sufixoTipo(peca: PecaFormulaDto): string {
  if (peca.tipo === 'ATALHO') return '';
  if (peca.composto) return ` de ${nomeTipo(peca.composto[0])} e ${nomeTipo(peca.composto[1])}, meio a meio`;
  return peca.tipoDano ? ` de ${nomeTipo(peca.tipoDano)}` : '';
}

function valorFonte(fonte: string, ambiente?: AmbienteMontador): number | null {
  if (!ambiente) return null;
  if (fonte === 'proficiencia') return ambiente.proficiencia ?? 0;
  if (fonte === 'nivel') return ambiente.nivel;
  return ambiente.atributos[fonte as keyof FichaAtributosDto] ?? null;
}

function lerDado(peca: PecaDadoDto, ambiente?: AmbienteMontador): string {
  let base: string;
  if (peca.quantidade.tipo === 'NUMERO') {
    base = `${peca.quantidade.valor}d${peca.faces}`;
  } else if (peca.quantidade.tipo === 'FONTE') {
    const valor = valorFonte(peca.quantidade.fonte, ambiente);
    const nome = nomeDaFonte(peca.quantidade.fonte);
    base = valor === null ? `d${peca.faces} × ${nome}` : `${valor} d${peca.faces} (${nome})`;
  } else {
    const avaliada = ambiente
      ? avaliarExpressaoMontador(peca.quantidade.texto, { tipo: 'QUANTIDADE', faces: peca.faces }, ambiente)
      : null;
    base =
      avaliada?.valida === true
        ? `${avaliada.valor} d${peca.faces} (${peca.quantidade.texto})`
        : `d${peca.faces} × (${peca.quantidade.texto})`;
  }
  const opcoes: string[] = [];
  if (peca.manterMaior !== undefined) opcoes.push(peca.manterMaior === 1 ? 'fica com o maior' : `fica com os ${peca.manterMaior} maiores`);
  if (peca.manterMenor !== undefined) opcoes.push(peca.manterMenor === 1 ? 'fica com o menor' : `fica com os ${peca.manterMenor} menores`);
  if (peca.margemCritico !== undefined) {
    const limiar = peca.faces - peca.margemCritico + 1;
    opcoes.push(limiar >= peca.faces ? `crítico no ${peca.faces}` : `crítico de ${limiar} a ${peca.faces}`);
  }
  if (peca.explosao !== undefined) opcoes.push(peca.explosao === peca.faces ? 'explode no máximo' : `explode com ${peca.explosao} ou mais`);
  if (peca.implosao !== undefined) opcoes.push(peca.implosao === 1 ? 'implode no 1' : `implode com ${peca.implosao} ou menos`);
  return `${base}${sufixoTipo(peca)}${opcoes.length ? `, ${opcoes.join(', ')}` : ''}`;
}

function lerPeca(peca: PecaFormulaDto, ambiente?: AmbienteMontador, atalhos?: { corpo?: string | null; furtivo?: string | null }): string {
  switch (peca.tipo) {
    case 'DADO':
      return lerDado(peca, ambiente);
    case 'FONTE': {
      const escala = peca.multiplicador ? ` × ${peca.multiplicador}` : peca.divisor ? ` ÷ ${peca.divisor}` : '';
      const valor = valorFonte(peca.fonte, ambiente);
      return `${nomeDaFonte(peca.fonte)}${escala}${valor === null ? '' : ` (${valor})`}${sufixoTipo(peca)}`;
    }
    case 'NUMERO':
      return `${peca.valor}${sufixoTipo(peca)}`;
    case 'CONTA': {
      const avaliada = ambiente ? avaliarExpressaoMontador(peca.texto, { tipo: 'BONUS' }, ambiente) : null;
      return `${peca.texto}${avaliada?.valida === true ? ` (${avaliada.valor})` : ''}${sufixoTipo(peca)}`;
    }
    case 'ATALHO': {
      const expansao = peca.atalho === 'CORPO' ? atalhos?.corpo : atalhos?.furtivo;
      const nome = peca.atalho === 'CORPO' ? 'dano Corpo a corpo' : 'dano Furtivo';
      return expansao ? `${nome} (${expansao})` : nome;
    }
  }
}

/**
 * Frase em português da fórmula em peças, na ordem do texto: "2d6 de Físico + Força (3) de Físico + 3". Com a
 * repetição, "N rolagens de: …". Com o ambiente, mostra o valor de cada fonte e de cada conta.
 */
export function lerFormula(
  tokenizada: FormulaTokenizadaDto,
  ambiente?: AmbienteMontador,
  atalhos?: { corpo?: string | null; furtivo?: string | null },
): string {
  const partes = tokenizada.pecas.map((peca, indice) => {
    const texto = lerPeca(peca, ambiente, atalhos);
    if (indice === 0) return peca.sinal === -1 ? `− ${texto}` : texto;
    return `${peca.sinal === -1 ? '−' : '+'} ${texto}`;
  });
  const frase = partes.join(' ');
  return tokenizada.repeticoes && tokenizada.repeticoes >= 2 ? `${tokenizada.repeticoes} rolagens de: ${frase}` : frase;
}
