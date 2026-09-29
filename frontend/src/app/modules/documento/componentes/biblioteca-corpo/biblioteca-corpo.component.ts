import { Component, computed, input, output, signal } from '@angular/core';

import type {
  DocumentoRecuperadoDto,
  DocumentoResumoDto,
} from '@contratados-rpg/shared/dtos/documento';

import { Icone } from '../../../../shared/icone/icone.component';
import { Botao } from '../../../../shared/ui/botao/botao.component';
import { Chip } from '../../../../shared/ui/chip/chip.component';
import { Esqueleto } from '../../../../shared/ui/esqueleto/esqueleto.component';
import { EstadoVazio } from '../../../../shared/ui/estado-vazio/estado-vazio.component';
import {
  NENHUM_LEITOR,
  leitoresDoDocumento,
  type DocumentoLeitoresPorDocumento,
} from '../../documento-leitores';
import { iconeTipoDocumento } from '../../documento-tipo';
import { BuscaDocumentos } from '../busca-documentos/busca-documentos.component';
import { LeitorDocumento } from '../leitor-documento/leitor-documento.component';
import {
  ListaDocumentos,
  type DocumentoMovimento,
} from '../lista-documentos/lista-documentos.component';

/**
 * Corpo da Biblioteca (m9-11) — lista (com a busca no topo) | documento aberto, extraído do
 * `BibliotecaLayout` para a página e o painel flutuante (`BibliotecaFlutuante`) montarem o mesmo
 * miolo. O host **é** o `.biblioteca__corpo` (nenhum nó novo entre a casca e a lista), então a
 * página continua com o mesmo DOM de antes da extração.
 *
 * Uma vista por vez (a lista, ou o documento com o "voltar"): no celular pela media query, como
 * sempre; no painel (`emPainel`), também pela largura da própria janela (`@container`), que pode
 * estreitar sem o viewport mudar.
 *
 * Só apresenta — o estado é de quem monta. O que muda por papel entra por input e por projeção:
 * - `[bibliotecaAcoesDocumento]`: as ações no cabeçalho do documento aberto (mestre);
 * - `[bibliotecaCorpoDocumento]`: o corpo do documento aberto — sem projeção, o `LeitorDocumento`.
 */
@Component({
  selector: 'app-biblioteca-corpo',
  imports: [
    Icone,
    Botao,
    Chip,
    Esqueleto,
    EstadoVazio,
    BuscaDocumentos,
    LeitorDocumento,
    ListaDocumentos,
  ],
  templateUrl: './biblioteca-corpo.component.html',
  styleUrl: './biblioteca-corpo.component.scss',
  host: {
    class: 'biblioteca__corpo',
    '[class.biblioteca__corpo--documento]': 'abertoId() !== null',
    '[class.biblioteca__corpo--painel]': 'emPainel()',
  },
})
export class BibliotecaCorpo {
  readonly campanhaId = input.required<number>();

  readonly documentos = input.required<readonly DocumentoResumoDto[]>();
  readonly carregandoLista = input(false);
  /** O documento escolhido — decide a vista única antes mesmo de ele carregar. */
  readonly abertoId = input<number | null>(null);
  /** O documento aberto já carregado; `null` com `abertoId` é o esqueleto do painel. */
  readonly documento = input<DocumentoRecuperadoDto | null>(null);

  /** Chip Revelado/Oculto na lista, na busca e no documento aberto — só o mestre. */
  readonly mostrarEstado = input(false);
  /**
   * Quem está lendo cada documento (m9-10) — chip "N lendo" na lista e na busca, "Lendo agora" no
   * documento aberto. Só a página do mestre passa; a mesa fica com o mapa vazio e nada aparece.
   */
  readonly leitoresPorDocumento = input<DocumentoLeitoresPorDocumento>(NENHUM_LEITOR);
  /** Setas de ordem na lista — só a página do mestre. */
  readonly ordenavel = input(false);
  readonly bloqueado = input(false);
  /** Dentro do painel flutuante: cada coluna rola por dentro e a vista única segue a janela. */
  readonly emPainel = input(false);

  readonly vazioTitulo = input.required<string>();
  readonly vazioApoio = input.required<string>();
  readonly painelVazioApoio = input.required<string>();

  readonly selecionar = output<number>();
  /** Navegação pela busca: abre sem alternar o documento já aberto. */
  readonly abrir = output<number>();
  readonly mover = output<DocumentoMovimento>();
  /** "Voltar" da vista única: quem monta fecha o documento (o mestre confirma o rascunho). */
  readonly fecharDocumento = output<void>();

  protected readonly buscaAtiva = signal(false);
  protected readonly totalBusca = signal<number | null>(null);

  protected readonly iconeTipo = iconeTipoDocumento;

  protected readonly leitoresAberto = computed(() =>
    leitoresDoDocumento(this.leitoresPorDocumento(), this.abertoId()),
  );

  /** A busca só some com a biblioteca carregada e vazia — buscar no nada não ajuda ninguém. */
  protected readonly mostrarBusca = computed(
    () => this.buscaAtiva() || this.carregandoLista() || this.documentos().length > 0,
  );
  protected readonly contagem = computed(() => {
    if (this.buscaAtiva()) {
      return this.totalBusca();
    }
    return this.carregandoLista() ? null : this.documentos().length;
  });
  /** Sem nenhum documento, o estado vazio da lista basta: o painel nem aparece. */
  protected readonly mostrarPainel = computed(
    () =>
      this.abertoId() !== null || (!this.carregandoLista() && this.documentos().length > 0),
  );
}
