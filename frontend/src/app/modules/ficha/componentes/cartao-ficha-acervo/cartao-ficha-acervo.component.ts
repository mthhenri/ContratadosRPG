import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TipoFichaEnum } from '@contratados-rpg/shared/enums';

import { Icone } from '../../../../shared/icone/icone.component';
import { BotaoIcone } from '../../../../shared/ui/botao-icone/botao-icone.component';

/**
 * Ficha do acervo já enriquecida pro cartão (m4-11) — recorte de `FichaResumoDto` + os rótulos já
 * resolvidos no cliente (`classeTexto`/`patenteTexto`/`naTexto`, ver `AcervoPage.itens`). Os
 * campos abaixo de `tipo` são opcionais porque só um subconjunto se aplica a cada tipo — o
 * componente lê só os do seu próprio recorte (ver tabela do `m4-11-acervo-por-tipo.spec.md`).
 */
export interface ItemAcervo {
  readonly id: number;
  readonly tipo: TipoFichaEnum;
  readonly nome: string;
  /** Cor de identidade visual (m3-61) — alimenta borda/listras do avatar (`--cor-ficha`). */
  readonly cor: string | null;
  /** Avatar da ficha (m3-62) — `null` sem imagem definida (cai no placeholder decorativo). */
  readonly imagemUrl: string | null;
  readonly campanhaId: number | null;
  readonly campanhaNome: string | null;
  readonly vidaAtual: number;
  readonly vidaMaxima?: number;
  /** JOGADOR — `rotuloClasseCompleto` (classe + arquétipo/subclasse). */
  readonly classeTexto?: string;
  readonly nivel?: number;
  /** JOGADOR — Patente derivada do Prestígio (`rotuloPatente`). */
  readonly patenteTexto?: string;
  readonly energiaAtual?: number;
  readonly energiaMaxima?: number;
  /** CRIATURA — Nível de Ameaça já rotulado (`rotuloNivelAmeaca`). */
  readonly naTexto?: string;
  readonly vd?: number | null;
  /** CRIATURA (e, futuramente, JOGADOR quando a classe possui) — Defesa. */
  readonly defesa?: number;
}

/**
 * Cartão único do acervo (m4-11), com recorte de meta/vitais por tipo — extraído de
 * `AcervoPage` (`acervo.page.ts`, que já tinha 15k e cresceria mais um `@if` por tipo) para os
 * três blocos (Agentes/Criaturas/NPCs) reusarem o mesmo componente sem duplicar moldura/avatar/
 * chip/régua/kebab. Só apresenta e emite eventos — o menu (⋯) e o preview ampliado do avatar
 * continuam na raiz da página (`AcervoPage`, `position: fixed`, cortados pelo `appOverflowFade`
 * do `<ul>` se vivessem aqui dentro — mesmo problema/correção já documentados no acervo e em
 * `CampanhaDetalhe`, m3-52).
 */
@Component({
  selector: 'app-cartao-ficha-acervo',
  imports: [RouterLink, Icone, BotaoIcone],
  templateUrl: './cartao-ficha-acervo.component.html',
  styleUrl: './cartao-ficha-acervo.component.scss',
})
export class CartaoFichaAcervo {
  readonly item = input.required<ItemAcervo>();
  readonly menuAberto = input(false);

  /** Kebab clicado — a página calcula a posição `fixed` a partir do `MouseEvent` (`alternarMenuFicha`). */
  readonly menu = output<MouseEvent>();
  readonly avatarHover = output<MouseEvent>();
  readonly avatarSaida = output<void>();

  protected readonly TipoFichaEnum = TipoFichaEnum;

  /** Link do card por tipo (m4-11): `JOGADOR` → `/fichas/:id`; `CRIATURA` → `/fichas/criatura/:id`. */
  protected readonly rota = computed<readonly (string | number)[]>(() => {
    const item = this.item();
    return item.tipo === TipoFichaEnum.CRIATURA
      ? ['/fichas', 'criatura', item.id]
      : ['/fichas', item.id];
  });
}
