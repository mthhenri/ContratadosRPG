import { Component, computed, input, signal } from '@angular/core';

import type {
  EncontroCombatenteResumoDto,
  EncontroEventoDto,
} from '@contratados-rpg/shared/dtos/encontro';
import { EncontroEventoTipoEnum } from '@contratados-rpg/shared/enums';

import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';

/**
 * Uma linha do log já pronta para desenhar. O `texto` chega do backend como uma frase inteira
 * ("K. Amaral gastou 4 de Energia"), e o mockup destaca **o nome** dentro dela — daí a quebra em
 * três pedaços em vez de um `texto` só: o nome é recortado por posição (`indexOf`), nunca por
 * regex, e some quando o evento não é de ninguém.
 */
interface EntradaLogExibidaDto {
  readonly id: number;
  /** `R3` para a virada de rodada; `T3 · 2` para o que aconteceu dentro de um turno. */
  readonly marcador: string;
  readonly antes: string;
  readonly nome: string;
  readonly depois: string;
  /** Mudança de estado ("ficou Morrendo", "perdeu o turno") — o nome sai no accent (mockup). */
  readonly alerta: boolean;
}

/**
 * **Log da rodada** (m7-07) — a trilha legível do que aconteceu no encontro, fiel ao painel
 * homônimo de `docs/design/examples/iniciativa-desktop.html`: marcador de rodada/turno à esquerda,
 * nome do combatente em destaque e o texto do evento.
 *
 * **Componente burro, sem regra nenhuma.** As entradas chegam prontas de `encontro_evento` (m7-04),
 * com o texto já redigido pela `EncontroService` — aqui não se monta frase, não se deduz estado e
 * não se consulta nada. O que este componente faz é **apresentação**: ordenar do mais recente para
 * o mais antigo, recortar por rodada e destacar o nome.
 *
 * **Recorte por rodada.** A tela abre na **rodada corrente** e revela as anteriores uma a uma, sob
 * demanda. Combinado com o teto do repositório (as 100 entradas mais recentes), um combate longo
 * nunca despeja o histórico inteiro na tela de uma vez.
 *
 * **Tempo real de graça.** O log viaja dentro do próprio `EncontroRecuperadoDto`, então cada
 * `encontro:alterado` (§9, broadcast-only) já traz as entradas novas — não há polling nem uma
 * segunda assinatura aqui.
 *
 * **Revelação (m7-06).** O recorte de quem pode ler o quê é do backend: um evento preso a um
 * combatente que o jogador não pode ver **não chega** a esta lista. O componente desenha o que
 * recebeu.
 */
@Component({
  selector: 'app-log-encontro',
  imports: [Tooltip],
  templateUrl: './log-encontro.component.html',
  styleUrl: './log-encontro.component.scss',
})
export class LogEncontro {
  /** Entradas do encontro, como vieram do backend (mais recente primeiro). */
  readonly eventos = input.required<readonly EncontroEventoDto[]>();

  /** Combatentes do encontro — só para resolver `combatenteId` → nome exibido. */
  readonly combatentes = input<readonly EncontroCombatenteResumoDto[]>([]);

  /** Rodada em que o combate está: o topo da janela visível. */
  readonly rodadaAtual = input(1);

  /** Quantas rodadas o painel está mostrando, contando da corrente para trás. */
  private readonly rodadasReveladas = signal(1);

  /** A rodada mais antiga em exibição — abaixo dela, o log fica recolhido. */
  private readonly rodadaMinimaVisivel = computed(() =>
    Math.max(1, this.rodadaAtual() - this.rodadasReveladas() + 1),
  );

  /** `true` quando o painel está mostrando mais do que a rodada corrente. */
  protected readonly expandido = computed(() => this.rodadasReveladas() > 1);

  private readonly nomePorCombatenteId = computed<ReadonlyMap<number, string>>(
    () => new Map(this.combatentes().map((combatente) => [combatente.id, combatente.nome])),
  );

  /**
   * As entradas visíveis, da mais recente para a mais antiga. A ordenação por `id` decrescente
   * repete a do repositório de propósito: o componente recebe uma lista de fora e não tem como
   * saber quem a montou — ordenar aqui custa uma linha e o deixa correto sozinho.
   */
  protected readonly entradas = computed<readonly EntradaLogExibidaDto[]>(() => {
    const minima = this.rodadaMinimaVisivel();
    const nomes = this.nomePorCombatenteId();
    return [...this.eventos()]
      .filter((evento) => evento.rodada >= minima)
      .sort((primeiro, segundo) => segundo.id - primeiro.id)
      .map((evento) => this.montarEntrada(evento, nomes));
  });

  /** `true` enquanto sobrar rodada anterior entre as entradas já carregadas. */
  protected readonly temRodadasAnteriores = computed(() => {
    const minima = this.rodadaMinimaVisivel();
    return this.eventos().some((evento) => evento.rodada < minima);
  });

  /** Abre mais uma rodada para trás. */
  protected revelarRodadaAnterior(): void {
    this.rodadasReveladas.update((quantidade) => quantidade + 1);
  }

  /** Volta o painel à rodada corrente. */
  protected recolher(): void {
    this.rodadasReveladas.set(1);
  }

  /** Quebra a frase do evento em `antes + nome + depois`, quando o nome está mesmo nela. */
  private montarEntrada(
    evento: EncontroEventoDto,
    nomes: ReadonlyMap<number, string>,
  ): EntradaLogExibidaDto {
    const marcador =
      evento.tipo === EncontroEventoTipoEnum.RODADA_INICIADA
        ? `R${evento.rodada}`
        : `T${evento.rodada} · ${evento.turno}`;
    const alerta = evento.tipo === EncontroEventoTipoEnum.ESTADO_ALTERADO;
    const nome = evento.combatenteId === null ? undefined : nomes.get(evento.combatenteId);
    const posicao = nome === undefined ? -1 : evento.texto.indexOf(nome);

    // Combatente removido do encontro (ou evento de rodada): sem nome a destacar, a frase inteira
    // sai como está — o log continua legível, só não ganha o realce.
    if (nome === undefined || posicao < 0) {
      return { id: evento.id, marcador, antes: evento.texto, nome: '', depois: '', alerta };
    }
    return {
      id: evento.id,
      marcador,
      antes: evento.texto.slice(0, posicao),
      nome,
      depois: evento.texto.slice(posicao + nome.length),
      alerta,
    };
  }
}
