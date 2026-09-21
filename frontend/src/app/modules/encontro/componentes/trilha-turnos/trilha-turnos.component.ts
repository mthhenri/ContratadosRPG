import { Component, ElementRef, afterRenderEffect, computed, input, viewChild } from '@angular/core';

import type { EncontroRecuperadoDto } from '@contratados-rpg/shared/dtos/encontro';
import { CombatenteOrigemEnum, EncontroStatusEnum, TipoFichaEnum } from '@contratados-rpg/shared/enums';

import { FocoImagem } from '../../../../shared/foco-imagem.directive';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import {
  combatenteEhDaVez,
  combatenteJaAgiu,
  siglaDoCombatente,
  type CombatenteVisualDto,
} from '../../encontro-leitura.util';
import { rotuloStatusEncontro } from '../../rotulos-encontro';

/** Uma posição da trilha já resolvida para a apresentação — o template só desenha. */
interface PosicaoTrilhaDto {
  readonly combatente: CombatenteVisualDto;
  readonly ativa: boolean;
  readonly agiu: boolean;
  readonly sigla: string;
  readonly subtitulo: string;
  /** `1/2` — só quando o combatente tem mais de um turno na rodada (faixa horizontal). */
  readonly ocorrencia: string | null;
  readonly dica: string;
}

/**
 * Trilha de turnos da visão do mestre (`ui-37`): contadores Rodada/Turno (ou a Situação, fora do
 * combate) e a ordem em que os combatentes agem — cada slot da rodada é uma posição, então uma
 * Cadência maior que 1 aparece repetida, igual à grade.
 *
 * Componente **burro**: recebe o encontro e a lista visual já montada
 * (`montarCombatentesVisuais`) e não escreve nada. De quem é a vez e quem já agiu vêm das mesmas
 * funções puras que a grade usa (`combatenteEhDaVez`/`combatenteJaAgiu`), para os dois nunca
 * discordarem. No desktop é uma coluna com nomes; abaixo do tablet vira uma faixa horizontal de
 * chips (CSS) e rola sozinha até quem age agora.
 */
@Component({
  selector: 'app-trilha-turnos',
  imports: [Tooltip, FocoImagem],
  templateUrl: './trilha-turnos.component.html',
  styleUrl: './trilha-turnos.component.scss',
})
export class TrilhaTurnos {
  readonly encontro = input.required<EncontroRecuperadoDto>();
  /** Posições visuais na ordem em que agem (`montarCombatentesVisuais`). */
  readonly combatentes = input.required<readonly CombatenteVisualDto[]>();

  private readonly lista = viewChild<ElementRef<HTMLElement>>('lista');

  protected readonly emCombate = computed(
    () => this.encontro().status === EncontroStatusEnum.ATIVO,
  );
  protected readonly totalTurnos = computed(() => this.encontro().ordemRodada.length);
  protected readonly situacao = computed(() => rotuloStatusEncontro(this.encontro().status));

  protected readonly posicoes = computed<readonly PosicaoTrilhaDto[]>(() => {
    const encontroAtual = this.encontro();
    return this.combatentes().map((combatente) => {
      const ativa = combatenteEhDaVez(combatente, encontroAtual);
      const agiu = combatenteJaAgiu(combatente, encontroAtual);
      return {
        combatente,
        ativa,
        agiu,
        sigla: siglaDoCombatente(combatente.nome),
        subtitulo: this.subtituloDe(combatente),
        ocorrencia:
          combatente.totalOcorrencias > 1
            ? `${combatente.ocorrencia}/${combatente.totalOcorrencias}`
            : null,
        dica: `${combatente.nome} — ${this.estadoDe(encontroAtual.status, ativa, agiu)}`,
      };
    });
  });

  constructor() {
    // Mantém quem age agora à vista quando a trilha rola (coluna no desktop, faixa no tablet/mobile).
    afterRenderEffect(() => {
      this.encontro();
      this.combatentes();
      this.centralizarAtiva();
    });
  }

  private subtituloDe(combatente: CombatenteVisualDto): string {
    if (combatente.totalOcorrencias > 1) {
      return `Turno ${combatente.ocorrencia} de ${combatente.totalOcorrencias}`;
    }
    if (combatente.tipoFicha === TipoFichaEnum.JOGADOR && combatente.donoNome !== null) {
      return combatente.donoNome;
    }
    if (combatente.tipoFicha === TipoFichaEnum.CRIATURA) {
      return 'Ameaça';
    }
    return combatente.origem === CombatenteOrigemEnum.AVULSO ? 'Avulso' : '';
  }

  private estadoDe(status: EncontroStatusEnum, ativa: boolean, agiu: boolean): string {
    if (status === EncontroStatusEnum.ENCERRADO) {
      return 'combate encerrado';
    }
    if (status !== EncontroStatusEnum.ATIVO) {
      return 'aguardando o combate começar';
    }
    if (ativa) {
      return 'agindo agora';
    }
    return agiu ? 'já agiu nesta rodada' : 'ainda não agiu';
  }

  private centralizarAtiva(): void {
    const lista = this.lista()?.nativeElement;
    const ativa = lista?.querySelector<HTMLElement>('.trilha__item--ativa');
    if (!lista || !ativa) {
      return;
    }
    const caixaLista = lista.getBoundingClientRect();
    const caixaAtiva = ativa.getBoundingClientRect();
    if (lista.scrollWidth > lista.clientWidth) {
      lista.scrollLeft +=
        caixaAtiva.left - caixaLista.left - (caixaLista.width - caixaAtiva.width) / 2;
    }
    if (lista.scrollHeight > lista.clientHeight) {
      lista.scrollTop +=
        caixaAtiva.top - caixaLista.top - (caixaLista.height - caixaAtiva.height) / 2;
    }
  }
}
