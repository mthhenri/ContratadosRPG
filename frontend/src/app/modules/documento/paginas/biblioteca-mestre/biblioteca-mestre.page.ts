import { Component, DestroyRef, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Observable, Subject, filter, finalize, merge, switchMap, tap } from 'rxjs';

import type {
  DocumentoBibliotecaAlteradaDto,
  DocumentoCriadoDto,
  DocumentoRecuperadoDto,
  DocumentoResumoDto,
} from '@contratados-rpg/shared/dtos/documento';
import { DocumentoAlteracaoEnum, TipoDocumentoEnum } from '@contratados-rpg/shared/enums';
import type { StandardResponse } from '@contratados-rpg/shared/interfaces';
import {
  DOCUMENTO_CONTEUDO_MAXIMO,
  DOCUMENTO_IMAGEM_MIMES_PERMITIDOS,
  DOCUMENTO_IMAGEM_TAMANHO_MAXIMO_BYTES,
  DOCUMENTO_TITULO_MAXIMO,
} from '@contratados-rpg/shared/validators';

import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { TopbarContextoService } from '../../../../core/services/topbar-contexto.service';
import { normalizarMarkdownImportado, possuiFrontMatterYaml, validarArquivoMarkdown, type FalhaImportacaoMarkdown } from '../../../../shared/markdown/importar-markdown';
import { Icone } from '../../../../shared/icone/icone.component';
import { Botao } from '../../../../shared/ui/botao/botao.component';
import { Campo } from '../../../../shared/ui/campo/campo.component';
import { ConfirmacaoService } from '../../../../shared/ui/confirmacao/confirmacao.service';
import { EditorMarkdown } from '../../../../shared/ui/editor-markdown/editor-markdown.component';
import { NotificacaoService } from '../../../../shared/ui/notificacao/notificacao.service';
import { CampanhaService } from '../../../campanha/campanha.service';
import { BibliotecaLayout } from '../../componentes/biblioteca-layout/biblioteca-layout.component';
import { DocumentoCriarDialog } from '../../componentes/documento-criar-dialog/documento-criar-dialog.component';
import { LeitorDocumento } from '../../componentes/leitor-documento/leitor-documento.component';
import { DocumentoService } from '../../documento.service';
import type { TelaComRascunhoDocumento } from '../../rascunho-documento.guard';

/** O teto do upload em MB, para as mensagens — derivado da constante de `shared`, não repetido. */
const TAMANHO_MAXIMO_IMAGEM_MB = DOCUMENTO_IMAGEM_TAMANHO_MAXIMO_BYTES / (1024 * 1024);

/**
 * Biblioteca do mestre (m9-04) — todos os documentos da campanha, revelados e ocultos: criar, ler e
 * editar no próprio lugar, revelar/ocultar para a mesa, remover e reordenar.
 *
 * A composição (casca, lista com busca, painel e as duas vistas do celular) é a estrutura comum da
 * Biblioteca, `BibliotecaLayout` (m9-05), a mesma da visão da mesa; aqui entra só o que é do
 * mestre: chips de estado, setas de ordem, "Novo documento", as ações e a edição do documento
 * aberto.
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
 */
@Component({
  selector: 'app-biblioteca-mestre',
  imports: [
    ReactiveFormsModule,
    Icone,
    Botao,
    Campo,
    EditorMarkdown,
    BibliotecaLayout,
    DocumentoCriarDialog,
    LeitorDocumento,
  ],
  templateUrl: './biblioteca-mestre.page.html',
  styleUrl: './biblioteca-mestre.page.scss',
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

  protected readonly campanhaId = Number(this.rotaAtiva.snapshot.paramMap.get('campanhaId'));

  protected readonly tituloMaximo = DOCUMENTO_TITULO_MAXIMO;
  protected readonly conteudoMaximo = DOCUMENTO_CONTEUDO_MAXIMO;
  protected readonly mimesAceitos = DOCUMENTO_IMAGEM_MIMES_PERMITIDOS.join(',');
  protected readonly tamanhoMaximoImagemMb = TAMANHO_MAXIMO_IMAGEM_MB;

  protected readonly documentos = signal<readonly DocumentoResumoDto[]>([]);
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
  protected readonly tituloEdicao = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(DOCUMENTO_TITULO_MAXIMO)],
  });
  /** Espelho do título em edição, para o contador e o erro. */
  protected readonly tituloEditado = signal('');
  /** O rascunho do texto como o editor o propagou (debounced — ver `confirmarValor()`). */
  protected readonly conteudoEdicao = signal('');
  /**
   * No mobile, com o editor focado, a barra dele vira `position: fixed` sobre o rodapé
   * Cancelar/Salvar — diferente do Caderno/anotações da ficha, aqui o rodapé vem depois do editor
   * no fluxo da página, não dentro de um container com altura própria. Reserva o espaço da barra
   * pra ele continuar alcançável (m9-06, `biblioteca-mestre.page.scss`).
   */
  protected readonly editorFocado = signal(false);
  /** O salvar voltou 409: outra sessão alterou o documento depois que a edição começou. */
  protected readonly conflito = signal(false);
  protected readonly salvando = signal(false);
  protected readonly erroImagem = signal<string | null>(null);
  protected readonly enviandoImagem = signal(false);
  protected readonly avisoImportacao = signal<{ texto: string; erro: boolean } | null>(null);
  protected readonly importandoMarkdown = signal(false);
  /** Invalida uma leitura local pendente ao sair ou reiniciar a edição. */
  private sequenciaEdicao = 0;

  /** O id que este mestre remove: o eco `REMOVIDO` dele não é "removido em outra sessão". */
  private removendoId: number | null = null;

  private readonly editor = viewChild<EditorMarkdown>('editor');

  /** Pedidos de recarga da lista (depois de uma escrita, reconexão). */
  private readonly recarregar$ = new Subject<void>();

  protected readonly abertoEhTexto = computed(
    () => this.aberto()?.tipo === TipoDocumentoEnum.TEXTO,
  );
  protected readonly erroTitulo = computed(() =>
    this.editando() && !this.tituloEditado().trim() ? 'Dê um título ao documento.' : '',
  );
  /** Um `IMAGEM` sem arquivo não pode ser revelado (o backend recusa): o botão nasce travado. */
  protected readonly podeRevelar = computed(() => {
    const documento = this.aberto();
    return !!documento && (documento.tipo === TipoDocumentoEnum.TEXTO || !!documento.imagemUrl);
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.sequenciaEdicao++;
      this.topbarContexto.limpar();
    });
    this.tituloEdicao.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((titulo) => this.tituloEditado.set(titulo));

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

    // Presença de leitura (m9-09): o mestre fica fora do retrato, mas informar é o que lhe entrega
    // o retrato atual — na abertura e a cada reconexão (`reconexao$`, P-083), quando o backend
    // perdeu o estado. O que ele lê não importa ao retrato; a exibição é da `m9-10`.
    this.tempoRealService.informarLeitura(this.campanhaId, null);
    this.tempoRealService.reconexao$
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.tempoRealService.informarLeitura(this.campanhaId, null));

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

  /**
   * Há edição com algo diferente do salvo? Lê o texto do editor **agora** (`confirmarValor()`) —
   * o `valorChange` é debounced e perderia as últimas teclas (P-081).
   */
  private haRascunho(): boolean {
    const documento = this.aberto();
    if (!this.editando() || !documento) {
      return false;
    }
    const titulo = this.tituloEdicao.value;
    const conteudo = this.editor()?.confirmarValor() ?? this.conteudoEdicao();
    return (
      titulo !== documento.titulo ||
      (documento.tipo === TipoDocumentoEnum.TEXTO && conteudo !== (documento.conteudoMarkdown ?? ''))
    );
  }

  /** "Descartar alterações?" — só pergunta quando há mesmo o que perder. */
  private async confirmarDescarte(): Promise<boolean> {
    if (!this.haRascunho()) {
      return true;
    }
    return this.confirmacaoService.confirmar({
      titulo: 'Descartar alterações?',
      mensagem: `As alterações em ${this.aberto()?.titulo ?? ''} ainda não foram salvas.`,
      entidade: this.aberto()?.titulo,
      rotuloConfirmar: 'Descartar',
      rotuloCancelar: 'Continuar editando',
    });
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

  protected alternarRevelacao(): void {
    const documento = this.aberto();
    if (!documento || this.bloqueado() || (!documento.revelado && !this.podeRevelar())) {
      return;
    }
    const chamada = documento.revelado
      ? this.documentoService.ocultar(documento.id)
      : this.documentoService.revelar(documento.id);
    this.executar<{ id: number; revelado: boolean; updatedDate: string }>(chamada, (resposta) => {
      this.aplicarNoAberto(resposta.id, {
        revelado: resposta.revelado,
        updatedDate: resposta.updatedDate,
      });
      this.notificacaoService.notificar({
        severidade: 'sucesso',
        resumo: resposta.revelado ? 'Revelado para a mesa' : 'Oculto',
        detalhe: resposta.revelado
          ? `${documento.titulo} já aparece para os jogadores.`
          : `${documento.titulo} saiu da vista dos jogadores.`,
      });
    });
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
    const documento = this.aberto();
    if (!documento) {
      return;
    }
    this.sequenciaEdicao++;
    this.avisoImportacao.set(null);
    this.importandoMarkdown.set(false);
    this.tituloEdicao.reset(documento.titulo);
    this.tituloEditado.set(documento.titulo);
    this.conteudoEdicao.set(documento.conteudoMarkdown ?? '');
    this.conflito.set(false);
    this.erroImagem.set(null);
    this.editorFocado.set(false);
    this.editando.set(true);
  }

  protected async cancelarEdicao(): Promise<void> {
    if (await this.confirmarDescarte()) {
      this.sairDaEdicao();
    }
  }

  /** Salvar lê o texto do editor **antes** de enviar (`confirmarValor()`, P-081). */
  protected salvar(): void {
    const documento = this.aberto();
    if (!documento || this.salvando() || this.conflito()) {
      return;
    }
    const titulo = this.tituloEdicao.value.trim();
    const conteudoMarkdown =
      documento.tipo === TipoDocumentoEnum.TEXTO
        ? (this.editor()?.confirmarValor() ?? this.conteudoEdicao())
        : null;
    if (!titulo || this.tituloEdicao.invalid) {
      return;
    }
    if (
      titulo === documento.titulo &&
      (conteudoMarkdown ?? null) === (documento.conteudoMarkdown ?? null)
    ) {
      this.sairDaEdicao();
      return;
    }
    this.salvando.set(true);
    this.documentoService
      .alterar({ id: documento.id, titulo, conteudoMarkdown, updatedDate: documento.updatedDate })
      .pipe(finalize(() => this.salvando.set(false)))
      .subscribe({
        next: (alterado) => {
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
          this.notificacaoService.notificar({
            severidade: 'sucesso',
            resumo: 'Documento salvo',
            detalhe: alterado.revelado
              ? `${alterado.titulo} — a mesa já vê esta versão.`
              : alterado.titulo,
          });
        },
        error: (erro: unknown) => {
          if (erro instanceof HttpErrorResponse && erro.status === HttpStatusCode.Conflict) {
            this.conflito.set(true);
          }
        },
      });
  }

  /**
   * "Recarregar" do aviso de conflito — o mestre pediu: traz a versão atual e reabre a edição sobre
   * ela, descartando o rascunho.
   */
  protected recarregarVersao(): void {
    const id = this.abertoId();
    if (id === null) {
      return;
    }
    this.documentoService.recuperar(id).subscribe({
      next: (documento) => {
        if (this.abertoId() !== documento.id) {
          return;
        }
        this.aberto.set(documento);
        this.iniciarEdicao();
      },
    });
  }

  /** Importa somente texto local para o rascunho; persistência continua exclusiva de Salvar. */
  protected async aoSelecionarMarkdown(evento: Event): Promise<void> {
    const entrada = evento.target as HTMLInputElement;
    const arquivo = entrada.files?.[0] ?? null;
    entrada.value = '';
    if (!arquivo || !this.editando() || !this.abertoEhTexto() || this.importandoMarkdown()) return;
    const sequencia = this.sequenciaEdicao;
    this.avisoImportacao.set(null);
    const falhaArquivo = validarArquivoMarkdown(arquivo, DOCUMENTO_CONTEUDO_MAXIMO);
    if (falhaArquivo) {
      this.definirFalhaImportacao(falhaArquivo);
      return;
    }
    this.importandoMarkdown.set(true);
    try {
      const texto = await arquivo.text();
      if (sequencia !== this.sequenciaEdicao) return;
      const conteudoMarkdown = normalizarMarkdownImportado(texto);
      const falhaConteudo = validarArquivoMarkdown(arquivo, DOCUMENTO_CONTEUDO_MAXIMO, conteudoMarkdown);
      if (falhaConteudo) {
        this.definirFalhaImportacao(falhaConteudo);
        return;
      }
      const conteudoAtual = this.editor()?.confirmarValor() ?? this.conteudoEdicao();
      if (conteudoAtual.trim()) {
        const confirmado = await this.confirmacaoService.confirmar({
          titulo: 'Substituir o conteúdo?',
          mensagem: 'O texto atual do documento será trocado pelo conteúdo do arquivo. Nada é salvo até clicar em Salvar.',
          rotuloConfirmar: 'Substituir',
          rotuloCancelar: 'Cancelar',
        });
        if (!confirmado || sequencia !== this.sequenciaEdicao) return;
      }
      this.conteudoEdicao.set(conteudoMarkdown);
      this.avisoImportacao.set({
        texto: `Importado de "${arquivo.name}".${possuiFrontMatterYaml(texto) ? ' Front matter removido.' : ''} Salve para gravar.`,
        erro: false,
      });
    } catch {
      if (sequencia === this.sequenciaEdicao) {
        this.avisoImportacao.set({ texto: 'Não foi possível ler o arquivo. Tente novamente.', erro: true });
      }
    } finally {
      if (sequencia === this.sequenciaEdicao) this.importandoMarkdown.set(false);
    }
  }

  private definirFalhaImportacao(falha: FalhaImportacaoMarkdown): void {
    const textos = {
      EXTENSAO: 'Formato inválido: envie um arquivo .md',
      TAMANHO: `Arquivo maior que o limite do documento (${DOCUMENTO_CONTEUDO_MAXIMO.toLocaleString('pt-BR')} caracteres)`,
      VAZIO: 'O arquivo não tem conteúdo',
    } as const;
    this.avisoImportacao.set({ texto: textos[falha], erro: true });
  }

  /** Arquivo escolhido: valida tipo e tamanho aqui (constantes de `shared`) antes de enviar. */
  protected aoSelecionarImagem(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    const arquivo = entrada.files?.[0] ?? null;
    entrada.value = '';
    const documento = this.aberto();
    if (!arquivo || !documento || this.enviandoImagem()) {
      return;
    }
    if (!DOCUMENTO_IMAGEM_MIMES_PERMITIDOS.includes(arquivo.type)) {
      this.erroImagem.set('Formato inválido: use JPEG, PNG ou WEBP.');
      return;
    }
    if (arquivo.size > DOCUMENTO_IMAGEM_TAMANHO_MAXIMO_BYTES) {
      this.erroImagem.set(`Imagem maior que o limite permitido (${TAMANHO_MAXIMO_IMAGEM_MB} MB).`);
      return;
    }
    this.erroImagem.set(null);
    this.enviandoImagem.set(true);
    this.documentoService
      .enviarImagem(documento.id, arquivo)
      .pipe(finalize(() => this.enviandoImagem.set(false)))
      .subscribe({
        next: (resposta) =>
          this.aplicarNoAberto(resposta.id, {
            imagemUrl: resposta.imagemUrl,
            updatedDate: resposta.updatedDate,
          }),
        error: (erro: unknown) => {
          const resposta =
            erro instanceof HttpErrorResponse ? (erro.error as StandardResponse | null) : null;
          this.erroImagem.set(resposta?.mensagem ?? 'Não foi possível enviar a imagem.');
        },
      });
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

  private sairDaEdicao(): void {
    this.sequenciaEdicao++;
    this.avisoImportacao.set(null);
    this.importandoMarkdown.set(false);
    this.editando.set(false);
    this.conflito.set(false);
    this.erroImagem.set(null);
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
