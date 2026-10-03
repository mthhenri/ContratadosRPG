import { Component, computed, input, linkedSignal, model, output, signal, viewChild } from '@angular/core';

import type { FichaAtributosDto } from '@contratados-rpg/shared/dtos/ficha';
import { expandirAtalhosDano, type ResultadoRolagemDto } from '@contratados-rpg/shared/regras/rolagem';

import { Icone } from '../icone/icone.component';
import { OverflowFade } from '../overflow-fade/overflow-fade.directive';
import { ResultadoRolagem } from '../resultado-rolagem/resultado-rolagem.component';
import { Tooltip } from '../tooltip/tooltip.directive';
import { Botao } from '../ui/botao/botao.component';
import { BotaoIcone } from '../ui/botao-icone/botao-icone.component';
import { CartaoReceita } from '../ui/cartao-receita/cartao-receita.component';
import type { PainelFlutuantePosicao } from '../ui/painel-flutuante/painel-flutuante.component';
import { PainelFlutuante } from '../ui/painel-flutuante/painel-flutuante.component';
import { type MontadorDensidade, MontadorEditorPecas } from './montador-editor-pecas.component';
import { type AmbienteMontador, lerFormula, resumirFormula, type ResumoFormulaMontador } from './montador-leitura';
import {
  type AtalhosDanoMontador,
  analisarFormulaMontador,
  desfazerPassoHistorico,
  type HistoricoMontador,
  type MontadorFormulaAnalise,
  type MontadorModo,
  RECEITAS_MONTADOR,
  type ReceitaMontador,
  registrarPassoHistorico,
} from './montador-modelo';
import { podeMontarPecasOuTeste } from './montador-pecas';
import { type MontadorVersao, rotuloMontadorVersao } from './montador-versao';

/** Última rolagem feita pela barra, para o estado "resultado" (o painel não fecha ao rolar). */
export interface MontadorUltimaRolagem {
  readonly formula: string;
  readonly resultado: ResultadoRolagemDto;
}

/** Mesmo limiar de `$bp-mobile` (`_breakpoints.scss`), lido por `matchMedia` como no `MontadorRolagem`. */
const BREAKPOINT_MOBILE = 560;

/** Desktop: posição e tamanho iniciais, e mínimos do redimensionar (mesma mecânica do `MontadorRolagem`). */
const POSICAO_INICIAL: PainelFlutuantePosicao = { x: 24, y: 120 };
const LARGURA_INICIAL = 520;
const ALTURA_INICIAL = 700;
const LARGURA_MINIMA = 360;
const ALTURA_MINIMA = 440;

interface Tamanho {
  readonly largura: number;
  readonly altura: number;
}

/**
 * Casca das versões novas do montador de rolagem (`montador-exp-02`; Essencial/Completo em `03`, Blocos em `04`):
 * gatilho, janela flutuante, visor editável, pontos de partida, estados "avançada"/"inválida", último resultado e
 * rodapé fixo com **Desfazer**, Limpar e Rolar. Análogo aprovado: o `MontadorRolagem` (Atual) — mesma casca
 * `app-painel-flutuante`, gatilho e rodapé. As três versões são a **mesma janela e o mesmo estado**: trocar entre
 * elas (`versao`) não fecha nem perde nada.
 *
 * O texto da fórmula (`formula`, o mesmo `FormControl` da barra) é a única fonte de verdade: o estado da tela é
 * derivado dele e toda edição dos controles passa por `aplicarEdicao`, que guarda o passo para o Desfazer. Quem
 * pode ver o montador é decidido fora (`podeUsarMontador`, no consumidor); quem rola é o consumidor (`rolar`).
 */
@Component({
  selector: 'app-montador-rolagem-experimental',
  imports: [
    Botao,
    BotaoIcone,
    CartaoReceita,
    Icone,
    MontadorEditorPecas,
    OverflowFade,
    PainelFlutuante,
    ResultadoRolagem,
    Tooltip,
  ],
  templateUrl: './montador-rolagem-experimental.component.html',
  styleUrl: './montador-rolagem-experimental.component.scss',
  host: {
    '(window:resize)': 'aoRedimensionarViewport()',
    '(window:pointermove)': 'aoMoverPonteiroRedimensionar($event)',
    '(window:pointerup)': 'encerrarRedimensionamento()',
    '(window:pointercancel)': 'encerrarRedimensionamento()',
  },
})
export class MontadorRolagemExperimental {
  /** Fórmula em edição — o mesmo texto da barra de "Rolagem rápida". */
  readonly formula = model.required<string>();

  /** Versão nova em uso (o Atual é outro componente). */
  readonly versao = input.required<Exclude<MontadorVersao, 'ATUAL'>>();

  /** Dano C. a C./Furtivo atuais — validam e oferecem os atalhos `CORPO`/`FURTIVO`. */
  readonly atalhosDano = input<AtalhosDanoMontador>({});

  /** Validade já computada pelo consumidor — desabilita o Rolar com a mesma condição do botão da barra. */
  readonly formulaValida = input<boolean | null>(null);

  /** Última rolagem da barra; aparece acima do rodapé até ser fechada. */
  readonly ultimaRolagem = input<MontadorUltimaRolagem | null>(null);

  /** Cor de identidade da ficha, repassada ao resultado. */
  readonly corFicha = input<string | null>(null);

  /** Valores da ficha — leitura ao vivo (faixa, média, frase e campo de expressão). */
  readonly atributos = input.required<FichaAtributosDto>();
  readonly proficiencia = input<number | null>(null);
  readonly nivel = input<number>(0);

  /** A instância continua viva fora da aba Rolagens; nessa condição só a janela permanece. */
  readonly oculto = input(false);

  /** Pede ao consumidor para rolar — o painel não fecha sozinho. */
  readonly rolar = output<void>();

  protected readonly receitas = RECEITAS_MONTADOR;
  protected readonly posicaoInicial = POSICAO_INICIAL;
  protected readonly rotuloVersao = computed(() => rotuloMontadorVersao(this.versao()));

  protected readonly ambiente = computed<AmbienteMontador>(() => ({
    atributos: this.atributos(),
    proficiencia: this.proficiencia(),
    nivel: this.nivel(),
  }));

  /**
   * Estado derivado do texto: vazia, em peças, avançada ou inválida. Peças que os controles **desta versão** não
   * montam também ficam como avançada — o texto nunca é reescrito por um controle que não o representa.
   */
  protected readonly analise = computed<MontadorFormulaAnalise>(() => {
    const analise = analisarFormulaMontador(this.formula(), this.atalhosDano());
    if (analise.estado === 'PECAS' && analise.tokenizada && !podeMontarPecasOuTeste(analise.tokenizada)) {
      return { estado: 'AVANCADA', tokenizada: null };
    }
    return analise;
  });

  protected readonly densidade = computed<MontadorDensidade>(() =>
    this.versao() === 'COMPLETO' ? 'COMPLETO' : 'ESSENCIAL',
  );

  /** Editor de controles visível: fórmula em peças, ou vazia depois de escolher um ponto de partida. */
  protected readonly mostraEditor = computed(() => {
    const estado = this.analise().estado;
    return estado === 'PECAS' || (estado === 'VAZIA' && this.modo() !== null);
  });

  protected readonly tokenizadaEditor = computed(() => this.analise().tokenizada ?? { pecas: [] });

  /** Linha de leitura sob o visor: faixa e média de uma rolagem (do motor) e a frase em português. */
  protected readonly leitura = computed<{ resumo: ResumoFormulaMontador | null; frase: string | null } | null>(() => {
    const analise = this.analise();
    if (analise.estado !== 'PECAS' && analise.estado !== 'AVANCADA') return null;
    const resumo = resumirFormula(expandirAtalhosDano(this.formula(), this.atalhosDano()), this.ambiente());
    const frase = analise.tokenizada ? lerFormula(analise.tokenizada, this.ambiente(), this.atalhosDano()) : null;
    return { resumo, frase };
  });

  protected textoFaixa(resumo: ResumoFormulaMontador): string {
    const numero = (valor: number) => valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
    const faixa =
      resumo.minimo === resumo.maximo ? numero(resumo.minimo) : numero(resumo.minimo) + ' a ' + numero(resumo.maximo);
    return faixa + ' · média ' + numero(resumo.media);
  }

  protected readonly repeticoes = computed(() => this.analise().tokenizada?.repeticoes ?? 1);

  /**
   * Modo escolhido num ponto de partida. `null` com a fórmula vazia mostra "Começar por"; com texto, o editor
   * deriva o modo das peças. Limpar volta a `null`.
   */
  protected readonly modo = signal<MontadorModo | null>(null);

  /** Lista "Modelos" aberta (trocar de ponto de partida sem limpar antes). */
  protected readonly modelosAbertos = signal(false);

  protected readonly mostraInicio = computed(() => this.analise().estado === 'VAZIA' && this.modo() === null);

  // === Desfazer ===
  private readonly historico = signal<HistoricoMontador>([]);
  protected readonly podeDesfazer = computed(() => this.historico().length > 0);

  /** Toda edição feita pelos controles do montador passa por aqui (guarda o texto anterior para o Desfazer). */
  aplicarEdicao(texto: string): void {
    const anterior = this.formula();
    if (texto === anterior) {
      return;
    }
    this.historico.update((pilha) => registrarPassoHistorico(pilha, anterior));
    this.formula.set(texto);
  }

  protected desfazer(): void {
    const passo = desfazerPassoHistorico(this.historico());
    if (!passo) {
      return;
    }
    this.historico.set(passo.historico);
    this.formula.set(passo.texto);
  }

  protected limpar(): void {
    this.aplicarEdicao('');
    this.modo.set(null);
    this.modelosAbertos.set(false);
  }

  protected escolherReceita(receita: ReceitaMontador): void {
    this.aplicarEdicao(receita.formula);
    this.modo.set(receita.modo);
    this.modelosAbertos.set(false);
  }

  /** Digitação no visor: é o texto da barra, então não vira passo de Desfazer (o campo de texto já tem o seu). */
  protected aoDigitarVisor(evento: Event): void {
    this.formula.set((evento.target as HTMLInputElement).value);
  }

  // === Último resultado: some ao fechar e volta a aparecer na próxima rolagem ===
  protected readonly resultadoVisivel = linkedSignal(() => this.ultimaRolagem());

  protected fecharResultado(): void {
    this.resultadoVisivel.set(null);
  }

  // === Janela: aberta/fechada, mesmo padrão do `MontadorRolagem` ===
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

  // === Mobile: folha cheia abaixo de `$bp-mobile` ===
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

  // === Redimensionar (desktop), mesma mecânica do `MontadorRolagem` ===
  protected readonly tamanho = signal<Tamanho>({ largura: LARGURA_INICIAL, altura: ALTURA_INICIAL });
  private redimensionando = false;
  private origemRedimensionamento = { ponteiroX: 0, ponteiroY: 0, tamanho: this.tamanho() };

  protected iniciarRedimensionamento(evento: PointerEvent): void {
    if (this.mobileAtivo() || evento.button !== 0) return;
    evento.preventDefault();
    this.redimensionando = true;
    this.origemRedimensionamento = { ponteiroX: evento.clientX, ponteiroY: evento.clientY, tamanho: this.tamanho() };
  }

  protected aoMoverPonteiroRedimensionar(evento: PointerEvent): void {
    if (!this.redimensionando) return;
    const origem = this.origemRedimensionamento;
    this.tamanho.set({
      largura: limitarDimensao(origem.tamanho.largura + evento.clientX - origem.ponteiroX, LARGURA_MINIMA, window.innerWidth),
      altura: limitarDimensao(origem.tamanho.altura + evento.clientY - origem.ponteiroY, ALTURA_MINIMA, window.innerHeight),
    });
  }

  protected encerrarRedimensionamento(): void {
    this.redimensionando = false;
  }
}

/** Nunca menor que o mínimo nem maior que o viewport (mesmo racional do `MontadorRolagem`). */
function limitarDimensao(valor: number, minimo: number, viewport: number): number {
  if (viewport <= minimo) return viewport;
  return Math.min(Math.max(valor, minimo), viewport);
}
