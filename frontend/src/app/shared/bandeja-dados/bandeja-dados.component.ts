import { Component, HostListener, computed, inject, signal } from '@angular/core';

import type { DadosRoladosDto, ResultadoRolagemDto } from '@contratados-rpg/shared/regras/rolagem';

import { BandejaDadosService, type EntradaBandeja } from './bandeja-dados.service';

/** Largura máxima da carta (casa com o SCSS) — usada em telas largas o bastante para acomodá-la. */
const LARGURA_CARTA_MAXIMA = 640;
const GAP_CARTAS = 12;
/** Margem lateral mínima reservada no mobile (m3-56) — casa com o `calc(100vw - 32px)` do SCSS. */
const MARGEM_LATERAL_MINIMA = 32;

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

  /** Largura da viewport (m3-56) — reativa via `window:resize`, usada para encolher a carta no mobile. */
  private readonly larguraJanela = signal(window.innerWidth);

  @HostListener('window:resize')
  protected aoRedimensionarJanela(): void {
    this.larguraJanela.set(window.innerWidth);
  }

  /**
   * Largura real da carta (m3-56): a máxima de 640px (m3-55) quando a viewport comporta, encolhida
   * pra caber com folga (`MARGEM_LATERAL_MINIMA`) em telas de 360-430px — sem isso a carta ficava
   * clipada (`overflow-x: clip` do container) em vez de simplesmente menor. Exposta como CSS custom
   * property (`--bandeja-carta-largura`, ver SCSS) pra `width`/`flex-basis` da carta e usada aqui
   * também no cálculo do deslocamento — as duas fontes ficam sempre em sincronia.
   */
  protected readonly larguraCarta = computed(() =>
    Math.min(LARGURA_CARTA_MAXIMA, this.larguraJanela() - MARGEM_LATERAL_MINIMA),
  );

  /**
   * Desloca a pilha (px) para a **esquerda** de modo que a carta mais nova (índice 0) fique sempre
   * centralizada na tela; as anteriores acumulam à esquerda dela. 0 quando há uma só (já centrada).
   * Conta só as cartas **não** `saindo`: uma carta em saída já colapsa pra largura 0 via CSS (m3-55);
   * se o desvio só reagisse depois que ela some do array (280ms depois, em `remover`), a pilha dava
   * um salto adicional bem depois do colapso — visível só com 2+ cartas (com 1 só, o desvio é sempre 0).
   */
  protected readonly deslocamento = computed(() => {
    const visiveis = this.bandeja.entradas().filter((entrada) => !entrada.saindo).length;
    return (-Math.max(visiveis - 1, 0) * (this.larguraCarta() + GAP_CARTAS)) / 2;
  });

  /** Opacidade por posição: a mais nova (índice 0, centralizada) cheia; o histórico à esquerda esmaece. */
  protected opacidade(indice: number): number {
    return Math.max(0.3, 1 - indice * 0.22);
  }

  /**
   * Resultados a exibir **dentro de uma mesma carta** (m3-46): sem repetição `#N`, é só o próprio
   * resultado; com `subResultados` (2+ rolagens independentes de `(<fórmula>)#N`), são todas elas —
   * a carta empilha um bloco de total+dados por rolagem, em vez de abrir uma carta por repetição.
   */
  protected resultadosExibidos(entrada: EntradaBandeja): readonly ResultadoRolagemDto[] {
    return entrada.resultado.subResultados ?? [entrada.resultado];
  }

  /**
   * Se a rolagem deve ganhar o realce de **crítico** (m3-30): ou foi uma rolagem de crítico (dano
   * dobrado), ou algum termo bateu a margem de crítico (`cm`). Usado para o glow no total e no ◆.
   */
  protected ehCritico(resultado: ResultadoRolagemDto): boolean {
    return resultado.critico === true || resultado.dados.some((dado) => (dado.criticos ?? 0) > 0);
  }

  /**
   * Marca cada valor rolado de um termo como **mantido** ou **descartado** (m3-29), replicando a
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
