import { Component, computed, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import type { CenaTipoEnum } from '@contratados-rpg/shared/enums';
import { cenaTemIniciativa } from '@contratados-rpg/shared/regras/cena';

import { iconeTipoCena } from '../../../../shared/icone/icones-dominio';
import { Botao } from '../../../../shared/ui/botao/botao.component';
import { Campo } from '../../../../shared/ui/campo/campo.component';
import { ConfirmacaoService } from '../../../../shared/ui/confirmacao/confirmacao.service';
import { Modal } from '../../../../shared/ui/modal/modal.component';
import { Seletor, type SeletorOpcao } from '../../../../shared/ui/seletor/seletor.component';
import { TIPOS_DE_CENA, rotuloTipoCena } from '../../rotulos-cena';

/**
 * Dialog "Trocar tipo" (`cena-trocar-tipo`) — o mesmo `app-modal` e o mesmo `app-seletor` do
 * "Nova cena". Só escolhe: quem chama o backend é o painel (`EncontroPainelDadosService
 * .alterarTipoCena`), que fecha o dialog antes — a troca pode desmontar o painel inteiro, já que a
 * casca escolhe o painel pelo tipo.
 *
 * Com um combate aberto (`combateAberto`), pede confirmação antes de emitir: a troca o encerra e,
 * se o tipo novo também tem iniciativa, abre outro do zero (decisões 1 e 2 da spec).
 */
@Component({
  selector: 'app-cena-trocar-tipo-dialog',
  imports: [ReactiveFormsModule, Botao, Campo, Modal, Seletor],
  templateUrl: './cena-trocar-tipo-dialog.component.html',
  styleUrl: './cena-trocar-tipo-dialog.component.scss',
})
export class CenaTrocarTipoDialog {
  private readonly confirmacaoService = inject(ConfirmacaoService);
  private readonly formBuilder = inject(FormBuilder);

  readonly nomeCena = input.required<string>();
  readonly tipoAtual = input.required<CenaTipoEnum>();
  /** A cena tem um encontro não encerrado — a troca vai encerrá-lo. */
  readonly combateAberto = input(false);

  /** O tipo novo, já confirmado quando havia combate aberto. */
  readonly escolhido = output<CenaTipoEnum>();
  readonly fechou = output<void>();

  protected readonly opcoesTipo = computed<readonly SeletorOpcao[]>(() =>
    TIPOS_DE_CENA.map((tipo) => ({
      valor: tipo,
      rotulo: tipo === this.tipoAtual() ? `${rotuloTipoCena(tipo)} (atual)` : rotuloTipoCena(tipo),
      icone: iconeTipoCena(tipo),
      desabilitada: tipo === this.tipoAtual(),
    })),
  );

  protected readonly ajuda = computed(() =>
    this.combateAberto()
      ? 'Trocar o tipo encerra o combate atual, que vai para o histórico. Os documentos anexados continuam na cena.'
      : 'Os documentos anexados continuam na cena. Um tipo com iniciativa começa um combate novo, em montagem.',
  );

  protected readonly formulario = this.formBuilder.group({
    tipo: this.formBuilder.control<CenaTipoEnum | null>(null, Validators.required),
  });

  protected async trocar(): Promise<void> {
    const { tipo } = this.formulario.getRawValue();
    if (this.formulario.invalid || tipo === null || tipo === this.tipoAtual()) {
      return;
    }
    if (this.combateAberto()) {
      const confirmado = await this.confirmacaoService.confirmar({
        titulo: 'Trocar tipo',
        mensagem: cenaTemIniciativa(tipo)
          ? `O combate atual será encerrado e vai para o histórico. ${rotuloTipoCena(tipo)} começa um combate novo, em montagem.`
          : 'O combate atual será encerrado e vai para o histórico.',
        entidade: this.nomeCena(),
        rotuloConfirmar: 'Trocar tipo',
      });
      if (!confirmado) {
        return;
      }
    }
    this.escolhido.emit(tipo);
  }
}
