import { Component, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { map } from 'rxjs';

import { calcularDtAtributo } from '@contratados-rpg/shared/regras/dt';

import { AjudaCalculadora } from '../../componentes/ajuda-calculadora/ajuda-calculadora.component';
import { StepInput } from '../../componentes/step-input/step-input.component';

/** Uma linha da tabela de referência: um valor de atributo e a DT para cada nível de coluna. */
interface LinhaReferencia {
  readonly atributo: number;
  readonly valores: readonly number[];
}

/** Níveis usados como colunas da tabela de referência rápida (paridade com o site antigo). */
const NIVEIS_REFERENCIA: readonly number[] = [0, 5, 10, 15, 20];

/** Atributos usados como linhas da tabela de referência rápida. */
const ATRIBUTOS_REFERENCIA: readonly number[] = [1, 2, 3, 4, 5, 6];

/**
 * Aba "DT" (Dificuldade de Teste) da calculadora (m1-08). Formulário reativo (Nível +
 * Atributo) reusando o `StepInput` da m1-06; o resultado deriva em Signal. **Nenhuma regra de
 * jogo vive aqui**: a DT vem de `shared/regras/dt` (fonte única — SYSTEM.SPEC §6.6). Paridade
 * de saída com a aba `dt` do site antigo (`calcDT`), consumindo os tokens do tema.
 */
@Component({
  selector: 'app-dt-page',
  imports: [ReactiveFormsModule, StepInput, AjudaCalculadora],
  templateUrl: './dt.page.html',
  styleUrl: './dt.page.scss',
})
export class DtPage {
  protected readonly formulario = new FormGroup({
    nivel: new FormControl(0, { nonNullable: true }),
    atributo: new FormControl(1, { nonNullable: true }),
  });

  private readonly bruto = toSignal(
    this.formulario.valueChanges.pipe(map(() => this.formulario.getRawValue())),
    { initialValue: this.formulario.getRawValue() },
  );

  /** DT do atributo informado = 10 + Nível + (Atributo × 2). */
  protected readonly dt = computed(() => calcularDtAtributo(this.bruto()));

  protected readonly niveisReferencia = NIVEIS_REFERENCIA;

  /**
   * Tabela de referência (Atributo × Nível), calculada uma vez pelo motor — é constante, não
   * depende dos inputs. Toda célula também sai de `calcularDtAtributo` (zero fórmula no front).
   */
  protected readonly linhasReferencia: readonly LinhaReferencia[] = ATRIBUTOS_REFERENCIA.map(
    (atributo) => ({
      atributo,
      valores: NIVEIS_REFERENCIA.map((nivel) => calcularDtAtributo({ nivel, atributo })),
    }),
  );
}
