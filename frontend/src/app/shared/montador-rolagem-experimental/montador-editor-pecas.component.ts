import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';

import { TipoDanoEnum } from '@contratados-rpg/shared/enums';
import {
  type FormulaTokenizadaDto,
  montarFormula,
  type PecaDadoDto,
  type PecaFormulaDto,
} from '@contratados-rpg/shared/regras/rolagem';

import { Icone, type IconeNome } from '../icone/icone.component';
import { Tooltip } from '../tooltip/tooltip.directive';
import { Botao } from '../ui/botao/botao.component';
import { BotaoIcone } from '../ui/botao-icone/botao-icone.component';
import { Campo } from '../ui/campo/campo.component';
import { type FichaTermoCor, FichaTermo } from '../ui/ficha-termo/ficha-termo.component';
import { Segmentado } from '../ui/segmentado/segmentado.component';
import { SegmentadoItem } from '../ui/segmentado/segmentado-item.component';
import { StepInput } from '../ui/stepper/step-input.component';
import {
  type AmbienteMontador,
  avaliarExpressaoMontador,
  contarDadosDoPool,
  escreverValorExpressao,
  type ExpressaoAvaliada,
  normalizarExpressao,
} from './montador-leitura';
import {
  adicionarPeca,
  alterarRepeticoes,
  alternarSinalPeca,
  type AtalhosDanoMontador,
  listarAtalhosDisponiveis,
  type MontadorModo,
  removerPeca,
  substituirPeca,
} from './montador-modelo';
import {
  adicionarDadoMontador,
  alterarOpcoesDado,
  alterarQuantidadeDado,
  aplicarTipoPeca,
  ATRIBUTOS_MONTADOR,
  type CombinacaoTeste,
  type DadoExtra,
  escreverTeste,
  FACES_MONTADOR,
  fonteDaSigla,
  FONTES_EXTRA_MONTADOR,
  lerDadoExtra,
  lerManterDado,
  lerTeste,
  lerTipoPeca,
  type ManterDado,
  MARGEM_CRITICO_MAXIMA,
  nomeDaFonte,
  novaPecaFonte,
  novaPecaNumero,
  podeMontarPecas,
  QUANTIDADE_DADOS_MONTADOR,
  REPETICOES_MONTADOR,
  siglaDaFonte,
  type TesteMontador,
  TIPOS_DANO_MONTADOR,
  tipoPadraoDoModo,
} from './montador-pecas';

/** Densidade da versão: Completo deixa tudo à vista; Essencial recolhe o segundo plano. */
export type MontadorDensidade = 'COMPLETO' | 'ESSENCIAL';

/** Painéis de "+ Adicionar" do Essencial (um aberto por vez). */
type PainelTermos = 'ATRIBUTO' | 'NUMERO' | 'EXPRESSAO' | 'REPETIR' | 'ATALHOS';
type PainelTeste = 'COMBINAR' | 'DADOS' | 'BONUS' | 'OPCOES';

const ICONE_POR_FACES: Readonly<Record<number, IconeNome>> = {
  3: 'd3',
  4: 'd4',
  6: 'd6',
  8: 'd8',
  10: 'd10',
  12: 'd12',
  20: 'd20',
};

/**
 * Editor das versões **Completo** (E3.1) e **Essencial** (E3.3) do montador (`montador-exp-03`) — um componente, duas
 * densidades: mesmo estado e mesma janela, só muda o que fica à vista. Recebe as peças da fórmula (`tokenizada`, lidas
 * do texto da barra) e devolve o texto novo a cada edição (`editar`); quem guarda o Desfazer é a casca.
 *
 * Dois editores: **teste de atributo** (pool de d20 de 1–2 atributos, soma ou média, dados a mais/menos, manter
 * maior/menor, margem de crítico, Proficiência, Nível, bônus e repetição) quando as peças têm essa forma, e **termos**
 * (dano de arma e dados livres) — uma ficha por termo, cada uma com o próprio sinal e tipo. Toda regra fica no motor e
 * nas funções puras de `montador-pecas.ts`; aqui só há apresentação.
 */
@Component({
  selector: 'app-montador-editor-pecas',
  imports: [
    Botao,
    BotaoIcone,
    Campo,
    FichaTermo,
    Icone,
    NgTemplateOutlet,
    Segmentado,
    SegmentadoItem,
    StepInput,
    Tooltip,
  ],
  templateUrl: './montador-editor-pecas.component.html',
  styleUrl: './montador-editor-pecas.component.scss',
})
export class MontadorEditorPecas {
  readonly densidade = input.required<MontadorDensidade>();
  /** Peças da fórmula atual (vazia em "Dados livres" recém-escolhido). */
  readonly tokenizada = input.required<FormulaTokenizadaDto>();
  /** Modo escolhido num ponto de partida, ou `null` (fórmula vinda da barra). */
  readonly modo = input<MontadorModo | null>(null);
  readonly atalhosDano = input<AtalhosDanoMontador>({});
  readonly ambiente = input.required<AmbienteMontador>();

  /** Texto novo da fórmula a cada edição. */
  readonly editar = output<string>();

  protected readonly faces = FACES_MONTADOR;
  protected readonly atributos = ATRIBUTOS_MONTADOR;
  protected readonly fontesExtra = FONTES_EXTRA_MONTADOR;
  protected readonly tiposDano = TIPOS_DANO_MONTADOR;
  protected readonly tiposComposto = TIPOS_DANO_MONTADOR.filter((tipo) => tipo.tipo !== TipoDanoEnum.GERAL);
  protected readonly quantidadeMaxima = QUANTIDADE_DADOS_MONTADOR;
  protected readonly repeticoesMaxima = REPETICOES_MONTADOR;
  protected readonly margens = Array.from({ length: MARGEM_CRITICO_MAXIMA + 1 }, (_, indice) => indice);

  protected readonly essencial = computed(() => this.densidade() === 'ESSENCIAL');

  /** Teste de atributo lido das peças (quando o modo admite), senão `null` → editor de termos. */
  protected readonly teste = computed<TesteMontador | null>(() => {
    const modo = this.modo();
    const tokenizada = this.tokenizada();
    const termosBastam = (modo === 'DANO' || modo === 'LIVRE') && podeMontarPecas(tokenizada);
    return termosBastam ? null : lerTeste(tokenizada);
  });

  /** Tipo que uma peça nova ganha: Físico no dano de arma; sem tipo nos dados livres. */
  protected readonly tipoNovo = computed(() => tipoPadraoDoModo(this.modo() ?? 'LIVRE'));

  protected readonly atalhosDisponiveis = computed(() => listarAtalhosDisponiveis(this.atalhosDano()));

  protected readonly repeticoes = computed(() => this.tokenizada().repeticoes ?? 1);

  // ── Painéis do Essencial ─────────────────────────────────────────────────
  protected readonly painelTermos = signal<PainelTermos | null>(null);
  protected readonly painelTeste = signal<PainelTeste | null>(null);

  protected alternarPainelTermos(painel: PainelTermos): void {
    this.painelTermos.update((atual) => (atual === painel ? null : painel));
  }

  protected alternarPainelTeste(painel: PainelTeste): void {
    this.painelTeste.update((atual) => (atual === painel ? null : painel));
  }

  // ── Apresentação ─────────────────────────────────────────────────────────
  protected iconeDado(faces: number): IconeNome {
    return ICONE_POR_FACES[faces] ?? 'dado';
  }

  protected corDoTipo(tipo: TipoDanoEnum | null): FichaTermoCor | null {
    return this.tiposDano.find((item) => item.tipo === tipo)?.classe ?? null;
  }

  protected rotuloPeca(peca: PecaFormulaDto): string {
    switch (peca.tipo) {
      case 'DADO':
        return peca.quantidade.tipo === 'NUMERO'
          ? `${peca.quantidade.valor}d${peca.faces}`
          : peca.quantidade.tipo === 'FONTE'
            ? `${peca.quantidade.nome}d${peca.faces}`
            : `(${peca.quantidade.texto})d${peca.faces}`;
      case 'FONTE': {
        const escala = peca.multiplicador ? ` × ${peca.multiplicador}` : peca.divisor ? ` ÷ ${peca.divisor}` : '';
        return `${nomeDaFonte(peca.fonte)}${escala}`;
      }
      case 'NUMERO':
        return String(peca.valor);
      case 'CONTA':
        return peca.texto;
      case 'ATALHO':
        return peca.atalho === 'CORPO' ? 'Corpo a corpo' : 'Furtivo';
    }
  }

  protected valorFonte(sigla: string): number {
    const ambiente = this.ambiente();
    const fonte = fonteDaSigla(sigla);
    if (fonte === 'proficiencia') return ambiente.proficiencia ?? 0;
    if (fonte === 'nivel') return ambiente.nivel;
    return ambiente.atributos[fonte] ?? 0;
  }

  protected tipoDe(peca: PecaFormulaDto) {
    return lerTipoPeca(peca);
  }

  /** O Composto só existe sobre um primeiro tipo bloqueável (não Geral). */
  protected podeDividir(peca: PecaFormulaDto): boolean {
    const primeiro = lerTipoPeca(peca).primeiro;
    return primeiro !== null && primeiro !== TipoDanoEnum.GERAL;
  }

  protected manterDe(peca: PecaDadoDto): ManterDado {
    return lerManterDado(peca);
  }

  protected extraDe(peca: PecaDadoDto): DadoExtra {
    return lerDadoExtra(peca);
  }

  protected nomeMargem(margem: number): string {
    return margem === 0 ? 'Sem' : margem === 1 ? 'Máximo' : `${margem} maiores`;
  }

  // ── Edição de termos ─────────────────────────────────────────────────────
  private publicar(tokenizada: FormulaTokenizadaDto): void {
    this.editar.emit(montarFormula(tokenizada));
  }

  private trocarPeca(indice: number, peca: PecaFormulaDto): void {
    this.publicar(substituirPeca(this.tokenizada(), indice, peca));
  }

  protected clicarDado(faces: number): void {
    this.publicar(adicionarDadoMontador(this.tokenizada(), faces, this.tipoNovo()));
  }

  protected adicionarFonte(sigla: string): void {
    this.publicar(adicionarPeca(this.tokenizada(), novaPecaFonte(sigla, this.tipoNovo())));
  }

  protected readonly numeroNovo = signal(1);

  protected adicionarNumero(): void {
    if (this.numeroNovo() === 0) return;
    this.publicar(adicionarPeca(this.tokenizada(), novaPecaNumero(this.numeroNovo(), this.tipoNovo())));
  }

  protected adicionarAtalho(atalho: 'CORPO' | 'FURTIVO'): void {
    this.publicar(adicionarPeca(this.tokenizada(), { tipo: 'ATALHO', sinal: 1, atalho }));
  }

  protected removerTermo(indice: number): void {
    this.publicar(removerPeca(this.tokenizada(), indice));
  }

  protected alternarSinal(indice: number): void {
    this.trocarPeca(indice, alternarSinalPeca(this.tokenizada().pecas[indice]));
  }

  protected definirSinal(indice: number, sinal: 1 | -1): void {
    const peca = this.tokenizada().pecas[indice];
    if (peca.sinal !== sinal) this.trocarPeca(indice, { ...peca, sinal });
  }

  protected definirQuantidade(indice: number, valor: number): void {
    const peca = this.tokenizada().pecas[indice];
    if (peca.tipo === 'DADO') this.trocarPeca(indice, alterarQuantidadeDado(peca, valor));
  }

  protected definirValorNumero(indice: number, valor: number): void {
    const peca = this.tokenizada().pecas[indice];
    if (peca.tipo !== 'NUMERO') return;
    if (valor === 0) {
      this.removerTermo(indice);
      return;
    }
    this.trocarPeca(indice, { ...peca, sinal: valor < 0 ? -1 : 1, valor: Math.abs(valor) });
  }

  protected definirTipo(indice: number, evento: Event): void {
    const peca = this.tokenizada().pecas[indice];
    const valor = (evento.target as HTMLSelectElement).value;
    const primeiro = valor ? (valor as TipoDanoEnum) : null;
    this.trocarPeca(indice, aplicarTipoPeca(peca, { primeiro, segundo: lerTipoPeca(peca).segundo }));
  }

  protected definirSegundoTipo(indice: number, evento: Event): void {
    const peca = this.tokenizada().pecas[indice];
    const valor = (evento.target as HTMLSelectElement).value;
    const segundo = valor ? (valor as TipoDanoEnum) : null;
    this.trocarPeca(indice, aplicarTipoPeca(peca, { primeiro: lerTipoPeca(peca).primeiro, segundo }));
  }

  protected definirOpcoes(
    indice: number,
    opcoes: { manter?: ManterDado; extra?: DadoExtra; margem?: number },
  ): void {
    const peca = this.tokenizada().pecas[indice];
    if (peca.tipo === 'DADO') this.trocarPeca(indice, alterarOpcoesDado(peca, opcoes));
  }

  protected definirRepeticoes(valor: number): void {
    this.publicar(alterarRepeticoes(this.tokenizada(), valor));
  }

  // ── Campo de expressão (decisões 5 e 10) ─────────────────────────────────
  protected readonly expressao = signal('');
  protected readonly expressaoUso = signal<'QUANTIDADE' | 'BONUS'>('QUANTIDADE');
  protected readonly expressaoFaces = signal(6);

  protected readonly expressaoAvaliada = computed<ExpressaoAvaliada | null>(() => {
    if (!this.expressao().trim()) return null;
    const uso =
      this.expressaoUso() === 'QUANTIDADE'
        ? ({ tipo: 'QUANTIDADE', faces: this.expressaoFaces() } as const)
        : ({ tipo: 'BONUS' } as const);
    return avaliarExpressaoMontador(this.expressao(), uso, this.ambiente());
  });

  protected aoDigitarExpressao(evento: Event): void {
    this.expressao.set((evento.target as HTMLInputElement).value);
  }

  protected definirFacesExpressao(evento: Event): void {
    this.expressaoFaces.set(parseInt((evento.target as HTMLSelectElement).value, 10));
  }

  protected adicionarExpressao(): void {
    const avaliada = this.expressaoAvaliada();
    if (!avaliada?.valida) return;
    const texto = normalizarExpressao(this.expressao());
    const tipo = this.tipoNovo();
    const peca: PecaFormulaDto =
      this.expressaoUso() === 'QUANTIDADE'
        ? {
            tipo: 'DADO',
            sinal: 1,
            quantidade: { tipo: 'CONTA', texto },
            faces: this.expressaoFaces(),
            ...(tipo ? { tipoDano: tipo } : {}),
          }
        : { tipo: 'CONTA', sinal: 1, texto, ...(tipo ? { tipoDano: tipo } : {}) };
    this.publicar(adicionarPeca(this.tokenizada(), peca));
    this.expressao.set('');
  }

  // ── Teste de atributo ────────────────────────────────────────────────────
  private publicarTeste(mudanca: Partial<TesteMontador>): void {
    const atual = this.teste();
    if (!atual) return;
    this.publicar(escreverTeste({ ...atual, ...mudanca }));
  }

  protected escolherAtributoTeste(sigla: string): void {
    const atual = this.teste();
    if (!atual) return;
    const [, segundo] = atual.atributos;
    this.publicarTeste({ atributos: segundo && segundo !== sigla ? [sigla, segundo] : [sigla] });
  }

  protected definirCombinacao(combinacao: 'UM' | CombinacaoTeste): void {
    const atual = this.teste();
    if (!atual) return;
    const [primeiro, segundo] = atual.atributos;
    if (combinacao === 'UM') {
      this.publicarTeste({ atributos: [primeiro], combinacao: 'SOMA' });
      return;
    }
    const outro = segundo ?? ATRIBUTOS_MONTADOR.find((item) => item.sigla !== primeiro)?.sigla ?? primeiro;
    this.publicarTeste({ atributos: [primeiro, outro], combinacao });
  }

  protected escolherSegundoAtributo(evento: Event): void {
    const atual = this.teste();
    if (!atual) return;
    this.publicarTeste({ atributos: [atual.atributos[0], (evento.target as HTMLSelectElement).value] });
  }

  protected definirExtraTeste(extra: number): void {
    this.publicarTeste({ extra });
  }

  protected definirManterTeste(manter: 'MAIOR' | 'MENOR'): void {
    this.publicarTeste({ manter });
  }

  protected definirMargemTeste(margem: number): void {
    this.publicarTeste({ margem });
  }

  protected alternarFonteTeste(sigla: 'PROF' | 'NIV', ligar: boolean): void {
    this.publicarTeste(sigla === 'PROF' ? { proficiencia: ligar } : { nivel: ligar });
  }

  protected definirBonusTeste(bonus: number): void {
    this.publicarTeste({ bonus });
  }

  protected definirRepeticoesTeste(repeticoes: number): void {
    this.publicarTeste({ repeticoes });
  }

  /** Quantos d20 o teste com este atributo rola agora — o que o motor rolaria (inclusive com o atributo zerado). */
  protected d20DoAtributo(sigla: string): number {
    return contarDadosDoPool(`${sigla}d20kh1`, this.ambiente());
  }

  protected siglaDaFonte = siglaDaFonte;
  protected escreverValorExpressao = escreverValorExpressao;
}
