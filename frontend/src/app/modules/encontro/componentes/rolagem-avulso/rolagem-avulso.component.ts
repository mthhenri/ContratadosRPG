import { Component, ElementRef, HostListener, OnInit, inject, input, output, signal, viewChild } from '@angular/core';

import type { EncontroCombatenteResumoDto } from '@contratados-rpg/shared/dtos/encontro';
import type { FichaAtributosDto } from '@contratados-rpg/shared/dtos/ficha';
import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';
import { RolagemVisibilidadeEnum } from '@contratados-rpg/shared/enums';
import { rolarFormula } from '@contratados-rpg/shared/regras/rolagem';

import { BandejaDadosService } from '../../../../shared/bandeja-dados/bandeja-dados.service';
import { Icone } from '../../../../shared/icone/icone.component';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import { Botao } from '../../../../shared/ui/botao/botao.component';
import { Modal } from '../../../../shared/ui/modal/modal.component';
import { NotificacaoService } from '../../../../shared/ui/notificacao/notificacao.service';
import { RolagemService } from '../../../ficha/rolagem.service';

const ATRIBUTOS_NEUTROS: FichaAtributosDto = {
  destreza: 0,
  forca: 0,
  luta: 0,
  pontaria: 0,
  vigor: 0,
  intelecto: 0,
  medicina: 0,
  sentidos: 0,
  social: 0,
  vontade: 0,
};

const FONTE_DE_FICHA = /\b(?:DES|FOR|LUT|PON|VIG|INT|MED|SEN|SOC|VON|PROF|PROFICIENCIA|NIV|NIVEL)\b/i;

/** Painel compacto de rolagem livre atribuído a um combatente avulso. */
@Component({
  selector: 'app-rolagem-avulso',
  imports: [Icone, Tooltip, Botao, Modal],
  templateUrl: './rolagem-avulso.component.html',
  styleUrl: './rolagem-avulso.component.scss',
})
export class RolagemAvulso implements OnInit {
  private readonly rolagemService = inject(RolagemService);
  private readonly bandeja = inject(BandejaDadosService);
  private readonly notificacaoService = inject(NotificacaoService);

  readonly combatente = input.required<EncontroCombatenteResumoDto>();
  readonly ocultaInicial = input(true);
  readonly fechado = output<void>();
  readonly registrada = output<RolagemResumoDto>();
  readonly ocultaAlterada = output<boolean>();

  protected readonly expressao = signal('');
  protected readonly oculta = signal(true);
  protected readonly confirmandoPublica = signal(false);
  protected readonly rolagemConfirmada = signal(false);
  private confirmacaoHandle: ReturnType<typeof setTimeout> | null = null;
  protected readonly painel = viewChild<ElementRef<HTMLElement>>('painel');
  protected readonly posicao = signal<{ x: number; y: number } | null>(null);
  private arrastando = false;
  private origemArraste = { x: 0, y: 0 };

  ngOnInit(): void {
    this.oculta.set(this.ocultaInicial());
  }

  protected alterarExpressao(valor: string): void {
    this.expressao.set(valor);
  }

  protected alternarVisibilidade(): void {
    if (this.oculta()) {
      this.confirmandoPublica.set(true);
      return;
    }
    this.oculta.set(true);
    this.ocultaAlterada.emit(true);
  }

  protected confirmarPublica(): void {
    this.oculta.set(false);
    this.ocultaAlterada.emit(false);
    this.confirmandoPublica.set(false);
  }

  protected iniciarArraste(evento: PointerEvent): void {
    if (evento.button !== 0 || (evento.target as HTMLElement).closest('button')) return;
    const retangulo = this.painel()?.nativeElement.getBoundingClientRect();
    if (!retangulo) return;
    this.origemArraste = { x: evento.clientX - retangulo.left, y: evento.clientY - retangulo.top };
    this.arrastando = true;
    evento.preventDefault();
  }

  @HostListener('window:pointermove', ['$event'])
  protected aoMoverPonteiro(evento: PointerEvent): void {
    if (!this.arrastando) return;
    const elemento = this.painel()?.nativeElement;
    if (!elemento) return;
    const x = Math.max(0, Math.min(evento.clientX - this.origemArraste.x, window.innerWidth - elemento.offsetWidth));
    const y = Math.max(0, Math.min(evento.clientY - this.origemArraste.y, window.innerHeight - elemento.offsetHeight));
    this.posicao.set({ x, y });
  }

  @HostListener('window:pointerup')
  protected encerrarArraste(): void {
    this.arrastando = false;
  }

  @HostListener('window:resize')
  protected manterDentroDoViewport(): void {
    const posicao = this.posicao();
    const elemento = this.painel()?.nativeElement;
    if (!posicao || !elemento) return;
    this.posicao.set({
      x: Math.max(0, Math.min(posicao.x, window.innerWidth - elemento.offsetWidth)),
      y: Math.max(0, Math.min(posicao.y, window.innerHeight - elemento.offsetHeight)),
    });
  }

  protected rolar(): void {
    const formula = this.expressao().trim();
    if (!formula) return;
    if (FONTE_DE_FICHA.test(formula)) {
      this.notificacaoService.notificar({
        severidade: 'aviso',
        resumo: 'Expressão sem ficha',
        detalhe: 'Avulsos não possuem atributos, PROF ou NIV. Use apenas dados, números e operações.',
      });
      return;
    }
    const resultado = rolarFormula({ formula, atributos: ATRIBUTOS_NEUTROS });
    if (!resultado) {
      this.notificacaoService.notificar({
        severidade: 'aviso',
        resumo: 'Expressão inválida',
        detalhe: 'Use dados, números e operações. Avulsos não possuem atributos, PROF ou NIV.',
      });
      return;
    }

    const combatente = this.combatente();
    this.confirmarRolagemNoBotao();
    this.bandeja.mostrar({
      rotulo: 'Rolagem livre',
      formula,
      resultado,
      corFicha: combatente.corFicha,
      visibilidade: this.oculta()
        ? RolagemVisibilidadeEnum.PRIVADA
        : RolagemVisibilidadeEnum.PUBLICA,
    });
    this.rolagemService
      .registrarAvulso(combatente.encontroId, combatente.id, {
        rotulo: 'Rolagem livre',
        visibilidade: this.oculta()
          ? RolagemVisibilidadeEnum.PRIVADA
          : RolagemVisibilidadeEnum.PUBLICA,
        resultado,
      })
      .subscribe({ next: (registrada) => this.registrada.emit(registrada), error: () => undefined });
  }

  private confirmarRolagemNoBotao(): void {
    if (this.confirmacaoHandle !== null) clearTimeout(this.confirmacaoHandle);
    this.rolagemConfirmada.set(true);
    this.confirmacaoHandle = setTimeout(() => {
      this.rolagemConfirmada.set(false);
      this.confirmacaoHandle = null;
    }, 650);
  }
}
