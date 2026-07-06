import { Injectable, signal } from '@angular/core';

/** Nome de cada aba da calculadora cujo estado de formulário é preservado em memória (m1-17). */
export type AbaCalculadoraComEstado = 'agente' | 'dt' | 'novo-agente' | 'patente' | 'descanso';

/**
 * Singleton em memória (`providedIn: 'root'`) que preserva o valor bruto do formulário de cada
 * aba da calculadora enquanto a SPA está viva. As abas são rotas lazy que destroem/recriam o
 * componente ao navegar; sem este service, trocar de aba e voltar zerava o formulário. Cada
 * página lê o estado salvo ao montar (senão usa seu preset inicial) e o grava de volta a cada
 * mudança.
 *
 * **Só memória — sem I/O.** Não há `localStorage`/`sessionStorage`/cookie aqui: um reload (F5)
 * recria o service vazio e as abas voltam ao preset inicial, exatamente como antes desta task.
 * A aba `compras` fica de fora — ela mantém seu próprio mecanismo de `localStorage` (m1-11) e
 * não duplica estado aqui. Usa Signals (não `Subject`) para acompanhar o padrão do projeto
 * (SYSTEM.SPEC §8).
 */
@Injectable({ providedIn: 'root' })
export class EstadoAbasCalculadoraService {
  /** Valor bruto do formulário de cada aba, indexado pelo nome da aba. Só em memória. */
  private readonly estados = signal<ReadonlyMap<AbaCalculadoraComEstado, unknown>>(new Map());

  /**
   * Valor bruto salvo da aba nesta sessão, ou `undefined` se ela ainda não foi preenchida — a
   * página então usa seu preset inicial. O tipo do valor é o valor bruto da própria página, que
   * a informa no parâmetro genérico.
   */
  obterEstado<TValorBruto>(aba: AbaCalculadoraComEstado): TValorBruto | undefined {
    return this.estados().get(aba) as TValorBruto | undefined;
  }

  /** Guarda o valor bruto atual do formulário da aba, sobrescrevendo o anterior. */
  definirEstado<TValorBruto>(aba: AbaCalculadoraComEstado, valorBruto: TValorBruto): void {
    const proximo = new Map(this.estados());
    proximo.set(aba, valorBruto);
    this.estados.set(proximo);
  }
}
