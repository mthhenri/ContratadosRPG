import { Component, input } from '@angular/core';

/**
 * Nomes de ícone suportados. Os seis primeiros são as abas da calculadora (batem com o
 * `caminho` da rota); os dez seguintes são as categorias do catálogo de compras + amplificador;
 * depois (m2-09) topbar, autenticação e campanhas (nav, dropdown de perfil, chips de papel,
 * ações); e por fim as seis abas da ficha (batem com o `id` da aba — Visão Geral, Combate,
 * Inventário, Habilidades, Sanidade, Rolagens); e por fim as três condições rastreadas na ficha
 * (`sistema-v4.1.0.md` — "Condições"; m2-16b), usadas no editor e no mini-card de campanha; e
 * `infinito`, marca de lesão permanente na aba Sanidade; `alerta`, sinal de sobrecarga na linha
 * "Inventário"; `camadas`/`teto`, toggles "não conta no total/teto" das modificações de item; e
 * `busca`, botão de busca de itens na aba Inventário; `duplicar`, ação de clonar uma ficha no
 * painel da campanha (m3-52); `d20`, gatilho da barra lateral de histórico de rolagens
 * (campanha e ficha); e `fragmento-construtor`/`fragmento-potencializador`, variantes do
 * diamante genérico `fragmento` com um selo no canto inferior direito (martelo/estrela) —
 * usadas só onde a categoria específica importa (abas do catálogo, select de item custom);
 * o `fragmento` genérico continua valendo pros demais usos (filtro, badge "de Fragmento"); as
 * duas AÇÕES do fragmento Potencializador seguem o mesmo padrão "2 ícones em 1" de
 * `fragmento-construtor`/`fragmento-potencializador` (diamante menor + selo no canto inferior
 * direito), pra não repetir o diamante puro: `link` (Aplicar em... — selo de elo de corrente) e
 * `chama` (Consumir — selo de chama, o fragmento é destruído); e `modificador` (±), rótulo do
 * stepper de modificador de teste na edição de atributos — mesmo papel que `dado` cumpre pro
 * rótulo do stepper de ajuste de dados, ao lado.
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
  | 'fragmento-construtor'
  | 'fragmento-potencializador'
  | 'link'
  | 'chama'
  | 'dado'
  | 'morrendo'
  | 'machucado'
  | 'inconsciente'
  | 'infinito'
  | 'alerta'
  | 'camadas'
  | 'teto'
  | 'busca'
  | 'duplicar'
  | 'd20'
  | 'modificador';

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
