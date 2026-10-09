import type { IconeNome } from '../../shared/icone/icone.component';
import { descreverCondicao } from "../../shared/condicoes/condicoes";

/**
 * As três condições rastreadas na ficha (Sistema vigente — "Condições": Morrendo, Machucado,
 * Inconsciente). Este descritor fornece apresentação, sem calcular ou alterar estado. Centralizado
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
  readonly descricao: string;
}

/** As três condições, na ordem de exibição (mais grave → menos grave). */
export const CONDICOES_FICHA: readonly DescritorCondicao[] = [
  { chave: 'morrendo', rotulo: 'Morrendo', icone: 'morrendo',
    descricao: descreverCondicao("Morrendo") },
  { chave: 'inconsciente', rotulo: 'Inconsciente', icone: 'inconsciente',
    descricao: descreverCondicao("Inconsciente") },
  { chave: 'machucado', rotulo: 'Machucado', icone: 'machucado',
    descricao: descreverCondicao("Machucado") },
];
