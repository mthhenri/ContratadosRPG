import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import type {
  BuscaCampanhaResultadoDto,
  PaginaCadernoDto,
  PaginaCadernoResumoDto,
} from '@contratados-rpg/shared/dtos/pagina-caderno';
import type { PaginatedResult } from '@contratados-rpg/shared/interfaces';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import {
  CADERNO_ALTURA_MINIMA,
  CADERNO_AUTOSAVE_DELAY,
  CADERNO_LARGURA_MINIMA,
  CADERNO_TAMANHO_STORAGE_KEY,
  type CadernoFlutuanteEstado,
  type CadernoRascunho,
  type CadernoTamanho,
  type CadernoViewport,
  type EstadoSalvamentoCaderno,
  RASCUNHO_CADERNO_VAZIO,
  RESULTADOS_BUSCA_CADERNO_VAZIOS,
  type VistaMobileCaderno,
} from './caderno-flutuante.model';
import { PaginaCadernoService } from './pagina-caderno.service';

const TAMANHO_INICIAL: CadernoTamanho = {
  largura: 960,
  altura: 680,
};

@Injectable()
export class CadernoFlutuanteStore {
  private readonly api = inject(PaginaCadernoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly estadoInterno = signal<CadernoFlutuanteEstado>(
    criarEstadoInicial(carregarTamanho()),
  );
  private readonly campanhaIdInterno = signal<number | null>(null);
  private readonly paginasInternas = signal<PaginaCadernoResumoDto[]>([]);
  private readonly paginaAtivaInterna = signal<PaginaCadernoDto | null>(null);
  private readonly rascunhoInterno = signal<CadernoRascunho>(RASCUNHO_CADERNO_VAZIO);
  private readonly estadoSalvamentoInterno = signal<EstadoSalvamentoCaderno>('INATIVO');
  private readonly resultadosBuscaInternos =
    signal<PaginatedResult<BuscaCampanhaResultadoDto>>(RESULTADOS_BUSCA_CADERNO_VAZIOS);

  private temporizadorSalvamento: ReturnType<typeof setTimeout> | null = null;
  private salvamentoEmAndamento = false;
  private revisaoRascunho = 0;
  private revisaoEmSalvamento = 0;
  private escopoCampanha = 0;

  readonly estado = this.estadoInterno.asReadonly();
  readonly campanhaId = this.campanhaIdInterno.asReadonly();
  readonly paginas = this.paginasInternas.asReadonly();
  readonly paginaAtiva = this.paginaAtivaInterna.asReadonly();
  readonly rascunho = this.rascunhoInterno.asReadonly();
  readonly estadoSalvamento = this.estadoSalvamentoInterno.asReadonly();
  readonly resultadosBusca = this.resultadosBuscaInternos.asReadonly();

  abrir(campanhaId: number): void {
    if (this.campanhaIdInterno() !== campanhaId) {
      this.descartarCampanha();
      this.campanhaIdInterno.set(campanhaId);
      this.carregarPaginas(campanhaId);
    }
    this.estadoInterno.update((estado) => ({ ...estado, aberto: true }));
  }

  fechar(): void {
    this.salvarAgora();
    this.estadoInterno.update((estado) => ({ ...estado, aberto: false }));
  }

  selecionarPagina(pagina: PaginaCadernoDto): void {
    this.cancelarAgendamento();
    this.paginaAtivaInterna.set(pagina);
    this.rascunhoInterno.set({
      titulo: pagina.titulo,
      conteudoMarkdown: pagina.conteudoMarkdown,
    });
    this.revisaoRascunho = 0;
    this.revisaoEmSalvamento = 0;
    this.estadoSalvamentoInterno.set('INATIVO');
    this.definirVistaMobile('CONTEUDO');
  }

  /** Reflete uma página do esquadrão sem acionar o autosave do caderno privado. */
  selecionarPaginaColaborativa(pagina: PaginaCadernoDto): void {
    this.selecionarPagina(pagina);
  }

  definirPaginasColaborativas(paginas: PaginaCadernoResumoDto[]): void {
    this.limparPaginaSelecionada();
    this.paginasInternas.set(paginas);
  }

  refletirPaginaColaborativa(pagina: PaginaCadernoDto): void {
    this.paginaAtivaInterna.set(pagina);
    this.rascunhoInterno.set({ titulo: pagina.titulo, conteudoMarkdown: pagina.conteudoMarkdown });
    this.paginasInternas.update((paginas) => {
      const indice = paginas.findIndex((item) => item.id === pagina.id);
      if (indice < 0) return [pagina, ...paginas];
      return paginas.map((item) => (item.id === pagina.id ? { ...item, ...pagina } : item));
    });
  }

  removerPaginaColaborativa(id: number): void {
    this.paginasInternas.update((paginas) => paginas.filter((pagina) => pagina.id !== id));
    if (this.paginaAtivaInterna()?.id === id) this.desselecionarPagina();
  }

  refletirResumoColaborativo(pagina: PaginaCadernoResumoDto): void {
    this.paginasInternas.update((paginas) => {
      const indice = paginas.findIndex((item) => item.id === pagina.id);
      if (indice < 0) return [pagina, ...paginas];
      return paginas.map((item) => (item.id === pagina.id ? pagina : item));
    });
  }

  recuperarPagina(id: number): void {
    const escopo = this.escopoCampanha;
    this.definirVistaMobile('CONTEUDO');
    this.definirCarregando(true);
    this.api
      .recuperarPagina(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (escopo === this.escopoCampanha) this.definirCarregando(false);
        }),
      )
      .subscribe({
        next: (pagina) => {
          if (escopo === this.escopoCampanha) this.selecionarPagina(pagina);
        },
        error: () => {
          if (escopo === this.escopoCampanha) this.estadoSalvamentoInterno.set('FALHA');
        },
      });
  }

  iniciarNovaPagina(): void {
    this.cancelarAgendamento();
    this.paginaAtivaInterna.set(null);
    this.rascunhoInterno.set(RASCUNHO_CADERNO_VAZIO);
    this.revisaoRascunho = 0;
    this.revisaoEmSalvamento = 0;
    this.estadoSalvamentoInterno.set('INATIVO');
    this.definirVistaMobile('CONTEUDO');
  }

  temAlteracoesNaoSalvas(): boolean {
    const pagina = this.paginaAtivaInterna();
    const rascunho = this.rascunhoInterno();
    if (!pagina) return rascunho.titulo.length > 0 || rascunho.conteudoMarkdown.length > 0;
    return pagina.titulo !== rascunho.titulo || pagina.conteudoMarkdown !== rascunho.conteudoMarkdown;
  }

  desselecionarPagina(): void {
    this.limparPaginaSelecionada();
    this.definirVistaMobile('LISTA');
  }

  importarPagina(rascunho: CadernoRascunho): void {
    this.cancelarAgendamento();
    this.paginaAtivaInterna.set(null);
    this.rascunhoInterno.set(rascunho);
    this.revisaoRascunho = 1;
    this.revisaoEmSalvamento = 0;
    this.estadoSalvamentoInterno.set('INATIVO');
    this.definirVistaMobile('CONTEUDO');
    this.salvarAgora();
  }

  alterarRascunho(rascunho: CadernoRascunho): void {
    if (this.paginaAtivaInterna()?.somenteLeitura) return;
    this.rascunhoInterno.set(rascunho);
    this.revisaoRascunho += 1;
    this.agendarSalvamento();
  }

  salvarAgora(): void {
    this.cancelarAgendamento();
    if (this.salvamentoEmAndamento) return;

    const campanhaId = this.campanhaIdInterno();
    const pagina = this.paginaAtivaInterna();
    const rascunho = this.rascunhoInterno();
    if (
      campanhaId === null ||
      pagina?.somenteLeitura ||
      rascunho.titulo.trim().length === 0 ||
      this.revisaoRascunho === this.revisaoEmSalvamento
    ) {
      return;
    }

    const escopo = this.escopoCampanha;
    const revisao = this.revisaoRascunho;
    this.revisaoEmSalvamento = revisao;
    this.salvamentoEmAndamento = true;
    this.estadoSalvamentoInterno.set('SALVANDO');
    let salvo: PaginaCadernoDto | null = null;
    let falhou = false;
    const requisicao = pagina
      ? this.api.alterarPagina(pagina.id, {
          titulo: rascunho.titulo,
          conteudoMarkdown: rascunho.conteudoMarkdown,
          updatedDate: pagina.updatedDate,
        })
      : this.api.criarPagina(campanhaId, {
          titulo: rascunho.titulo,
          conteudoMarkdown: rascunho.conteudoMarkdown,
        });

    requisicao
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.salvamentoEmAndamento = false;
          if (escopo !== this.escopoCampanha) {
            if (this.revisaoRascunho > this.revisaoEmSalvamento) this.salvarAgora();
            return;
          }
          if (falhou) return;
          if (salvo) this.aplicarPaginaSalva(salvo);
          if (this.revisaoRascunho > revisao) this.salvarAgora();
          else this.estadoSalvamentoInterno.set('SALVO');
        }),
      )
      .subscribe({
        next: (resultado) => (salvo = resultado),
        error: (erro: unknown) => {
          falhou = true;
          if (escopo !== this.escopoCampanha) return;
          this.estadoSalvamentoInterno.set(
            erro instanceof HttpErrorResponse && erro.status === 409 ? 'CONFLITO' : 'FALHA',
          );
        },
      });
  }

  descartarCampanha(): void {
    if (this.campanhaIdInterno() !== null) this.salvarAgora();
    this.cancelarAgendamento();
    this.escopoCampanha += 1;
    this.campanhaIdInterno.set(null);
    this.paginasInternas.set([]);
    this.paginaAtivaInterna.set(null);
    this.rascunhoInterno.set(RASCUNHO_CADERNO_VAZIO);
    this.resultadosBuscaInternos.set(RESULTADOS_BUSCA_CADERNO_VAZIOS);
    this.estadoSalvamentoInterno.set('INATIVO');
    this.revisaoRascunho = 0;
    this.revisaoEmSalvamento = 0;
  }

  carregarCadernoMembro(campanhaId: number, usuarioId: number): void {
    const escopo = this.escopoCampanha;
    this.limparPaginaSelecionada();
    this.definirCarregando(true);
    this.api
      .listarPaginasMembro(campanhaId, usuarioId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (escopo === this.escopoCampanha) this.definirCarregando(false);
        }),
      )
      .subscribe({
        next: (paginas) => {
          if (escopo === this.escopoCampanha) this.paginasInternas.set(paginas);
        },
        error: () => {
          if (escopo === this.escopoCampanha) this.estadoSalvamentoInterno.set('FALHA');
        },
      });
  }

  carregarMeuCaderno(): void {
    const campanhaId = this.campanhaIdInterno();
    if (campanhaId === null) return;
    this.limparPaginaSelecionada();
    this.carregarPaginas(campanhaId);
  }

  definirResultados(resultado: PaginatedResult<BuscaCampanhaResultadoDto>): void {
    this.resultadosBuscaInternos.set(resultado);
  }

  limparResultados(): void {
    this.resultadosBuscaInternos.set(RESULTADOS_BUSCA_CADERNO_VAZIOS);
  }

  recarregarPaginaAtiva(): void {
    const pagina = this.paginaAtivaInterna();
    if (!pagina) return;
    this.recuperarPagina(pagina.id);
  }

  excluirPaginaAtiva(): void {
    const pagina = this.paginaAtivaInterna();
    if (!pagina || pagina.somenteLeitura) return;
    const escopo = this.escopoCampanha;
    this.cancelarAgendamento();
    this.api
      .excluirPagina(pagina.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          if (escopo !== this.escopoCampanha) return;
          this.paginasInternas.update((paginas) =>
            paginas.filter((item) => item.id !== pagina.id),
          );
          this.limparPaginaSelecionada();
          this.definirVistaMobile('LISTA');
        },
        error: () => {
          if (escopo === this.escopoCampanha) this.estadoSalvamentoInterno.set('FALHA');
        },
      });
  }

  definirVistaMobile(vistaMobile: VistaMobileCaderno): void {
    this.estadoInterno.update((estado) => ({ ...estado, vistaMobile }));
  }

  alterarTamanho(tamanho: CadernoTamanho, viewport: CadernoViewport): void {
    const tamanhoLimitado = limitarTamanho(tamanho, viewport);
    this.estadoInterno.update((estado) => ({ ...estado, tamanho: tamanhoLimitado }));
    persistirTamanho(tamanhoLimitado);
  }

  private carregarPaginas(campanhaId: number): void {
    const escopo = this.escopoCampanha;
    this.definirCarregando(true);
    this.api
      .listarPaginas(campanhaId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (escopo === this.escopoCampanha) this.definirCarregando(false);
        }),
      )
      .subscribe({
        next: (paginas) => {
          if (escopo === this.escopoCampanha) this.paginasInternas.set(paginas);
        },
        error: () => {
          if (escopo === this.escopoCampanha) this.estadoSalvamentoInterno.set('FALHA');
        },
      });
  }

  private agendarSalvamento(): void {
    this.cancelarAgendamento();
    this.temporizadorSalvamento = setTimeout(() => {
      this.temporizadorSalvamento = null;
      this.salvarAgora();
    }, CADERNO_AUTOSAVE_DELAY);
  }

  private cancelarAgendamento(): void {
    if (this.temporizadorSalvamento === null) return;
    clearTimeout(this.temporizadorSalvamento);
    this.temporizadorSalvamento = null;
  }

  private aplicarPaginaSalva(pagina: PaginaCadernoDto): void {
    this.paginaAtivaInterna.set(pagina);
    this.paginasInternas.update((paginas) => {
      const resumo: PaginaCadernoResumoDto = pagina;
      const indice = paginas.findIndex((item) => item.id === pagina.id);
      if (indice < 0) return [resumo, ...paginas];
      return paginas.map((item) => (item.id === pagina.id ? resumo : item));
    });
  }

  private limparPaginaSelecionada(): void {
    this.cancelarAgendamento();
    this.paginaAtivaInterna.set(null);
    this.rascunhoInterno.set(RASCUNHO_CADERNO_VAZIO);
    this.estadoSalvamentoInterno.set('INATIVO');
    this.revisaoRascunho = 0;
    this.revisaoEmSalvamento = 0;
  }

  private definirCarregando(carregando: boolean): void {
    this.estadoInterno.update((estado) => ({ ...estado, carregando }));
  }
}

function criarEstadoInicial(tamanho: CadernoTamanho): CadernoFlutuanteEstado {
  return {
    aberto: false,
    carregando: false,
    vistaMobile: 'LISTA',
    tamanho,
  };
}

function limitarTamanho(tamanho: CadernoTamanho, viewport: CadernoViewport): CadernoTamanho {
  const larguraViewport = numeroNaoNegativo(viewport.largura);
  const alturaViewport = numeroNaoNegativo(viewport.altura);
  return {
    largura: limitarDimensao(tamanho.largura, CADERNO_LARGURA_MINIMA, larguraViewport),
    altura: limitarDimensao(tamanho.altura, CADERNO_ALTURA_MINIMA, alturaViewport),
  };
}

function limitarDimensao(valor: number, minimo: number, viewport: number): number {
  if (viewport <= minimo) return viewport;
  return limitarIntervalo(valor, minimo, viewport);
}

function numeroNaoNegativo(valor: number): number {
  return Number.isFinite(valor) ? Math.max(0, valor) : 0;
}

function limitarIntervalo(valor: number, minimo: number, maximo: number): number {
  if (!Number.isFinite(valor)) return minimo;
  return Math.min(Math.max(valor, minimo), maximo);
}

function carregarTamanho(): CadernoTamanho {
  try {
    const valor = globalThis.localStorage?.getItem(CADERNO_TAMANHO_STORAGE_KEY);
    if (!valor) return TAMANHO_INICIAL;
    const tamanho = JSON.parse(valor) as Partial<CadernoTamanho>;
    if (
      [tamanho.largura, tamanho.altura].every(
        (item) => typeof item === 'number' && Number.isFinite(item),
      )
    ) {
      return { largura: tamanho.largura!, altura: tamanho.altura! };
    }
  } catch {
    // Preferência local inválida ou indisponível: usa o tamanho canônico.
  }
  return TAMANHO_INICIAL;
}

function persistirTamanho(tamanho: CadernoTamanho): void {
  try {
    globalThis.localStorage?.setItem(CADERNO_TAMANHO_STORAGE_KEY, JSON.stringify(tamanho));
  } catch {
    // A janela continua funcional quando o armazenamento local está indisponível.
  }
}
