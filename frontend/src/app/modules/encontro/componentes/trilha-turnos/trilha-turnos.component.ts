import { Component, ElementRef, afterRenderEffect, computed, input, viewChild } from '@angular/core';

import type { EncontroRecuperadoDto } from '@contratados-rpg/shared/dtos/encontro';
import { CombatenteOrigemEnum, EncontroStatusEnum, TipoFichaEnum } from '@contratados-rpg/shared/enums';

import { FocoImagem } from '../../../../shared/foco-imagem.directive';
import { PreviewAvatar } from '../../../../shared/preview-avatar/preview-avatar.directive';
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
  /** É o combatente do próprio jogador (visão do jogador) — ganha a marca "Você". */
  readonly voce: boolean;
  readonly subtitulo: string;
  /** `1/2` — só quando o combatente tem mais de um turno na rodada (faixa horizontal). */
  readonly ocorrencia: string | null;
  readonly dica: string;
}

/**
 * Trilha de turnos da visão do mestre (`ui-37`) e do jogador (`ui-39`): contadores Rodada/Turno
 * (ou a Situação, fora do combate) e a ordem em que os combatentes agem — cada slot da rodada é uma
 * posição, então uma Cadência maior que 1 aparece repetida, igual à grade.
 *
 * O jogador projeta o bloco de ação dele em `[trilhaAcao]` (logo abaixo dos contadores, no mesmo
 * bloco de topo) e passa `meuCombatenteId`, que marca o item dele com "Você". O mestre não usa
 * nenhum dos dois e a trilha continua exatamente como era.
 *
 * Componente **burro**: recebe o encontro e a lista visual já montada
 * (`montarCombatentesVisuais`) e não escreve nada. De quem é a vez e quem já agiu vêm das mesmas
 * funções puras que a grade usa (`combatenteEhDaVez`/`combatenteJaAgiu`), para os dois nunca
 * discordarem. No desktop é uma coluna com nomes; abaixo do tablet vira uma faixa horizontal de
 * chips (CSS) e rola sozinha até quem age agora.
 */
@Component({
  selector: 'app-trilha-turnos',
  imports: [Tooltip, FocoImagem, PreviewAvatar],
  templateUrl: './trilha-turnos.component.html',
  styleUrl: './trilha-turnos.component.scss',
  host: { '[class.trilha--com-acao]': 'comAcao()' },
})
export class TrilhaTurnos {
  readonly encontro = input.required<EncontroRecuperadoDto>();
  /** Posições visuais na ordem em que agem (`montarCombatentesVisuais`). */
  readonly combatentes = input.required<readonly CombatenteVisualDto[]>();
  /** Id do combatente do próprio jogador — `null` no mestre e para quem só assiste. */
  readonly meuCombatenteId = input<number | null>(null);
  /** Há um bloco de ação projetado em `[trilhaAcao]` — o topo da trilha passa a acomodá-lo. */
  readonly comAcao = input(false);

  private readonly lista = viewChild<ElementRef<HTMLElement>>('lista');

  protected readonly emCombate = computed(
    () => this.encontro().status === EncontroStatusEnum.ATIVO,
  );
  protected readonly totalTurnos = computed(() => this.encontro().ordemRodada.length);
  protected readonly situacao = computed(() => rotuloStatusEncontro(this.encontro().status));

  protected readonly posicoes = computed<readonly PosicaoTrilhaDto[]>(() => {
    const encontroAtual = this.encontro();
    const meuId = this.meuCombatenteId();
    return this.combatentes().map((combatente) => {
      const ativa = combatenteEhDaVez(combatente, encontroAtual);
      const agiu = combatenteJaAgiu(combatente, encontroAtual);
      const voce = meuId !== null && combatente.id === meuId;
      return {
        combatente,
        ativa,
        agiu,
        sigla: siglaDoCombatente(combatente.nome),
        voce,
        subtitulo: voce ? 'Você' : this.subtituloDe(combatente),
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
    // Sem ninguém agindo (montagem), o jogador tem o item dele à vista.
    const ativa =
      lista?.querySelector<HTMLElement>('.trilha__item--ativa') ??
      lista?.querySelector<HTMLElement>('.trilha__item--voce');
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
