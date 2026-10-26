import { Component, computed, effect, input, linkedSignal, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  expandirAtalhosDano,
  montarFormula,
  type FormulaTokenizadaDto,
  type PecaFormulaDto,
} from '@contratados-rpg/shared/regras/rolagem';
import { Botao } from '../ui/botao/botao.component';
import { Campo } from '../ui/campo/campo.component';
import { EstadoVazio } from '../ui/estado-vazio/estado-vazio.component';
import { FichaTermo } from '../ui/ficha-termo/ficha-termo.component';
import { Icone, type IconeNome } from '../icone/icone.component';
import { Segmentado } from '../ui/segmentado/segmentado.component';
import { SegmentadoItem } from '../ui/segmentado/segmentado-item.component';
import { StepInput } from '../ui/stepper/step-input.component';
import { Tooltip } from '../tooltip/tooltip.directive';
import {
  alterarValorPeca,
  corTipoPeca,
  lerContaPeca,
  lerValorPeca,
  rotularPeca,
  rotularValorPeca,
} from './montador-apresentacao';
import {
  avaliarExpressaoMontador,
  normalizarExpressao,
  resumirFormula,
  escreverValorExpressao,
  type AmbienteMontador,
} from './montador-leitura';
import {
  adicionarPeca,
  alterarRepeticoes,
  listarAtalhosDisponiveis,
  removerPeca,
  substituirPeca,
  type AtalhosDanoMontador,
  type MontadorModo,
} from './montador-modelo';
import {
  adicionarDadoMontador,
  ATRIBUTOS_MONTADOR,
  FACES_MONTADOR,
  lerTipoPeca,
  novaPecaFonte,
  novaPecaNumero,
  QUANTIDADE_DADOS_MONTADOR,
  REPETICOES_MONTADOR,
  tipoPadraoDoModo,
  TIPOS_DANO_MONTADOR,
} from './montador-pecas';
import { MontadorEditorTermo } from './montador-editor-termo.component';

const ICONES: Readonly<Record<number, IconeNome>> = {
  3: 'd3',
  4: 'd4',
  6: 'd6',
  8: 'd8',
  10: 'd10',
  12: 'd12',
  20: 'd20',
};

/** Lista, adição e seleção; a fórmula entra pronta e cada interação devolve somente seu novo texto. */
@Component({
  selector: 'app-montador-editor-termos',
  imports: [
    Botao,
    Campo,
    EstadoVazio,
    FichaTermo,
    Icone,
    MontadorEditorTermo,
    ReactiveFormsModule,
    Segmentado,
    SegmentadoItem,
    StepInput,
    Tooltip,
  ],
  templateUrl: './montador-editor-termos.component.html',
  styleUrl: './montador-editor-termos.component.scss',
})
export class MontadorEditorTermos {
  readonly tokenizada = input.required<FormulaTokenizadaDto>();
  readonly modo = input<MontadorModo | null>(null);
  readonly ambiente = input.required<AmbienteMontador>();
  readonly atalhosDano = input<AtalhosDanoMontador>({});
  readonly editar = output<string>();
  protected readonly selecionado = linkedSignal<number, number>({
    source: () => this.tokenizada().pecas.length,
    computation: (total, anterior) => Math.max(0, Math.min(anterior?.value ?? 0, total - 1)),
  });
  protected readonly peca = computed(() => this.tokenizada().pecas[this.selecionado()] ?? null);
  protected readonly tipoNovo = computed(() => tipoPadraoDoModo(this.modo() ?? 'LIVRE'));
  protected readonly atalhos = computed(() => listarAtalhosDisponiveis(this.atalhosDano()));
  protected readonly faces = FACES_MONTADOR;
  protected readonly atributos = ATRIBUTOS_MONTADOR;
  protected readonly repeticoesMaxima = REPETICOES_MONTADOR;
  protected readonly atributo = new FormControl('FOR', { nonNullable: true });
  protected readonly expressao = new FormControl('', { nonNullable: true });
  protected readonly dadoExpressao = new FormControl(6, { nonNullable: true });
  protected readonly usoExpressao = new FormControl<'BONUS' | 'QUANTIDADE'>('BONUS', { nonNullable: true });
  private readonly textoExpressao = toSignal(this.expressao.valueChanges, { initialValue: '' });
  private readonly facesExpressao = toSignal(this.dadoExpressao.valueChanges, { initialValue: 6 });
  protected readonly uso = toSignal(this.usoExpressao.valueChanges, { initialValue: 'BONUS' });
  protected readonly avaliada = computed(() =>
    avaliarExpressaoMontador(
      this.textoExpressao(),
      this.uso() === 'BONUS' ? { tipo: 'BONUS' } : { tipo: 'QUANTIDADE', faces: this.facesExpressao() },
      this.ambiente(),
    ),
  );
  protected readonly leituraExpressao = computed(() => {
    const avaliada = this.avaliada();
    return avaliada.valida
      ? `${avaliada.texto} = ${escreverValorExpressao(avaliada, this.uso())}`
      : this.textoExpressao()
        ? avaliada.erro
        : 'Atributos, PROF, NIV, + − * / e parênteses.';
  });
  protected readonly rotular = rotularPeca;
  protected readonly tipo = lerTipoPeca;
  protected readonly cor = corTipoPeca;
  protected readonly conta = lerContaPeca;
  protected readonly valor = lerValorPeca;
  protected readonly nomeValor = rotularValorPeca;
  constructor() {
    effect(() => {
      if (this.uso() === 'QUANTIDADE') this.dadoExpressao.enable({ emitEvent: false });
      else this.dadoExpressao.disable({ emitEvent: false });
    });
  }

  protected icone(faces: number): IconeNome {
    return ICONES[faces] ?? 'dado';
  }
  protected maximo(peca: PecaFormulaDto): number {
    return peca.tipo === 'DADO' ? QUANTIDADE_DADOS_MONTADOR : 999;
  }
  protected podeValor(peca: PecaFormulaDto): boolean {
    return (
      peca.tipo === 'NUMERO' || peca.tipo === 'FONTE' || (peca.tipo === 'DADO' && peca.quantidade.tipo === 'NUMERO')
    );
  }
  protected detalhe(peca: PecaFormulaDto): string {
    if (peca.tipo === 'ATALHO')
      return this.atalhosDano()[peca.atalho === 'CORPO' ? 'corpo' : 'furtivo'] ?? 'Atalho da ficha';
    const tipo = lerTipoPeca(peca);
    const nome = (valor: typeof tipo.primeiro) =>
      TIPOS_DANO_MONTADOR.find((opcao) => opcao.tipo === valor)?.nome ?? 'Sem tipo';
    const descricao = nome(tipo.primeiro) + (tipo.segundo ? ` / ${nome(tipo.segundo)}` : '');
    if (peca.tipo === 'DADO') return descricao;
    const resumo = resumirFormula(
      expandirAtalhosDano(montarFormula({ pecas: [peca] }), this.atalhosDano()),
      this.ambiente(),
    );
    return descricao + (resumo ? ` · vale ${resumo.minimo}` : '');
  }
  protected selecionar(indice: number): void {
    this.selecionado.set(indice);
  }
  protected aoFocar(indice: number, evento: Event): void {
    if (!(evento.target as HTMLElement).closest('.ficha-termo__remover')) this.selecionar(indice);
  }
  private publicar(tokenizada: FormulaTokenizadaDto, indice?: number): void {
    if (indice !== undefined) this.selecionado.set(indice);
    this.editar.emit(montarFormula(tokenizada));
  }
  protected adicionarDado(faces: number): void {
    const atual = this.tokenizada();
    const nova = adicionarDadoMontador(atual, faces, this.tipoNovo());
    const indice =
      nova.pecas.length > atual.pecas.length
        ? nova.pecas.length - 1
        : nova.pecas.findIndex((peca, posicao) => peca !== atual.pecas[posicao]);
    this.publicar(nova, Math.max(0, indice));
  }
  protected adicionarFonte(sigla: string): void {
    this.publicar(
      adicionarPeca(this.tokenizada(), novaPecaFonte(sigla, this.tipoNovo())),
      this.tokenizada().pecas.length,
    );
  }
  protected adicionarNumero(): void {
    this.publicar(adicionarPeca(this.tokenizada(), novaPecaNumero(1, this.tipoNovo())), this.tokenizada().pecas.length);
  }
  protected adicionarAtalho(atalho: 'CORPO' | 'FURTIVO'): void {
    this.publicar(
      adicionarPeca(this.tokenizada(), { tipo: 'ATALHO', sinal: 1, atalho }),
      this.tokenizada().pecas.length,
    );
  }
  protected remover(indice: number): void {
    const selecionado = this.selecionado();
    this.publicar(
      removerPeca(this.tokenizada(), indice),
      Math.max(0, selecionado > indice ? selecionado - 1 : selecionado),
    );
  }
  protected alterarValor(indice: number, valor: number): void {
    this.publicar(substituirPeca(this.tokenizada(), indice, alterarValorPeca(this.tokenizada().pecas[indice], valor)));
  }
  protected substituir(peca: PecaFormulaDto): void {
    this.publicar(substituirPeca(this.tokenizada(), this.selecionado(), peca));
  }
  protected repetir(repeticoes: number): void {
    this.publicar(alterarRepeticoes(this.tokenizada(), repeticoes));
  }
  protected adicionarExpressao(): void {
    if (!this.avaliada().valida) return;
    const texto = normalizarExpressao(this.expressao.value);
    const tipo = this.tipoNovo();
    const destino = tipo ? { tipoDano: tipo } : {};
    const peca: PecaFormulaDto =
      this.uso() === 'BONUS'
        ? { tipo: 'CONTA', sinal: 1, texto, ...destino }
        : { tipo: 'DADO', sinal: 1, quantidade: { tipo: 'CONTA', texto }, faces: this.dadoExpressao.value, ...destino };
    this.publicar(adicionarPeca(this.tokenizada(), peca), this.tokenizada().pecas.length);
    this.expressao.setValue('');
  }
}
