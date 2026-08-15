import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { TipoDanoEnum } from '@contratados-rpg/shared/enums';
import type { FichaCriaturaResistenciaDto } from '@contratados-rpg/shared/dtos/ficha';

import { CriaturaResistenciaLista } from './criatura-resistencia-lista.component';

describe('CriaturaResistenciaLista', () => {
  const itens: FichaCriaturaResistenciaDto[] = [
    { tipo: TipoDanoEnum.BALISTICO, subtipo: null, valor: 10 },
  ];

  function montar(editavel = true) {
    TestBed.configureTestingModule({ imports: [CriaturaResistenciaLista] });
    const fixture = TestBed.createComponent(CriaturaResistenciaLista);
    fixture.componentRef.setInput('itens', itens);
    fixture.componentRef.setInput('titulo', 'Resistências');
    fixture.componentRef.setInput('editavel', editavel);
    fixture.detectChanges();
    const emitidos: (readonly FichaCriaturaResistenciaDto[])[] = [];
    fixture.componentInstance.itensMudou.subscribe((e) => emitidos.push(e));
    return { fixture, raiz: fixture.nativeElement as HTMLElement, emitidos };
  }

  it('lista os itens existentes com tipo e valor (variante grade, padrão de Resistências)', () => {
    const { raiz } = montar(false);
    const tipos = Array.from(raiz.querySelectorAll('.resistencia-lista__grade-tipo')).map((n) => n.textContent?.trim());
    expect(tipos).toEqual(['Balístico']);
  });

  it('lista os itens existentes com tipo e valor (variante lista, usada em Fraquezas)', () => {
    TestBed.configureTestingModule({ imports: [CriaturaResistenciaLista] });
    const fixture = TestBed.createComponent(CriaturaResistenciaLista);
    fixture.componentRef.setInput('itens', itens);
    fixture.componentRef.setInput('titulo', 'Fraquezas');
    fixture.componentRef.setInput('editavel', false);
    fixture.componentRef.setInput('variante', 'fraqueza');
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    const tipos = Array.from(raiz.querySelectorAll('.resistencia-lista__tipo')).map((n) => n.textContent?.trim());
    expect(tipos).toEqual(['Balístico']);
  });

  it('adiciona um item e emite a lista inteira', () => {
    const alvo = montar(true);
    alvo.fixture.componentInstance['adicionar']();
    alvo.fixture.componentInstance['itemForm'].setValue({ tipo: TipoDanoEnum.QUIMICO, subtipo: '', valor: 5 });
    alvo.fixture.componentInstance['confirmar']();

    expect(alvo.emitidos).toHaveLength(1);
    expect(alvo.emitidos[0]).toEqual([...itens, { tipo: TipoDanoEnum.QUIMICO, subtipo: null, valor: 5 }]);
  });

  it('remove um item e emite a lista sem ele', () => {
    const alvo = montar(true);
    alvo.fixture.componentInstance['pedirRemocao'](0);
    alvo.fixture.componentInstance['remover'](0);

    expect(alvo.emitidos).toHaveLength(1);
    expect(alvo.emitidos[0]).toEqual([]);
  });
});
