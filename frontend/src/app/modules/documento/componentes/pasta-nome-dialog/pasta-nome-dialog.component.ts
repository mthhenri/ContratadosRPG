import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { DOCUMENTO_PASTA_NOME_MAXIMO } from '@contratados-rpg/shared/validators';

import { AutoFocus } from '../../../../shared/auto-focus/auto-focus.directive';
import { Botao } from '../../../../shared/ui/botao/botao.component';
import { Campo } from '../../../../shared/ui/campo/campo.component';
import { Modal } from '../../../../shared/ui/modal/modal.component';

/**
 * Dialog de nome de pasta (biblioteca-pastas) — serve a "Nova pasta" e a "Renomear pasta", só
 * muda o título, o nome inicial e o rótulo da confirmação. Mesma receita do "Novo documento"
 * (`app-modal` + `app-campo`): Enter confirma, Esc/fundo/Cancelar fecham. Não chama a API: devolve
 * o nome aparado em `confirmou`, e quem abre escreve e fecha — `enviando` trava o botão enquanto
 * a escrita está em voo.
 */
@Component({
  selector: 'app-pasta-nome-dialog',
  imports: [ReactiveFormsModule, AutoFocus, Botao, Campo, Modal],
  templateUrl: './pasta-nome-dialog.component.html',
  styleUrl: './pasta-nome-dialog.component.scss',
})
export class PastaNomeDialog implements OnInit {
  private readonly formBuilder = inject(FormBuilder);

  readonly titulo = input.required<string>();
  readonly rotuloConfirmar = input('Criar');
  readonly nomeInicial = input('');
  readonly enviando = input(false);

  readonly confirmou = output<string>();
  readonly fechou = output<void>();

  protected readonly nomeMaximo = DOCUMENTO_PASTA_NOME_MAXIMO;
  /** Tentou confirmar: a partir daí o erro do nome aparece. */
  protected readonly tentouEnviar = signal(false);

  protected readonly formulario = this.formBuilder.nonNullable.group({
    nome: ['', [Validators.required, Validators.maxLength(DOCUMENTO_PASTA_NOME_MAXIMO)]],
  });

  private readonly valores = toSignal(this.formulario.valueChanges, {
    initialValue: this.formulario.getRawValue(),
  });

  protected readonly tamanhoNome = computed(() => (this.valores().nome ?? '').length);

  /** Só espaços também é "vazio" — o backend recusa o nome que o `trim` esvazia. */
  protected readonly erroNome = computed(() =>
    this.tentouEnviar() && !(this.valores().nome ?? '').trim() ? 'Dê um nome à pasta.' : '',
  );

  ngOnInit(): void {
    this.formulario.controls.nome.setValue(this.nomeInicial());
  }

  protected confirmar(): void {
    this.tentouEnviar.set(true);
    const nome = this.formulario.getRawValue().nome.trim();
    if (this.formulario.invalid || !nome || this.enviando()) {
      return;
    }
    this.confirmou.emit(nome);
  }
}
