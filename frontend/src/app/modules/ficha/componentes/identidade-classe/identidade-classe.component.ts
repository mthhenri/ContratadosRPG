import { Component, computed, input } from '@angular/core';

import type { ArquetipoEnum, ClasseEnum } from '@contratados-rpg/shared/enums';

import { Icone } from '../../../../shared/icone/icone.component';
import { iconesIdentidade } from '../../../../shared/icone/icones-dominio';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import { perfilClasseRotulos } from '../../rotulos-ficha';

/**
 * Identidade de um agente em texto, com o ícone de cada parte (`icones-identidade-cards-agente`): "Combatente - Lutador",
 * "Combatente - Experimento Bestial" ou "Civil" — o mesmo texto de `rotuloClasseCompleto`, com o ícone da classe-base e o
 * do arquétipo/subclasse antes de cada nome (`icone--texto`, com `appTooltip` do nome). Só apresentação: a divisão em
 * duas partes vem de `perfilClasseRotulos` e os desenhos de `iconesIdentidade`; sem ícone de "tipo" (decisão do autor).
 * Onde a identidade aparece em chips ou em linhas com estilo próprio, o consumidor usa os mesmos dois mapas direto.
 */
@Component({
  selector: 'app-identidade-classe',
  imports: [Icone, Tooltip],
  templateUrl: './identidade-classe.component.html',
  styleUrl: './identidade-classe.component.scss',
})
export class IdentidadeClasse {
  readonly classe = input.required<ClasseEnum>();
  readonly arquetipo = input<ArquetipoEnum | null>(null);

  protected readonly perfil = computed(() => perfilClasseRotulos(this.classe(), this.arquetipo()));
  protected readonly icones = computed(() => iconesIdentidade(this.classe(), this.arquetipo()));
}
