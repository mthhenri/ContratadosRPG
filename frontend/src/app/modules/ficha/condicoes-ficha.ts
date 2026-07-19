import type { IconeNome } from '../../shared/icone/icone.component';

/**
 * As três condições rastreadas na ficha (`sistema-v4.1.0.md` — "Condições": Morrendo, Machucado,
 * Inconsciente — m2-16b). Alternadas **manualmente** pelo dono/mestre, não computadas a partir de
 * Vida/Energia — mesma filosofia de m3-10 (o estado narrativo é refletido por quem joga). Centralizado
 * aqui porque tanto o editor da ficha (`ficha-visualizacao`) quanto o mini-card embutido no detalhe da
 * campanha (`CampanhaDetalhe`) precisam do mesmo trio chave/rótulo/ícone, sem duplicar a lista.
 */
export interface CondicoesFicha {
  readonly morrendo: boolean;
  readonly machucado: boolean;
  readonly inconsciente: boolean;
}

/** Descritor de uma condição (chave + rótulo + ícone dedicado). */
export interface DescritorCondicao {
  readonly chave: keyof CondicoesFicha;
  readonly rotulo: string;
  readonly icone: IconeNome;
}

/** As três condições, na ordem de exibição (mais grave → menos grave). */
export const CONDICOES_FICHA: readonly DescritorCondicao[] = [
  { chave: 'morrendo', rotulo: 'Morrendo', icone: 'morrendo' },
  { chave: 'inconsciente', rotulo: 'Inconsciente', icone: 'inconsciente' },
  { chave: 'machucado', rotulo: 'Machucado', icone: 'machucado' },
];
