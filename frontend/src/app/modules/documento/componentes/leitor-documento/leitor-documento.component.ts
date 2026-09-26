import { Component, computed, effect, input, signal } from '@angular/core';

import type { DocumentoRecuperadoDto } from '@contratados-rpg/shared/dtos/documento';
import { TipoDocumentoEnum } from '@contratados-rpg/shared/enums';

import { Icone } from '../../../../shared/icone/icone.component';
import { BotaoIcone } from '../../../../shared/ui/botao-icone/botao-icone.component';
import { EditorMarkdown } from '../../../../shared/ui/editor-markdown/editor-markdown.component';
import { Esqueleto } from '../../../../shared/ui/esqueleto/esqueleto.component';
import { EstadoVazio } from '../../../../shared/ui/estado-vazio/estado-vazio.component';

/** O que o leitor precisa de um documento — o recuperado inteiro serve; a `m7-25` também o usa. */
export type DocumentoLeitura = Pick<
  DocumentoRecuperadoDto,
  'titulo' | 'tipo' | 'conteudoMarkdown' | 'imagemUrl'
>;

/** Ciclo de vida da imagem: esqueleto até o `load`, estado de erro se a URL falhar. */
type EstadoImagem = 'CARREGANDO' | 'PRONTA' | 'ERRO';

/**
 * Leitor de um documento da biblioteca (m9-04), **somente leitura** — o mesmo para o mestre, a
 * mesa (m9-05) e o palco da Investigação (m7-25).
 *
 * `TEXTO` usa o `app-editor-markdown` em `somenteLeitura`: o mesmo renderizador Milkdown do
 * Caderno, que não interpreta HTML cru — não há um segundo sanitizador aqui. `IMAGEM` mostra a
 * imagem com esqueleto até carregar e estado de erro se a URL falhar, e alterna entre **ajustar à
 * largura** (padrão) e **tamanho real**, em que o quadro rola. Sem enquadramento/foco (`m9-01`).
 */
@Component({
  selector: 'app-leitor-documento',
  imports: [Icone, BotaoIcone, EditorMarkdown, Esqueleto, EstadoVazio],
  templateUrl: './leitor-documento.component.html',
  styleUrl: './leitor-documento.component.scss',
})
export class LeitorDocumento {
  readonly documento = input.required<DocumentoLeitura>();

  protected readonly ehTexto = computed(() => this.documento().tipo === TipoDocumentoEnum.TEXTO);
  protected readonly imagemUrl = computed(() => this.documento().imagemUrl);
  protected readonly estadoImagem = signal<EstadoImagem>('CARREGANDO');
  protected readonly tamanhoReal = signal(false);

  constructor() {
    // Outra imagem (troca de documento, upload novo): volta ao esqueleto e ao ajuste à largura.
    effect(() => {
      this.imagemUrl();
      this.estadoImagem.set('CARREGANDO');
      this.tamanhoReal.set(false);
    });
  }

  protected aoCarregarImagem(): void {
    this.estadoImagem.set('PRONTA');
  }

  protected aoFalharImagem(): void {
    this.estadoImagem.set('ERRO');
  }

  protected alternarTamanho(): void {
    this.tamanhoReal.update((real) => !real);
  }
}
