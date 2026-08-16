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

  it('mostra o tipo abreviado no box da grade, com o nome inteiro no rótulo acessível', () => {
    const { raiz } = montar(false);
    const box = raiz.querySelector('.resistencia-lista__grade-tipo')!;
    expect(box.textContent?.trim()).toBe('Balíst.');
    expect(box.getAttribute('aria-label')).toBe('Balístico');
    expect(raiz.querySelector('.resistencia-lista__grade-valor')?.textContent?.trim()).toBe('10');
  });

  it('na variante lista, o item sem subtipo mostra o próprio tipo como texto principal', () => {
    TestBed.configureTestingModule({ imports: [CriaturaResistenciaLista] });
    const fixture = TestBed.createComponent(CriaturaResistenciaLista);
    fixture.componentRef.setInput('itens', itens);
    fixture.componentRef.setInput('titulo', 'Fraquezas');
    fixture.componentRef.setInput('editavel', false);
    fixture.componentRef.setInput('variante', 'fraqueza');
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector('.resistencia-lista__tipo')).toBeNull();
    expect(raiz.querySelector('.resistencia-lista__subtipo')?.textContent?.trim()).toBe('Balístico');
    expect(raiz.querySelector('.resistencia-lista__valor')?.textContent?.trim()).toBe('+10');
  });

  it('na variante lista, o item com subtipo mostra tipo em cima e subtipo como texto principal', () => {
    TestBed.configureTestingModule({ imports: [CriaturaResistenciaLista] });
    const fixture = TestBed.createComponent(CriaturaResistenciaLista);
    fixture.componentRef.setInput('itens', [{ tipo: TipoDanoEnum.EXPLOSAO, subtipo: 'Concussivo', valor: 20 }]);
    fixture.componentRef.setInput('titulo', 'Fraquezas');
    fixture.componentRef.setInput('editavel', false);
    fixture.componentRef.setInput('variante', 'fraqueza');
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector('.resistencia-lista__tipo')?.textContent?.trim()).toBe('Explosão');
    expect(raiz.querySelector('.resistencia-lista__subtipo')?.textContent?.trim()).toBe('Concussivo');
  });

  it('só mostra editar/remover por item depois de ativar o modo de edição (variante grade)', () => {
    const { fixture, raiz } = montar(true);
    expect(raiz.querySelector('.resistencia-lista__grade-acoes')).toBeNull();

    fixture.componentInstance['alternarModoEdicao']();
    fixture.detectChanges();
    expect(raiz.querySelector('.resistencia-lista__grade-acoes')).not.toBeNull();

    fixture.componentInstance['alternarModoEdicao']();
    fixture.detectChanges();
    expect(raiz.querySelector('.resistencia-lista__grade-acoes')).toBeNull();
  });

  it('só mostra editar/remover por item depois de ativar o modo de edição (variante lista)', () => {
    TestBed.configureTestingModule({ imports: [CriaturaResistenciaLista] });
    const fixture = TestBed.createComponent(CriaturaResistenciaLista);
    fixture.componentRef.setInput('itens', itens);
    fixture.componentRef.setInput('titulo', 'Fraquezas');
    fixture.componentRef.setInput('editavel', true);
    fixture.componentRef.setInput('variante', 'fraqueza');
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector('.resistencia-lista__acoes')).toBeNull();

    fixture.componentInstance['alternarModoEdicao']();
    fixture.detectChanges();
    expect(raiz.querySelector('.resistencia-lista__acoes')).not.toBeNull();
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
