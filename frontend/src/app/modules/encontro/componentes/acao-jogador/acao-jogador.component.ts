import { Component, computed, input, output } from '@angular/core';

import { EncontroStatusEnum } from '@contratados-rpg/shared/enums';

import { Icone } from '../../../../shared/icone/icone.component';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import { Botao } from '../../../../shared/ui/botao/botao.component';

/** Qual leitura o bloco faz do momento — decide texto e botão; o template só desenha. */
type ModoAcaoJogador =
  | 'encerrado'
  | 'assistindo'
  | 'rolar'
  | 'aguardando'
  | 'minha-vez'
  | 'vez-de-outro';

/**
 * Bloco de ação do jogador (`ui-39`) — mora no topo da trilha de turnos, logo abaixo dos
 * contadores Rodada/Turno. É a contrapartida do jogador à `app-conducao-turno` do mestre: em vez
 * de conduzir o combate, ele faz só o que lhe cabe — rolar a **própria** iniciativa e encerrar a
 * **própria** vez. Herda a moldura "acesa" (accent) da condução: acende quando há algo a fazer.
 *
 * Leituras: **rolar** (montagem, sem iniciativa), **aguardando** (montagem, já rolou),
 * **minha vez** (com o botão de avançar), **vez de outro** (quem age e quantos turnos faltam até a
 * vez do jogador), **assistindo** (sem combatente em campo) e **encerrado** (só o estado).
 *
 * Componente **burro**: emite intenções; quem chama o `EncontroService` (e faz a rolagem pelo
 * preset da ficha) é a página. Nenhuma regra de iniciativa vive aqui — `turnosAteAVez`,
 * `acoesRestantes` e `podeRolar` chegam prontos.
 */
@Component({
  selector: 'app-acao-jogador',
  imports: [Icone, Tooltip, Botao],
  templateUrl: './acao-jogador.component.html',
  styleUrl: './acao-jogador.component.scss',
  host: {
    role: 'region',
    'aria-label': 'Sua ação no combate',
    '[class.acao--acesa]': 'acesa()',
  },
})
export class AcaoJogador {
  readonly status = input.required<EncontroStatusEnum>();
  /** Sem combatente do jogador em campo (ou só espectador). */
  readonly assistindo = input(false);
  /** O turno atual é do combatente do jogador. */
  readonly minhaVez = input(false);
  /** Nome de quem age agora — `null` fora do combate. */
  readonly nomeDaVez = input<string | null>(null);
  /** Turnos que ainda restam a quem age agora nesta rodada, contando o atual. */
  readonly acoesRestantes = input(0);
  /** Turnos até a vez do jogador (`turnosAteAVez`); `null` se ele não está na ordem. */
  readonly turnosAteAVez = input<number | null>(null);
  /** Montagem, combatente do jogador em campo e ainda sem iniciativa. */
  readonly podeRolar = input(false);
  /** O mestre chamou a rolagem de iniciativa — acende o bloco. */
  readonly chamado = input(false);
  /** Iniciativa do jogador, já rolada — `null` enquanto não rolou. */
  readonly minhaIniciativa = input<number | null>(null);
  /** Uma escrita em voo: trava os botões para não duplicar a mutação. */
  readonly emOperacao = input(false);

  readonly rolar = output<void>();
  readonly avancar = output<void>();

  protected readonly modo = computed<ModoAcaoJogador>(() => {
    const status = this.status();
    if (status === EncontroStatusEnum.ENCERRADO) {
      return 'encerrado';
    }
    if (this.assistindo()) {
      return 'assistindo';
    }
    if (status === EncontroStatusEnum.MONTAGEM) {
      return this.podeRolar() ? 'rolar' : 'aguardando';
    }
    return this.minhaVez() ? 'minha-vez' : 'vez-de-outro';
  });

  protected readonly emCombate = computed(() => this.status() === EncontroStatusEnum.ATIVO);

  /** Há algo a fazer agora: a moldura acende. */
  protected readonly acesa = computed(
    () => this.modo() === 'minha-vez' || (this.modo() === 'rolar' && this.chamado()),
  );

  /** "Faltam N turnos para a sua vez." — a leitura de quem espera, com o singular e o vazio. */
  protected readonly textoDaEspera = computed(() => {
    const faltam = this.turnosAteAVez();
    if (faltam === null) {
      return 'Você entra na ordem na próxima rodada.';
    }
    return faltam === 1 ? 'Você é o próximo.' : `Faltam ${faltam} turnos para a sua vez.`;
  });
}
