import { Component, input, output, signal } from '@angular/core';

import { Tooltip } from '../../../../shared/tooltip/tooltip.directive';
import { ValorEditavel } from '../../../../shared/ui/valor-editavel/valor-editavel.component';
import { ChaveInfoExtra, InfoExtra } from '../../status-derivado';

/** Override manual de um derivado editado (Defesa/Esquiva/Bloqueio/Contra-ataque). */
export interface AjusteDerivado {
  readonly chave: ChaveInfoExtra;
  readonly valor: number | string;
}

/**
 * Bloco "Reações" (Defesa/Esquiva/Bloqueio/Contra-ataque) — extraído de `FichaVisualizacao` e
 * `FichaCampanhaCard` (`I-029`), onde vivia duplicado byte a byte salvo o booleano `ajustavelAmplo`.
 * Estado de edição (`editandoDerivado`) é local ao componente: a página completa mantém sua própria
 * cópia do mesmo mecanismo para os demais derivados da aba Status/Combate (Deslocamento,
 * Percepção...), que não fazem parte deste bloco.
 */
@Component({
  selector: 'app-ficha-reacoes',
  imports: [Tooltip, ValorEditavel],
  templateUrl: './ficha-reacoes.component.html',
  styleUrl: './ficha-reacoes.component.scss',
})
export class FichaReacoes {
  /** Defesa/Esquiva/Bloqueio — as três primeiras linhas de `combateLinhas()` da página-mãe. */
  readonly linhas = input.required<readonly InfoExtra[]>();
  /** Contra-ataque — só existe quando o agente tem a habilidade "Contra-Ataque". */
  readonly contraAtaqueLinha = input.required<InfoExtra>();
  readonly temContraAtaque = input(false);
  readonly ajustavelAmplo = input(false);
  /**
   * Densidade compacta (`FichaCampanhaCard`, carteirinha): grade fixa de 4 colunas iguais, valor em
   * 13px. Sem o flag (`FichaVisualizacao`, ficha completa): fileira flex que cresce para preencher a
   * coluna, Contra-ataque um pouco mais largo — a única divergência visual real entre os dois hosts.
   */
  readonly compacto = input(false);

  readonly ajusteDerivado = output<AjusteDerivado>();

  protected readonly editandoDerivado = signal<ChaveInfoExtra | null>(null);

  protected editarDerivado(chave: ChaveInfoExtra): void {
    this.editandoDerivado.set(chave);
  }

  protected cancelarDerivado(): void {
    this.editandoDerivado.set(null);
  }

  protected confirmarDerivado(info: InfoExtra, texto: string): void {
    if (this.editandoDerivado() !== info.chave) {
      return;
    }
    this.editandoDerivado.set(null);
    if (info.tipo === 'numero') {
      const bruto = Number.parseInt(texto, 10);
      if (!Number.isNaN(bruto) && bruto !== info.bruto) {
        this.ajusteDerivado.emit({ chave: info.chave, valor: bruto });
      }
      return;
    }
    const aparado = texto.trim();
    if (aparado && aparado !== info.bruto) {
      this.ajusteDerivado.emit({ chave: info.chave, valor: aparado });
    }
  }
}
