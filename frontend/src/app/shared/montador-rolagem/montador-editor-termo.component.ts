import { Component, computed, effect, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { TipoDanoEnum } from '@contratados-rpg/shared/enums';
import type { PecaFormulaDto } from '@contratados-rpg/shared/regras/rolagem';
import { Botao } from '../ui/botao/botao.component';
import { Campo } from '../ui/campo/campo.component';
import { Segmentado } from '../ui/segmentado/segmentado.component';
import { SegmentadoItem } from '../ui/segmentado/segmentado-item.component';
import { StepInput } from '../ui/stepper/step-input.component';
import { alterarValorPeca, lerContaPeca, lerValorPeca, rotularPeca, rotularValorPeca } from './montador-apresentacao';
import { avaliarExpressaoMontador, normalizarExpressao, type AmbienteMontador } from './montador-leitura';
import {
  alterarOpcoesDado,
  aplicarTipoPeca,
  lerDadoExtra,
  lerManterDado,
  lerTipoPeca,
  QUANTIDADE_DADOS_MONTADOR,
  TIPOS_DANO_MONTADOR,
  type DadoExtra,
  type ManterDado,
} from './montador-pecas';

const PECA_VAZIA: PecaFormulaDto = { tipo: 'NUMERO', sinal: 1, valor: 0 };

/** Inspeção de uma peça. Só emite sua substituição; não mantém uma segunda fórmula. */
@Component({
  selector: 'app-montador-editor-termo',
  imports: [Botao, Campo, ReactiveFormsModule, Segmentado, SegmentadoItem, StepInput],
  templateUrl: './montador-editor-termo.component.html',
  styleUrl: './montador-editor-termo.component.scss',
})
export class MontadorEditorTermo {
  readonly peca = input<PecaFormulaDto | null>(null);
  readonly indice = input(0);
  readonly ambiente = input.required<AmbienteMontador>();
  readonly detalhe = input('');
  readonly alterar = output<PecaFormulaDto>();
  protected readonly atual = computed(() => this.peca() ?? PECA_VAZIA);
  protected readonly tipo = computed(() => lerTipoPeca(this.atual()));
  protected readonly rotulo = computed(() => rotularPeca(this.atual(), true));
  protected readonly conta = new FormControl('', { nonNullable: true });
  private readonly textoConta = toSignal(this.conta.valueChanges, { initialValue: '' });
  protected readonly temConta = computed(() => lerContaPeca(this.atual()) !== null);
  protected readonly tipos = TIPOS_DANO_MONTADOR;
  protected readonly tiposCompostos = TIPOS_DANO_MONTADOR.filter((opcao) => opcao.tipo !== TipoDanoEnum.GERAL);
  protected readonly podeDividir = computed(
    () => this.tipo().primeiro !== null && this.tipo().primeiro !== TipoDanoEnum.GERAL,
  );
  protected readonly ehDado = computed(() => this.atual().tipo === 'DADO');
  protected readonly margem = computed(() => {
    const peca = this.atual();
    return peca.tipo === 'DADO' ? (peca.margemCritico ?? 0) : 0;
  });
  protected readonly manter = computed(() => {
    const peca = this.atual();
    return peca.tipo === 'DADO' ? lerManterDado(peca) : 'TODOS';
  });
  protected readonly extra = computed(() => {
    const peca = this.atual();
    return peca.tipo === 'DADO' ? lerDadoExtra(peca) : 'NENHUM';
  });
  protected readonly podeValor = computed(() => {
    const peca = this.atual();
    return (
      peca.tipo === 'NUMERO' || peca.tipo === 'FONTE' || (peca.tipo === 'DADO' && peca.quantidade.tipo === 'NUMERO')
    );
  });
  protected readonly valor = computed(() => lerValorPeca(this.atual()));
  protected readonly nomeValor = computed(() => rotularValorPeca(this.atual()));
  protected readonly maximo = computed(() => (this.ehDado() ? QUANTIDADE_DADOS_MONTADOR : 999));
  protected readonly avaliacao = computed(() => {
    const peca = this.atual();
    return avaliarExpressaoMontador(
      this.textoConta(),
      peca.tipo === 'DADO' ? { tipo: 'QUANTIDADE', faces: peca.faces } : { tipo: 'BONUS' },
      this.ambiente(),
    );
  });
  protected readonly erroConta = computed(() => {
    const avaliacao = this.avaliacao();
    return avaliacao.valida ? '' : avaliacao.erro;
  });
  protected readonly entradaExtra = new FormControl<DadoExtra>('NENHUM', { nonNullable: true });
  private readonly inicializar = effect(() => {
    this.conta.setValue(lerContaPeca(this.atual()) ?? '');
    this.entradaExtra.setValue(this.extra(), { emitEvent: false });
  });

  constructor() {
    this.entradaExtra.valueChanges.pipe(takeUntilDestroyed()).subscribe((extra) => this.definirOpcoes({ extra }));
  }

  protected definirValor(valor: number): void {
    this.alterar.emit(alterarValorPeca(this.atual(), valor));
  }
  protected definirSinal(sinal: 1 | -1): void {
    this.alterar.emit({ ...this.atual(), sinal });
  }
  protected definirTipo(primeiro: TipoDanoEnum | null): void {
    this.alterar.emit(aplicarTipoPeca(this.atual(), { primeiro, segundo: this.tipo().segundo }));
  }
  protected definirSegundo(segundo: TipoDanoEnum | null): void {
    this.alterar.emit(aplicarTipoPeca(this.atual(), { primeiro: this.tipo().primeiro, segundo }));
  }
  protected definirOpcoes(opcoes: { manter?: ManterDado; extra?: DadoExtra; margem?: number }): void {
    const peca = this.atual();
    if (peca.tipo === 'DADO') this.alterar.emit(alterarOpcoesDado(peca, opcoes));
  }
  protected aplicarConta(): void {
    if (!this.avaliacao().valida) return;
    const peca = this.atual();
    const texto = normalizarExpressao(this.conta.value);
    if (peca.tipo === 'CONTA') this.alterar.emit({ ...peca, texto });
    if (peca.tipo === 'DADO') this.alterar.emit({ ...peca, quantidade: { tipo: 'CONTA', texto } });
  }
}
