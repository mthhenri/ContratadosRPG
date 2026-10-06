import type { FichaAtributosDto } from '@contratados-rpg/shared/dtos/ficha';
import {
  type FormulaInterpretadaDto,
  type FormulaTokenizadaDto,
  interpretarFormula,
  listarDadosDaConta,
  type PecaDadoDto,
  type PecaFormulaDto,
  rolarFormula,
  rolarInterpretada,
  type RolarDado,
  substituirDadosDaConta,
} from '@contratados-rpg/shared/regras/rolagem';

import { nomeDaFonte, TIPOS_DANO_MONTADOR } from './montador-pecas';

/**
 * Leitura das versões novas do montador (`montador-exp-03`/`04`): a frase em português sob o visor, a faixa e a média
 * de uma rolagem e o valor ao vivo do campo de expressão. **Tudo que depende de regra vem do motor**: a faixa é a
 * própria rolagem do motor com o dado travado no mínimo e no máximo, e a quantidade de dados de uma conta é a que o
 * motor rolaria (inclusive a regra de atributo zerado). Aqui só há apresentação e probabilidade de dados — inclusive
 * a dos dados dentro da conta de quantidade (`(1d6)d20`), percorrida soma a soma.
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

function rolarFormulaCom(formula: FormulaInterpretadaDto, ambiente: AmbienteMontador, rolarDado: RolarDado) {
  return rolarInterpretada(formula, ambiente.atributos, ambiente.proficiencia, ambiente.nivel, rolarDado);
}

/** Teto de combinações de somas dos dados das contas de quantidade que a faixa, a média e a leitura percorrem. */
const COMBINACOES_DADOS_CONTA_MAXIMO = 2000;

/** Distribuição exata da soma de `quantidade` dados de `faces` faces: soma → probabilidade. */
function distribuicaoSoma(quantidade: number, faces: number): Map<number, number> {
  let atual = new Map<number, number>([[0, 1]]);
  for (let dado = 0; dado < quantidade; dado += 1) {
    const proxima = new Map<number, number>();
    for (const [soma, probabilidade] of atual) {
      for (let valor = 1; valor <= faces; valor += 1) {
        proxima.set(soma + valor, (proxima.get(soma + valor) ?? 0) + probabilidade / faces);
      }
    }
    atual = proxima;
  }
  return atual;
}

/** Uma das formas que a fórmula toma depois de rolados os dados das contas de quantidade. */
interface FormulaFixada {
  readonly formula: FormulaInterpretadaDto;
  readonly probabilidade: number;
}

/**
 * A fórmula com os dados das contas de quantidade (`(1d6)d20`) trocados por cada combinação possível de somas, com a
 * probabilidade de cada uma — a mesma troca que o motor faz na rolagem (`substituirDadosDaConta`). Sem esses dados, a
 * própria fórmula com probabilidade 1. `null` quando as combinações passam do teto.
 */
function fixarDadosDaQuantidade(formula: FormulaInterpretadaDto): FormulaFixada[] | null {
  const dadosPorTermo = formula.dados.map((termo) =>
    termo.quantidadeConta ? listarDadosDaConta(termo.quantidadeConta) : [],
  );
  const todos = dadosPorTermo.flat();
  const tamanho = todos.reduce((produto, dado) => produto * (dado.quantidade * (dado.faces - 1) + 1), 1);
  if (tamanho > COMBINACOES_DADOS_CONTA_MAXIMO) return null;

  let combinacoes: { somas: number[]; probabilidade: number }[] = [{ somas: [], probabilidade: 1 }];
  for (const dado of todos) {
    const distribuicao = [...distribuicaoSoma(dado.quantidade, dado.faces)];
    combinacoes = combinacoes.flatMap((combinacao) =>
      distribuicao.map(([soma, probabilidade]) => ({
        somas: [...combinacao.somas, soma],
        probabilidade: combinacao.probabilidade * probabilidade,
      })),
    );
  }
  return combinacoes.map(({ somas, probabilidade }) => {
    let usadas = 0;
    const dados = formula.dados.map((termo, indice) => {
      const quantos = dadosPorTermo[indice].length;
      if (!termo.quantidadeConta || quantos === 0) return termo;
      const quantidadeConta = substituirDadosDaConta(termo.quantidadeConta, somas.slice(usadas, usadas + quantos));
      usadas += quantos;
      return { ...termo, quantidadeConta };
    });
    return { formula: { ...formula, dados }, probabilidade };
  });
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

/** Faixa e média de uma fórmula sem dados nas contas de quantidade (já fixados por `fixarDadosDaQuantidade`). */
function resumirFormulaFixada(formula: FormulaInterpretadaDto, ambiente: AmbienteMontador): ResumoFormulaMontador {
  const base = rolarFormulaCom(formula, ambiente, dadoMinimo);
  const dadosPorTermo = base.dados.map((rolado, indice) => ({
    quantidade: rolado.valores.length,
    sinal: formula.dados[indice].sinal,
  }));
  const minimo = rolarFormulaCom(formula, ambiente, dadoTravado(dadosPorTermo, 'MINIMO'));
  const maximo = rolarFormulaCom(formula, ambiente, dadoTravado(dadosPorTermo, 'MAXIMO'));

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

/**
 * Faixa e média de uma rolagem da fórmula (texto **já com atalhos expandidos**), ou `null` se o motor a recusa, se
 * ela explode/implode (sem teto ou piso definidos) ou se os dados das contas de quantidade passam do teto de
 * combinações. Mínimo e máximo são rolagens do próprio motor com o dado travado no extremo certo de cada termo; a
 * média troca cada pool pela sua esperança (com manter maior/menor). Com dados na quantidade (`(1d6)d20`), cada soma
 * possível desses dados entra com a sua probabilidade.
 */
export function resumirFormula(texto: string, ambiente: AmbienteMontador): ResumoFormulaMontador | null {
  const interpretacao = interpretarFormula(texto);
  const formula = interpretacao.formula;
  if (!interpretacao.valida || !formula) return null;
  if (formula.dados.some((termo) => termo.explosao !== undefined || termo.implosao !== undefined)) return null;
  const fixadas = fixarDadosDaQuantidade(formula);
  if (!fixadas) return null;
  const parciais = fixadas.map(({ formula: fixada, probabilidade }) => ({
    resumo: resumirFormulaFixada(fixada, ambiente),
    probabilidade,
  }));
  return {
    minimo: Math.min(...parciais.map(({ resumo }) => resumo.minimo)),
    maximo: Math.max(...parciais.map(({ resumo }) => resumo.maximo)),
    media: parciais.reduce((soma, { resumo, probabilidade }) => soma + probabilidade * resumo.media, 0),
  };
}

/** Quantos dados o primeiro pool da fórmula rola com estes valores (0 se o motor a recusa). */
export function contarDadosDoPool(texto: string, ambiente: AmbienteMontador): number {
  return rolarCom(texto, ambiente, dadoMinimo)?.dados[0]?.valores.length ?? 0;
}

/** Uso do campo de expressão: quantidade de dados de um dado, ou bônus fixo. */
export type UsoExpressaoMontador = { readonly tipo: 'QUANTIDADE'; readonly faces: number } | { readonly tipo: 'BONUS' };

/**
 * Leitura ao vivo do campo de expressão: o valor que o motor daria agora — uma faixa (`minimo` a `maximo`) quando a
 * quantidade tem dados (`1d6` = 1 a 6 dados); sem dados, `minimo` = `maximo` — ou o motivo de não aceitar.
 */
export type ExpressaoAvaliada =
  | { readonly valida: true; readonly minimo: number; readonly maximo: number; readonly texto: string }
  | { readonly valida: false; readonly erro: string };

/** Texto da expressão como entra na fórmula: sem espaços, em maiúsculas. */
export function normalizarExpressao(expressao: string): string {
  return (expressao ?? '').replace(/\s+/g, '').toUpperCase();
}

/**
 * Valor da expressão (`(FOR+VIG)*2`) com os valores da ficha — o que o motor faria com ela como quantidade de dados
 * (`(<conta>)dN`) ou como bônus fixo: números, atributos, `PROF` e `NIV` com `+ − * /` e parênteses. Na quantidade
 * a conta também aceita dados (`1d6`, `1d4+FOR`): a leitura é a faixa de dados que ela pode dar.
 */
export function avaliarExpressaoMontador(
  expressao: string,
  uso: UsoExpressaoMontador,
  ambiente: AmbienteMontador,
): ExpressaoAvaliada {
  const texto = normalizarExpressao(expressao);
  if (!texto) return { valida: false, erro: 'Escreva uma conta, ex.: (FOR+VIG)*2.' };
  if (uso.tipo === 'BONUS' && /D\d/.test(texto)) {
    return { valida: false, erro: 'O bônus fixo não aceita dados — só números, atributos, PROF e NIV.' };
  }
  const formula = uso.tipo === 'QUANTIDADE' ? `(${texto})d${uso.faces}` : `0+(${texto})`;
  const interpretacao = interpretarFormula(formula);
  if (!interpretacao.valida || !interpretacao.formula) {
    return { valida: false, erro: interpretacao.erro ?? 'Conta inválida.' };
  }
  if (uso.tipo === 'BONUS') {
    const valor = rolarFormulaCom(interpretacao.formula, ambiente, dadoMinimo).total;
    return { valida: true, minimo: valor, maximo: valor, texto };
  }
  const fixadas = fixarDadosDaQuantidade(interpretacao.formula);
  if (!fixadas) return { valida: false, erro: 'Dados demais na conta para ler a quantidade.' };
  const quantidades = fixadas.map(
    ({ formula: fixada }) => rolarFormulaCom(fixada, ambiente, dadoMinimo).dados[0].valores.length,
  );
  return { valida: true, minimo: Math.min(...quantidades), maximo: Math.max(...quantidades), texto };
}

/** Valor lido do campo de expressão, para a tela: `14 dados`, `1 a 6 dados`, `+5`. */
export function escreverValorExpressao(avaliada: Extract<ExpressaoAvaliada, { valida: true }>, uso: UsoExpressaoMontador['tipo']): string {
  if (uso === 'BONUS') return `${avaliada.minimo >= 0 ? '+' : ''}${avaliada.minimo}`;
  const { minimo, maximo } = avaliada;
  if (minimo !== maximo) return `${minimo} a ${maximo} dados`;
  return `${minimo} ${minimo === 1 ? 'dado' : 'dados'}`;
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
    const quantidade =
      avaliada?.valida !== true
        ? null
        : avaliada.minimo === avaliada.maximo
          ? `${avaliada.minimo}`
          : `${avaliada.minimo} a ${avaliada.maximo}`;
    base =
      quantidade !== null
        ? `${quantidade} d${peca.faces} (${peca.quantidade.texto})`
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
      return `${peca.texto}${avaliada?.valida === true ? ` (${avaliada.minimo})` : ''}${sufixoTipo(peca)}`;
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
