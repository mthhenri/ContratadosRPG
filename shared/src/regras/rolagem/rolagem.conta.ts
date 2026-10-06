import {
  CONTA_NUMERO_DIGITOS_MAXIMO,
  CONTA_PROFUNDIDADE_MAXIMA,
  CONTA_TAMANHO_MAXIMO,
  QUANTIDADE_DADOS_MAXIMA,
} from './rolagem.dados';
import type { AnaliseContaDto, ContaDto, FonteEscalar, NoContaDto, OperadorConta } from './rolagem.dtos';

/**
 * Avaliador de **conta** das fórmulas de rolagem (I-041, `rolagem-expressao-quantidade-dados`): `+ − × ÷`
 * e parênteses sobre números inteiros e fontes escalares (os 10 atributos, `PROF` e `NIV`) — a quantidade
 * de dados e o bônus fixo de uma fórmula podem ser uma conta qualquer, ex.: `((INT+SOC)/2)d20kh1cm1+PROF`,
 * `((FOR+VIG)*2)d4`,  * `2d6+(FOR+VIG)*2`. Na **quantidade de dados** a conta também aceita dados `NdM` (`(1d6)d20`, `(1d4+FOR)d6`):
 * a rolagem rola esses dados primeiro e troca cada um pela soma (`listarDadosDaConta`/`substituirDadosDaConta`).
 *
 * **Aritmética exata**: cada valor é uma fração de inteiros (`BigInt`), nunca ponto flutuante — `(7/3)*3`
 * vale exatamente 7, e o **arredondamento é para baixo, uma única vez, ao fim da conta**
 * (docs/core/sistema-v4.1.3.md:1353-1359 — "arredondar para baixo após a conclusão do cálculo"; 27,5 → 27).
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
  | { readonly tipo: 'DADO'; readonly quantidade: number; readonly faces: number }
  | { readonly tipo: 'OPERADOR'; readonly operador: OperadorConta }
  | { readonly tipo: 'ABRE' }
  | { readonly tipo: 'FECHA' };

/** Erro de leitura levantado só **dentro** deste módulo; `analisarConta` o converte em `{ erro }`. */
class ErroConta extends Error {}

/** Divisão por zero durante a avaliação; `avaliarConta` converte em 0 (D2). */
class DivisaoPorZero extends Error {}

// ── Leitura ──────────────────────────────────────────────────────────────────

/** Fim da sequência de dígitos que começa em `inicio`. */
function fimDosDigitos(texto: string, inicio: number): number {
  let fim = inicio;
  while (fim < texto.length && /\d/.test(texto[fim])) {
    fim += 1;
  }
  return fim;
}

function lerNumero(texto: string, digitos: string): number {
  if (digitos.length > CONTA_NUMERO_DIGITOS_MAXIMO) {
    throw new ErroConta(`Número grande demais na conta "${texto}" (máx. ${CONTA_NUMERO_DIGITOS_MAXIMO} dígitos).`);
  }
  return parseInt(digitos, 10);
}

/** Token de dado `NdM` (N omitido = 1), com as mesmas restrições de um `NdM` literal da fórmula. */
function tokenDado(texto: string, quantidade: number, digitosFaces: string): Token {
  const faces = lerNumero(texto, digitosFaces);
  if (quantidade < 1 || faces < 1) {
    throw new ErroConta(`Dado inválido na conta "${texto}".`);
  }
  if (quantidade > QUANTIDADE_DADOS_MAXIMA) {
    throw new ErroConta(`Máximo de ${QUANTIDADE_DADOS_MAXIMA} dados por termo.`);
  }
  return { tipo: 'DADO', quantidade, faces };
}

function tokenizar(texto: string): Token[] {
  const tokens: Token[] = [];
  let indice = 0;
  while (indice < texto.length) {
    const caractere = texto[indice];
    if (/\d/.test(caractere)) {
      const fim = fimDosDigitos(texto, indice);
      const valor = lerNumero(texto, texto.slice(indice, fim));
      // `NdM`: número seguido de `d` e dígitos é um dado, não um número.
      if (/[dD]/.test(texto[fim] ?? '') && /\d/.test(texto[fim + 1] ?? '')) {
        const fimFaces = fimDosDigitos(texto, fim + 1);
        tokens.push(tokenDado(texto, valor, texto.slice(fim + 1, fimFaces)));
        indice = fimFaces;
      } else {
        tokens.push({ tipo: 'NUMERO', valor });
        indice = fim;
      }
    } else if (/[A-Za-z]/.test(caractere)) {
      let fim = indice;
      while (fim < texto.length && /[A-Za-z]/.test(texto[fim])) {
        fim += 1;
      }
      const nome = texto.slice(indice, fim);
      // `dM` sozinho é `1dM`; um nome que só termina em `d` (`FORd6`) segue sendo nome (e falha como fonte).
      if (/^[dD]$/.test(nome) && /\d/.test(texto[fim] ?? '')) {
        const fimFaces = fimDosDigitos(texto, fim);
        tokens.push(tokenDado(texto, 1, texto.slice(fim, fimFaces)));
        indice = fimFaces;
      } else {
        tokens.push({ tipo: 'NOME', texto: nome });
        indice = fim;
      }
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
    private readonly permitirDados: boolean,
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
        const divisorConhecido = !contaTemFonte(direita) && !contaTemDado(direita);
        if (proximo.operador === '/' && divisorConhecido && avaliarFracao(direita, {}, false).numerador === 0n) {
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
    if (token.tipo === 'DADO') {
      if (!this.permitirDados) {
        throw new ErroConta('Dados só entram na conta da quantidade de dados, ex.: (1d6)d20.');
      }
      return { quantidade: token.quantidade, faces: token.faces };
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
 * parêntese sobrando ou faltando, conta vazia, operador duplo, decimal e divisor literalmente zero. Dados
 * `NdM` só são aceitos com `permitirDados` (a quantidade de dados, `(1d6)d20`); no bônus fixo são erro.
 */
export function analisarConta(
  texto: string,
  resolverFonte: ResolverFonte,
  opcoes: { readonly permitirDados?: boolean } = {},
): AnaliseContaDto {
  if (texto.length > CONTA_TAMANHO_MAXIMO) {
    return { erro: `Conta longa demais (máx. ${CONTA_TAMANHO_MAXIMO} caracteres).` };
  }
  try {
    const raiz = new Leitor(tokenizar(texto), texto, resolverFonte, opcoes.permitirDados ?? false).lerConta();
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
  if ('numero' in no || 'faces' in no) {
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

/** `true` se a conta tem algum dado `NdM` — o valor só existe depois de rolá-lo. */
export function contaTemDado(no: NoContaDto): boolean {
  if ('faces' in no) {
    return true;
  }
  if ('numero' in no || 'fonte' in no) {
    return false;
  }
  if ('negar' in no) {
    return contaTemDado(no.negar);
  }
  return contaTemDado(no.esquerda) || contaTemDado(no.direita);
}

/** Dados `NdM` da conta, na ordem em que aparecem no texto — a ordem em que a rolagem os rola. */
export function listarDadosDaConta(conta: ContaDto): { readonly quantidade: number; readonly faces: number }[] {
  const dados: { quantidade: number; faces: number }[] = [];
  const visitar = (no: NoContaDto): void => {
    if ('faces' in no) {
      dados.push({ quantidade: no.quantidade, faces: no.faces });
    } else if ('negar' in no) {
      visitar(no.negar);
    } else if ('operador' in no) {
      visitar(no.esquerda);
      visitar(no.direita);
    }
  };
  visitar(conta.raiz);
  return dados;
}

/**
 * Troca cada dado `NdM` da conta, na ordem de `listarDadosDaConta`, pela soma já rolada em `somas` — a conta que
 * sobra só tem números e fontes e é avaliada normalmente. Dado sem soma correspondente vale 0.
 */
export function substituirDadosDaConta(conta: ContaDto, somas: readonly number[]): ContaDto {
  let indice = 0;
  const trocar = (no: NoContaDto): NoContaDto => {
    if ('faces' in no) {
      const soma = somas[indice] ?? 0;
      indice += 1;
      return { numero: soma };
    }
    if ('negar' in no) {
      return { negar: trocar(no.negar) };
    }
    if ('operador' in no) {
      const esquerda = trocar(no.esquerda);
      return { operador: no.operador, esquerda, direita: trocar(no.direita) };
    }
    return no;
  };
  return { raiz: trocar(conta.raiz) };
}

function avaliarFracao(no: NoContaDto, ambiente: Partial<Record<FonteEscalar, number>>, semPatenteNivel: boolean): Fracao {
  if ('numero' in no) {
    return fracao(BigInt(no.numero), 1n);
  }
  if ('faces' in no) {
    // A rolagem troca os dados pela soma antes de contar (`substituirDadosDaConta`); aqui só chega por engano.
    throw new Error('Conta com dado não rolado: role os dados e use substituirDadosDaConta antes de avaliar.');
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
