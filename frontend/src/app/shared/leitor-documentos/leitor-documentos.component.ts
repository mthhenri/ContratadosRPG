import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

import { Icone } from '../icone/icone.component';
import { Tooltip } from '../tooltip/tooltip.directive';
import { Botao } from '../ui/botao/botao.component';
import { BotaoIcone } from '../ui/botao-icone/botao-icone.component';
import {
  PainelFlutuante,
  type PainelFlutuantePosicao,
} from '../ui/painel-flutuante/painel-flutuante.component';
import {
  DOCUMENTOS_REGRAS,
  type DocumentoRegrasId,
  type LeitorTamanho,
} from './leitor-documentos.model';
import { LeitorDocumentosService } from './leitor-documentos.service';
import { LeitorPdfMobile } from './leitor-pdf-mobile/leitor-pdf-mobile.component';

const BREAKPOINT_MOBILE = 560;

/**
 * Leitor de documentos do sistema (regras + guia do mestre), sobre `app-painel-flutuante`
 * (ui-17) — arraste, posição, empilhamento, minimizar e fechar vêm todos do primitivo. Este
 * componente só cuida do conteúdo (seletor de documento, PDF) e do que continua fora do escopo do
 * primitivo: redimensionar por arraste e maximizar.
 */
@Component({
  selector: 'app-leitor-documentos',
  standalone: true,
  imports: [Icone, Tooltip, LeitorPdfMobile, Botao, BotaoIcone, PainelFlutuante],
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

  protected readonly painelRef = viewChild<PainelFlutuante>('painel');
  private readonly gatilhoElemento = viewChild<ElementRef<HTMLButtonElement>>('gatilho');
  private tamanhoAntesDeMaximizar: LeitorTamanho | null = null;
  private posicaoAntesDeMaximizar: PainelFlutuantePosicao | null = null;
  private redimensionando = false;
  private origemRedimensionamento = { ponteiroX: 0, ponteiroY: 0, largura: 640, altura: 480 };

  protected selecionarDocumento(documento: DocumentoRegrasId): void {
    this.servico.selecionarDocumento(documento);
  }

  protected fechar(): void {
    this.maximizada.set(false);
    this.tamanhoAntesDeMaximizar = null;
    this.posicaoAntesDeMaximizar = null;
    this.servico.fechar();
  }

  protected aoMinimizadoChange(minimizado: boolean): void {
    if (minimizado) setTimeout(() => this.gatilhoElemento()?.nativeElement?.focus());
  }

  protected alternarMaximizacao(): void {
    if (this.ehMobile()) return;
    const painel = this.painelRef();
    if (this.maximizada()) {
      if (this.tamanhoAntesDeMaximizar) {
        this.servico.alterarTamanho(this.tamanhoAntesDeMaximizar, this.viewport());
      }
      if (this.posicaoAntesDeMaximizar) {
        painel?.moverPara(this.posicaoAntesDeMaximizar);
      }
      this.tamanhoAntesDeMaximizar = null;
      this.posicaoAntesDeMaximizar = null;
      this.maximizada.set(false);
      return;
    }

    this.tamanhoAntesDeMaximizar = this.estado().tamanho;
    this.posicaoAntesDeMaximizar = painel?.obterPosicaoAtual() ?? null;
    const viewport = this.viewport();
    this.servico.alterarTamanho({ largura: viewport.largura, altura: viewport.altura }, viewport);
    painel?.moverPara({ x: 0, y: 0 }, { persistir: false });
    this.maximizada.set(true);
  }

  protected iniciarRedimensionamento(evento: PointerEvent): void {
    if (this.ehMobile() || this.maximizada() || evento.button !== 0) return;
    const retangulo = this.painelRef()?.obterElemento()?.getBoundingClientRect();
    if (!retangulo) return;
    evento.preventDefault();
    this.redimensionando = true;
    this.origemRedimensionamento = {
      ponteiroX: evento.clientX,
      ponteiroY: evento.clientY,
      largura: retangulo.width,
      altura: retangulo.height,
    };
  }

  protected aoMoverPonteiro(evento: PointerEvent): void {
    if (!this.redimensionando) return;
    this.servico.alterarTamanho(
      {
        largura:
          this.origemRedimensionamento.largura +
          evento.clientX -
          this.origemRedimensionamento.ponteiroX,
        altura:
          this.origemRedimensionamento.altura +
          evento.clientY -
          this.origemRedimensionamento.ponteiroY,
      },
      this.viewport(),
    );
  }

  protected encerrarInteracao(): void {
    this.redimensionando = false;
  }

  protected aoRedimensionarViewport(): void {
    this.ehMobile.set(this.verificarMobile());
    if (this.ehMobile()) return;
    const viewport = this.viewport();
    if (this.maximizada()) {
      this.servico.alterarTamanho({ largura: viewport.largura, altura: viewport.altura }, viewport);
    } else {
      this.servico.alterarTamanho(this.estado().tamanho, viewport);
    }
  }

  private verificarMobile(): boolean {
    return typeof window.matchMedia === 'function'
      ? window.matchMedia(`(max-width: ${BREAKPOINT_MOBILE}px)`).matches
      : window.innerWidth <= BREAKPOINT_MOBILE;
  }

  private viewport(): { largura: number; altura: number } {
    return { largura: window.innerWidth, altura: window.innerHeight };
  }
}
