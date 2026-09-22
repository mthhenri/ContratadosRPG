import { Component, input, output, signal } from '@angular/core';

import { TipoDanoEnum } from '@contratados-rpg/shared/enums';
import type { ResistenciaLinhaDto } from '@contratados-rpg/shared/regras/agente';

import { ValorEditavel } from '../../../../shared/ui/valor-editavel/valor-editavel.component';

/** Override manual da base de uma resistência (ajuste pós-m3-36). */
export interface AjusteResistencia {
  readonly tipo: TipoDanoEnum;
  readonly valor: number;
}

/**
 * Bloco "Resistências" (os 5 tipos de dano) — extraído de `FichaVisualizacao` e
 * `FichaCampanhaCard` (`I-029`), onde vivia duplicado byte a byte salvo o `ajustavelAmplo` e a
 * densidade visual (ver `compacto`). Estado de edição é local: cada instância guarda só a própria
 * linha em digitação.
 */
@Component({
  selector: 'app-ficha-resistencias',
  imports: [ValorEditavel],
  templateUrl: './ficha-resistencias.component.html',
  styleUrl: './ficha-resistencias.component.scss',
})
export class FichaResistencias {
  readonly linhas = input.required<readonly ResistenciaLinhaDto[]>();
  readonly ajustavelAmplo = input(false);
  /**
   * Densidade compacta (`FichaCampanhaCard`, carteirinha): fileira em grade de 5 colunas iguais,
   * cor só na borda. Sem o flag (`FichaVisualizacao`, ficha completa): fileira flex que cresce pra
   * preencher a coluna, cor também no valor — a divergência visual real entre os dois hosts.
   */
  readonly compacto = input(false);

  readonly ajusteResistencia = output<AjusteResistencia>();

  protected readonly abreviacaoResistencia: Record<TipoDanoEnum, string> = {
    [TipoDanoEnum.FISICO]: 'Físico',
    [TipoDanoEnum.BALISTICO]: 'Balíst.',
    [TipoDanoEnum.EXPLOSAO]: 'Explos.',
    [TipoDanoEnum.QUIMICO]: 'Químico',
    [TipoDanoEnum.GERAL]: 'Geral',
  };

  private static readonly SUFIXO_TIPO_DANO: Record<TipoDanoEnum, string> = {
    [TipoDanoEnum.FISICO]: 'fisico',
    [TipoDanoEnum.BALISTICO]: 'balistico',
    [TipoDanoEnum.EXPLOSAO]: 'explosao',
    [TipoDanoEnum.QUIMICO]: 'quimico',
    [TipoDanoEnum.GERAL]: 'geral',
  };

  protected classeResistencia(tipo: TipoDanoEnum): string {
    return `ficha-resistencia ficha-resistencia--${FichaResistencias.SUFIXO_TIPO_DANO[tipo]}`;
  }

  protected readonly editandoResistencia = signal<TipoDanoEnum | null>(null);

  protected editarResistencia(tipo: TipoDanoEnum): void {
    this.editandoResistencia.set(tipo);
  }

  protected cancelarResistencia(): void {
    this.editandoResistencia.set(null);
  }

  protected confirmarResistencia(tipo: TipoDanoEnum, texto: string): void {
    if (this.editandoResistencia() !== tipo) {
      return;
    }
    this.editandoResistencia.set(null);
    const bruto = Number.parseInt(texto, 10);
    const manualAtual = this.linhas().find((linha) => linha.tipo === tipo)?.manual ?? 0;
    if (!Number.isNaN(bruto) && bruto !== manualAtual) {
      this.ajusteResistencia.emit({ tipo, valor: bruto });
    }
  }
}
