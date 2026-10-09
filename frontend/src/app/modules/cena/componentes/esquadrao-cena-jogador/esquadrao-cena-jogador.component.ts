import { Component, computed, input, output } from '@angular/core';
import type { CampanhaMembroResumoDto } from '@contratados-rpg/shared/dtos/campanha';
import type { FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';
import { TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';

import { agruparFichasPorMembro, condicoesAtivas, montarEquipeExibicao, ordenarMembros } from '../../../campanha/campanha-equipe.util';
import { Botao } from '../../../../shared/ui/botao/botao.component';
import { Cartao } from '../../../../shared/ui/cartao/cartao.component';
import { Chip } from '../../../../shared/ui/chip/chip.component';
import { EstadoVazio } from '../../../../shared/ui/estado-vazio/estado-vazio.component';
import { Icone } from '../../../../shared/icone/icone.component';
import { PreviewAvatar } from '../../../../shared/preview-avatar/preview-avatar.directive';
import { Tooltip } from "../../../../shared/tooltip/tooltip.directive";

/** Esquadrão já redigido pelo backend para quem observa a Investigação. */
@Component({
  selector: 'app-esquadrao-cena-jogador',
  imports: [Botao, Cartao, Chip, EstadoVazio, Icone, PreviewAvatar, Tooltip],
  templateUrl: './esquadrao-cena-jogador.component.html',
  styleUrl: './esquadrao-cena-jogador.component.scss',
})
export class EsquadraoCenaJogador {
  readonly membros = input.required<readonly CampanhaMembroResumoDto[]>();
  readonly fichas = input.required<readonly FichaResumoDto[]>();
  readonly usuarioObservadorId = input<number | null>(null);
  readonly abrirFicha = output<number>();

  protected readonly condicoesAtivas = condicoesAtivas;
  protected readonly equipe = computed(() =>
    montarEquipeExibicao(
      ordenarMembros(this.membros()),
      agruparFichasPorMembro(this.fichas()),
    ).filter((item) =>
      item.membro.papel === TipoCampanhaMembroPapelEnum.JOGADOR && item.fichas.length > 0,
    ),
  );
}
