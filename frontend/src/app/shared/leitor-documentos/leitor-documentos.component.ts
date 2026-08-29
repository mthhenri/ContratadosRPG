import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

import { Icone } from '../icone/icone.component';
import { Tooltip } from '../tooltip/tooltip.directive';
import { Botao } from '../ui/botao/botao.component';
import {
  DOCUMENTOS_REGRAS,
  type DocumentoRegrasId,
  type LeitorGeometria,
} from './leitor-documentos.model';
import { LeitorDocumentosService } from './leitor-documentos.service';
import { LeitorPdfMobile } from './leitor-pdf-mobile/leitor-pdf-mobile.component';

const BREAKPOINT_MOBILE = 560;

@Component({
  selector: 'app-leitor-documentos',
  standalone: true,
  imports: [Icone, Tooltip, LeitorPdfMobile, Botao],
  templateUrl: './leitor-documentos.component.html',
  styleUrl: './leitor-documentos.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:pointermove)': 'aoMoverPonteiro($event)',
    '(window:pointerup)': 'encerrarInteracao()',
    '(window:pointercancel)': 'encerrarInteracao()',
    '(window:resize)': 'aoRedimensionarViewport()',
  },
})
export class LeitorDocumentos {
  private readonly servico = inject(LeitorDocumentosService);
  private readonly documento = inject(DOCUMENT);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly estado = this.servico.estado;
  protected readonly ehMobile = signal(this.verificarMobile());
  protected readonly maximizada = signal(false);
  protected readonly documentoConfiguracao = computed(
    () => DOCUMENTOS_REGRAS[this.estado().documentoAtivo],
  );
  protected readonly documentoUrl = computed(() =>
    this.sanitizer.bypassSecurityTrustResourceUrl(this.documentoConfiguracao().url),
  );

  private readonly janela = viewChild<ElementRef<HTMLElement>>('janela');
  private readonly cabecalho = viewChild<ElementRef<HTMLElement>>('cabecalho');
  private readonly gatilho = viewChild<ElementRef<HTMLButtonElement>>('gatilho');
  private abridorOriginal: HTMLElement | null = null;
  private geometriaAntesDeMaximizar: LeitorGeometria | null = null;
  private estadoAnterior = { aberto: false, recolhido: false };
  private arrastando = false;
  private redimensionando = false;
  private origemArraste = { ponteiroX: 0, ponteiroY: 0, janelaX: 0, janelaY: 0 };
  private origemRedimensionamento = {
    ponteiroX: 0,
    ponteiroY: 0,
    geometria: { x: 0, y: 52, largura: 640, altura: 480 } as LeitorGeometria,
  };

  constructor() {
    effect(() => {
      const atual = { aberto: this.estado().aberto, recolhido: this.estado().recolhido };
      untracked(() => this.sincronizarFoco(atual));
      this.estadoAnterior = atual;
    });
  }

  protected selecionarDocumento(documento: DocumentoRegrasId): void {
    this.servico.selecionarDocumento(documento);
  }

  protected recolher(): void {
    this.servico.recolher();
  }

  protected reabrir(): void {
    this.servico.reabrir();
  }

  protected fechar(): void {
    this.maximizada.set(false);
    this.geometriaAntesDeMaximizar = null;
    this.servico.fechar();
  }

  protected alternarMaximizacao(): void {
    if (this.ehMobile()) return;
    if (this.maximizada()) {
      const geometria = this.geometriaAntesDeMaximizar;
      if (geometria) this.servico.alterarGeometria(geometria, this.viewport());
      this.geometriaAntesDeMaximizar = null;
      this.maximizada.set(false);
      return;
    }

    this.geometriaAntesDeMaximizar = this.estado().geometria;
    const viewport = this.viewport();
    this.servico.alterarGeometria(
      { x: 0, y: 0, largura: viewport.largura, altura: viewport.altura },
      viewport,
    );
    this.maximizada.set(true);
  }

  protected iniciarArraste(evento: PointerEvent): void {
    if (
      this.ehMobile() ||
      this.maximizada() ||
      evento.button !== 0 ||
      this.alvoEhControle(evento.target)
    ) return;
    const retangulo = this.janela()?.nativeElement.getBoundingClientRect();
    if (!retangulo) return;
    evento.preventDefault();
    this.arrastando = true;
    this.origemArraste = {
      ponteiroX: evento.clientX,
      ponteiroY: evento.clientY,
      janelaX: retangulo.left,
      janelaY: retangulo.top,
    };
  }

  protected iniciarRedimensionamento(evento: PointerEvent): void {
    if (this.ehMobile() || this.maximizada() || evento.button !== 0) return;
    evento.preventDefault();
    this.redimensionando = true;
    this.origemRedimensionamento = {
      ponteiroX: evento.clientX,
      ponteiroY: evento.clientY,
      geometria: this.estado().geometria,
    };
  }

  protected aoMoverPonteiro(evento: PointerEvent): void {
    if (this.arrastando) {
      this.servico.alterarGeometria(
        {
          ...this.estado().geometria,
          x: this.origemArraste.janelaX + evento.clientX - this.origemArraste.ponteiroX,
          y: this.origemArraste.janelaY + evento.clientY - this.origemArraste.ponteiroY,
        },
        this.viewport(),
      );
    } else if (this.redimensionando) {
      this.servico.alterarGeometria(
        {
          ...this.origemRedimensionamento.geometria,
          largura:
            this.origemRedimensionamento.geometria.largura +
            evento.clientX -
            this.origemRedimensionamento.ponteiroX,
          altura:
            this.origemRedimensionamento.geometria.altura +
            evento.clientY -
            this.origemRedimensionamento.ponteiroY,
        },
        this.viewport(),
      );
    }
  }

  protected encerrarInteracao(): void {
    this.arrastando = false;
    this.redimensionando = false;
  }

  protected aoRedimensionarViewport(): void {
    this.ehMobile.set(this.verificarMobile());
    if (this.maximizada() && !this.ehMobile()) {
      const viewport = this.viewport();
      this.servico.alterarGeometria(
        { x: 0, y: 0, largura: viewport.largura, altura: viewport.altura },
        viewport,
      );
    } else if (!this.ehMobile()) {
      this.servico.alterarGeometria(this.estado().geometria, this.viewport());
    }
  }

  protected aoTecladoJanela(evento: KeyboardEvent): void {
    if (evento.key !== 'Escape' || !this.janela()?.nativeElement.contains(evento.target as Node)) {
      return;
    }
    evento.preventDefault();
    this.fechar();
  }

  private sincronizarFoco(atual: { aberto: boolean; recolhido: boolean }): void {
    if (!this.estadoAnterior.aberto && atual.aberto) {
      this.abridorOriginal = this.documento.activeElement as HTMLElement | null;
    }
    if (atual.aberto && atual.recolhido && !this.estadoAnterior.recolhido) {
      setTimeout(() => this.gatilho()?.nativeElement.focus());
    } else if (atual.aberto && !atual.recolhido && this.estadoAnterior.recolhido) {
      setTimeout(() => this.cabecalho()?.nativeElement.focus());
    } else if (!atual.aberto && this.estadoAnterior.aberto) {
      const destino = this.abridorOriginal;
      setTimeout(() => destino?.isConnected && destino.focus());
      this.abridorOriginal = null;
    } else if (atual.aberto && !this.estadoAnterior.aberto) {
      setTimeout(() => this.cabecalho()?.nativeElement.focus());
    }
  }

  private alvoEhControle(alvo: EventTarget | null): boolean {
    return alvo instanceof Element && Boolean(alvo.closest('button, a, input, select, textarea'));
  }

  private verificarMobile(): boolean {
    return typeof window.matchMedia === 'function'
      ? window.matchMedia('(max-width: ' + BREAKPOINT_MOBILE + 'px)').matches
      : window.innerWidth <= BREAKPOINT_MOBILE;
  }

  private viewport(): { largura: number; altura: number } {
    return { largura: window.innerWidth, altura: window.innerHeight };
  }
}
