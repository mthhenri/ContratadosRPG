import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  signal,
  viewChild,
} from '@angular/core';

import { Icone } from '../../../../shared/icone/icone.component';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import { FichaFlutuanteConteudo } from './ficha-flutuante-conteudo.component';
import {
  GEOMETRIA_INICIAL_FICHA_FLUTUANTE,
  GEOMETRIA_INICIAL_FICHA_FLUTUANTE_MESTRE,
  limitarGeometriaFichaFlutuante,
  type FichaFlutuanteAlvo,
  type FichaFlutuanteGeometria,
} from './ficha-flutuante.model';

const BREAKPOINT_MOBILE = 560;

/**
 * Ficha de um combatente aberta como janela flutuante — arrastável, redimensionável, minimizável
 * e maximizável, mesma mecânica de `frontend/src/app/shared/leitor-documentos/`. Quem dispara é a
 * página hospedeira (`PainelEncontro`), chamando `abrir()` via referência de template
 * (`#fichaFlutuante`) a partir do cartão do combatente ou do "Ver ficha" das Anotações.
 *
 * O corpo (busca + edição da ficha) mora no componente filho `FichaFlutuanteConteudo`, recriado a
 * cada troca de alvo — ver o comentário dessa classe para o porquê.
 */
@Component({
  selector: 'app-ficha-flutuante',
  imports: [Icone, Tooltip, FichaFlutuanteConteudo],
  templateUrl: './ficha-flutuante.component.html',
  styleUrl: './ficha-flutuante.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:pointermove)': 'aoMoverPonteiro($event)',
    '(window:pointerup)': 'encerrarInteracao()',
    '(window:pointercancel)': 'encerrarInteracao()',
    '(window:resize)': 'aoRedimensionarViewport()',
  },
})
export class FichaFlutuante {
  readonly ehMestre = input.required<boolean>();

  protected readonly aberto = signal(false);
  protected readonly recolhido = signal(false);
  protected readonly alvo = signal<FichaFlutuanteAlvo | null>(null);
  protected readonly geometria = signal<FichaFlutuanteGeometria>(GEOMETRIA_INICIAL_FICHA_FLUTUANTE);
  protected readonly maximizada = signal(false);
  protected readonly ehMobile = signal(this.verificarMobile());

  private readonly janela = viewChild<ElementRef<HTMLElement>>('janela');

  private geometriaAntesDeMaximizar: FichaFlutuanteGeometria | null = null;
  private arrastando = false;
  private redimensionando = false;
  private origemArraste = { ponteiroX: 0, ponteiroY: 0, janelaX: 0, janelaY: 0 };
  private origemRedimensionamento = {
    ponteiroX: 0,
    ponteiroY: 0,
    geometria: GEOMETRIA_INICIAL_FICHA_FLUTUANTE,
  };

  /**
   * Abre a ficha de `novoAlvo`. Se já houver uma ficha **diferente** aberta, fecha e reabre num
   * próximo ciclo — força o Angular a destruir e recriar `FichaFlutuanteConteudo`, e com ela os
   * `FichaEdicaoService`/`FichaEdicaoCriaturaService` da ficha anterior (que, senão, ficariam
   * presos a ela: `inicializar()` só liga na primeira ficha que recebe). Reabrir a **mesma** ficha
   * (mesmo `fichaId`+`tipo`) é barato — só reaproveita a instância já viva.
   */
  abrir(novoAlvo: FichaFlutuanteAlvo): void {
    const atual = this.alvo();
    const mesmaFicha = atual?.fichaId === novoAlvo.fichaId && atual?.tipo === novoAlvo.tipo;
    if (!this.aberto() && this.ehMestre() && !this.ehMobile()) {
      this.geometria.set(
        limitarGeometriaFichaFlutuante(GEOMETRIA_INICIAL_FICHA_FLUTUANTE_MESTRE, this.viewport()),
      );
    }
    this.aberto.set(true);
    this.recolhido.set(false);
    if (mesmaFicha) {
      return;
    }
    if (atual === null) {
      this.alvo.set(novoAlvo);
      return;
    }
    this.alvo.set(null);
    setTimeout(() => this.alvo.set(novoAlvo));
  }

  /**
   * No mobile a ficha é tela cheia, sem janela para recolher a um canto — "minimizar" reabria por
   * um selo `position: fixed` a meio da lista de combatentes, sobrepondo o card que estivesse ali
   * embaixo. Em vez disso, minimizar e fechar viram a mesma ação: fecha de vez.
   */
  protected recolher(): void {
    if (this.ehMobile()) {
      this.fechar();
      return;
    }
    this.recolhido.set(true);
  }

  protected reabrir(): void {
    this.recolhido.set(false);
  }

  protected fechar(): void {
    this.aberto.set(false);
    this.recolhido.set(false);
    this.maximizada.set(false);
    this.geometriaAntesDeMaximizar = null;
    this.alvo.set(null);
  }

  protected alternarMaximizacao(): void {
    if (this.ehMobile()) return;
    if (this.maximizada()) {
      const geometriaAnterior = this.geometriaAntesDeMaximizar;
      if (geometriaAnterior) this.geometria.set(limitarGeometriaFichaFlutuante(geometriaAnterior, this.viewport()));
      this.geometriaAntesDeMaximizar = null;
      this.maximizada.set(false);
      return;
    }
    this.geometriaAntesDeMaximizar = this.geometria();
    const viewport = this.viewport();
    this.geometria.set({ x: 0, y: 0, largura: viewport.largura, altura: viewport.altura });
    this.maximizada.set(true);
  }

  protected iniciarArraste(evento: PointerEvent): void {
    if (this.ehMobile() || this.maximizada() || evento.button !== 0 || this.alvoEhControle(evento.target)) {
      return;
    }
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
      geometria: this.geometria(),
    };
  }

  protected aoMoverPonteiro(evento: PointerEvent): void {
    if (this.arrastando) {
      this.geometria.set(
        limitarGeometriaFichaFlutuante(
          {
            ...this.geometria(),
            x: this.origemArraste.janelaX + evento.clientX - this.origemArraste.ponteiroX,
            y: this.origemArraste.janelaY + evento.clientY - this.origemArraste.ponteiroY,
          },
          this.viewport(),
        ),
      );
    } else if (this.redimensionando) {
      this.geometria.set(
        limitarGeometriaFichaFlutuante(
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
        ),
      );
    }
  }

  protected encerrarInteracao(): void {
    this.arrastando = false;
    this.redimensionando = false;
  }

  protected aoRedimensionarViewport(): void {
    this.ehMobile.set(this.verificarMobile());
    if (this.ehMobile()) return;
    if (this.maximizada()) {
      const viewport = this.viewport();
      this.geometria.set({ x: 0, y: 0, largura: viewport.largura, altura: viewport.altura });
    } else {
      this.geometria.set(limitarGeometriaFichaFlutuante(this.geometria(), this.viewport()));
    }
  }

  protected aoTecladoJanela(evento: KeyboardEvent): void {
    if (evento.key !== 'Escape' || !this.janela()?.nativeElement.contains(evento.target as Node)) {
      return;
    }
    evento.preventDefault();
    this.fechar();
  }

  private alvoEhControle(alvo: EventTarget | null): boolean {
    return alvo instanceof Element && Boolean(alvo.closest('button, a, input, select, textarea'));
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
