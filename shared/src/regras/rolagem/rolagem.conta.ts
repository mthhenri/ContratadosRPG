import { CONTA_NUMERO_DIGITOS_MAXIMO, CONTA_PROFUNDIDADE_MAXIMA, CONTA_TAMANHO_MAXIMO } from './rolagem.dados';
import type { AnaliseContaDto, ContaDto, FonteEscalar, NoContaDto, OperadorConta } from './rolagem.dtos';

/**
 * Avaliador de **conta** das fórmulas de rolagem (I-041, `rolagem-expressao-quantidade-dados`): `+ − × ÷`
 * e parênteses sobre números inteiros e fontes escalares (os 10 atributos, `PROF` e `NIV`) — a quantidade
 * de dados e o bônus fixo de uma fórmula podem ser uma conta qualquer, ex.: `((INT+SOC)/2)d20kh1cm1+PROF`,
 * `((FOR+VIG)*2)d4`, `2d6+(FOR+VIG)*2`.
 *
 * **Aritmética exata**: cada valor é uma fração de inteiros (`BigInt`), nunca ponto flutuante — `(7/3)*3`
 * vale exatamente 7, e o **arredondamento é para baixo, uma única vez, ao fim da conta**
 * (docs/core/sistema-v4.1.0.md:2027-2033 — "arredondar para baixo após a conclusão do cálculo"; 27,5 → 27).
 * Sem `eval`/`Function`: analisador recursivo sobre tokens, com limites de tamanho e de profundidade
 * (o backend valida texto vindo do cliente). Nada aqui lança: o erro de leitura volta em `erro`, e a divisão
 * por zero **na rolagem** (divisor que depende de uma fonte e vale 0) faz a conta valer 0 (D2).
 * Funções puras.
 */

/** Resolve o nome de uma fonte (`FOR`, `forca`, `PROF`…) ou `null` — injetado para não acoplar ao `rolagem.ts`. */
export type ResolverFonte = (nome: string) => FonteEscalar | null;

type Token =
  | { readonly tipo: 'NUMERO'; readonly valor: number }
  | { readonly tipo: 'NOME'; readonly texto: string }
  | { readonly tipo: 'OPERADOR'; readonly operador: OperadorConta }
  | { readonly tipo: 'ABRE' }
  | { readonly tipo: 'FECHA' };

/** Erro de leitura levantado só **dentro** deste módulo; `analisarConta` o converte em `{ erro }`. */
class ErroConta extends Error {}

/** Divisão por zero durante a avaliação; `avaliarConta` converte em 0 (D2). */
class DivisaoPorZero extends Error {}

// ── Leitura ──────────────────────────────────────────────────────────────────

function tokenizar(texto: string): Token[] {
  const tokens: Token[] = [];
  let indice = 0;
  while (indice < texto.length) {
    const caractere = texto[indice];
    if (/\d/.test(caractere)) {
      let fim = indice;
      while (fim < texto.length && /\d/.test(texto[fim])) {
        fim += 1;
      }
      const digitos = texto.slice(indice, fim);
      if (digitos.length > CONTA_NUMERO_DIGITOS_MAXIMO) {
        throw new ErroConta(`Número grande demais na conta "${texto}" (máx. ${CONTA_NUMERO_DIGITOS_MAXIMO} dígitos).`);
      }
      tokens.push({ tipo: 'NUMERO', valor: parseInt(digitos, 10) });
      indice = fim;
    } else if (/[A-Za-z]/.test(caractere)) {
      let fim = indice;
      while (fim < texto.length && /[A-Za-z]/.test(texto[fim])) {
        fim += 1;
      }
      tokens.push({ tipo: 'NOME', texto: texto.slice(indice, fim) });
      indice = fim;
    } else if (caractere === '+' || caractere === '-' || caractere === '*' || caractere === '/') {
      tokens.push({ tipo: 'OPERADOR', operador: caractere });
      indice += 1;
    } else if (caractere === '(') {
      tokens.push({ tipo: 'ABRE' });
      indice += 1;
    } else if (caractere === ')') {
      tokens.push({ tipo: 'FECHA' });
      indice += 1;
    } else {
      const dica = caractere === '.' || caractere === ',' ? ' Decimais não são suportados.' : '';
      throw new ErroConta(`Caractere "${caractere}" não é permitido na conta "${texto}".${dica}`);
    }
  }
  return tokens;
}

/** Analisador recursivo: `expr := ['-'] termo (('+'|'-') termo)*`, `termo := primario (('*'|'/') primario)*`. */
class Leitor {
  private posicao = 0;

  constructor(
    private readonly tokens: readonly Token[],
    private readonly texto: string,
    private readonly resolverFonte: ResolverFonte,
  ) {}

  lerConta(): NoContaDto {
    if (this.tokens.length === 0) {
      throw new ErroConta('Conta vazia.');
    }
    const raiz = this.lerExpressao(0);
    const sobra = this.tokens[this.posicao];
    if (sobra) {
      throw new ErroConta(
        sobra.tipo === 'FECHA'
          ? `Parêntese fechado a mais na conta "${this.texto}".`
          : `Conta inválida perto de "${this.texto}".`,
      );
    }
    return raiz;
  }

  private espiar(): Token | undefined {
    return this.tokens[this.posicao];
  }

  private lerExpressao(profundidade: number): NoContaDto {
    if (profundidade > CONTA_PROFUNDIDADE_MAXIMA) {
      throw new ErroConta(`Parênteses aninhados demais na conta (máx. ${CONTA_PROFUNDIDADE_MAXIMA} níveis).`);
    }
    // Menos unário só no início da conta ou do grupo — `(-FOR+VIG)`. Em exatas frações, `-(a*b)` e `(-a)*b` coincidem.
    let atual: NoContaDto;
    const primeiro = this.espiar();
    if (primeiro?.tipo === 'OPERADOR' && primeiro.operador === '-') {
      this.posicao += 1;
      atual = { negar: this.lerTermo(profundidade) };
    } else {
      atual = this.lerTermo(profundidade);
    }
    for (;;) {
      const proximo = this.espiar();
      if (proximo?.tipo === 'OPERADOR' && (proximo.operador === '+' || proximo.operador === '-')) {
        this.posicao += 1;
        atual = { operador: proximo.operador, esquerda: atual, direita: this.lerTermo(profundidade) };
      } else {
        return atual;
      }
    }
  }

  private lerTermo(profundidade: number): NoContaDto {
    let atual = this.lerPrimario(profundidade);
    for (;;) {
      const proximo = this.espiar();
      if (proximo?.tipo === 'OPERADOR' && (proximo.operador === '*' || proximo.operador === '/')) {
        this.posicao += 1;
        const direita = this.lerPrimario(profundidade);
        if (proximo.operador === '/' && !contaTemFonte(direita) && avaliarFracao(direita, {}, false).numerador === 0n) {
          throw new ErroConta(`Divisão por zero na conta "${this.texto}".`);
        }
        atual = { operador: proximo.operador, esquerda: atual, direita };
      } else {
        return atual;
      }
    }
  }

  private lerPrimario(profundidade: number): NoContaDto {
    const token = this.espiar();
    if (!token) {
      throw new ErroConta(`Falta um valor no fim da conta "${this.texto}".`);
    }
    this.posicao += 1;
    if (token.tipo === 'NUMERO') {
      return { numero: token.valor };
    }
    if (token.tipo === 'NOME') {
      const fonte = this.resolverFonte(token.texto);
      if (!fonte) {
        throw new ErroConta(`Fonte desconhecida "${token.texto}".`);
      }
      return { fonte };
    }
    if (token.tipo === 'ABRE') {
      if (this.espiar()?.tipo === 'FECHA') {
        throw new ErroConta('Conta vazia: parênteses sem nada dentro.');
      }
      const interno = this.lerExpressao(profundidade + 1);
      if (this.espiar()?.tipo !== 'FECHA') {
        throw new ErroConta(`Parêntese aberto sem fechar na conta "${this.texto}".`);
      }
      this.posicao += 1;
      return interno;
    }
    if (token.tipo === 'OPERADOR') {
      throw new ErroConta(`Operador duplo ou fora de lugar ("${token.operador}") na conta "${this.texto}".`);
    }
    throw new ErroConta(`Falta um valor antes de ")" na conta "${this.texto}".`);
  }
}

/**
 * Lê o texto de uma conta (sem espaços) e devolve a árvore, ou o erro. **Nunca lança.** Rejeita texto acima
 * de `CONTA_TAMANHO_MAXIMO`, aninhamento acima de `CONTA_PROFUNDIDADE_MAXIMA`, fonte desconhecida,
 * parêntese sobrando ou faltando, conta vazia, operador duplo, decimal e divisor literalmente zero.
 */
export function analisarConta(texto: string, resolverFonte: ResolverFonte): AnaliseContaDto {
  if (texto.length > CONTA_TAMANHO_MAXIMO) {
    return { erro: `Conta longa demais (máx. ${CONTA_TAMANHO_MAXIMO} caracteres).` };
  }
  try {
    const raiz = new Leitor(tokenizar(texto), texto, resolverFonte).lerConta();
    return { conta: { raiz } };
  } catch (erro) {
    if (erro instanceof ErroConta) {
      return { erro: erro.message };
    }
    throw erro;
  }
}

// ── Avaliação (frações exatas) ───────────────────────────────────────────────

interface Fracao {
  readonly numerador: bigint;
  /** Sempre > 0. */
  readonly denominador: bigint;
}

function mdc(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) {
    [x, y] = [y, x % y];
  }
  return x;
}

function fracao(numerador: bigint, denominador: bigint): Fracao {
  const divisor = mdc(numerador, denominador) || 1n;
  const sinal = denominador < 0n ? -1n : 1n;
  return { numerador: (sinal * numerador) / divisor, denominador: (sinal * denominador) / divisor };
}

/** `true` se a conta cita alguma fonte (atributo, `PROF` ou `NIV`) — sem fonte, o valor é conhecido ao interpretar. */
export function contaTemFonte(no: NoContaDto): boolean {
  if ('numero' in no) {
    return false;
  }
  if ('fonte' in no) {
    return true;
  }
  if ('negar' in no) {
    return contaTemFonte(no.negar);
  }
  return contaTemFonte(no.esquerda) || contaTemFonte(no.direita);
}

function avaliarFracao(no: NoContaDto, ambiente: Partial<Record<FonteEscalar, number>>, semPatenteNivel: boolean): Fracao {
  if ('numero' in no) {
    return fracao(BigInt(no.numero), 1n);
  }
  if ('fonte' in no) {
    const zerada = semPatenteNivel && (no.fonte === 'proficiencia' || no.fonte === 'nivel');
    const valor = zerada ? 0 : (ambiente[no.fonte] ?? 0);
    return fracao(BigInt(Math.trunc(Number.isFinite(valor) ? valor : 0)), 1n);
  }
  if ('negar' in no) {
    const interno = avaliarFracao(no.negar, ambiente, semPatenteNivel);
    return fracao(-interno.numerador, interno.denominador);
  }
  const esquerda = avaliarFracao(no.esquerda, ambiente, semPatenteNivel);
  const direita = avaliarFracao(no.direita, ambiente, semPatenteNivel);
  switch (no.operador) {
    case '+':
      return fracao(
        esquerda.numerador * direita.denominador + direita.numerador * esquerda.denominador,
        esquerda.denominador * direita.denominador,
      );
    case '-':
      return fracao(
        esquerda.numerador * direita.denominador - direita.numerador * esquerda.denominador,
        esquerda.denominador * direita.denominador,
      );
    case '*':
      return fracao(esquerda.numerador * direita.numerador, esquerda.denominador * direita.denominador);
    case '/':
      if (direita.numerador === 0n) {
        throw new DivisaoPorZero();
      }
      return fracao(esquerda.numerador * direita.denominador, esquerda.denominador * direita.numerador);
  }
}

/** Piso de uma fração (`floor` — para baixo também nos negativos: −1,5 → −2). */
function pisoFracao(valor: Fracao): bigint {
  const quociente = valor.numerador / valor.denominador;
  return valor.numerador % valor.denominador < 0n ? quociente - 1n : quociente;
}

/**
 * Valor da conta com o ambiente da rolagem, **arredondado para baixo** uma vez, no fim. Divisor que vale zero
 * na rolagem (ex.: `FOR/VIG` com Vigor 0) faz a conta valer 0 — nunca lança (D2). `semPatenteNivel` zera
 * `PROF` e `NIV` antes de contar: serve à regra do crítico (D4), em que só o que vem de atributos e de números
 * dobra. O resultado é limitado ao intervalo de inteiros seguros.
 */
export function avaliarConta(
  conta: ContaDto,
  ambiente: Partial<Record<FonteEscalar, number>>,
  semPatenteNivel = false,
): number {
  let piso: bigint;
  try {
    piso = pisoFracao(avaliarFracao(conta.raiz, ambiente, semPatenteNivel));
  } catch (erro) {
    if (erro instanceof DivisaoPorZero) {
      return 0;
    }
    throw erro;
  }
  const limite = BigInt(Number.MAX_SAFE_INTEGER);
  return Number(piso > limite ? limite : piso < -limite ? -limite : piso);
}
