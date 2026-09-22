import { Component, computed, input, output } from '@angular/core';

import type { EncontroCombatenteResumoDto } from '@contratados-rpg/shared/dtos/encontro';
import { NivelAmeacaEnum, TipoDanoEnum, TipoFichaEnum } from '@contratados-rpg/shared/enums';

import { FocoImagem } from '../../../../shared/foco-imagem.directive';
import { Icone } from '../../../../shared/icone/icone.component';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import { BarraRecurso } from '../../../../shared/ui/barra-recurso/barra-recurso.component';
import { BotaoIcone } from '../../../../shared/ui/botao-icone/botao-icone.component';
import { Chip } from '../../../../shared/ui/chip/chip.component';
import { rotuloNivelAmeaca } from '../../../ficha/rotulos-criatura';
import {
  defesasDoCombatente,
  linhaOrigemDoCombatente,
  siglaDoCombatente,
  turnosPorRodadaDoCombatente,
} from '../../encontro-leitura.util';

/** Uma caixa de Resistência: rótulo curto, total e o sufixo BEM da cor do tipo de dano. */
interface ResistenciaExibidaDto {
  readonly tipo: TipoDanoEnum;
  readonly rotulo: string;
  readonly sufixo: string;
  readonly valor: number;
}

/** Ordem, rótulo de glance e sufixo de cor por tipo de dano — a mesma da ficha de campanha. */
const RESISTENCIAS: readonly Omit<ResistenciaExibidaDto, 'valor'>[] = [
  { tipo: TipoDanoEnum.FISICO, rotulo: 'Físico', sufixo: 'fisico' },
  { tipo: TipoDanoEnum.BALISTICO, rotulo: 'Balíst.', sufixo: 'balistico' },
  { tipo: TipoDanoEnum.EXPLOSAO, rotulo: 'Explos.', sufixo: 'explosao' },
  { tipo: TipoDanoEnum.QUIMICO, rotulo: 'Químico', sufixo: 'quimico' },
  { tipo: TipoDanoEnum.GERAL, rotulo: 'Geral', sufixo: 'geral' },
];

/**
 * Ficha resumida de quem age agora, na visão do mestre (`ui-37`): foto quadrada, origem e nome,
 * barras de Vida/Energia, Reações e Resistências — o que o mestre consulta a cada turno sem abrir
 * a ficha. As caixas de Reações e Resistências reproduzem `.ficha-mini`/`.ficha-resistencia` da
 * ficha de campanha (mesma receita, mesma paleta `--dano-*`).
 *
 * **A regra vence o mockup (§16 #27).** Só desenha o que existe: a criatura não reage (só Defesa),
 * o avulso não tem defesas nem resistências e o NPC tem `resistencias: null` (contrato ainda não
 * tipado) — esses grupos simplesmente não aparecem.
 *
 * Componente **burro**: recebe o combatente já resolvido e emite só o pedido de abrir a ficha.
 */
@Component({
  selector: 'app-resumo-combatente',
  imports: [FocoImagem, Icone, Tooltip, BarraRecurso, BotaoIcone, Chip],
  templateUrl: './resumo-combatente.component.html',
  styleUrl: './resumo-combatente.component.scss',
  host: {
    '[style.--cor-ficha]': 'combatente().corFicha',
  },
})
export class ResumoCombatente {
  readonly combatente = input.required<EncontroCombatenteResumoDto>();
  /** Nível de Ameaça da criatura, para o chip "Ameaça · Alta". Nulo para os demais. */
  readonly nivelAmeaca = input<NivelAmeacaEnum | null>(null);

  /** Pedido de abrir a ficha completa (janela flutuante — quem hospeda decide). */
  readonly abrirFicha = output<void>();

  protected readonly sigla = computed(() => siglaDoCombatente(this.combatente().nome));
  protected readonly origem = computed(() => linhaOrigemDoCombatente(this.combatente()));

  protected readonly ehCriatura = computed(
    () => this.combatente().tipoFicha === TipoFichaEnum.CRIATURA,
  );

  /** `Ameaça · Alta` — só para criatura; sem o nível resolvido, só `Ameaça`. */
  protected readonly rotuloAmeaca = computed(() => {
    const nivel = this.nivelAmeaca();
    return nivel ? `Ameaça · ${rotuloNivelAmeaca(nivel)}` : 'Ameaça';
  });

  /** `Cadência N` — nulo quando ele tem só o turno padrão (seria ruído em todo agente). */
  protected readonly cadencia = computed<string | null>(() => {
    const turnos = turnosPorRodadaDoCombatente(this.combatente());
    return turnos > 1 ? `Cadência ${turnos}` : null;
  });

  protected readonly temEnergia = computed(() => this.combatente().energiaMaxima !== null);

  /** As defesas que o combatente possui, no nome por extenso — a caixa tem largura para ele. */
  protected readonly reacoes = computed(() => defesasDoCombatente(this.combatente()));

  /**
   * O agente sem Contra-ataque mostra a caixa tracejada "—" (a ficha de campanha faz o mesmo): a
   * ausência de uma reação do agente é informação, a da criatura/NPC não.
   */
  protected readonly mostrarContraAusente = computed(() => {
    const combatente = this.combatente();
    return combatente.tipoFicha === TipoFichaEnum.JOGADOR && combatente.contraAtaque === null;
  });

  /** Cinco tipos de dano, sempre na mesma ordem; `null` (NPC/avulso) esconde o grupo inteiro. */
  protected readonly resistencias = computed<readonly ResistenciaExibidaDto[] | null>(() => {
    const totais = this.combatente().resistencias;
    if (totais === null) {
      return null;
    }
    return RESISTENCIAS.map((resistencia) => ({
      ...resistencia,
      valor: totais[resistencia.tipo] ?? 0,
    }));
  });
}
