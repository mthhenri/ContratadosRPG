import { Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import type { CenaCriadaDto } from '@contratados-rpg/shared/dtos/cena';
import type { CenaTipoEnum } from '@contratados-rpg/shared/enums';

import { AutoFocus } from '../../../../shared/auto-focus/auto-focus.directive';
import { Botao } from '../../../../shared/ui/botao/botao.component';
import { Campo } from '../../../../shared/ui/campo/campo.component';
import { ConfirmacaoService } from '../../../../shared/ui/confirmacao/confirmacao.service';
import { Modal } from '../../../../shared/ui/modal/modal.component';
import { CenaService } from '../../cena.service';
import { TIPOS_DE_CENA, rotuloTipoCena } from '../../rotulos-cena';

/**
 * Dialog "Nova cena" (m7-23) — sucessor do "Novo combate" (`ui-38`): o mesmo `app-modal` e o mesmo
 * campo de nome, mais o `<select>` do tipo, que é **obrigatório** (a cena nasce tipada). Duas saídas:
 * "Planejar" (a cena nasce `PLANEJADA`, invisível aos jogadores) e "Abrir agora" (nasce `ATIVA`).
 *
 * Havendo cena ativa, "Abrir agora" encerra a atual no backend (m7-22) — por isso pede confirmação
 * antes de enviar. Quem decide se há cena ativa é quem abre o dialog (`haCenaAtiva`); o dialog só
 * transporta a escolha e devolve a cena criada por `criada`.
 */
@Component({
  selector: 'app-cena-criar-dialog',
  imports: [ReactiveFormsModule, AutoFocus, Botao, Campo, Modal],
  templateUrl: './cena-criar-dialog.component.html',
  styleUrl: './cena-criar-dialog.component.scss',
})
export class CenaCriarDialog {
  private readonly cenaService = inject(CenaService);
  private readonly confirmacaoService = inject(ConfirmacaoService);
  private readonly formBuilder = inject(FormBuilder);

  readonly campanhaId = input.required<number>();
  /** Há uma cena `ATIVA` na campanha — "Abrir agora" vai encerrá-la. */
  readonly haCenaAtiva = input(false);

  /** A cena foi criada — `status` diz se nasceu planejada ou ativa. */
  readonly criada = output<CenaCriadaDto>();
  readonly fechou = output<void>();

  protected readonly tipos = TIPOS_DE_CENA;
  protected readonly rotuloTipoCena = rotuloTipoCena;

  /** Uma criação em voo — trava os dois botões para não criar duas cenas. */
  protected readonly enviando = signal(false);

  protected readonly formulario = this.formBuilder.group({
    nome: this.formBuilder.nonNullable.control('', [
      Validators.required,
      Validators.maxLength(120),
    ]),
    tipo: this.formBuilder.control<CenaTipoEnum | null>(null, Validators.required),
  });

  /** Enter no nome equivale ao botão principal, "Abrir agora" (como o "Abrir combate" de antes). */
  protected enviar(): void {
    void this.criar(true);
  }

  protected async criar(ativarImediatamente: boolean): Promise<void> {
    const { nome, tipo } = this.formulario.getRawValue();
    const nomeLimpo = nome.trim();
    if (this.formulario.invalid || !nomeLimpo || tipo === null || this.enviando()) {
      return;
    }
    if (ativarImediatamente && this.haCenaAtiva()) {
      const confirmado = await this.confirmacaoService.confirmar({
        titulo: 'Abrir nova cena',
        mensagem:
          'Já há uma cena em andamento. Abrir esta agora encerra a atual — e o combate dela, se houver.',
        entidade: nomeLimpo,
        rotuloConfirmar: 'Abrir agora',
      });
      if (!confirmado) {
        return;
      }
    }
    this.enviando.set(true);
    this.cenaService
      .criarCena(this.campanhaId(), { nome: nomeLimpo, tipo, ativarImediatamente })
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({ next: (cena) => this.criada.emit(cena) });
  }
}
