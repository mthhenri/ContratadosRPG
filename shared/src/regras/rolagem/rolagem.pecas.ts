import { siglaTipoDano } from './rolagem.dados';
import type {
  FormulaTokenizadaDto,
  InterpretacaoFormulaDto,
  PecaDadoDto,
  PecaDadoQuantidadeDto,
  PecaFormulaDto,
} from './rolagem.dtos';
import {
  DestinoDano,
  dividirTermosNivelSuperior,
  encontrarFechamento,
  extrairRepeticao,
  interpretarOperadores,
  resolverFonte,
  resolverTipoDano,
} from './rolagem.leitura';
import { expandirAtalhosDano, interpretarFormula } from './rolagem';

/**
 * Fórmula de rolagem em **peças** (montador-exp-01, I-041): `tokenizarFormula` lê o texto como lista ordenada de
 * peças (dado, fonte escalar, número, conta de bônus fixo, atalho `CORPO`/`FURTIVO`, cada uma com sinal e tag de
 * tipo; a quantidade de um dado pode ser número, fonte ou conta) e `montarFormula` recompõe o texto. É o que o
 * montador de rolagem edita — o texto da barra continua a única fonte de verdade.
 *
 * **Nunca troca uma peça em silêncio**: `tokenizarFormula` remonta o texto e só devolve as peças se o motor
 * (`interpretarFormula`) ler a remontagem **igual** ao original — senão devolve `null` (o montador mostra a
 * fórmula como "avançada"). O texto remontado pode vir normalizado (`d20` → `1d20`, `kh` → `kh1`, `[Físico]` →
 * `[F]`). Lê com as mesmas funções do motor (`rolagem.leitura.ts`); nenhum resultado de rolagem muda. Funções puras.
 */

/** Expansões representativas de `CORPO`/`FURTIVO` (com e sem tag, como as reais) só para a autoverificação. */
const ATALHOS_VERIFICACAO = [
  { corpo: '2D6 [Físico]', furtivo: '2D6+2' },
  { corpo: '4D6+7 [Físico]', furtivo: '1D6+1' },
] as const;

const ATALHOS = ['CORPO', 'FURTIVO'] as const;

/** Lê um termo de dado (`NdM`, `ATRdM`, `(<conta>)dM`) com operadores, ou `null` se `corpo` não é dado. */
function lerDado(corpo: string, sinal: 1 | -1, destino: DestinoDano): PecaDadoDto | null {
  let quantidade: PecaDadoQuantidadeDto;
  let resto: RegExpMatchArray | null;
  const fechamento = encontrarFechamento(corpo);
  if (fechamento > 0) {
    resto = corpo.slice(fechamento + 1).match(/^[dD](\d+)(.*)$/);
    quantidade = { tipo: 'CONTA', texto: corpo.slice(1, fechamento).toUpperCase() };
  } else {
    const literal = corpo.match(/^(\d*)[dD](\d+)(.*)$/);
    const porFonte = literal ? null : corpo.match(/^([A-Za-z]+)[dD](\d+)(.*)$/);
    const fonte = porFonte ? resolverFonte(porFonte[1]) : null;
    if (literal) {
      resto = [literal[0], literal[2], literal[3]];
      quantidade = { tipo: 'NUMERO', valor: literal[1] === '' ? 1 : parseInt(literal[1], 10) };
    } else if (porFonte && fonte) {
      resto = [porFonte[0], porFonte[2], porFonte[3]];
      quantidade = { tipo: 'FONTE', fonte, nome: porFonte[1].toUpperCase() };
    } else {
      return null;
    }
  }
  if (!resto) {
    return null;
  }
  const faces = parseInt(resto[1], 10);
  const { ops, erro } = interpretarOperadores(resto[2], faces);
  if (erro) {
    return null;
  }
  return { tipo: 'DADO', sinal, quantidade, faces, ...ops, ...destino };
}

/** Lê um termo de nível superior em peça, na mesma ordem de tentativas do motor; `null` se não sabe ler. */
function lerPeca(corpo: string, sinal: 1 | -1, destino: DestinoDano): PecaFormulaDto | null {
  const dado = lerDado(corpo, sinal, destino);
  if (dado) {
    return dado;
  }
  const escalado = corpo.match(/^([A-Za-z]+)([*/])(\d+)$/);
  const fonteEscalada = escalado ? resolverFonte(escalado[1]) : null;
  if (escalado && fonteEscalada) {
    const fator = parseInt(escalado[3], 10);
    return {
      tipo: 'FONTE',
      sinal,
      fonte: fonteEscalada,
      nome: escalado[1].toUpperCase(),
      ...(escalado[2] === '*' ? { multiplicador: fator } : { divisor: fator }),
      ...destino,
    };
  }
  if (/^\d+$/.test(corpo)) {
    return { tipo: 'NUMERO', sinal, valor: parseInt(corpo, 10), ...destino };
  }
  const fonte = resolverFonte(corpo);
  if (fonte) {
    return { tipo: 'FONTE', sinal, fonte, nome: corpo.toUpperCase(), ...destino };
  }
  const atalho = ATALHOS.find((nome) => nome === corpo.toUpperCase());
  if (atalho) {
    return { tipo: 'ATALHO', sinal, atalho };
  }
  if (/[*/()]/.test(corpo) && !/[dD]\d/.test(corpo)) {
    return { tipo: 'CONTA', sinal, texto: corpo.toUpperCase(), ...destino };
  }
  return null;
}

/** Lê um segmento (`termos` de uma mesma tag) em peças; `null` se algum termo não tem representação. */
function lerSegmento(expressao: string, destino: DestinoDano, sinalExterno: 1 | -1 = 1): PecaFormulaDto[] | null {
  const normalizada = /^[+-]/.test(expressao) ? expressao : `+${expressao}`;
  const pecas: PecaFormulaDto[] = [];
  for (const parte of dividirTermosNivelSuperior(normalizada)) {
    const sinal = ((parte[0] === '-' ? -1 : 1) * sinalExterno) as 1 | -1;
    const peca = lerPeca(parte.slice(1), sinal, destino);
    if (!peca) {
      return null;
    }
    pecas.push(peca);
  }
  return pecas;
}

/** Lê o corpo (sem a repetição) em peças, dividindo por tag como o motor; `null` se não sabe ler. */
function lerCorpo(texto: string): PecaFormulaDto[] | null {
  if (!texto.includes('[')) {
    return lerSegmento(texto, {});
  }
  const pecas: PecaFormulaDto[] = [];
  const partes = texto.split(/\[([^\]]+)\]/);
  for (let indice = 0; indice < partes.length; indice += 2) {
    const expressao = partes[indice];
    const tag = partes[indice + 1];
    if (!expressao) {
      if (tag !== undefined) {
        return null;
      }
      continue;
    }
    const destino = tag === undefined ? {} : resolverTipoDano(tag);
    if (!destino) {
      return null;
    }
    // `(<dados>)[Tipo]` e `(<conta>)[Tipo]`: o grupo inteiro leva a tag; o sinal de fora vale para cada peça.
    const grupo = tag !== undefined ? expressao.match(/^([+-]?)\(([^()]+)\)$/) : null;
    if (grupo) {
      const sinalExterno: 1 | -1 = grupo[1] === '-' ? -1 : 1;
      const internas = /[dD]\d/.test(grupo[2])
        ? lerSegmento(grupo[2], destino, sinalExterno)
        : [{ tipo: 'CONTA' as const, sinal: sinalExterno, texto: `(${grupo[2].toUpperCase()})`, ...destino }];
      if (!internas) {
        return null;
      }
      pecas.push(...internas);
      continue;
    }
    const lidas = lerSegmento(expressao, destino);
    if (!lidas) {
      return null;
    }
    pecas.push(...lidas);
  }
  return pecas;
}

/** Igualdade estrutural (ordem de chaves irrelevante) entre duas interpretações do motor. */
function iguais(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false;
  }
  if (Array.isArray(a) !== Array.isArray(b)) {
    return false;
  }
  const chavesA = Object.keys(a).filter((chave) => (a as Record<string, unknown>)[chave] !== undefined);
  const chavesB = Object.keys(b).filter((chave) => (b as Record<string, unknown>)[chave] !== undefined);
  if (chavesA.length !== chavesB.length) {
    return false;
  }
  return chavesA.every((chave) =>
    iguais((a as Record<string, unknown>)[chave], (b as Record<string, unknown>)[chave]),
  );
}

/** Interpretações do texto com cada expansão de verificação dos atalhos (uma só, se não há atalho). */
function interpretarParaVerificar(texto: string, temAtalho: boolean): InterpretacaoFormulaDto[] {
  if (!temAtalho) {
    return [interpretarFormula(texto)];
  }
  return ATALHOS_VERIFICACAO.map((atalhos) => interpretarFormula(expandirAtalhosDano(texto, atalhos)));
}

/**
 * Lê o texto da fórmula como lista ordenada de peças. Devolve `null` quando o texto é vazio, inválido no motor
 * ou não tem representação em peças que o motor leia igual (o montador o trata como fórmula "avançada").
 * Fórmula com `CORPO`/`FURTIVO` é verificada com expansões representativas desses atalhos.
 */
export function tokenizarFormula(formulaTexto: string): FormulaTokenizadaDto | null {
  const texto = (formulaTexto ?? '').replace(/\s+/g, '');
  if (!texto) {
    return null;
  }
  const repeticao = extrairRepeticao(texto);
  const corpo = repeticao ? repeticao.interna : texto;
  const pecas = lerCorpo(corpo);
  if (!pecas || pecas.length === 0) {
    return null;
  }
  const tokenizada: FormulaTokenizadaDto = repeticao ? { pecas, repeticoes: repeticao.n } : { pecas };

  const temAtalho = pecas.some((peca) => peca.tipo === 'ATALHO');
  const originais = interpretarParaVerificar(texto, temAtalho);
  if (!originais.some((interpretacao) => interpretacao.valida)) {
    return null;
  }
  const remontadas = interpretarParaVerificar(montarFormula(tokenizada), temAtalho);
  const mesmaLeitura = originais.every((original, indice) => iguais(original, remontadas[indice]));
  return mesmaLeitura ? tokenizada : null;
}

/** Tag de uma peça (`F`, `F-Q`) ou `''` quando não tem tipo. */
function tagDaPeca(peca: PecaFormulaDto): string {
  if (peca.tipo === 'ATALHO') {
    return '';
  }
  if (peca.composto) {
    return `${siglaTipoDano(peca.composto[0])}-${siglaTipoDano(peca.composto[1])}`;
  }
  return peca.tipoDano ? siglaTipoDano(peca.tipoDano) : '';
}

/** Conta com `+`/`−` no nível de cima (ou começando com `−`) ganha parênteses, para seguir sendo uma peça só. */
function envolverConta(texto: string): string {
  const normalizada = /^[+-]/.test(texto) ? texto : `+${texto}`;
  return texto.startsWith('-') || dividirTermosNivelSuperior(normalizada).length > 1 ? `(${texto})` : texto;
}

/** Texto de uma peça, sem o sinal. */
function escreverPeca(peca: PecaFormulaDto): string {
  switch (peca.tipo) {
    case 'DADO': {
      const quantidade =
        peca.quantidade.tipo === 'NUMERO'
          ? String(peca.quantidade.valor)
          : peca.quantidade.tipo === 'FONTE'
            ? peca.quantidade.nome
            : `(${peca.quantidade.texto})`;
      const manter =
        peca.manterMaior !== undefined
          ? `kh${peca.manterMaior}`
          : peca.manterMenor !== undefined
            ? `kl${peca.manterMenor}`
            : '';
      const critico = peca.margemCritico !== undefined ? `cm${peca.margemCritico}` : '';
      const explosao =
        peca.explosao !== undefined ? (peca.explosao === peca.faces ? '!' : `!${peca.explosao}`) : '';
      const implosao =
        peca.implosao !== undefined ? (peca.implosao === 1 ? '?' : `?${peca.implosao}`) : '';
      return `${quantidade}d${peca.faces}${manter}${critico}${explosao}${implosao}`;
    }
    case 'FONTE':
      if (peca.multiplicador !== undefined) {
        return `${peca.nome}*${peca.multiplicador}`;
      }
      return peca.divisor !== undefined ? `${peca.nome}/${peca.divisor}` : peca.nome;
    case 'NUMERO':
      return String(peca.valor);
    case 'CONTA':
      return envolverConta(peca.texto);
    case 'ATALHO':
      return peca.atalho;
  }
}

/**
 * Recompõe o texto da fórmula a partir das peças, na ordem: peças vizinhas com a mesma tag formam um segmento
 * (`2d6 + FOR [F]`), e a tag sai como sigla. Numa fórmula tipada, um trecho sem tag **antes** de um trecho
 * tipado sai com `[F]` — é o Físico que o motor já lhe daria, e sem a tag ele seria absorvido pela tag seguinte.
 * Atalhos saem sem tag. `repeticoes` ≥ 1 envolve tudo em `(…)#N`. Sem peças, devolve `''`.
 */
export function montarFormula(dto: FormulaTokenizadaDto): string {
  const grupos: { tag: string; atalho: boolean; pecas: PecaFormulaDto[] }[] = [];
  for (const peca of dto.pecas) {
    const tag = tagDaPeca(peca);
    const atalho = peca.tipo === 'ATALHO';
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && !atalho && !ultimo.atalho && ultimo.tag === tag) {
      ultimo.pecas.push(peca);
    } else {
      grupos.push({ tag, atalho, pecas: [peca] });
    }
  }

  const trechos = grupos.map((grupo, indiceGrupo) => {
    const termos = grupo.pecas
      .map((peca, indicePeca) => {
        const texto = escreverPeca(peca);
        if (indiceGrupo === 0 && indicePeca === 0) {
          return peca.sinal === -1 ? `-${texto}` : texto;
        }
        return `${peca.sinal === -1 ? '- ' : '+ '}${texto}`;
      })
      .join(' ');
    const tipadoDepois = grupos.slice(indiceGrupo + 1).some((seguinte) => !seguinte.atalho && seguinte.tag !== '');
    const tag = grupo.tag || (!grupo.atalho && tipadoDepois ? 'F' : '');
    return tag ? `${termos} [${tag}]` : termos;
  });
  const corpo = trechos.join(' ');
  return dto.repeticoes !== undefined && dto.repeticoes >= 1 && corpo ? `(${corpo})#${dto.repeticoes}` : corpo;
}
