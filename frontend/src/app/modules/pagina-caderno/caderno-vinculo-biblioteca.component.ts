import { Component, DestroyRef, effect, inject, input, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Botao } from '../../shared/ui/botao/botao.component';
import { EstadoVazio } from '../../shared/ui/estado-vazio/estado-vazio.component';
import { Esqueleto } from '../../shared/ui/esqueleto/esqueleto.component';
import { Modal } from '../../shared/ui/modal/modal.component';
import type { EditorMarkdownSelecao } from '../../shared/ui/editor-markdown/editor-markdown.component';
import { BibliotecaLeituraStore } from '../documento/biblioteca-leitura.store';
import { DocumentoService } from '../documento/documento.service';
import { BuscaDocumentos } from '../documento/componentes/busca-documentos/busca-documentos.component';
import { ListaDocumentos } from '../documento/componentes/lista-documentos/lista-documentos.component';
import { LeitorDocumento } from '../documento/componentes/leitor-documento/leitor-documento.component';

export const PREFIXO_DOCUMENTO_CADERNO = '#biblioteca-documento-';

/** ID canônico do vínculo, sem aceitar URLs externas, sufixos ou inteiros inseguros. */
export function lerDocumentoDoVinculo(href: string): number | null {
  if (!/^#biblioteca-documento-[1-9]\d*$/.test(href)) return null;
  const documentoId = Number(href.slice(PREFIXO_DOCUMENTO_CADERNO.length));
  return Number.isSafeInteger(documentoId) ? documentoId : null;
}

/**
 * Operação sob demanda do Caderno: escolher um documento ou ler o vínculo existente.
 * Reutiliza a busca, os cartões, o leitor e a store da Biblioteca (incluindo revogação e
 * reconexão). Só existe enquanto o modal está aberto; não carrega documentos ao abrir o Caderno.
 * O editor permanece genérico e o Markdown guarda apenas ID e texto escrito pelo autor.
 */
@Component({
  selector: 'app-caderno-vinculo-biblioteca',
  imports: [Botao, EstadoVazio, Esqueleto, Modal, BuscaDocumentos, ListaDocumentos, LeitorDocumento],
  providers: [BibliotecaLeituraStore],
  templateUrl: './caderno-vinculo-biblioteca.component.html',
  styleUrl: './caderno-vinculo-biblioteca.component.scss',
})
export class CadernoVinculoBiblioteca {
  readonly campanhaId = input.required<number>();
  readonly ehMestre = input(false);
  readonly selecao = input<EditorMarkdownSelecao | null>(null);
  readonly documentoId = input<number | null>(null);
  readonly fechou = output<void>();

  protected readonly biblioteca = inject(BibliotecaLeituraStore);
  private readonly api = inject(DocumentoService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly buscaAtiva = signal(false);
  protected readonly validando = signal(false);
  protected readonly aviso = signal('');
  private leituraSolicitada = false;

  constructor() {
    effect(() => {
      const campanhaId = this.campanhaId();
      const mestre = this.ehMestre();
      untracked(() => this.biblioteca.iniciar(campanhaId, { mestre, informarPresenca: false }));
    });
    effect((aoLimpar) => {
      const selecao = this.selecao();
      aoLimpar(() => selecao?.cancelar());
    });
    effect(() => {
      const documentoId = this.documentoId();
      const carregando = this.biblioteca.carregandoLista();
      const documentos = this.biblioteca.documentos();
      if (documentoId === null || carregando || this.leituraSolicitada) return;
      // Mesmo um documento acessível em outra campanha não é alvo deste Caderno.
      if (!documentos.some((documento) => documento.id === documentoId)) return;
      this.leituraSolicitada = true;
      untracked(() => this.biblioteca.abrirDocumento(documentoId));
    });
  }

  protected escolher(documentoId: number): void {
    const selecao = this.selecao();
    if (!selecao || this.validando()) return;
    if (!this.biblioteca.documentos().some((documento) => documento.id === documentoId)) {
      this.aviso.set('Este documento não está mais disponível.');
      return;
    }
    this.validando.set(true);
    this.aviso.set('');
    // Revalida a permissão antes de gravar: a lista pode anteceder uma ocultação.
    this.api.recuperar(documentoId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (documento) => {
        this.validando.set(false);
        if (this.selecao() !== selecao) return;
        if (documento.campanhaId !== this.campanhaId()) {
          this.aviso.set('Este documento não está mais disponível.');
          return;
        }
        if (selecao.aplicarLink(`${PREFIXO_DOCUMENTO_CADERNO}${documentoId}`)) {
          this.fechar();
        } else {
          this.aviso.set('O trecho mudou. Selecione o trecho novamente para vinculá-lo.');
        }
      },
      error: () => {
        this.validando.set(false);
        this.aviso.set('Este documento não está mais disponível. Verifique a conexão ou escolha outro.');
      },
    });
  }

  protected fechar(): void {
    this.selecao()?.cancelar();
    this.fechou.emit();
  }
}
