import { Component, computed, input, model, signal } from '@angular/core';

import { TipoDanoEnum } from '@contratados-rpg/shared/enums';
import { ABREVIACOES_ATRIBUTO, REPETICOES_MAXIMA } from '@contratados-rpg/shared/regras/rolagem';

import { OverflowFade } from '../overflow-fade/overflow-fade.directive';
import { Tooltip } from '../tooltip/tooltip.directive';
import { Segmentado } from '../ui/segmentado/segmentado.component';
import { SegmentadoItem } from '../ui/segmentado/segmentado-item.component';
import { StepInput } from '../ui/stepper/step-input.component';

/** Dados canônicos do sistema (`docs/core/sistema-v4.1.0.md` — "Dados"); sem `d100`. */
const DADOS: readonly number[] = [3, 4, 6, 8, 10, 12, 20];

/** Os 10 atributos, na mesma ordem usada em `guia-formula`/`ficha-rolagens`. */
const ATRIBUTOS: readonly string[] = Object.keys(ABREVIACOES_ATRIBUTO);

/** Siglas curtas de `ABREVIACOES_FONTE_EXTRA` (que também aceita `PROFICIENCIA`/`NIVEL` por
 *  extenso). */
const FONTES_EXTRA: readonly string[] = ['PROF', 'NIV'];

/** Um botão do grupo "Tipo de dano": sigla exibida + classe BEM para a cor do token. */
interface TokenTipoDano {
  readonly tipo: TipoDanoEnum;
  readonly sigla: string;
  readonly classe: string;
}

/** Sigla de 1 letra por tipo de dano — mesma convenção de `SIGLAS_TIPO_DANO`
 *  (`rolagem.dados.ts`), aqui só como rótulo de botão (a resolução real continua em
 *  `resolverTipoDanoSimples`). */
const TIPOS_DANO: readonly TokenTipoDano[] = [
  { tipo: TipoDanoEnum.FISICO, sigla: 'F', classe: 'fisico' },
  { tipo: TipoDanoEnum.BALISTICO, sigla: 'B', classe: 'balistico' },
  { tipo: TipoDanoEnum.EXPLOSAO, sigla: 'E', classe: 'explosao' },
  { tipo: TipoDanoEnum.QUIMICO, sigla: 'Q', classe: 'quimico' },
  { tipo: TipoDanoEnum.GERAL, sigla: 'G', classe: 'geral' },
];

/** Caracteres após os quais um novo token "aditivo" não precisa de `+` na frente. */
const SEM_SINAL_NECESSARIO = new Set(['+', '-', '(']);

/**
 * Teclado de tokens para montar uma fórmula de rolagem sem decorar a sintaxe do motor
 * (`shared/regras/rolagem`) — ui-35. Mesma mecânica de `CalculadoraFlutuante.inserir`: concatena
 * texto no `model` `formula` com guardas simples, sem parser client-side de "onde inserir". Duas
 * ações compostas (`(ATR±n)dM` e `(<fórmula>)#N`) evitam o erro mais comum de montar essas duas
 * formas sancionadas de parênteses na mão (parêntese sobrando/faltando).
 *
 * **Nenhuma regra de dados vive aqui** (proibição #26 do `CLAUDE.md`): os tokens só reproduzem a
 * gramática já documentada em `guia-formula`; quem valida o resultado é `validarFormula`,
 * chamada pelo consumidor (`ficha-rolagens.component.ts`), não este componente.
 */
@Component({
  selector: 'app-montador-rolagem',
  imports: [OverflowFade, Segmentado, SegmentadoItem, StepInput, Tooltip],
  templateUrl: './montador-rolagem.component.html',
  styleUrl: './montador-rolagem.component.scss',
})
export class MontadorRolagem {
  /** Fórmula em edição — mesmo texto que alimenta o `FormControl` da "Rolagem rápida". */
  readonly formula = model.required<string>();

  /** Dano C. a C./Furtivo atuais (m3-31) — só mostra `CORPO`/`FURTIVO` quando há valor. */
  readonly atalhosDano = input<{
    readonly corpo?: string | null;
    readonly furtivo?: string | null;
  }>({});

  protected readonly dados = DADOS;
  protected readonly atributos = ATRIBUTOS;
  protected readonly fontesExtra = FONTES_EXTRA;
  protected readonly tiposDano = TIPOS_DANO;
  protected readonly repeticoesMaxima = REPETICOES_MAXIMA;

  protected readonly temCorpo = computed(() => !!this.atalhosDano().corpo);
  protected readonly temFurtivo = computed(() => !!this.atalhosDano().furtivo);

  // === Steppers dos operadores por pool (N sempre ≥ 1) ===
  protected readonly manterMaiorN = signal(1);
  protected readonly manterMenorN = signal(1);
  protected readonly margemCriticoN = signal(1);

  // === Ação composta 1: "Dado por atributo+ajuste" → `(ATR±n)dM` ===
  protected readonly atributoComposto = signal<string>(ATRIBUTOS[0]);
  protected readonly ajusteComposto = signal(1);

  // === Ação composta 2: "Repetir tudo" → `(<fórmula>)#N` ===
  protected readonly repeticoesN = signal(2);
  protected readonly podeRepetir = computed(() => this.formula().trim().length > 0);

  // === Inserção crua (dado, tag de dano, operador por pool — encostado no texto atual) ===
  protected inserir(token: string): void {
    this.formula.update((atual) => atual + token);
  }

  /** Insere um termo "aditivo" (atributo modificador, atalho de dano) com `+` automático quando
   *  o campo já tem conteúdo e o último caractere não é `+`/`-`/`(`. */
  protected inserirComSinal(token: string): void {
    this.formula.update((atual) => {
      if (atual === '') {
        return token;
      }
      const ultimo = atual.at(-1) ?? '';
      return SEM_SINAL_NECESSARIO.has(ultimo) ? atual + token : `${atual}+${token}`;
    });
  }

  /** `+`/`-` substituem o operador anterior em vez de encadear (`2d6+-3` nunca é o que se quer).
   */
  protected inserirOperador(token: '+' | '-'): void {
    this.formula.update((atual) => {
      const ultimo = atual.at(-1);
      if (ultimo === '+' || ultimo === '-') {
        return atual.slice(0, -1) + token;
      }
      return atual + token;
    });
  }

  protected apagarUltimo(): void {
    this.formula.update((atual) => atual.slice(0, -1));
  }

  protected limpar(): void {
    this.formula.set('');
  }

  // === Ações compostas ===
  /** Fecha `(ATR±n)dM` de uma vez — o atributo e o ajuste vêm dos steppers acima do teclado. */
  protected inserirDadoPorAtributo(faces: number): void {
    const sinal = this.ajusteComposto() >= 0 ? '+' : '';
    const bloco = `(${this.atributoComposto()}${sinal}${this.ajusteComposto()})d${faces}`;
    this.inserirComSinal(bloco);
  }

  /** Envolve a fórmula **atual inteira** em `(...)#N` — sempre balanceado, por construção. */
  protected repetirTudo(): void {
    if (!this.podeRepetir()) {
      return;
    }
    this.formula.update((atual) => `(${atual})#${this.repeticoesN()}`);
  }
}
