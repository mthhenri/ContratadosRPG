import { Component, computed, inject } from '@angular/core';

import type { DadosRoladosDto, ResultadoRolagemDto } from '@contratados-rpg/shared/regras/rolagem';

import { BandejaDadosService } from './bandeja-dados.service';

/** Largura fixa da carta e gap (casam com o SCSS) — usados para manter a mais nova centralizada. */
const LARGURA_CARTA = 320;
const GAP_CARTAS = 12;

/**
 * Bandeja de dados flutuante (m3-22): fixa na base central da tela, exibe as rolagens recentes
 * empilhadas (teste de atributo da Visão Geral, passos de preset). Lê o estado de
 * `BandejaDadosService`; não rola nada — só apresenta. Container preparado para "dados físicos" (3D)
 * numa feature futura. Só tokens do tema "Terminal de Contenção" (proibição #29).
 */
@Component({
  selector: 'app-bandeja-dados',
  imports: [],
  templateUrl: './bandeja-dados.component.html',
  styleUrl: './bandeja-dados.component.scss',
})
export class BandejaDados {
  protected readonly bandeja = inject(BandejaDadosService);

  /**
   * Desloca a pilha (px) para a **esquerda** de modo que a carta mais nova (índice 0) fique sempre
   * centralizada na tela; as anteriores acumulam à esquerda dela. 0 quando há uma só (já centrada).
   */
  protected readonly deslocamento = computed(
    () => (-(this.bandeja.entradas().length - 1) * (LARGURA_CARTA + GAP_CARTAS)) / 2,
  );

  /** Opacidade por posição: a mais nova (índice 0, centralizada) cheia; o histórico à esquerda esmaece. */
  protected opacidade(indice: number): number {
    return Math.max(0.3, 1 - indice * 0.22);
  }

  /**
   * Marca cada valor rolado de um termo como **mantido** ou **descartado** (m3-27), replicando a
   * separação por multiset do motor (preserva a ordem e trata duplicados). Sem keep (`mantidos` ausente),
   * todos contam como mantidos — a UI então não aplica realce.
   */
  protected dadosMarcados(dado: DadosRoladosDto): { readonly valor: number; readonly mantido: boolean }[] {
    if (!dado.mantidos) {
      return dado.valores.map((valor) => ({ valor, mantido: true }));
    }
    const restante = new Map<number, number>();
    for (const valor of dado.mantidos) {
      restante.set(valor, (restante.get(valor) ?? 0) + 1);
    }
    return dado.valores.map((valor) => {
      const disponivel = restante.get(valor) ?? 0;
      if (disponivel > 0) {
        restante.set(valor, disponivel - 1);
        return { valor, mantido: true };
      }
      return { valor, mantido: false };
    });
  }

  /**
   * Modificadores planos de uma rolagem (m3-22) — atributos/fontes aplicados (`+ FOR 6`) e a constante
   * — como texto. Os **dados rolados** aparecem à parte, em chips; aqui vai só o que somou fora dos
   * dados. Vazio quando não há modificadores (a bandeja omite a legenda).
   */
  protected modificadoresSoma(resultado: ResultadoRolagemDto): string {
    const partes: string[] = [];
    resultado.atributos.forEach((atributo) => {
      const sinal = atributo.valor < 0 ? '−' : '+';
      partes.push(`${sinal} ${atributo.rotulo} ${Math.abs(atributo.valor)}`);
    });
    if (resultado.constante !== 0) {
      partes.push(`${resultado.constante < 0 ? '−' : '+'} ${Math.abs(resultado.constante)}`);
    }
    return partes.join(' ');
  }
}
