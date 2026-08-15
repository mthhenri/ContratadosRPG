import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { CustoAcaoEnum, TipoDanoEnum } from '@contratados-rpg/shared/enums';
import type { FichaCriaturaAtaqueDto } from '@contratados-rpg/shared/dtos/ficha';

import { CriaturaAtaqueLista } from './criatura-ataque-lista.component';

describe('CriaturaAtaqueLista', () => {
  const itens: FichaCriaturaAtaqueDto[] = [
    { nome: 'Golpe de Pedra', atributo: 'luta', custoAcao: CustoAcaoEnum.PADRAO, dano: '4D12+10', tipoDano: TipoDanoEnum.FISICO, area: false },
  ];

  function montar(editavel = true) {
    TestBed.configureTestingModule({ imports: [CriaturaAtaqueLista] });
    const fixture = TestBed.createComponent(CriaturaAtaqueLista);
    fixture.componentRef.setInput('itens', itens);
    fixture.componentRef.setInput('editavel', editavel);
    fixture.detectChanges();
    const emitidos: (readonly FichaCriaturaAtaqueDto[])[] = [];
    const rolados: FichaCriaturaAtaqueDto[] = [];
    fixture.componentInstance.itensMudou.subscribe((e) => emitidos.push(e));
    fixture.componentInstance.rolarAtaque.subscribe((a) => rolados.push(a));
    return { fixture, raiz: fixture.nativeElement as HTMLElement, emitidos, rolados };
  }

  it('lista os ataques com nome e dano', () => {
    const { raiz } = montar(false);
    const nomes = Array.from(raiz.querySelectorAll('.ataque-lista__nome')).map((n) => n.textContent?.trim());
    expect(nomes).toEqual(['Golpe de Pedra']);
  });

  it('emite rolarAtaque ao clicar no botão de dado', () => {
    const alvo = montar(false);
    (alvo.raiz.querySelector('.ataque-lista__rolar') as HTMLButtonElement).click();
    expect(alvo.rolados).toEqual([itens[0]]);
  });

  it('adiciona um ataque e emite a lista inteira', () => {
    const alvo = montar(true);
    alvo.fixture.componentInstance['adicionar']();
    alvo.fixture.componentInstance['itemForm'].setValue({
      nome: 'Investida', atributo: 'forca', custoAcao: CustoAcaoEnum.COMPLETA,
      dano: '6D12+16', tipoDano: TipoDanoEnum.FISICO, area: false, efeito: '',
    });
    alvo.fixture.componentInstance['confirmar']();

    expect(alvo.emitidos[0]).toEqual([
      ...itens,
      { nome: 'Investida', atributo: 'forca', custoAcao: CustoAcaoEnum.COMPLETA, dano: '6D12+16', tipoDano: TipoDanoEnum.FISICO, area: false },
    ]);
  });
});
