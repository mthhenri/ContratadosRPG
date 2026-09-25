import { DOCUMENT, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import type { CampanhaMembroResumoDto } from '@contratados-rpg/shared/dtos/campanha';
import type { BuscaCampanhaResultadoDto } from '@contratados-rpg/shared/dtos/pagina-caderno';
import { PAGINA_CADERNO_CONTEUDO_MAXIMO } from '@contratados-rpg/shared/validators';
import {
  BuscaCampanhaFonteEnum,
  BuscaCampanhaResultadoTipoEnum,
  TipoCampanhaMembroPapelEnum,
} from '@contratados-rpg/shared/enums';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';

import { Icone } from '../../shared/icone/icone.component';
import { Tooltip } from '../../shared/tooltip/tooltip.directive';
import { Botao } from '../../shared/ui/botao/botao.component';
import { BotaoIcone } from '../../shared/ui/botao-icone/botao-icone.component';
import { EstadoVazio } from '../../shared/ui/estado-vazio/estado-vazio.component';
import { Segmentado } from '../../shared/ui/segmentado/segmentado.component';
import { SegmentadoItem } from '../../shared/ui/segmentado/segmentado-item.component';
import { TempoRealService } from '../../core/services/tempo-real.service';
import { CadernoFlutuanteStore } from './caderno-flutuante.store';
import { EditorMarkdown } from '../../shared/ui/editor-markdown/editor-markdown.component';
import { PaginaCadernoService } from './pagina-caderno.service';
import { CadernoEsquadraoColaborativoService } from './caderno-esquadrao-colaborativo.service';
import {
  derivarTituloDeArquivo,
  normalizarMarkdownImportado,
  possuiFrontMatterYaml,
  type FalhaImportacaoMarkdown,
} from './importar-markdown';

const TAMANHO_MAXIMO_IMPORTACAO_BYTES = 1_000_000;

type ModoCaderno = 'MEU' | 'ESQUADRAO' | 'JOGADORES';

interface TrocaPaginaPendente {
  readonly paginaId: number | null;
}

/**
 * Corpo do Caderno da campanha — escopo, busca, lista de páginas e editor. Hospedado pelo painel
 * flutuante (`CadernoFlutuante`) e pela janela externa (`CadernoJanela`, I-027); quem hospeda provê
 * `CadernoFlutuanteStore` e `CadernoEsquadraoColaborativoService`, então as duas cascas leem o mesmo
 * estado que o corpo altera (status de salvamento, página aberta). `:host { display: contents }`
 * mantém os blocos como filhos diretos da coluna flexível de quem hospeda.
 */
@Component({
  selector: 'app-caderno-conteudo',
  standalone: true,
  imports: [
    Botao,
    BotaoIcone,
    DatePipe,
    EditorMarkdown,
    EstadoVazio,
    Icone,
    ReactiveFormsModule,
    Segmentado,
    SegmentadoItem,
    Tooltip,
  ],
  templateUrl: './caderno-conteudo.component.html',
  styleUrl: './caderno-conteudo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CadernoConteudo {
  readonly campanhaId = input.required<number>();
  readonly ehMestre = input.required<boolean>();
  readonly membros = input.required<readonly CampanhaMembroResumoDto[]>();
  /** Navegação lista ↔ conteúdo em vez das duas colunas — o breakpoint é de quem hospeda. */
  readonly mobile = input(false);
  /**
   * O Caderno desta campanha está aberto em janela externa e o painel local saiu da tela (I-027):
   * grava o pendente e encerra a sessão colaborativa; ao voltar, recarrega o que a janela pode ter
   * alterado.
   */
  readonly recolhido = input(false);
  readonly abrirFicha = output<number>();

  protected readonly store = inject(CadernoFlutuanteStore);
  private readonly api = inject(PaginaCadernoService);
  private readonly tempoReal = inject(TempoRealService);
  protected readonly colaboracaoEsquadrao = inject(CadernoEsquadraoColaborativoService);
  private readonly documento = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly estado = this.store.estado;
  protected readonly modoCaderno = signal<ModoCaderno>('MEU');
  protected readonly jogadorSelecionadoId = signal<number | null>(null);
  protected readonly exclusaoPendente = signal(false);
  protected readonly trocaPaginaPendente = signal<TrocaPaginaPendente | null>(null);
  protected readonly listaRecolhida = signal(false);
  protected readonly fontesSelecionadas = signal<readonly BuscaCampanhaFonteEnum[]>([]);
  protected readonly buscando = signal(false);
  protected readonly erroBusca = signal(false);
  protected readonly avisoImportacao = signal<{ texto: string; erro: boolean } | null>(null);
  private readonly termoBuscaAtual = signal('');
  /** Foco dentro do editor da página (texto ou barra de formatação). */
  protected readonly editorFocado = signal(false);
  /**
   * Escrevendo no celular: abas de escopo, busca e filtros saem da frente — com o teclado aberto
   * eles ocupavam ~290px e sobravam ~94px para o texto (medido em 360×470). Só com texto editável:
   * o mestre lendo o caderno de um jogador continua com as abas à vista. Exigir a vista de conteúdo
   * protege contra um `focusout` que não chega quando o editor some da tela (volta à lista).
   */
  protected readonly escrevendoNoCelular = computed(
    () =>
      this.mobile() &&
      this.editorFocado() &&
      !this.somenteLeitura() &&
      this.estado().vistaMobile === 'CONTEUDO',
  );
  protected readonly jogadores = computed(() =>
    this.membros().filter((membro) => membro.papel === TipoCampanhaMembroPapelEnum.JOGADOR),
  );
  protected readonly fontesPermitidas = computed<
    readonly { readonly valor: BuscaCampanhaFonteEnum; readonly rotulo: string }[]
  >(() =>
    this.ehMestre()
      ? [
          { valor: BuscaCampanhaFonteEnum.MEU_CADERNO, rotulo: 'Meu caderno' },
          { valor: BuscaCampanhaFonteEnum.CADERNO_ESQUADRAO, rotulo: 'Caderno do esquadrão' },
          {
            valor: BuscaCampanhaFonteEnum.CADERNOS_JOGADORES,
            rotulo: 'Cadernos dos jogadores',
          },
          { valor: BuscaCampanhaFonteEnum.FICHAS_CAMPANHA, rotulo: 'Fichas da campanha' },
        ]
      : [
          { valor: BuscaCampanhaFonteEnum.MEU_CADERNO, rotulo: 'Meu caderno' },
          { valor: BuscaCampanhaFonteEnum.CADERNO_ESQUADRAO, rotulo: 'Caderno do esquadrão' },
          { valor: BuscaCampanhaFonteEnum.MINHAS_FICHAS, rotulo: 'Minhas fichas' },
        ],
  );
  protected readonly somenteLeitura = computed(
    () => this.store.paginaAtiva()?.somenteLeitura ?? this.modoCaderno() === 'JOGADORES',
  );
  protected readonly formulario = new FormGroup({
    titulo: new FormControl('', { nonNullable: true }),
    conteudoMarkdown: new FormControl('', { nonNullable: true }),
  });
  protected readonly termoBusca = new FormControl('', { nonNullable: true });
  protected readonly buscaAtiva = computed(() => this.termoBuscaAtual().trim().length > 0);

  private jaRecolhido = false;
  private readonly buscaSolicitada = new Subject<{
    readonly termo: string;
    readonly fontes: readonly BuscaCampanhaFonteEnum[];
    readonly pagina: number;
  }>();

  constructor() {
    effect(() => {
      const rascunho = this.store.rascunho();
      untracked(() => this.formulario.setValue(rascunho, { emitEvent: false }));
    });
    effect(() => {
      const pagina = this.colaboracaoEsquadrao.pagina();
      if (pagina) untracked(() => this.store.refletirPaginaColaborativa(pagina));
    });
    effect(() => {
      const titulo = this.colaboracaoEsquadrao.titulo();
      const pagina = this.colaboracaoEsquadrao.pagina();
      if (!pagina) return;
      untracked(() => {
        this.formulario.controls.titulo.setValue(titulo, { emitEvent: false });
        this.store.refletirPaginaColaborativa({ ...pagina, titulo });
      });
    });
    effect(() => {
      const fontes = this.fontesPermitidas().map((fonte) => fonte.valor);
      untracked(() => this.fontesSelecionadas.set(fontes));
    });
    // Trocar de campanha não carrega o aviso de importação da anterior.
    effect(() => {
      this.campanhaId();
      untracked(() => this.avisoImportacao.set(null));
    });
    // Fechar o painel descarta uma confirmação de exclusão aberta — reabrir não a mostra de novo.
    effect(() => {
      if (!this.store.estado().aberto) untracked(() => this.exclusaoPendente.set(false));
    });
    effect(() => {
      const recolhido = this.recolhido();
      untracked(() => {
        if (recolhido) {
          this.jaRecolhido = true;
          this.suspender();
        } else if (this.jaRecolhido) {
          this.jaRecolhido = false;
          this.retomar();
        }
      });
    });
    this.formulario.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((rascunho) =>
        this.modoCaderno() === 'ESQUADRAO'
          ? this.colaboracaoEsquadrao.definirTitulo(rascunho.titulo ?? '')
          : this.store.alterarRascunho({
              titulo: rascunho.titulo ?? '',
              conteudoMarkdown: rascunho.conteudoMarkdown ?? '',
            }),
      );
    this.termoBusca.valueChanges
      .pipe(
        tap((termo) => this.termoBuscaAtual.set(termo)),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.solicitarBusca(1));
    this.buscaSolicitada
      .pipe(
        switchMap(({ termo, fontes, pagina }) => {
          this.buscando.set(true);
          this.erroBusca.set(false);
          return this.api
            .buscarCampanha({
              campanhaId: this.campanhaId(),
              termo,
              fontes,
              pagina,
              limite: 20,
            })
            .pipe(
              catchError(() => {
                this.erroBusca.set(true);
                return of({ itens: [], totalItens: 0, paginaAtual: 1, totalPaginas: 0 });
              }),
            );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((resultado) => {
        this.buscando.set(false);
        this.store.definirResultados(resultado);
      });
    this.tempoReal.paginaEsquadraoCriada$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((pagina) => {
        if (this.modoCaderno() === 'ESQUADRAO' && pagina.campanhaId === this.campanhaId()) {
          this.store.refletirResumoColaborativo(pagina);
        }
      });
    this.tempoReal.paginaEsquadraoAlterada$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((evento) => {
        if (this.modoCaderno() === 'ESQUADRAO' && evento.campanhaId === this.campanhaId()) {
          this.store.refletirResumoColaborativo(evento.pagina);
        }
      });
    this.tempoReal.paginaEsquadraoExcluida$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((evento) => {
        if (this.modoCaderno() === 'ESQUADRAO' && evento.campanhaId === this.campanhaId()) {
          this.store.removerPaginaColaborativa(evento.paginaId);
        }
      });
  }

  protected selecionarModo(modo: ModoCaderno): void {
    if (modo === this.modoCaderno()) return;
    this.store.salvarAgora();
    this.modoCaderno.set(modo);
    this.jogadorSelecionadoId.set(null);
    this.exclusaoPendente.set(false);
    this.avisoImportacao.set(null);
    this.colaboracaoEsquadrao.fechar();
    if (modo === 'MEU') this.store.carregarMeuCaderno();
    else if (modo === 'ESQUADRAO') this.carregarCadernoEsquadrao();
    else this.store.iniciarNovaPagina();
    this.store.definirVistaMobile('LISTA');
  }

  protected selecionarJogador(evento: Event): void {
    const valor = Number((evento.target as HTMLSelectElement).value);
    this.jogadorSelecionadoId.set(Number.isInteger(valor) && valor > 0 ? valor : null);
    if (this.jogadorSelecionadoId() !== null) {
      this.store.carregarCadernoMembro(this.campanhaId(), this.jogadorSelecionadoId()!);
    }
  }

  protected selecionarPagina(id: number): void {
    this.exclusaoPendente.set(false);
    this.avisoImportacao.set(null);
    const paginaId = this.store.paginaAtiva()?.id === id ? null : id;
    if (this.store.temAlteracoesNaoSalvas()) {
      this.store.definirVistaMobile('CONTEUDO');
      this.trocaPaginaPendente.set({ paginaId });
      return;
    }
    this.executarTrocaPagina(paginaId);
  }

  protected alternarLista(): void {
    this.listaRecolhida.update((recolhida) => !recolhida);
  }

  protected iniciarNovaPagina(): void {
    this.exclusaoPendente.set(false);
    this.avisoImportacao.set(null);
    this.listaRecolhida.set(true);
    if (this.modoCaderno() === 'ESQUADRAO') {
      this.store.definirVistaMobile('CONTEUDO');
      this.colaboracaoEsquadrao.criar(this.campanhaId());
    } else this.store.iniciarNovaPagina();
    setTimeout(() => this.documento.querySelector<HTMLInputElement>('.caderno__titulo-input')?.focus());
  }

  protected async aoSelecionarArquivo(evento: Event): Promise<void> {
    const entrada = evento.target as HTMLInputElement;
    const arquivo = entrada.files?.[0] ?? null;
    entrada.value = '';
    if (!arquivo) return;
    this.avisoImportacao.set(null);
    if (!/\.(?:md|markdown)$/iu.test(arquivo.name)) {
      this.definirFalhaImportacao('EXTENSAO');
      return;
    }
    if (arquivo.size > TAMANHO_MAXIMO_IMPORTACAO_BYTES) {
      this.definirFalhaImportacao('TAMANHO');
      return;
    }
    const texto = await arquivo.text();
    const frontMatterRemovido = possuiFrontMatterYaml(texto);
    const conteudoMarkdown = normalizarMarkdownImportado(texto);
    if (conteudoMarkdown.length > PAGINA_CADERNO_CONTEUDO_MAXIMO) {
      this.definirFalhaImportacao('TAMANHO');
      return;
    }
    if (!conteudoMarkdown) {
      this.definirFalhaImportacao('VAZIO');
      return;
    }
    this.store.importarPagina({
      titulo: derivarTituloDeArquivo(arquivo.name),
      conteudoMarkdown,
    });
    this.avisoImportacao.set({
      texto: `Importado de "${arquivo.name}".${frontMatterRemovido ? ' Front matter removido.' : ''}`,
      erro: false,
    });
    setTimeout(() => this.documento.querySelector<HTMLInputElement>('.caderno__titulo-input')?.focus());
  }

  private definirFalhaImportacao(falha: FalhaImportacaoMarkdown): void {
    const textos = {
      EXTENSAO: 'Formato inválido: envie um arquivo .md',
      TAMANHO: 'Arquivo maior que o limite da página (100.000 caracteres)',
      VAZIO: 'O arquivo não tem conteúdo',
    } as const;
    this.avisoImportacao.set({ texto: textos[falha], erro: true });
  }

  protected alterarConteudoMarkdown(conteudoMarkdown: string): void {
    if (this.modoCaderno() === 'ESQUADRAO') {
      this.colaboracaoEsquadrao.definirConteudoMarkdown(conteudoMarkdown);
      const pagina = this.store.paginaAtiva();
      if (pagina) this.store.refletirPaginaColaborativa({ ...pagina, conteudoMarkdown });
      return;
    }
    this.formulario.controls.conteudoMarkdown.setValue(conteudoMarkdown);
  }

  /** Inicial exibida no indicador de presença (P-039) — nome completo vai só na tooltip. */
  protected iniciaisDoParticipante(nome: string): string {
    return nome.trim().charAt(0).toUpperCase() || '?';
  }

  protected salvar(): void {
    if (this.modoCaderno() !== 'ESQUADRAO') this.store.salvarAgora();
  }

  protected recarregarVersao(): void {
    this.store.recarregarPaginaAtiva();
  }

  protected pedirExclusao(): void {
    this.exclusaoPendente.set(true);
  }

  protected cancelarExclusao(): void {
    this.exclusaoPendente.set(false);
  }

  protected confirmarDescarteDeRascunho(): void {
    const troca = this.trocaPaginaPendente();
    if (!troca) return;
    this.trocaPaginaPendente.set(null);
    this.store.desselecionarPagina();
    this.executarTrocaPagina(troca.paginaId);
  }

  protected cancelarDescarteDeRascunho(): void {
    this.trocaPaginaPendente.set(null);
  }

  protected confirmarExclusao(): void {
    this.exclusaoPendente.set(false);
    const pagina = this.store.paginaAtiva();
    if (this.modoCaderno() === 'ESQUADRAO' && pagina) {
      this.api.excluirPaginaEsquadrao(pagina.id).subscribe({
        next: () => {
          this.colaboracaoEsquadrao.fechar();
          this.store.removerPaginaColaborativa(pagina.id);
        },
      });
      return;
    }
    this.store.excluirPaginaAtiva();
  }

  protected voltarParaPaginas(): void {
    this.store.definirVistaMobile('LISTA');
  }

  private executarTrocaPagina(paginaId: number | null): void {
    if (paginaId === null) {
      this.colaboracaoEsquadrao.fechar();
      this.store.desselecionarPagina();
    } else if (this.modoCaderno() === 'ESQUADRAO') {
      this.store.definirVistaMobile('CONTEUDO');
      this.colaboracaoEsquadrao.abrir(paginaId);
    } else this.store.recuperarPagina(paginaId);
  }

  /** `paginaIdReaberta`: página do Esquadrão que estava aberta antes de o painel ser recolhido. */
  private carregarCadernoEsquadrao(paginaIdReaberta: number | null = null): void {
    this.api.listarPaginasEsquadrao(this.campanhaId()).subscribe({
      next: (paginas) => {
        this.store.definirPaginasColaborativas(paginas);
        if (
          paginaIdReaberta !== null &&
          this.modoCaderno() === 'ESQUADRAO' &&
          paginas.some((pagina) => pagina.id === paginaIdReaberta)
        ) {
          this.colaboracaoEsquadrao.abrir(paginaIdReaberta);
        }
      },
    });
  }

  /** Painel saindo da tela: nada fica só no rascunho local, e a presença no Esquadrão termina. */
  private suspender(): void {
    this.store.salvarAgora();
    this.exclusaoPendente.set(false);
    if (this.modoCaderno() === 'ESQUADRAO') this.colaboracaoEsquadrao.fechar();
  }

  /**
   * Painel de volta: a janela pode ter alterado as mesmas páginas e o caderno privado não tem tempo
   * real — sem recarregar, a primeira edição bateria em "Conflito de versão". Um rascunho que não
   * pôde ser salvo (página nova sem título) fica como está.
   */
  private retomar(): void {
    const campanhaId = this.store.campanhaId();
    if (campanhaId === null || this.store.temAlteracoesNaoSalvas()) return;
    const paginaId = this.store.paginaAtiva()?.id ?? null;
    if (this.modoCaderno() === 'ESQUADRAO') {
      this.carregarCadernoEsquadrao(paginaId);
      return;
    }
    if (this.modoCaderno() === 'MEU') {
      this.store.recarregarPaginas();
    } else {
      const jogadorId = this.jogadorSelecionadoId();
      if (jogadorId === null) return;
      this.store.carregarCadernoMembro(campanhaId, jogadorId);
    }
    if (paginaId !== null) this.store.recuperarPagina(paginaId);
  }

  protected fonteSelecionada(fonte: BuscaCampanhaFonteEnum): boolean {
    return this.fontesSelecionadas().includes(fonte);
  }

  protected alterarFonte(fonte: BuscaCampanhaFonteEnum, evento: Event): void {
    const selecionada = (evento.target as HTMLInputElement).checked;
    this.fontesSelecionadas.update((fontes) =>
      selecionada
        ? [...new Set([...fontes, fonte])]
        : fontes.filter((item) => item !== fonte),
    );
    this.solicitarBusca(1);
  }

  protected solicitarBusca(pagina: number): void {
    const termo = this.termoBusca.value.trim();
    const fontes = this.fontesSelecionadas();
    if (!termo || fontes.length === 0) {
      this.buscando.set(false);
      this.erroBusca.set(false);
      this.store.limparResultados();
      return;
    }
    this.buscaSolicitada.next({ termo, fontes, pagina });
  }

  protected selecionarResultado(resultado: BuscaCampanhaResultadoDto): void {
    if (resultado.tipo === BuscaCampanhaResultadoTipoEnum.ANOTACAO_FICHA) {
      this.abrirFicha.emit(resultado.id);
      return;
    }
    this.termoBusca.setValue('', { emitEvent: false });
    this.termoBuscaAtual.set('');
    this.store.limparResultados();
    this.store.recuperarPagina(resultado.id);
  }
}
