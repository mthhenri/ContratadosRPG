import { Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Stepper / input numérico reutilizável da calculadora, em paridade com os helpers
 * `stepInput`/`stepInputFloat` do site antigo (botões − / +, clamp em [min, max], passo
 * configurável e arredondamento a 2 casas para o caso fracionário). É um
 * `ControlValueAccessor`: integra-se a Reactive Forms via `[formControl]`/`formControlName`
 * — sem `ngModel` (proibição do projeto). O valor central também aceita digitação direta.
 *
 * @example
 * ```html
 * <app-step-input [formControl]="nivel" [min]="0" [max]="20" />
 * <app-step-input [formControl]="peso" [min]="0" [passo]="0.2" ariaRotulo="Peso" />
 * ```
 */
@Component({
  selector: 'app-step-input',
  imports: [],
  templateUrl: './step-input.component.html',
  styleUrl: './step-input.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => StepInput),
      multi: true,
    },
  ],
})
export class StepInput implements ControlValueAccessor {
  /** Limite inferior (inclusivo). Sem limite por padrão. */
  readonly min = input<number>(Number.NEGATIVE_INFINITY);
  /** Limite superior (inclusivo). Sem limite por padrão. */
  readonly max = input<number>(Number.POSITIVE_INFINITY);
  /** Incremento aplicado pelos botões − / +. */
  readonly passo = input<number>(1);
  /** Rótulo acessível do campo (`aria-label`), já que o stepper não tem `<label>` próprio. */
  readonly ariaRotulo = input<string>('');

  protected readonly valor = signal<number>(0);
  protected readonly desabilitado = signal<boolean>(false);

  private aoAlterar: (valor: number) => void = () => {};
  private aoTocar: () => void = () => {};

  writeValue(valor: number | null): void {
    this.valor.set(this.normalizar(valor ?? 0));
  }

  registerOnChange(callback: (valor: number) => void): void {
    this.aoAlterar = callback;
  }

  registerOnTouched(callback: () => void): void {
    this.aoTocar = callback;
  }

  setDisabledState(desabilitado: boolean): void {
    this.desabilitado.set(desabilitado);
  }

  protected incrementar(): void {
    this.definir(this.valor() + this.passo());
  }

  protected decrementar(): void {
    this.definir(this.valor() - this.passo());
  }

  protected aoDigitar(evento: Event): void {
    const bruto = Number.parseFloat((evento.target as HTMLInputElement).value);
    this.definir(Number.isNaN(bruto) ? 0 : bruto);
  }

  protected aoSair(): void {
    this.aoTocar();
  }

  /** Limite finito ou `null` (para não emitir `min="Infinity"` no atributo do input). */
  protected get minAtributo(): number | null {
    return this.min() === Number.NEGATIVE_INFINITY ? null : this.min();
  }

  protected get maxAtributo(): number | null {
    return this.max() === Number.POSITIVE_INFINITY ? null : this.max();
  }

  private definir(candidato: number): void {
    const normalizado = this.normalizar(candidato);
    this.valor.set(normalizado);
    this.aoAlterar(normalizado);
  }

  /**
   * Arredonda a 2 casas (paridade com `stepInputFloat`; para inteiros com `passo = 1` é
   * idempotente) e clampa em [min, max].
   */
  private normalizar(valor: number): number {
    const arredondado = Math.round(valor * 100) / 100;
    return Math.min(this.max(), Math.max(this.min(), arredondado));
  }
}
