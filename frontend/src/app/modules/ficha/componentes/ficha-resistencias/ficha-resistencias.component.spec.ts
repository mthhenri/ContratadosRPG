import { TestBed } from '@angular/core/testing';
import { TipoDanoEnum } from '@contratados-rpg/shared/enums';
import type { ResistenciaLinhaDto } from '@contratados-rpg/shared/regras/agente';

import { AjusteResistencia, FichaResistencias } from './ficha-resistencias.component';

/**
 * Prova o bloco "Resistências" (I-029: extraído de `FichaVisualizacao`/`FichaCampanhaCard`, onde
 * vivia duplicado byte a byte) — as 5 linhas de `TipoDanoEnum`, edição no próprio lugar da base
 * manual gated por `ajustavelAmplo`.
 */
describe('FichaResistencias', () => {
  const linhas: readonly ResistenciaLinhaDto[] = [
    { tipo: TipoDanoEnum.FISICO, total: 3, manual: 1, equipamento: 2, formacao: 0 },
    { tipo: TipoDanoEnum.BALISTICO, total: 1, manual: 0, equipamento: 1, formacao: 0 },
    { tipo: TipoDanoEnum.EXPLOSAO, total: 0, manual: 0, equipamento: 0, formacao: 0 },
    { tipo: TipoDanoEnum.QUIMICO, total: 0, manual: 0, equipamento: 0, formacao: 0 },
    { tipo: TipoDanoEnum.GERAL, total: 2, manual: 2, equipamento: 0, formacao: 0 },
  ];

  function montar(opts: { ajustavelAmplo?: boolean; compacto?: boolean } = {}) {
    TestBed.configureTestingModule({ imports: [FichaResistencias] });
    const fixture = TestBed.createComponent(FichaResistencias);
    fixture.componentRef.setInput('linhas', linhas);
    fixture.componentRef.setInput('ajustavelAmplo', opts.ajustavelAmplo ?? true);
    fixture.componentRef.setInput('compacto', opts.compacto ?? false);
    fixture.detectChanges();
    const emitidos: AjusteResistencia[] = [];
    fixture.componentInstance.ajusteResistencia.subscribe((e) => emitidos.push(e));
    return { fixture, raiz: fixture.nativeElement as HTMLElement, emitidos };
  }

  it('lista as 5 linhas com abreviação e total, em leitura quando não ajustável', () => {
    const { raiz } = montar({ ajustavelAmplo: false });
    const abrevs = Array.from(raiz.querySelectorAll('.ficha-resistencia__abrev')).map((n) =>
      n.textContent?.trim(),
    );
    const valores = Array.from(raiz.querySelectorAll('.ficha-resistencia__valor')).map((n) =>
      n.textContent?.trim(),
    );
    expect(abrevs).toEqual(['Físico', 'Balíst.', 'Explos.', 'Químico', 'Geral']);
    expect(valores).toEqual(['3', '1', '0', '0', '2']);
    expect(raiz.querySelectorAll('app-valor-editavel')).toHaveLength(0);
  });

  it('confirmar a digitação de uma resistência emite o override (tipo + valor)', () => {
    const { fixture, emitidos } = montar({ ajustavelAmplo: true });
    fixture.componentInstance['editarResistencia'](TipoDanoEnum.FISICO);
    fixture.componentInstance['confirmarResistencia'](TipoDanoEnum.FISICO, '5');
    expect(emitidos).toEqual([{ tipo: TipoDanoEnum.FISICO, valor: 5 }]);
  });

  it('confirmar sem mudar a base manual não emite nada', () => {
    const { fixture, emitidos } = montar({ ajustavelAmplo: true });
    fixture.componentInstance['editarResistencia'](TipoDanoEnum.FISICO);
    fixture.componentInstance['confirmarResistencia'](TipoDanoEnum.FISICO, '1');
    expect(emitidos).toHaveLength(0);
  });

  it('aplica a classe de densidade compacta no host da grade quando [compacto]', () => {
    const { raiz } = montar({ compacto: true });
    expect(raiz.querySelector('.ficha-resistencias--compacto')).not.toBeNull();
  });
});
