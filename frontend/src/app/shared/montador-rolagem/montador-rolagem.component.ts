import { Component, computed, input, linkedSignal, model, output, signal, viewChild } from '@angular/core';

import type { FichaAtributosDto } from '@contratados-rpg/shared/dtos/ficha';
import { expandirAtalhosDano, type ResultadoRolagemDto } from '@contratados-rpg/shared/regras/rolagem';

import { Icone } from '../icone/icone.component';
import { GuiaMontador } from '../guia-montador/guia-montador.component';
import { JanelaMontador } from '../janela-montador/janela-montador';
import { OverflowFade } from '../overflow-fade/overflow-fade.directive';
import { ResultadoRolagem } from '../resultado-rolagem/resultado-rolagem.component';
import { Tooltip } from '../tooltip/tooltip.directive';
import { Botao } from '../ui/botao/botao.component';
import { BotaoIcone } from '../ui/botao-icone/botao-icone.component';
import { Segmentado } from '../ui/segmentado/segmentado.component';
import { SegmentadoItem } from '../ui/segmentado/segmentado-item.component';
import type { PainelFlutuantePosicao } from '../ui/painel-flutuante/painel-flutuante.component';
import { PainelFlutuante } from '../ui/painel-flutuante/painel-flutuante.component';
import { MontadorEditorPecas } from './montador-editor-pecas.component';
import { type AmbienteMontador, lerFormula, resumirFormula, type ResumoFormulaMontador } from './montador-leitura';
import {
  type AtalhosDanoMontador,
  analisarFormulaMontador,
  HISTORICO_MONTADOR_LIMITE,
  type MontadorFormulaAnalise,
  type MontadorModo,
  RECEITAS_MONTADOR,
  type ReceitaMontador,
} from './montador-modelo';
import { lerTeste, podeMontarPecasOuTeste } from './montador-pecas';

/** Última rolagem feita pela barra, para o estado "resultado" (o painel não fecha ao rolar). */
export interface MontadorUltimaRolagem {
  readonly formula: string;
  readonly resultado: ResultadoRolagemDto;
}

/** Mesmo limiar de `$bp-mobile` (`_breakpoints.scss`), lido por `matchMedia` como no `MontadorRolagem`. */
const BREAKPOINT_MOBILE = 560;

/** Desktop: posição e tamanho iniciais, e mínimos do redimensionar (`JanelaMontador`, comum ao `MontadorRolagem`). */
const POSICAO_INICIAL: PainelFlutuantePosicao = { x: 40, y: 136 };
const ALTURA_INICIAL = 880;
const LARGURA_MINIMA = 360;
const ALTURA_MINIMA = 440;

/**
 * Montador de rolagem (versão Completo, escolhida pelo autor em 2026-10-20): gatilho, janela flutuante, visor
 * editável, pontos de partida, estados "avançada"/"inválida", último resultado e rodapé fixo com **Desfazer**, Limpar
 * e Rolar. Mesma casca `app-painel-flutuante` do restante do produto.
 *
 * O texto da fórmula (`formula`, o mesmo `FormControl` da barra) é a única fonte de verdade: o estado da tela é
 * derivado dele e toda edição dos controles passa por `aplicarEdicao`, que guarda o passo para o Desfazer. Quem rola
 * é o consumidor (`rolar`).
 */
@Component({
  selector: 'app-montador-rolagem',
  imports: [
    Botao,
    BotaoIcone,
    GuiaMontador,
    Icone,
    MontadorEditorPecas,
    OverflowFade,
    PainelFlutuante,
    ResultadoRolagem,
    Tooltip,
    Segmentado,
    SegmentadoItem,
  ],
  templateUrl: './montador-rolagem.component.html',
  styleUrl: './montador-rolagem.component.scss',
  host: {
    '(window:resize)': 'aoRedimensionarViewport()',
    '(window:pointermove)': 'aoMoverPonteiroRedimensionar($event)',
    '(window:pointerup)': 'janela.encerrarRedimensionamento()',
    '(window:pointercancel)': 'janela.encerrarRedimensionamento()',
  },
})
export class MontadorRolagem {
  /** Fórmula em edição — o mesmo texto da barra de "Rolagem rápida". */
  readonly formula = model.required<string>();

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

  protected readonly ambiente = computed<AmbienteMontador>(() => ({
    atributos: this.atributos(),
    proficiencia: this.proficiencia(),
    nivel: this.nivel(),
  }));

  /**
   * Estado derivado do texto: vazia, em peças, avançada ou inválida. Peças que os controles não montam também
   * ficam como avançada — o texto nunca é reescrito por um controle que não o representa.
   */
  protected readonly analise = computed<MontadorFormulaAnalise>(() => {
    const analise = analisarFormulaMontador(this.formula(), this.atalhosDano());
    if (analise.estado === 'PECAS' && analise.tokenizada && !podeMontarPecasOuTeste(analise.tokenizada)) {
      return { estado: 'AVANCADA', tokenizada: null };
    }
    return analise;
  });

  /** Editor de controles visível para uma fórmula representável ou vazia. */
  protected readonly mostraEditor = computed(() => {
    const estado = this.analise().estado;
    return estado === 'PECAS' || estado === 'VAZIA';
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
   * Modelo escolhido; sem escolha explícita, o editor deriva Teste ou Livre da fórmula.
   */
  protected readonly modo = signal<MontadorModo | null>(null);
  protected readonly modoAtual = computed<MontadorModo>(
    () => this.modo() ?? (lerTeste(this.tokenizadaEditor()) ? 'TESTE' : 'LIVRE'),
  );
  protected readonly guiaAberto = signal(false);
  private readonly montagens = new Map<MontadorModo, string>();

  // === Desfazer ===
  private readonly historico = signal<readonly { texto: string; modo: MontadorModo | null }[]>([]);
  protected readonly podeDesfazer = computed(() => this.historico().length > 0);

  /** Toda edição feita pelos controles do montador passa por aqui (guarda o texto anterior para o Desfazer). */
  aplicarEdicao(texto: string, modo = this.modo()): void {
    const anterior = this.formula();
    if (texto === anterior && modo === this.modo()) {
      return;
    }
    this.historico.update((pilha) =>
      [...pilha, { texto: anterior, modo: this.modo() }].slice(-HISTORICO_MONTADOR_LIMITE),
    );
    this.formula.set(texto);
    this.modo.set(modo);
  }

  protected desfazer(): void {
    const passo = this.historico().at(-1);
    if (!passo) {
      return;
    }
    this.historico.update((pilha) => pilha.slice(0, -1));
    this.janela.restaurar(this.painelRef());
    this.modo.set(passo.modo);
    this.formula.set(passo.texto);
  }

  protected limpar(): void {
    this.aplicarEdicao('');
    this.montagens.set(this.modoAtual(), '');
  }

  protected escolherReceita(receita: ReceitaMontador): void {
    if (this.modo() === receita.modo) return;
    this.montagens.set(this.modoAtual(), this.formula());
    this.janela.restaurar(this.painelRef());
    this.aplicarEdicao(this.montagens.get(receita.modo) ?? receita.formula, receita.modo);
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

  /** Gatilhos externos abrem ou restauram a janela sem alternar o seu fechamento. */
  abrir(): void {
    this.aberto.set(true);
    this.painelRef()?.restaurar();
  }

  protected alternar(): void {
    if (this.aberto() && this.painelRef()?.minimizado()) {
      this.painelRef()?.restaurar();
      return;
    }
    this.aberto.update((atual) => !atual);
  }

  protected fechar(): void {
    this.janela.restaurar(this.painelRef());
    this.aberto.set(false);
  }

  // === Mobile: folha cheia abaixo de `$bp-mobile` ===
  protected readonly mobileAtivo = signal(this.verificarMobile());

  protected aoRedimensionarViewport(): void {
    this.janelaTeste.atualizarViewport();
    this.janelaTermos.atualizarViewport();
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

  // === Tamanho, redimensionar (desktop) e maximizar: `JanelaMontador`, a mesma mecânica do `MontadorRolagem` ===
  private readonly janelaTermos = new JanelaMontador({
    largura: 760,
    altura: ALTURA_INICIAL,
    larguraMinima: LARGURA_MINIMA,
    alturaMinima: ALTURA_MINIMA,
    posicaoInicial: POSICAO_INICIAL,
  });
  private readonly janelaTeste = new JanelaMontador({
    largura: 520,
    altura: 728,
    larguraMinima: LARGURA_MINIMA,
    alturaMinima: ALTURA_MINIMA,
    posicaoInicial: POSICAO_INICIAL,
  });
  protected get janela(): JanelaMontador {
    return this.modoAtual() === 'TESTE' ? this.janelaTeste : this.janelaTermos;
  }

  protected alternarMaximizar(): void {
    this.janela.alternarMaximizar(this.painelRef());
  }

  protected aoMoverPonteiroRedimensionar(evento: PointerEvent): void {
    this.janela.moverRedimensionamento(evento, this.painelRef());
  }
}
