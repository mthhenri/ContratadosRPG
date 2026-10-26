import { Component, computed, effect, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { montarFormula, tokenizarFormula, type FormulaTokenizadaDto } from '@contratados-rpg/shared/regras/rolagem';
import { Campo } from '../ui/campo/campo.component';
import { Segmentado } from '../ui/segmentado/segmentado.component';
import { SegmentadoItem } from '../ui/segmentado/segmentado-item.component';
import { StepInput } from '../ui/stepper/step-input.component';
import { contarDadosDoPool, type AmbienteMontador } from './montador-leitura';
import { RECEITAS_MONTADOR, type AtalhosDanoMontador, type MontadorModo } from './montador-modelo';
import {
  ATRIBUTOS_MONTADOR,
  escreverTeste,
  fonteDaSigla,
  lerTeste,
  podeMontarPecas,
  REPETICOES_MONTADOR,
  type CombinacaoTeste,
  type TesteMontador,
} from './montador-pecas';
import { MontadorEditorTermos } from './montador-editor-termos.component';

const TESTE_INICIAL = lerTeste(tokenizarFormula(RECEITAS_MONTADOR.find((receita) => receita.modo === 'TESTE')!.formula)!)!;

/** Teste de atributo compacto; os demais modelos delegam a edição independente de termos. */
@Component({
  selector: 'app-montador-editor-pecas',
  imports: [Campo, MontadorEditorTermos, ReactiveFormsModule, Segmentado, SegmentadoItem, StepInput],
  templateUrl: './montador-editor-pecas.component.html',
  styleUrl: './montador-editor-pecas.component.scss',
})
export class MontadorEditorPecas {
  readonly tokenizada = input.required<FormulaTokenizadaDto>();
  readonly modo = input<MontadorModo | null>(null);
  readonly atalhosDano = input<AtalhosDanoMontador>({});
  readonly ambiente = input.required<AmbienteMontador>();
  readonly editar = output<string>();
  protected readonly atributos = ATRIBUTOS_MONTADOR;
  protected readonly repeticoesMaxima = REPETICOES_MONTADOR;
  protected readonly principal = new FormControl('FOR', { nonNullable: true });
  protected readonly segundo = new FormControl('VIG', { nonNullable: true });
  private readonly segundoGuardado = signal<string | null>(null);
  protected readonly teste = computed(() => {
    const modo = this.modo();
    const tokenizada = this.tokenizada();
    if (modo === 'TESTE' && tokenizada.pecas.length === 0) return TESTE_INICIAL;
    return (modo === 'DANO' || modo === 'LIVRE') && podeMontarPecas(tokenizada) ? null : lerTeste(tokenizada);
  });
  protected readonly segundoAtual = computed(() => {
    const teste = this.teste();
    const primeiro = teste?.atributos[0];
    const lembrado = teste?.atributos[1] ?? this.segundoGuardado();
    return lembrado && lembrado !== primeiro
      ? lembrado
      : this.atributos.find((opcao) => opcao.sigla !== primeiro)!.sigla;
  });
  protected readonly modoTeste = computed(() => {
    const teste = this.teste();
    return teste?.atributos.length === 1 ? 'UM' : (teste?.combinacao ?? 'SOMA');
  });
  protected readonly leituraTeste = computed(() => {
    const teste = this.teste();
    if (!teste) return '';
    const primeiro = teste.atributos[0];
    if (teste.atributos.length === 1) return `${primeiro} ${this.valorFonte(primeiro)}`;
    const segundo = teste.atributos[1];
    const soma = `${primeiro} ${this.valorFonte(primeiro)} + ${segundo} ${this.valorFonte(segundo)}`;
    return teste.combinacao === 'MEDIA' ? `(${soma}) ÷ 2, para baixo` : soma;
  });
  protected readonly dadosTeste = computed(() => {
    const teste = this.teste();
    return contarDadosDoPool(montarFormula(teste ? escreverTeste(teste) : this.tokenizada()), this.ambiente());
  });
  constructor() {
    effect(() => {
      const teste = this.teste();
      if (!teste) return;
      this.principal.setValue(teste.atributos[0], { emitEvent: false });
      this.segundo.setValue(this.segundoAtual(), { emitEvent: false });
      if (teste.atributos.length === 1) this.segundo.disable({ emitEvent: false });
      else this.segundo.enable({ emitEvent: false });
    });
    this.principal.valueChanges.pipe(takeUntilDestroyed()).subscribe((sigla) => this.escolherAtributo(sigla));
    this.segundo.valueChanges.pipe(takeUntilDestroyed()).subscribe((sigla) => {
      const teste = this.teste();
      if (!teste) return;
      this.segundoGuardado.set(sigla);
      this.publicarTeste({ atributos: [teste.atributos[0], sigla] });
    });
  }
  private publicarTeste(mudanca: Partial<TesteMontador>): void {
    const teste = this.teste();
    if (teste) this.editar.emit(montarFormula(escreverTeste({ ...teste, ...mudanca })));
  }
  private escolherAtributo(sigla: string): void {
    const teste = this.teste();
    if (!teste) return;
    const segundo = teste.atributos[1];
    this.publicarTeste({ atributos: segundo ? [sigla, segundo === sigla ? teste.atributos[0] : segundo] : [sigla] });
  }
  protected combinar(combinacao: 'UM' | CombinacaoTeste): void {
    const teste = this.teste();
    if (!teste) return;
    if (combinacao === 'UM') {
      if (teste.atributos[1]) this.segundoGuardado.set(teste.atributos[1]);
      this.publicarTeste({ atributos: [teste.atributos[0]], combinacao: 'SOMA' });
    } else this.publicarTeste({ atributos: [teste.atributos[0], this.segundoAtual()], combinacao });
  }
  protected alterarTeste(mudanca: Partial<TesteMontador>): void {
    this.publicarTeste(mudanca);
  }
  protected valorFonte(sigla: string): number {
    const ambiente = this.ambiente();
    const fonte = fonteDaSigla(sigla);
    return fonte === 'proficiencia'
      ? (ambiente.proficiencia ?? 0)
      : fonte === 'nivel'
        ? ambiente.nivel
        : (ambiente.atributos[fonte] ?? 0);
  }
}
