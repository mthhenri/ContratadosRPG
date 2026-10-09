import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';

import { SessaoService } from '../../../../core/services/sessao.service';
import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { RegrasConsultaService } from '../../../regras/regras-consulta.service';
import { Icone } from '../../../../shared/icone/icone.component';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import { BotaoIcone } from '../../../../shared/ui/botao-icone/botao-icone.component';
import { NotificacaoService } from '../../../../shared/ui/notificacao/notificacao.service';
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
 * receita de `painel-flutuante`/`caderno-flutuante`. Este componente só cuida do conteúdo e do
 * que continua fora do escopo do primitivo: redimensionar por arraste e maximizar. Quem dispara é
 * a página hospedeira (`PainelEncontroMestre`/`PainelEncontroJogador`), chamando `abrir()` via referência de template
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
  protected readonly regrasConsulta = inject(RegrasConsultaService);
  private readonly tempoRealService = inject(TempoRealService);
  private readonly sessaoService = inject(SessaoService);
  private readonly notificacaoService = inject(NotificacaoService);

  readonly ehMestre = input.required<boolean>();

  protected readonly aberto = signal(false);
  protected readonly alvo = signal<FichaFlutuanteAlvo | null>(null);
  protected readonly geometria = signal<FichaFlutuanteGeometria>(GEOMETRIA_INICIAL_FICHA_FLUTUANTE);
  protected readonly maximizada = signal(false);
  protected readonly ehMobile = signal(this.verificarMobile());

  protected readonly painelRef = viewChild<PainelFlutuante>('painel');
  private readonly conteudoRef = viewChild(FichaFlutuanteConteudo);

  /**
   * "Ficha · {nome}" da ficha exibida, lido do documento que o conteúdo já carregou (jogador ou
   * criatura, sem consulta nova); só "Ficha" enquanto ele chega. Neutro: a janela abre de
   * combate, de cena sem iniciativa e do Caderno.
   */
  protected readonly titulo = computed(() => {
    const nome = this.conteudoRef()?.nome();
    return nome ? `Ficha · ${nome}` : 'Ficha';
  });
  private readonly gatilhoElemento = viewChild<ElementRef<HTMLButtonElement>>('gatilho');

  private geometriaAntesDeMaximizar: FichaFlutuanteGeometria | null = null;
  private redimensionando = false;
  private aberturaPendente: ReturnType<typeof setTimeout> | null = null;
  private alvoPendente: FichaFlutuanteAlvo | null = null;
  private origemRedimensionamento = {
    ponteiroX: 0,
    ponteiroY: 0,
    geometria: GEOMETRIA_INICIAL_FICHA_FLUTUANTE,
  };

  constructor() {
    // Revogar ou ocultar tira a leitura por concessão (fix-ficha-oculta-concessao-e-leitura): a
    // janela fecha como a página completa expulsa (`VisualizarPage.expulsar`). O evento chega pela
    // sala `ficha:<id>` que a tela hospedeira já ingressou; dono e mestre nunca perdem por aqui.
    this.tempoRealService.acessoRevogado$
      .pipe(
        filter((evento) => {
          const usuarioId = this.sessaoService.usuario()?.id;
          const alvoAtual = this.alvo();
          return (
            alvoAtual?.fichaId === evento.fichaId &&
            evento.usuarioId === usuarioId &&
            alvoAtual.usuarioIdDono !== usuarioId &&
            !this.ehMestre()
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: () => {
          this.fechar();
          this.notificacaoService.notificar({
            severidade: 'aviso',
            resumo: 'Acesso revogado',
            detalhe: 'Seu acesso a esta ficha foi revogado.',
          });
        },
      });
  }

  /**
   * Abre a ficha de `novoAlvo`. Se já houver uma ficha **diferente** aberta, fecha e reabre num
   * próximo ciclo — força o Angular a destruir e recriar `FichaFlutuanteConteudo`, e com ela os
   * `FichaEdicaoService`/`FichaEdicaoCriaturaService` da ficha anterior (que, senão, ficariam
   * presos a ela: `inicializar()` só liga na primeira ficha que recebe). Reabrir a **mesma** ficha
   * (mesmo `fichaId`+`tipo`) é barato — só reaproveita a instância já viva.
   */
  abrir(novoAlvo: FichaFlutuanteAlvo): void {
    if (this.aberturaPendente !== null) clearTimeout(this.aberturaPendente);
    this.aberturaPendente = null;
    this.alvoPendente = null;
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
    this.alvoPendente = novoAlvo;
    if (this.aberturaPendente !== null) clearTimeout(this.aberturaPendente);
    this.aberturaPendente = setTimeout(() => {
      this.aberturaPendente = null;
      this.alvoPendente = null;
      if (this.aberto()) this.alvo.set(novoAlvo);
    });
  }

  protected aoMinimizadoChange(minimizado: boolean): void {
    if (minimizado) setTimeout(() => this.gatilhoElemento()?.nativeElement?.focus());
  }

  protected fechar(): void {
    if (this.aberturaPendente !== null) clearTimeout(this.aberturaPendente);
    this.aberturaPendente = null;
    this.alvoPendente = null;
    this.aberto.set(false);
    this.maximizada.set(false);
    this.geometriaAntesDeMaximizar = null;
    this.alvo.set(null);
  }

  /** Uma invalidação do recorte fecha também a troca de alvo ainda pendente. */
  fecharSeAlvo(fichaId: number): void {
    if (this.alvo()?.fichaId === fichaId || this.alvoPendente?.fichaId === fichaId) {
      this.fechar();
    }
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
