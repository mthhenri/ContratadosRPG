import { Component, computed, input, model, output, signal, viewChild } from '@angular/core';

import { TipoDanoEnum } from '@contratados-rpg/shared/enums';
import { ABREVIACOES_ATRIBUTO, REPETICOES_MAXIMA } from '@contratados-rpg/shared/regras/rolagem';

import { Icone, type IconeNome } from '../icone/icone.component';
import { Botao } from '../ui/botao/botao.component';
import { BotaoIcone } from '../ui/botao-icone/botao-icone.component';
import type { PainelFlutuantePosicao } from '../ui/painel-flutuante/painel-flutuante.component';
import { PainelFlutuante } from '../ui/painel-flutuante/painel-flutuante.component';
import { Segmentado } from '../ui/segmentado/segmentado.component';
import { SegmentadoItem } from '../ui/segmentado/segmentado-item.component';
import { StepInput } from '../ui/stepper/step-input.component';
import { Tooltip } from '../tooltip/tooltip.directive';
import {
  adicionarDado,
  adicionarTipoDano,
  reposicionarOperadorPool,
} from './montador-rolagem.util';

/** Dados canônicos do sistema (`docs/core/sistema-v4.1.0.md` — "Dados"); sem `d100`. */
const DADOS: readonly number[] = [3, 4, 6, 8, 10, 12, 20];

/** Os 10 atributos, na mesma ordem usada em `guia-formula`/`ficha-rolagens`. */
const ATRIBUTOS: readonly string[] = Object.keys(ABREVIACOES_ATRIBUTO);

/** Siglas curtas de `ABREVIACOES_FONTE_EXTRA` (que também aceita `PROFICIENCIA`/`NIVEL` por
 *  extenso). */
const FONTES_EXTRA: readonly string[] = ['PROF', 'NIV'];

/** Ícone de dado (`d4`..`d20`) por face — mesmo mapa de `resultado-rolagem.component.ts`. `d3`
 *  não tem SVG dedicado (fallback pro ícone genérico `dado`, só aqui). */
const ICONE_POR_FACES: Readonly<Record<number, IconeNome>> = {
  4: 'd4',
  6: 'd6',
  8: 'd8',
  10: 'd10',
  12: 'd12',
  20: 'd20',
};

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

/** Abaixo desta largura o painel vira folha cheia — mesmo limiar de `_breakpoints.scss`
 *  (`$bp-mobile`), lido do CSS via `matchMedia` (mesmo padrão de
 *  `FichaVisualizacao.verificarAnotacoesMobile`) em vez de duplicado como número mágico aqui. */
const BREAKPOINT_MOBILE = 560;

const POSICAO_INICIAL: PainelFlutuantePosicao = { x: 24, y: 120 };

/** Tamanho de base 380×580 (ui-35) +50% horizontal/+25% vertical — pedido do autor, a caixa
 *  original ficava apertada demais pra composição de fórmulas compostas. */
const LARGURA_INICIAL = 570;
const ALTURA_INICIAL = 725;
const LARGURA_MINIMA = 320;
const ALTURA_MINIMA = 420;

interface Tamanho {
  readonly largura: number;
  readonly altura: number;
}

/**
 * Caixa flutuante de tokens para montar uma fórmula de rolagem sem decorar a sintaxe do motor
 * (`shared/regras/rolagem`) — ui-35, revisão de usabilidade. Mesma mecânica de
 * `CalculadoraFlutuante.inserir`: concatena texto no `model` `formula` com guardas simples, sem
 * parser client-side de "onde inserir" — a única exceção é o clique num dado, que delega a
 * composição ao utilitário puro. Duas ações
 * compostas (`(ATR±n)dM` e `(<fórmula>)#N`) evitam o erro mais comum de montar essas duas formas
 * sancionadas de parênteses na mão (parêntese sobrando/faltando).
 *
 * **Nenhuma regra de dados vive aqui** (proibição #26 do `CLAUDE.md`): os tokens só reproduzem a
 * gramática já documentada em `guia-formula`; quem valida o resultado é `validarFormula`, chamada
 * pelo consumidor (`ficha-rolagens.component.ts`), não este componente.
 */
@Component({
  selector: 'app-montador-rolagem',
  imports: [
    Botao,
    BotaoIcone,
    Icone,
    PainelFlutuante,
    Segmentado,
    SegmentadoItem,
    StepInput,
    Tooltip,
  ],
  templateUrl: './montador-rolagem.component.html',
  styleUrl: './montador-rolagem.component.scss',
  host: {
    '(window:resize)': 'aoRedimensionarViewport()',
    '(window:pointermove)': 'aoMoverPonteiroRedimensionar($event)',
    '(window:pointerup)': 'encerrarRedimensionamento()',
    '(window:pointercancel)': 'encerrarRedimensionamento()',
  },
})
export class MontadorRolagem {
  /** Fórmula em edição — mesmo texto que alimenta o `FormControl` da "Rolagem rápida". */
  readonly formula = model.required<string>();

  /** Dano C. a C./Furtivo atuais (m3-31) — só mostra `CORPO`/`FURTIVO` quando há valor. */
  readonly atalhosDano = input<{
    readonly corpo?: string | null;
    readonly furtivo?: string | null;
  }>({});

  /** Validade já computada pelo consumidor (`rapidaValida()`) — desabilita o "Rolar" do rodapé
   *  com a mesma condição do botão externo, sem duplicar a chamada a `validarFormula` aqui. */
  readonly formulaValida = input<boolean | null>(null);

  /** A instância continua viva fora da aba Rolagens; nessa condição só o painel permanece visível. */
  readonly oculto = input(false);

  /** O rodapé pede pro consumidor rolar — o painel não fecha sozinho (o jogador pode ajustar e
   *  rolar de novo, ex.: repetir com N diferente). */
  readonly rolar = output<void>();

  protected readonly dados = DADOS;
  protected readonly atributos = ATRIBUTOS;
  protected readonly fontesExtra = FONTES_EXTRA;
  protected readonly tiposDano = TIPOS_DANO;
  protected readonly repeticoesMaxima = REPETICOES_MAXIMA;
  protected readonly posicaoInicial = POSICAO_INICIAL;

  protected readonly temCorpo = computed(() => !!this.atalhosDano().corpo);
  protected readonly temFurtivo = computed(() => !!this.atalhosDano().furtivo);

  /** Margem de crítico aceita N > 1 (diferente de `kh`/`kl`, que agora são sempre 1). */
  protected readonly margemCriticoN = signal(1);

  // === Caixa flutuante: aberto/fechado, mesmo padrão de `CalculadoraFlutuante.alternar()` ===
  protected readonly aberto = signal(false);
  private readonly painelRef = viewChild<PainelFlutuante>('painel');

  protected alternar(): void {
    if (this.aberto() && this.painelRef()?.minimizado()) {
      this.painelRef()?.restaurar();
      return;
    }
    this.aberto.update((atual) => !atual);
  }

  protected fechar(): void {
    this.aberto.set(false);
  }

  // === Mobile: `[mobile]` de `app-painel-flutuante` reage à largura real da janela, mesmo padrão
  // de `FichaVisualizacao.verificarAnotacoesMobile` (lido do CSS via `matchMedia`, não duplicado
  // como breakpoint próprio). ===
  protected readonly mobileAtivo = signal(this.verificarMobile());
  protected aoRedimensionarViewport(): void {
    this.mobileAtivo.set(this.verificarMobile());
  }
  private verificarMobile(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    return typeof window.matchMedia === 'function'
      ? window.matchMedia(`(max-width: ${BREAKPOINT_MOBILE}px)`).matches
      : window.innerWidth <= BREAKPOINT_MOBILE;
  }

  // === Redimensionar (desktop): sem maximizar — só a alça no canto, mesmo padrão de
  // `CadernoFlutuante.iniciarRedimensionamento`/`aoMoverPonteiro`, mas com estado local (não há
  // store aqui) e sem persistência entre sessões. ===
  protected readonly tamanho = signal<Tamanho>({ largura: LARGURA_INICIAL, altura: ALTURA_INICIAL });
  private redimensionando = false;
  private origemRedimensionamento = { ponteiroX: 0, ponteiroY: 0, tamanho: this.tamanho() };

  protected iniciarRedimensionamento(evento: PointerEvent): void {
    if (this.mobileAtivo() || evento.button !== 0) return;
    evento.preventDefault();
    this.redimensionando = true;
    this.origemRedimensionamento = {
      ponteiroX: evento.clientX,
      ponteiroY: evento.clientY,
      tamanho: this.tamanho(),
    };
  }

  protected aoMoverPonteiroRedimensionar(evento: PointerEvent): void {
    if (!this.redimensionando) return;
    const largura =
      this.origemRedimensionamento.tamanho.largura + evento.clientX - this.origemRedimensionamento.ponteiroX;
    const altura =
      this.origemRedimensionamento.tamanho.altura + evento.clientY - this.origemRedimensionamento.ponteiroY;
    this.tamanho.set({
      largura: limitarDimensao(largura, LARGURA_MINIMA, window.innerWidth),
      altura: limitarDimensao(altura, ALTURA_MINIMA, window.innerHeight),
    });
  }

  protected encerrarRedimensionamento(): void {
    this.redimensionando = false;
  }

  // === Ação composta 1: "Dado por Propriedade + Ajuste" → `(ATR±n)dM` ===
  protected readonly atributoComposto = signal<string>(ATRIBUTOS[0]);
  protected readonly ajusteComposto = signal(1);
  protected readonly usaMultiplicadorComposto = signal(false);
  protected readonly multiplicadorComposto = signal(2);

  // === Ação composta 2: "Repetir tudo" → `(<fórmula>)#N` ===
  protected readonly repeticoesN = signal(2);
  protected readonly podeRepetir = computed(() => this.formula().trim().length > 0);

  /** Nome do ícone (`app-icone`) pra este `faces` — `dado` genérico no fallback (`d3`, sem SVG
   *  próprio). */
  protected iconeDado(faces: number): IconeNome {
    return ICONE_POR_FACES[faces] ?? 'dado';
  }

  /** Clique num dado: soma quantidade no último termo cru daquela face já na fórmula, ou insere
   *  um `dN` novo quando ainda não existe nenhum (comportamento padrão de sempre). */
  protected clicarDado(faces: number): void {
    this.formula.update((atual) => adicionarDado(atual, faces));
  }

  /** Preview editável dentro do painel — mesmo texto do input original da Rolagem rápida. */
  protected aoDigitarPreview(evento: Event): void {
    this.formula.set((evento.target as HTMLInputElement).value);
  }

  // === Inserção crua (tag de dano, operador por pool — encostado no texto atual) ===
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
    const quantidade = this.usaMultiplicadorComposto()
      ? `*${this.multiplicadorComposto()}`
      : `${this.ajusteComposto() >= 0 ? '+' : ''}${this.ajusteComposto()}`;
    const bloco = `(${this.atributoComposto()}${quantidade})d${faces}`;
    this.inserirComSinal(bloco);
  }

  protected reposicionarPool(operador: string): void {
    this.formula.update((atual) => reposicionarOperadorPool(atual, operador));
  }

  protected adicionarDano(tipo: string): void {
    this.formula.update((atual) => adicionarTipoDano(atual, tipo));
  }

  /** Envolve a fórmula **atual inteira** em `(...)#N` — sempre balanceado, por construção. */
  protected repetirTudo(): void {
    if (!this.podeRepetir()) {
      return;
    }
    this.formula.update((atual) => `(${atual})#${this.repeticoesN()}`);
  }
}

/** Nunca menor que o mínimo nem maior que o viewport disponível — mesmo racional de
 *  `caderno-flutuante.store.ts:limitarDimensao`. */
function limitarDimensao(valor: number, minimo: number, viewport: number): number {
  if (viewport <= minimo) return viewport;
  return Math.min(Math.max(valor, minimo), viewport);
}
