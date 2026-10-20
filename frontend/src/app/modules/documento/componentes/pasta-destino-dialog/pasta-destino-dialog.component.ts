import { Component, OnInit, computed, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { Botao } from '../../../../shared/ui/botao/botao.component';
import { Campo } from '../../../../shared/ui/campo/campo.component';
import { Modal } from '../../../../shared/ui/modal/modal.component';
import { Seletor, type SeletorOpcao } from '../../../../shared/ui/seletor/seletor.component';
import type { DestinoPasta } from '../../documento-arvore';

/** Valor do seletor para a raiz — o `id` `null` não cabe num `valor` de texto. */
const VALOR_RAIZ = 'raiz';

/**
 * Dialog "Mover para…" (biblioteca-pastas) — a ação equivalente ao arrastar, para o toque e para
 * quem prefere o teclado: escolhe a pasta de destino (ou a raiz) num `app-seletor`. Os destinos
 * chegam prontos (`destinosDeMovimento`, que já exclui a própria pasta, as descendentes e o que
 * estouraria o teto de profundidade); aqui só se apresenta e devolve a escolha em `confirmou`
 * (`null` = raiz). Não chama a API.
 */
@Component({
  selector: 'app-pasta-destino-dialog',
  imports: [ReactiveFormsModule, Botao, Campo, Modal, Seletor],
  templateUrl: './pasta-destino-dialog.component.html',
  styleUrl: './pasta-destino-dialog.component.scss',
})
export class PastaDestinoDialog implements OnInit {
  private readonly formBuilder = inject(FormBuilder);

  readonly titulo = input.required<string>();
  readonly destinos = input.required<readonly DestinoPasta[]>();
  /** A pasta onde o item está agora (`null` = raiz) — já vem selecionada. */
  readonly atualId = input<number | null>(null);
  readonly enviando = input(false);

  readonly confirmou = output<number | null>();
  readonly fechou = output<void>();

  protected readonly formulario = this.formBuilder.nonNullable.group({
    destino: [VALOR_RAIZ],
  });

  private readonly valores = toSignal(this.formulario.valueChanges, {
    initialValue: this.formulario.getRawValue(),
  });

  protected readonly opcoes = computed<readonly SeletorOpcao[]>(() =>
    this.destinos().map((destino) => ({
      valor: destino.id === null ? VALOR_RAIZ : String(destino.id),
      // O recuo vira travessões: o seletor mostra só texto, e a hierarquia precisa aparecer.
      rotulo: `${'– '.repeat(Math.max(0, destino.nivel - 1))}${destino.rotulo}`,
      icone: destino.id === null ? undefined : 'pasta',
    })),
  );

  /** Mesmo destino de onde o item já está: nada a fazer. */
  protected readonly semMudanca = computed(
    () => this.valores().destino === this.valorDe(this.atualId()),
  );

  ngOnInit(): void {
    this.formulario.controls.destino.setValue(this.valorDe(this.atualId()));
  }

  protected confirmar(): void {
    if (this.semMudanca() || this.enviando()) {
      return;
    }
    const valor = this.formulario.getRawValue().destino;
    this.confirmou.emit(valor === VALOR_RAIZ ? null : Number(valor));
  }

  private valorDe(id: number | null): string {
    return id === null ? VALOR_RAIZ : String(id);
  }
}
