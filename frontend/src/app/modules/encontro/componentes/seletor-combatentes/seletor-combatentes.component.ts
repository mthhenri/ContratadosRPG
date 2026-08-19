import { Component, computed, input, output } from '@angular/core';

import type { EncontroCombatenteResumoDto } from '@contratados-rpg/shared/dtos/encontro';
import type { FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';
import { TipoFichaEnum } from '@contratados-rpg/shared/enums';

import { Icone } from '../../../../shared/icone/icone.component';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import { rotuloNivelAmeaca } from '../../../ficha/rotulos-criatura';
import { rotuloClasseCompleto } from '../../../ficha/rotulos-ficha';

/**
 * Seletor de combatentes — o painel que **substitui** o antigo `<select>` de "Ficha da campanha".
 * Mostra um cartão sumarizado de cada ficha da campanha, separado por linha: **Agentes**,
 * **Criaturas** e (quando existirem) **NPCs**. Clicar alterna a presença da ficha no encontro —
 * é um seletor de participação, não um formulário: reabrir o painel já mostra marcado quem está em
 * campo, e clicar num marcado **remove**. O combatente avulso (sem ficha) tem um fluxo à parte
 * (`Adicionar avulso`), porque não há ficha nenhuma para escolher.
 *
 * Componente **burro**: recebe as fichas da campanha e o estado atual do encontro, e só emite a
 * intenção de alternar uma ficha — quem decide se isso é um `POST /combatente` ou um
 * `DELETE /combatente/:id` é a página, que já tem a chamada aos dois endpoints.
 */
@Component({
  selector: 'app-seletor-combatentes',
  imports: [Icone, Tooltip],
  templateUrl: './seletor-combatentes.component.html',
  styleUrl: './seletor-combatentes.component.scss',
})
export class SeletorCombatentes {
  /** Todas as fichas da campanha — jogador e criatura (NPC entra sozinho quando existir, M4). */
  readonly fichas = input.required<readonly FichaResumoDto[]>();

  /** Combatentes já no encontro — usado só para saber quais fichas estão marcadas. */
  readonly combatentes = input.required<readonly EncontroCombatenteResumoDto[]>();

  /** Trava os cartões enquanto uma chamada está em voo (mesmo sinal `emOperacao` da página). */
  readonly desabilitado = input(false);

  /** A ficha clicada — a página decide se isso adiciona ou remove. */
  readonly fichaAlternada = output<FichaResumoDto>();

  protected readonly TipoFichaEnum = TipoFichaEnum;
  protected readonly rotuloClasseCompleto = rotuloClasseCompleto;

  /** Ids de ficha que já têm um combatente no encontro — o que fica "marcado" no cartão. */
  private readonly fichaIdsNoEncontro = computed<ReadonlySet<number>>(
    () =>
      new Set(
        this.combatentes()
          .map((combatente) => combatente.fichaId)
          .filter((fichaId): fichaId is number => fichaId !== null),
      ),
  );

  protected readonly agentes = computed<readonly FichaResumoDto[]>(() =>
    this.fichas().filter(
      (ficha) => ficha.tipo !== TipoFichaEnum.CRIATURA && ficha.tipo !== TipoFichaEnum.NPC,
    ),
  );

  protected readonly criaturas = computed<readonly FichaResumoDto[]>(() =>
    this.fichas().filter((ficha) => ficha.tipo === TipoFichaEnum.CRIATURA),
  );

  /** Vazio até o M4 entregar a criação de NPC — a linha só aparece quando há o que mostrar. */
  protected readonly npcs = computed<readonly FichaResumoDto[]>(() =>
    this.fichas().filter((ficha) => ficha.tipo === TipoFichaEnum.NPC),
  );

  protected marcada(ficha: FichaResumoDto): boolean {
    return this.fichaIdsNoEncontro().has(ficha.id);
  }

  /** "Combatente - Mercenário · Nível 3" — mesmo rótulo combinado do mini-card da campanha. */
  protected metaAgente(ficha: FichaResumoDto): string {
    return `${rotuloClasseCompleto(ficha.classe, ficha.arquetipo)} · Nível ${ficha.nivel}`;
  }

  /** "Ameaça · Média · VD 37" — mesmo par NA/VD do "Guia de Criação de Ameaças". */
  protected metaCriatura(ficha: FichaResumoDto): string {
    const partes: string[] = [];
    if (ficha.na) {
      partes.push(`Ameaça · ${rotuloNivelAmeaca(ficha.na)}`);
    }
    if (ficha.vd !== null && ficha.vd !== undefined) {
      partes.push(`VD ${ficha.vd}`);
    }
    return partes.join(' · ');
  }

  protected alternar(ficha: FichaResumoDto): void {
    if (!this.desabilitado()) {
      this.fichaAlternada.emit(ficha);
    }
  }
}
