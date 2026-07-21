import { Component, input } from '@angular/core';

/**
 * Nomes de ícone suportados. Os seis primeiros são as abas da calculadora (batem com o
 * `caminho` da rota); os dez seguintes são as categorias do catálogo de compras + amplificador;
 * depois (m2-09) topbar, autenticação e campanhas (nav, dropdown de perfil, chips de papel,
 * ações); e por fim as seis abas da ficha (batem com o `id` da aba — Visão Geral, Combate,
 * Inventário, Habilidades, Sanidade, Rolagens); e por fim as três condições rastreadas na ficha
 * (`sistema-v4.1.0.md` — "Condições"; m2-16b), usadas no editor e no mini-card de campanha; e
 * `infinito`, marca de lesão permanente na aba Sanidade.
 */
export type IconeNome =
  | 'agente'
  | 'dt'
  | 'novo-agente'
  | 'patente'
  | 'descanso'
  | 'compras'
  | 'vendas'
  | 'corpo-a-corpo'
  | 'explosivos'
  | 'armas-de-fogo'
  | 'municoes'
  | 'protecoes'
  | 'exoticos'
  | 'armazenamento'
  | 'operacional'
  | 'medicinal'
  | 'amplificador'
  | 'campanhas'
  | 'calculadora'
  | 'sair'
  | 'entrar'
  | 'chevron'
  | 'copiar'
  | 'check'
  | 'mais'
  | 'convite'
  | 'coroa'
  | 'atualizar'
  | 'voltar'
  | 'editar'
  | 'excluir'
  | 'olho'
  | 'olho-fechado'
  | 'tema'
  | 'visao-geral'
  | 'combate'
  | 'inventario'
  | 'habilidades'
  | 'sanidade'
  | 'rolagens'
  | 'anotacoes'
  | 'vestida'
  | 'guardada'
  | 'fragmento'
  | 'dado'
  | 'morrendo'
  | 'machucado'
  | 'inconsciente'
  | 'infinito';

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
