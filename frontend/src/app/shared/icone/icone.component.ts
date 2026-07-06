import { Component, input } from '@angular/core';

/**
 * Nomes de ícone suportados. Os seis primeiros são as abas da calculadora (batem com o
 * `caminho` da rota); os demais são as categorias do catálogo de compras.
 */
export type IconeNome =
  | 'agente'
  | 'dt'
  | 'novo-agente'
  | 'patente'
  | 'descanso'
  | 'compras'
  | 'corpo-a-corpo'
  | 'explosivos'
  | 'armas-de-fogo'
  | 'municoes'
  | 'protecoes'
  | 'exoticos'
  | 'armazenamento'
  | 'operacional'
  | 'medicinal'
  | 'amplificador';

/**
 * Ícone monocromático de linha (SVG inline, `stroke: currentColor`) — reutilizado nos menus de
 * abas da calculadora e nas categorias da aba `compras`. **Não é emoji** (o tema "Terminal de
 * Contenção" proíbe emoji decorativo — por isso os `⚔ 🎯 …` do site antigo foram removidos nas
 * m1-06/m1-10): é um traço técnico que herda a cor do texto do controle (inclusive o accent no
 * estado ativo) e escala com a fonte (`1.15em`). Puramente decorativo → `aria-hidden`.
 */
@Component({
  selector: 'app-icone',
  imports: [],
  templateUrl: './icone.component.html',
  styleUrl: './icone.component.scss',
})
export class Icone {
  /** Qual glifo desenhar. */
  readonly nome = input.required<IconeNome>();
}
