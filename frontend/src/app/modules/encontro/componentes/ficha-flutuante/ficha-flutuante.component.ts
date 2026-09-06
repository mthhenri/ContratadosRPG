import { ChangeDetectionStrategy, Component, ElementRef, input, signal, viewChild } from '@angular/core';

import { Icone } from '../../../../shared/icone/icone.component';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import { BotaoIcone } from '../../../../shared/ui/botao-icone/botao-icone.component';
import { PainelFlutuante } from '../../../../shared/ui/painel-flutuante/painel-flutuante.component';
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
 * Ficha de um combatente aberta como janela flutuante, sobre `app-painel-flutuante` (`ui-17`) —
 * arraste, posição, empilhamento de z-index, minimizar e fechar vêm todos do primitivo, mesma
 * receita de `leitor-documentos`/`caderno-flutuante`. Este componente só cuida do conteúdo e do
 * que continua fora do escopo do primitivo: redimensionar por arraste e maximizar. Quem dispara é
 * a página hospedeira (`PainelEncontro`), chamando `abrir()` via referência de template
 * (`#fichaFlutuante`) a partir do cartão do combatente ou do "Ver ficha" das Anotações.
 *
 * O corpo (busca + edição da ficha) mora no componente filho `FichaFlutuanteConteudo`, recriado a
 * cada troca de alvo — ver o comentário dessa classe para o porquê.
 */
@Component({
  selector: 'app-ficha-flutuante',
  imports: [Icone, Tooltip, BotaoIcone, PainelFlutuante, FichaFlutuanteConteudo],
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
  protected readonly alvo = signal<FichaFlutuanteAlvo | null>(null);
  protected readonly geometria = signal<FichaFlutuanteGeometria>(GEOMETRIA_INICIAL_FICHA_FLUTUANTE);
  protected readonly maximizada = signal(false);
  protected readonly ehMobile = signal(this.verificarMobile());

  protected readonly painelRef = viewChild<PainelFlutuante>('painel');
  private readonly gatilhoElemento = viewChild<ElementRef<HTMLButtonElement>>('gatilho');

  private geometriaAntesDeMaximizar: FichaFlutuanteGeometria | null = null;
  private redimensionando = false;
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
      const geometriaMestre = limitarGeometriaFichaFlutuante(
        GEOMETRIA_INICIAL_FICHA_FLUTUANTE_MESTRE,
        this.viewport(),
      );
      this.geometria.set(geometriaMestre);
      this.painelRef()?.moverPara(
        { x: geometriaMestre.x, y: geometriaMestre.y },
        { persistir: false },
      );
    }
    this.aberto.set(true);
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

  protected aoMinimizadoChange(minimizado: boolean): void {
    if (minimizado) setTimeout(() => this.gatilhoElemento()?.nativeElement?.focus());
  }

  protected fechar(): void {
    this.aberto.set(false);
    this.maximizada.set(false);
    this.geometriaAntesDeMaximizar = null;
    this.alvo.set(null);
  }

  protected alternarMaximizacao(): void {
    if (this.ehMobile()) return;
    const painel = this.painelRef();
    if (this.maximizada()) {
      const geometriaAnterior = this.geometriaAntesDeMaximizar;
      if (geometriaAnterior) {
        const restaurada = limitarGeometriaFichaFlutuante(geometriaAnterior, this.viewport());
        this.geometria.set(restaurada);
        painel?.moverPara({ x: restaurada.x, y: restaurada.y });
      }
      this.geometriaAntesDeMaximizar = null;
      this.maximizada.set(false);
      return;
    }
    this.geometriaAntesDeMaximizar = {
      ...this.geometria(),
      x: painel?.obterPosicaoAtual().x ?? this.geometria().x,
      y: painel?.obterPosicaoAtual().y ?? this.geometria().y,
    };
    const viewport = this.viewport();
    this.geometria.set({ ...this.geometria(), largura: viewport.largura, altura: viewport.altura });
    painel?.moverPara({ x: 0, y: 0 }, { persistir: false });
    this.maximizada.set(true);
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
    if (!this.redimensionando) return;
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

  protected encerrarInteracao(): void {
    this.redimensionando = false;
  }

  protected aoRedimensionarViewport(): void {
    this.ehMobile.set(this.verificarMobile());
    if (this.ehMobile()) return;
    if (this.maximizada()) {
      const viewport = this.viewport();
      this.geometria.set({
        ...this.geometria(),
        largura: viewport.largura,
        altura: viewport.altura,
      });
    } else {
      this.geometria.set(limitarGeometriaFichaFlutuante(this.geometria(), this.viewport()));
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
