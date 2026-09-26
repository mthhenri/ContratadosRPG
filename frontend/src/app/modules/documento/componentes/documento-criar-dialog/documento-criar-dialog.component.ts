import { Component, computed, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import type { DocumentoCriadoDto } from '@contratados-rpg/shared/dtos/documento';
import { TipoDocumentoEnum } from '@contratados-rpg/shared/enums';
import { DOCUMENTO_TITULO_MAXIMO } from '@contratados-rpg/shared/validators';

import { AutoFocus } from '../../../../shared/auto-focus/auto-focus.directive';
import { Icone } from '../../../../shared/icone/icone.component';
import { Botao } from '../../../../shared/ui/botao/botao.component';
import { Campo } from '../../../../shared/ui/campo/campo.component';
import { Modal } from '../../../../shared/ui/modal/modal.component';
import { Segmentado } from '../../../../shared/ui/segmentado/segmentado.component';
import { SegmentadoItem } from '../../../../shared/ui/segmentado/segmentado-item.component';
import { DocumentoService } from '../../documento.service';

/**
 * Dialog "Novo documento" (m9-04) — o mesmo `app-modal` do "Nova cena": título (`app-campo`) e o
 * tipo num `app-segmentado` (Texto | Imagem). O documento nasce **oculto** no backend; quem abre
 * o dialog decide o que fazer com o criado (`criado`): `TEXTO` abre no editor, `IMAGEM` abre
 * pedindo o arquivo.
 */
@Component({
  selector: 'app-documento-criar-dialog',
  imports: [ReactiveFormsModule, AutoFocus, Icone, Botao, Campo, Modal, Segmentado, SegmentadoItem],
  templateUrl: './documento-criar-dialog.component.html',
  styleUrl: './documento-criar-dialog.component.scss',
})
export class DocumentoCriarDialog {
  private readonly documentoService = inject(DocumentoService);
  private readonly formBuilder = inject(FormBuilder);

  readonly campanhaId = input.required<number>();

  readonly criado = output<DocumentoCriadoDto>();
  readonly fechou = output<void>();

  protected readonly tituloMaximo = DOCUMENTO_TITULO_MAXIMO;
  protected readonly tipoTexto = TipoDocumentoEnum.TEXTO;
  protected readonly tipoImagem = TipoDocumentoEnum.IMAGEM;

  /** Uma criação em voo — trava o botão para não criar dois documentos. */
  protected readonly enviando = signal(false);
  /** O mestre tentou criar: a partir daí o erro do título aparece. */
  protected readonly tentouEnviar = signal(false);

  protected readonly formulario = this.formBuilder.nonNullable.group({
    titulo: ['', [Validators.required, Validators.maxLength(DOCUMENTO_TITULO_MAXIMO)]],
    tipo: [TipoDocumentoEnum.TEXTO],
  });

  private readonly valores = toSignal(this.formulario.valueChanges, {
    initialValue: this.formulario.getRawValue(),
  });

  protected readonly tipo = computed(() => this.valores().tipo ?? TipoDocumentoEnum.TEXTO);
  protected readonly tamanhoTitulo = computed(() => (this.valores().titulo ?? '').length);

  /** Só espaços também é "vazio" — o backend recusa o título que o `trim` esvazia. */
  protected readonly erroTitulo = computed(() =>
    this.tentouEnviar() && !(this.valores().titulo ?? '').trim() ? 'Dê um título ao documento.' : '',
  );

  protected escolherTipo(tipo: TipoDocumentoEnum): void {
    this.formulario.controls.tipo.setValue(tipo);
  }

  protected criar(): void {
    this.tentouEnviar.set(true);
    const { titulo, tipo } = this.formulario.getRawValue();
    const tituloLimpo = titulo.trim();
    if (this.formulario.invalid || !tituloLimpo || this.enviando()) {
      return;
    }
    this.enviando.set(true);
    this.documentoService
      // Um `TEXTO` nasce vazio (o backend assume `''`) e é escrito no editor, já aberto.
      .criar(this.campanhaId(), { titulo: tituloLimpo, tipo })
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({ next: (documento) => this.criado.emit(documento) });
  }
}
