import { Component, computed, input, output } from '@angular/core';

import { EncontroStatusEnum } from '@contratados-rpg/shared/enums';

import { Icone } from '../../../../shared/icone/icone.component';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import { Botao } from '../../../../shared/ui/botao/botao.component';
import { BotaoIcone } from '../../../../shared/ui/botao-icone/botao-icone.component';

/**
 * Barra de condução do mestre (`ui-37`) — a "vez" no topo do palco. Três leituras do mesmo
 * bloco, conforme o estado do encontro:
 *
 * - **Em combate:** voltar · quem age agora e quantas ações lhe restam · avançar (a ação primária,
 *   que a mesa repete a cada turno) · Encerrar.
 * - **Em montagem:** ninguém age; a barra vira as ações de montar a ordem — Pedir iniciativa,
 *   Rolar iniciativas e Iniciar combate, com as mesmas condições de `disabled` de sempre.
 * - **Encerrado:** só o estado — o encontro é de leitura.
 *
 * Componente **burro**: emite intenções; quem chama o `EncontroService` (e confirma o Encerrar) é
 * a página. Nenhuma regra de iniciativa vive aqui — `faltamIniciativas`/`temCombatentes` chegam
 * prontos.
 */
@Component({
  selector: 'app-conducao-turno',
  imports: [Icone, Tooltip, Botao, BotaoIcone],
  templateUrl: './conducao-turno.component.html',
  styleUrl: './conducao-turno.component.scss',
  host: {
    role: 'region',
    'aria-label': 'Condução do turno',
    '[class.conducao--acesa]': 'emCombate()',
  },
})
export class ConducaoTurno {
  readonly status = input.required<EncontroStatusEnum>();
  /** Nome de quem age agora — `null` fora do combate. */
  readonly nomeDaVez = input<string | null>(null);
  /** Turnos que ainda restam a quem age agora nesta rodada, contando o atual. */
  readonly acoesRestantes = input(0);
  /** Uma escrita em voo: trava todos os controles para não duplicar a mutação. */
  readonly emOperacao = input(false);
  readonly temCombatentes = input(false);
  readonly faltamIniciativas = input(false);

  readonly voltar = output<void>();
  readonly avancar = output<void>();
  readonly encerrar = output<void>();
  readonly pedirIniciativa = output<void>();
  readonly rolarIniciativas = output<void>();
  readonly iniciar = output<void>();

  protected readonly emCombate = computed(() => this.status() === EncontroStatusEnum.ATIVO);
  protected readonly emMontagem = computed(() => this.status() === EncontroStatusEnum.MONTAGEM);

  protected readonly podeIniciar = computed(
    () => this.temCombatentes() && !this.faltamIniciativas(),
  );
}
