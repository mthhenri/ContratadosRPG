import { Component, input, output } from '@angular/core';
import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';

import { BarraRecurso } from '../../../../shared/ui/barra-recurso/barra-recurso.component';
import { BotaoIcone } from '../../../../shared/ui/botao-icone/botao-icone.component';
import { Icone } from '../../../../shared/icone/icone.component';
import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';

/**
 * Criatura da grade "Criaturas" da visão de mestre — recorte enxuto de `FichaResumoDto`
 * (`tipo === CRIATURA`), já com os enums de apresentação (`porte`/`comportamento`/`na`) traduzidos
 * pela página-mãe, mesmo padrão de `classeTexto` em `ItemFicha`/`EspectadorFichaCardDados`.
 */
export interface CriaturaEsquadraoCardDados {
  readonly id: number;
  readonly usuarioId: number;
  readonly imagemUrl: string | null;
  readonly cor: string | null;
  readonly nome: string;
  /** "SCP-049" (`FichaCriaturaDadosDto.registro`) ou o placeholder sem registro — já resolvido pela página-mãe. */
  readonly registroTexto: string;
  readonly porteTexto: string;
  readonly comportamentoTexto: string;
  readonly naTexto: string;
  readonly vidaAtual: number;
  readonly vidaMaxima?: number;
  readonly defesa?: number;
  /** Vida ≤ 0 — mesmo limiar/receita de `ItemFicha.critico`. */
  readonly critico: boolean;
}

/**
 * Cartão de criatura da grade "Criaturas" (visão de mestre) — análogo aprovado
 * `EspectadorFichaCard` (Esquadrão de jogadores da mesma tela): mesma moldura, avatar hachurado
 * com o botão "Abrir ficha", barra de Vida (`app-barra-recurso`) e faixa "Última rolagem"
 * full-width no rodapé. Só Defesa aparece na linha de reação — criatura não tem Esquiva/Bloqueio/
 * Contra-ataque de verdade (`guia_de_mestre-v4.0.0.md`: ela nunca reage a ataques). O avatar fica
 * no tamanho que a criatura já usava (100×100, menor que os 128×128 do jogador) — pedido do autor,
 * não um esquecimento.
 *
 * O menu "⋯" (abrir ficha completa/duplicar/remover da campanha/excluir) é sempre visível aqui —
 * este cartão só existe na grade do mestre, nunca num modo só-leitura. O dropdown em si segue fora
 * deste componente, montado pelo consumidor — mesmo `menuFichaAberto` que já cobre o cartão de
 * jogador, generalizado para aceitar os dois tipos de ficha.
 */
@Component({
  selector: 'app-criatura-esquadrao-card',
  imports: [BarraRecurso, BotaoIcone, Icone, Tooltip],
  templateUrl: './criatura-esquadrao-card.component.html',
  styleUrl: './criatura-esquadrao-card.component.scss',
})
export class CriaturaEsquadraoCard {
  readonly criatura = input.required<CriaturaEsquadraoCardDados>();
  /** `null` sem rolagem daquela criatura na página do feed já carregada (nunca "nunca rolou"). */
  readonly ultimaRolagem = input<RolagemResumoDto | null>(null);
  readonly ultimaRolagemTempo = input<string | null>(null);
  /** Se o menu "⋯" DESTE cartão está aberto — controlado pelo pai, como `EspectadorFichaCard`. */
  readonly menuAberto = input(false);

  readonly abrirFicha = output<void>();
  readonly alternarMenu = output<MouseEvent>();
}
