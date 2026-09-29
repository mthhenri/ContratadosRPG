import { Component, DestroyRef, computed, inject, input, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { Observable, Subject, filter, finalize, merge, switchMap, tap } from 'rxjs';

import type { CampanhaMembroResumoDto } from '@contratados-rpg/shared/dtos/campanha';
import type {
  DocumentoAlteradoDto,
  DocumentoBibliotecaAlteradaDto,
  DocumentoCriadoDto,
  DocumentoImagemAlteradaDto,
  DocumentoRecuperadoDto,
  DocumentoResumoDto,
} from '@contratados-rpg/shared/dtos/documento';
import { DocumentoAlteracaoEnum } from '@contratados-rpg/shared/enums';

import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { TopbarContextoService } from '../../../../core/services/topbar-contexto.service';
import { Icone } from '../../../../shared/icone/icone.component';
import { Botao } from '../../../../shared/ui/botao/botao.component';
import { ConfirmacaoService } from '../../../../shared/ui/confirmacao/confirmacao.service';
import { NotificacaoService } from '../../../../shared/ui/notificacao/notificacao.service';
import { CampanhaService } from '../../../campanha/campanha.service';
import { BibliotecaLeitoresStore } from '../../biblioteca-leitores.store';
import { BibliotecaLayout } from '../../componentes/biblioteca-layout/biblioteca-layout.component';
import { DocumentoCriarDialog } from '../../componentes/documento-criar-dialog/documento-criar-dialog.component';
import { DocumentoEdicao } from '../../componentes/documento-edicao/documento-edicao.component';
import { LeitorDocumento } from '../../componentes/leitor-documento/leitor-documento.component';
import { DocumentoService } from '../../documento.service';
import { DocumentoRevelacaoService, podeRevelarDocumento } from '../../documento-revelacao.service';
import type { TelaComRascunhoDocumento } from '../../rascunho-documento.guard';

/**
 * Biblioteca do mestre (m9-04) — todos os documentos da campanha, revelados e ocultos: criar, ler e
 * editar no próprio lugar, revelar/ocultar para a mesa, remover e reordenar.
 *
 * A composição (casca, lista com busca, painel e as duas vistas do celular) é a estrutura comum da
 * Biblioteca, `BibliotecaLayout` (m9-05), a mesma da visão da mesa; aqui entra só o que é do
 * mestre: chips de estado, setas de ordem, "Novo documento", as ações e a edição do documento
 * aberto. A edição em si (título, texto, imagem, conflito) é a `DocumentoEdicao`, a mesma do painel
 * flutuante (m9-13); a página decide quando ela abre e adota o que ela devolve.
 *
 * **Salvar explícito, sem autosave:** com o documento já revelado, cada digitação salva chegaria à
 * mesa. A edição guarda a versão otimista (`updatedDate`) de onde partiu; toda escrita do próprio
 * mestre (revelar, ocultar, trocar a imagem) avança essa versão com a que a resposta devolve —
 * senão o mestre levaria o próprio 409. Com edição aberta, as ações que mexem na versão ficam fora
 * de alcance (o cabeçalho troca por Salvar/Cancelar e as setas da lista travam), e um 409 no salvar
 * vira aviso com "Recarregar", sem descartar o rascunho.
 *
 * **Tempo real:** todo `documento:alterado` da campanha (e a reconexão) refaz a lista. Se a versão
 * do documento aberto mudou e não há edição em curso, ele é recarregado; um `REMOVIDO` do aberto
 * fecha o painel com aviso.
 *
 * **Presença de leitura (m9-10):** quem está lendo cada documento vem da `BibliotecaLeitoresStore`
 * (provida aqui, extraída para não inchar a página) e desce ao layout: chip no cartão e "Lendo agora"
 * no documento aberto. Os nomes saem da lista de membros que a casca já carregou (`membros`).
 */
@Component({
  selector: 'app-biblioteca-mestre',
  imports: [
    Icone,
    Botao,
    BibliotecaLayout,
    DocumentoCriarDialog,
    DocumentoEdicao,
    LeitorDocumento,
  ],
  templateUrl: './biblioteca-mestre.page.html',
  styleUrl: './biblioteca-mestre.page.scss',
  providers: [BibliotecaLeitoresStore],
  host: {
    '(window:beforeunload)': 'avisarRascunhoAoFechar($event)',
  },
})
export class BibliotecaMestre implements TelaComRascunhoDocumento {
  private readonly documentoService = inject(DocumentoService);
  private readonly campanhaService = inject(CampanhaService);
  private readonly tempoRealService = inject(TempoRealService);
  private readonly topbarContexto = inject(TopbarContextoService);
  private readonly confirmacaoService = inject(ConfirmacaoService);
  private readonly notificacaoService = inject(NotificacaoService);
  private readonly rotaAtiva = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly leitoresStore = inject(BibliotecaLeitoresStore);
  private readonly documentoRevelacaoService = inject(DocumentoRevelacaoService);

  /** Os membros que a casca já carregou para decidir o papel — nomes da presença de leitura. */
  readonly membros = input<readonly CampanhaMembroResumoDto[]>([]);

  protected readonly campanhaId = Number(this.rotaAtiva.snapshot.paramMap.get('campanhaId'));

  protected readonly documentos = signal<readonly DocumentoResumoDto[]>([]);
  protected readonly leitoresPorDocumento = this.leitoresStore.leitoresPorDocumento;
  protected readonly carregandoLista = signal(true);
  protected readonly campanhaNome = signal('');
  /** Uma escrita em voo — trava os controles para não repetir a mutação. */
  protected readonly emOperacao = signal(false);
  /** Dialog "Novo documento" aberto. */
  protected readonly criando = signal(false);

  /** O documento escolhido na lista — decide a vista do celular antes mesmo de ele carregar. */
  protected readonly abertoId = signal<number | null>(null);
  protected readonly aberto = signal<DocumentoRecuperadoDto | null>(null);
  protected readonly carregandoAberto = signal(false);

  protected readonly editando = signal(false);
  /** O id que este mestre remove: o eco `REMOVIDO` dele não é "removido em outra sessão". */
  private removendoId: number | null = null;

  /** A edição aberta — o rascunho vive nela. */
  private readonly edicao = viewChild(DocumentoEdicao);

  /** Pedidos de recarga da lista (depois de uma escrita, reconexão). */
  private readonly recarregar$ = new Subject<void>();

  /** Um `IMAGEM` sem arquivo não pode ser revelado (`podeRevelarDocumento`, a trava do painel). */
  protected readonly podeRevelar = computed(() => podeRevelarDocumento(this.aberto()));

  constructor() {
    this.destroyRef.onDestroy(() => this.topbarContexto.limpar());

    this.campanhaService.recuperarCampanha(this.campanhaId).subscribe({
      next: (campanha) => {
        this.campanhaNome.set(campanha.nome);
        this.topbarContexto.definir(campanha.nome);
      },
    });

    this.tempoRealService.conectar();
    this.tempoRealService.entrarSalaCampanha(this.campanhaId);
    this.destroyRef.onDestroy(() => {
      this.tempoRealService.informarLeitura(this.campanhaId, null);
      this.tempoRealService.sairSalaCampanha(this.campanhaId);
    });

    // Presença de leitura (m9-09/m9-10): informar na abertura e em cada reconexão, e o retrato.
    this.leitoresStore.iniciar(this.campanhaId, this.membros);

    merge(
      this.recarregar$,
      this.tempoRealService.documentoAlterado$.pipe(
        filter((evento) => evento.campanhaId === this.campanhaId),
        tap((evento) => this.aoAlterarDocumento(evento)),
      ),
      // `reconexao$` (P-083): só reconexões futuras à montagem, nunca uma já ocorrida antes de
      // abrir a biblioteca.
      this.tempoRealService.reconexao$,
    )
      .pipe(
        // `switchMap`: numa rajada de eventos, só a última lista vale.
        switchMap(() => this.documentoService.listar(this.campanhaId)),
        takeUntilDestroyed(),
      )
      .subscribe({ next: (documentos) => this.aplicarLista(documentos) });

    this.documentoService
      .listar(this.campanhaId)
      .pipe(finalize(() => this.carregandoLista.set(false)))
      .subscribe({ next: (documentos) => this.documentos.set(documentos) });
  }

  // ── Rascunho ────────────────────────────────────────────────────────────────

  /** Guarda de rota (`rascunhoDocumentoGuard`): sair com edição não salva pede confirmação. */
  podeSair(): boolean | Promise<boolean> {
    return this.haRascunho() ? this.confirmarDescarte() : true;
  }

  /** Fechar/recarregar a aba com edição não salva: o aviso nativo do navegador. */
  protected avisarRascunhoAoFechar(evento: BeforeUnloadEvent): void {
    if (this.haRascunho()) {
      evento.preventDefault();
    }
  }

  /** Há edição com algo diferente do salvo? A `DocumentoEdicao` lê o editor agora (P-081). */
  private haRascunho(): boolean {
    return this.editando() && (this.edicao()?.haRascunho() ?? false);
  }

  /** "Descartar alterações?" — só pergunta quando há mesmo o que perder. */
  private async confirmarDescarte(): Promise<boolean> {
    const edicao = this.edicao();
    return !this.editando() || !edicao ? true : edicao.confirmarDescarte();
  }

  // ── Lista ───────────────────────────────────────────────────────────────────

  /** Com edição não salva, pergunta antes: o documento criado abre no lugar dela. */
  protected async abrirNovoDocumento(): Promise<void> {
    if (await this.confirmarDescarte()) {
      this.sairDaEdicao();
      this.criando.set(true);
    }
  }

  protected fecharNovoDocumento(): void {
    this.criando.set(false);
  }

  /** Criado: entra na lista (oculto, no fim) e abre no editor — o `IMAGEM`, pedindo o arquivo. */
  protected aoCriarDocumento(documento: DocumentoCriadoDto): void {
    this.criando.set(false);
    this.documentos.update((documentos) => [...documentos, documento]);
    this.recarregar$.next();
    this.abertoId.set(documento.id);
    this.aberto.set(documento);
    this.iniciarEdicao();
  }

  /** A lista alterna a seleção; o fechamento preserva a confirmação de descarte. */
  protected async selecionar(id: number): Promise<void> {
    if (id === this.abertoId()) {
      await this.fecharDocumento();
      return;
    }
    await this.abrirDocumento(id);
  }

  /** A busca navega sem fechar o documento que já está aberto. */
  protected async abrirDocumento(id: number): Promise<void> {
    if (id === this.abertoId() || !(await this.confirmarDescarte())) {
      return;
    }
    this.sairDaEdicao();
    this.carregar(id);
  }

  /** "Voltar" do celular: fecha o documento e mostra a lista. */
  protected async fecharDocumento(): Promise<void> {
    if (!(await this.confirmarDescarte())) {
      return;
    }
    this.sairDaEdicao();
    this.abertoId.set(null);
    this.aberto.set(null);
  }

  /**
   * Sobe (`-1`) ou desce (`+1`) um documento uma posição. O backend exige a lista **inteira**
   * (m9-02), então a troca é feita sobre ela e enviada completa.
   */
  protected mover(documento: DocumentoResumoDto, deslocamento: -1 | 1): void {
    const ordem = this.documentos().map((item) => item.id);
    const origem = ordem.indexOf(documento.id);
    const destino = origem + deslocamento;
    if (origem < 0 || destino < 0 || destino >= ordem.length || this.bloqueado()) {
      return;
    }
    [ordem[origem], ordem[destino]] = [ordem[destino], ordem[origem]];
    this.executar(this.documentoService.reordenar(this.campanhaId, ordem), (documentos) =>
      this.aplicarLista(documentos),
    );
  }

  /** Setas e ações de versão travam com escrita em voo ou edição aberta (versão otimista). */
  protected bloqueado(): boolean {
    return this.emOperacao() || this.editando();
  }

  // ── Documento aberto ───────────────────────────────────────────────────────

  /** A regra (trava, chamada e toast) é a do `DocumentoRevelacaoService`, a mesma do painel. */
  protected alternarRevelacao(): void {
    const documento = this.aberto();
    if (!documento || this.bloqueado()) {
      return;
    }
    this.executar(this.documentoRevelacaoService.alternar(documento), (resposta) =>
      this.aplicarNoAberto(resposta.id, {
        revelado: resposta.revelado,
        updatedDate: resposta.updatedDate,
      }),
    );
  }

  protected async remover(): Promise<void> {
    const documento = this.aberto();
    if (!documento || this.bloqueado()) {
      return;
    }
    const confirmado = await this.confirmacaoService.confirmar({
      titulo: 'Remover documento',
      mensagem: `Remover ${documento.titulo}? Ele sai da biblioteca e da vista da mesa. Esta ação não pode ser desfeita.`,
      entidade: documento.titulo,
      rotuloConfirmar: 'Remover',
    });
    if (!confirmado) {
      return;
    }
    this.removendoId = documento.id;
    this.executar(this.documentoService.remover(documento.id), () => {
      this.documentos.update((documentos) => documentos.filter((item) => item.id !== documento.id));
      if (this.abertoId() === documento.id) {
        this.abertoId.set(null);
        this.aberto.set(null);
      }
      this.notificacaoService.notificar({
        severidade: 'sucesso',
        resumo: 'Documento removido',
        detalhe: documento.titulo,
      });
    });
  }

  protected iniciarEdicao(): void {
    if (this.aberto()) {
      this.editando.set(true);
    }
  }

  /** Salvo pela edição: adota a versão devolvida no aberto e no resumo, e fecha a edição. */
  protected aoSalvarDocumento(alterado: DocumentoAlteradoDto): void {
    if (this.abertoId() === alterado.id) {
      this.aberto.set(alterado);
      this.sairDaEdicao();
    }
    this.documentos.update((documentos) =>
      documentos.map((item) =>
        item.id === alterado.id
          ? { ...item, titulo: alterado.titulo, updatedDate: alterado.updatedDate }
          : item,
      ),
    );
  }

  /** Imagem enviada pela edição: a URL e a versão novas valem para o aberto e o resumo. */
  protected aoEnviarImagem(resposta: DocumentoImagemAlteradaDto): void {
    this.aplicarNoAberto(resposta.id, {
      imagemUrl: resposta.imagemUrl,
      updatedDate: resposta.updatedDate,
    });
  }

  /** "Recarregar" do conflito: a edição recomeça sobre a versão atual, que o aberto adota. */
  protected aoRecarregarVersao(documento: DocumentoRecuperadoDto): void {
    if (this.abertoId() === documento.id) {
      this.aberto.set(documento);
    }
  }

  // ── Internos ────────────────────────────────────────────────────────────────

  private carregar(id: number): void {
    this.abertoId.set(id);
    this.aberto.set(null);
    this.carregandoAberto.set(true);
    this.documentoService
      .recuperar(id)
      .pipe(finalize(() => this.carregandoAberto.set(false)))
      .subscribe({
        next: (documento) => {
          if (this.abertoId() === documento.id) {
            this.aberto.set(documento);
          }
        },
        error: () => {
          if (this.abertoId() === id) {
            this.abertoId.set(null);
          }
        },
      });
  }

  protected sairDaEdicao(): void {
    this.editando.set(false);
  }

  /** Resposta de uma escrita do próprio mestre: adota a versão nova no aberto e no resumo. */
  private aplicarNoAberto(
    id: number,
    alteracao: Partial<Pick<DocumentoRecuperadoDto, 'revelado' | 'imagemUrl' | 'updatedDate'>>,
  ): void {
    this.aberto.update((documento) =>
      documento && documento.id === id ? { ...documento, ...alteracao } : documento,
    );
    this.documentos.update((documentos) =>
      documentos.map((item) => (item.id === id ? { ...item, ...alteracao } : item)),
    );
  }

  /**
   * Nova lista (evento, reconexão, reordenação). A versão do aberto mudou por fora e não há edição?
   * Recarrega o conteúdo. Com edição, nada: vale o 409 no salvar.
   */
  private aplicarLista(documentos: readonly DocumentoResumoDto[]): void {
    this.documentos.set(documentos);
    const aberto = this.aberto();
    if (!aberto || this.editando() || this.carregandoAberto()) {
      return;
    }
    const resumo = documentos.find((item) => item.id === aberto.id);
    if (resumo && resumo.updatedDate !== aberto.updatedDate) {
      this.carregar(aberto.id);
    }
  }

  private aoAlterarDocumento(evento: DocumentoBibliotecaAlteradaDto): void {
    if (
      evento.alteracao !== DocumentoAlteracaoEnum.REMOVIDO ||
      evento.documentoId === null ||
      evento.documentoId !== this.abertoId() ||
      evento.documentoId === this.removendoId
    ) {
      return;
    }
    this.sairDaEdicao();
    this.abertoId.set(null);
    this.aberto.set(null);
    this.notificacaoService.notificar({
      severidade: 'aviso',
      resumo: 'Documento removido',
      detalhe: 'O documento aberto foi removido em outra sessão.',
    });
  }

  /** Trava os controles enquanto a chamada está em voo e destrava no fim, dê certo ou não. */
  private executar<T>(chamada: Observable<T>, aoConcluir: (resultado: T) => void): void {
    this.emOperacao.set(true);
    chamada.pipe(finalize(() => this.emOperacao.set(false))).subscribe({ next: aoConcluir });
  }
}
