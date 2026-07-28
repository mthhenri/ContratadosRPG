/**
 * Motor de avaliação aritmética da calculadora comum (m3-54) — **isolado** do motor de regras do
 * jogo (`shared/regras`): não há atributo, dado ou fórmula de sistema aqui, só `+ − × ÷ %` e
 * parênteses sobre números. Recursive-descent puro (sem `eval`), para não expor execução de
 * código arbitrário a partir do que o usuário digita.
 *
 * `%` é tratado como operador pós-fixo que divide o valor precedente por 100 (ex.: `50%` = 0.5,
 * `(10+10)%` = 0.2) — permite combiná-lo com parênteses sem um caso especial "10% de 50".
 */

const TOKEN = /\d+(?:\.\d+)?|[+\-×÷%()]/g;

function tokenizar(expressao: string): string[] {
  return expressao.match(TOKEN) ?? [];
}

class ParserAritmetico {
  private posicao = 0;

  constructor(private readonly tokens: readonly string[]) {}

  avaliar(): number {
    const resultado = this.expressao();
    if (this.posicao !== this.tokens.length) {
      throw new Error('Expressão inválida');
    }
    return resultado;
  }

  private expressao(): number {
    let valor = this.termo();
    while (this.atual() === '+' || this.atual() === '-') {
      const operador = this.consumir();
      const direita = this.termo();
      valor = operador === '+' ? valor + direita : valor - direita;
    }
    return valor;
  }

  private termo(): number {
    let valor = this.fator();
    while (this.atual() === '×' || this.atual() === '÷') {
      const operador = this.consumir();
      const direita = this.fator();
      if (operador === '×') {
        valor *= direita;
      } else {
        if (direita === 0) {
          throw new Error('Divisão por zero');
        }
        valor /= direita;
      }
    }
    return valor;
  }

  private fator(): number {
    let valor = this.unario();
    while (this.atual() === '%') {
      this.consumir();
      valor /= 100;
    }
    return valor;
  }

  private unario(): number {
    if (this.atual() === '-') {
      this.consumir();
      return -this.unario();
    }
    if (this.atual() === '+') {
      this.consumir();
      return this.unario();
    }
    return this.atomo();
  }

  private atomo(): number {
    const token = this.atual();
    if (token === '(') {
      this.consumir();
      const valor = this.expressao();
      if (this.atual() !== ')') {
        throw new Error('Parêntese não fechado');
      }
      this.consumir();
      return valor;
    }
    if (token !== undefined && /^\d/.test(token)) {
      this.consumir();
      return Number(token);
    }
    throw new Error('Expressão inválida');
  }

  private atual(): string | undefined {
    return this.tokens[this.posicao];
  }

  private consumir(): string {
    return this.tokens[this.posicao++];
  }
}

/** Avalia uma expressão aritmética (`+ − × ÷ %`, parênteses). Lança `Error` se inválida. */
export function avaliarExpressao(expressao: string): number {
  const tokens = tokenizar(expressao);
  if (tokens.length === 0) {
    throw new Error('Expressão vazia');
  }
  const resultado = new ParserAritmetico(tokens).avaliar();
  if (!Number.isFinite(resultado)) {
    throw new Error('Resultado inválido');
  }
  return resultado;
}

/** Texto do resultado sem lixo de ponto-flutuante (ex.: `0.1 + 0.2` → `"0.3"`, não `"0.30000000000000004"`). */
export function formatarResultado(valor: number): string {
  return Number(valor.toFixed(10)).toString();
}

/** Uma entrada do histórico volátil (só em memória — F5 zera, m3-54). */
export interface EntradaHistoricoCalculadora {
  readonly expressao: string;
  readonly resultado: string;
}
