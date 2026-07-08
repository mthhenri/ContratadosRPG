import { Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { map } from 'rxjs';

import { PatenteEnum } from '@contratados-rpg/shared/enums';
import { calcularPatente } from '@contratados-rpg/shared/regras/patente';

import { AjudaCalculadora } from '../../componentes/ajuda-calculadora/ajuda-calculadora.component';
import { StepInput } from '../../componentes/step-input/step-input.component';
import { EstadoAbasCalculadoraService } from '../../estado-abas-calculadora.service';
import { ROTULOS_PATENTE } from '../../rotulos';

/** Valor bruto do formulário da aba — o que o singleton preserva entre navegações (m1-17). */
interface PatenteEstadoBruto {
  prestigio: number;
}

/** Recorte de uma linha da tabela de patentes, já formatado para exibição. */
interface LinhaPatente {
  readonly patente: PatenteEnum;
  readonly nome: string;
  readonly faixa: string;
  readonly salario: string;
  readonly modificacoes: string;
  readonly atual: boolean;
}

/** Formata a faixa de Prestígio de uma patente, exibindo `∞` no teto sem limite superior. */
function formatarFaixa(prestigioMinimo: number, prestigioMaximo: number): string {
  const teto = prestigioMaximo === Number.POSITIVE_INFINITY ? '∞' : String(prestigioMaximo);
  return `${prestigioMinimo}–${teto}`;
}

/**
 * Aba "Patentes" da calculadora (m1-08). Formulário reativo (Prestígio atual) reusando o
 * `StepInput` da m1-06; a consulta deriva em Signal. **Nenhuma regra de jogo vive aqui**: a
 * patente correspondente e a tabela completa vêm de `shared/regras/patente` (fonte única —
 * SYSTEM.SPEC §6.6). Paridade de saída com a aba `patente` do site antigo (`calcPatente`),
 * consumindo os tokens do tema.
 */
@Component({
  selector: 'app-patente-page',
  imports: [ReactiveFormsModule, StepInput, AjudaCalculadora],
  templateUrl: './patente.page.html',
  styleUrl: './patente.page.scss',
})
export class PatentePage {
  private readonly estadoAbas = inject(EstadoAbasCalculadoraService);

  protected readonly formulario = new FormGroup({
    prestigio: new FormControl(0, { nonNullable: true }),
  });

  private readonly bruto = toSignal(
    this.formulario.valueChanges.pipe(map(() => this.formulario.getRawValue())),
    { initialValue: this.formulario.getRawValue() },
  );

  constructor() {
    // Preserva o estado do formulário entre navegações (m1-17): restaura ao montar (senão usa o
    // preset inicial) e grava de volta a cada mudança — só memória, sem I/O.
    const salvo = this.estadoAbas.obterEstado<PatenteEstadoBruto>('patente');
    if (salvo) {
      this.formulario.patchValue(salvo);
    }
    this.formulario.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() =>
        this.estadoAbas.definirEstado<PatenteEstadoBruto>('patente', this.formulario.getRawValue()),
      );
  }

  /**
   * Volta a aba ao estado padrão: `reset()` restaura o preset de fábrica (Prestígio 0), e o
   * `valueChanges` acima regrava o preset no singleton.
   */
  protected limpar(): void {
    this.formulario.reset();
  }

  private readonly consulta = computed(() => calcularPatente({ prestigio: this.bruto().prestigio }));

  /** Patente correspondente ao Prestígio informado, formatada para o card de destaque. */
  protected readonly atual = computed(() => {
    const patente = this.consulta().patenteAtual;
    return {
      nome: ROTULOS_PATENTE[patente.patente],
      faixa: formatarFaixa(patente.prestigioMinimo, patente.prestigioMaximo),
      salario: `$${patente.salario.toLocaleString('pt-BR')}`,
      modificacoes: patente.limiteModificacoes,
    };
  });

  /** Tabela completa de patentes, com a linha correspondente ao Prestígio marcada. */
  protected readonly linhas = computed<readonly LinhaPatente[]>(() => {
    const patenteAtual = this.consulta().patenteAtual.patente;
    return this.consulta().tabela.map((patente) => ({
      patente: patente.patente,
      nome: ROTULOS_PATENTE[patente.patente],
      faixa: formatarFaixa(patente.prestigioMinimo, patente.prestigioMaximo),
      salario: `$${patente.salario.toLocaleString('pt-BR')}`,
      modificacoes: patente.limiteModificacoes,
      atual: patente.patente === patenteAtual,
    }));
  });
}
