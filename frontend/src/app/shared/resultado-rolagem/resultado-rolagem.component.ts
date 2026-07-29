import { Component, computed, input } from '@angular/core';

import type { DadosRoladosDto, ResultadoRolagemDto } from '@contratados-rpg/shared/regras/rolagem';

/**
 * Renderização do **resultado** de uma rolagem (total, pool de dados, grupos de dano, modificadores)
 * — extraído da bandeja de dados (m3-22) em m3-27 para ser reusado também no histórico da ficha e
 * no feed da campanha, sem duplicar a lógica de detalhamento (proibição de duplicar apresentação
 * do motor). Só apresentação; a rolagem em si já veio pronta (`ResultadoRolagemDto`).
 */
@Component({
  selector: 'app-resultado-rolagem',
  imports: [],
  templateUrl: './resultado-rolagem.component.html',
  styleUrl: './resultado-rolagem.component.scss',
})
export class ResultadoRolagem {
  readonly resultado = input.required<ResultadoRolagemDto>();

  /**
   * Resultados a exibir (m3-46): sem repetição `#N`, é só o próprio resultado; com `subResultados`
   * (2+ rolagens independentes de `(<fórmula>)#N`), são todas elas.
   */
  protected readonly resultadosExibidos = computed<readonly ResultadoRolagemDto[]>(
    () => this.resultado().subResultados ?? [this.resultado()],
  );

  /**
   * Se a rolagem deve ganhar o realce de **crítico** (m3-30): ou foi uma rolagem de crítico (dano
   * dobrado), ou algum termo bateu a margem de crítico (`cm`). Usado para o glow no total e no ◆.
   */
  protected ehCritico(resultado: ResultadoRolagemDto): boolean {
    return resultado.critico === true || resultado.dados.some((dado) => (dado.criticos ?? 0) > 0);
  }

  /**
   * Marca cada valor rolado de um termo como **mantido** ou **descartado** (m3-29), replicando a
   * separação por multiset do motor (preserva a ordem e trata duplicados). Sem keep (`mantidos`
   * ausente), todos contam como mantidos — a UI então não aplica realce.
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
   * Modificadores planos de uma rolagem (m3-22) — atributos/fontes aplicados (`+ FOR 6`) e a
   * constante — como texto. Os **dados rolados** aparecem à parte, em chips; aqui vai só o que
   * somou fora dos dados. Vazio quando não há modificadores.
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
