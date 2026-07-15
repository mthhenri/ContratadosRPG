import { TestBed } from '@angular/core/testing';

import type { FichaAtributosDto, FichaRolagemDto } from '@contratados-rpg/shared/dtos/ficha';

import { FichaRolagens } from './ficha-rolagens.component';

/**
 * Prova o editor da aba Rolagens (m3-15): adicionar/editar/remover presets e **rolar** — reusando
 * `shared/regras/rolagem` (nenhuma regra de dados no componente). Controlado: cada mutação emite a
 * lista inteira por `rolagensMudou`.
 */
describe('FichaRolagens', () => {
  const atributos: FichaAtributosDto = {
    destreza: 2,
    forca: 6,
    luta: 3,
    pontaria: 1,
    vigor: 4,
    intelecto: 1,
    medicina: 1,
    sentidos: 2,
    social: 1,
    vontade: 3,
  };

  function montar(rolagens: readonly FichaRolagemDto[], editavel = true) {
    TestBed.configureTestingModule({ imports: [FichaRolagens] });
    const fixture = TestBed.createComponent(FichaRolagens);
    fixture.componentRef.setInput('rolagens', rolagens);
    fixture.componentRef.setInput('atributos', atributos);
    fixture.componentRef.setInput('editavel', editavel);
    const emitidos: (readonly FichaRolagemDto[])[] = [];
    fixture.componentInstance.rolagensMudou.subscribe((lista) => emitidos.push(lista));
    fixture.detectChanges();
    return { fixture, componentInstance: fixture.componentInstance, emitidos };
  }

  it('adiciona um preset (nome + fórmula) e emite a lista', () => {
    const alvo = montar([]);
    alvo.componentInstance['abrirNovo']();
    alvo.componentInstance['form'].setValue({ nome: '  Ataque  ', formula: '  1d20 + LUT  ', descricao: '' });
    alvo.componentInstance['confirmar']();
    expect(alvo.emitidos[0]).toEqual([{ nome: 'Ataque', formula: '1d20 + LUT' }]);
  });

  it('edita um preset existente substituindo-o na lista', () => {
    const alvo = montar([{ nome: 'A', formula: '1d20' }]);
    alvo.componentInstance['editar'](0);
    alvo.componentInstance['form'].setValue({ nome: 'A+', formula: '1d20+FOR', descricao: 'nota' });
    alvo.componentInstance['confirmar']();
    expect(alvo.emitidos[0]).toEqual([{ nome: 'A+', formula: '1d20+FOR', descricao: 'nota' }]);
  });

  it('remove um preset', () => {
    const alvo = montar([
      { nome: 'A', formula: '1d20' },
      { nome: 'B', formula: '1d6' },
    ]);
    alvo.componentInstance['confirmarRemocao'](0);
    expect(alvo.emitidos[0]).toEqual([{ nome: 'B', formula: '1d6' }]);
  });

  it('rola um preset e guarda um resultado com total dentro da faixa', () => {
    const alvo = montar([{ nome: 'Ataque', formula: '1d20+LUT+2' }]);
    alvo.componentInstance['rolar'](0);
    const resultado = alvo.componentInstance['presets']()[0].resultado;
    expect(resultado).not.toBeNull();
    // 1d20 (1..20) + LUT (3) + 2 → total em [6, 25].
    expect(resultado!.total).toBeGreaterThanOrEqual(6);
    expect(resultado!.total).toBeLessThanOrEqual(25);
    expect(resultado!.dados[0].valores).toHaveLength(1);
  });

  it('marca fórmula inválida no VM e não permite rolar', () => {
    const alvo = montar([{ nome: 'Ruim', formula: 'abc' }]);
    const vm = alvo.componentInstance['presets']()[0];
    expect(vm.formulaValida).toBe(false);
    alvo.componentInstance['rolar'](0);
    expect(alvo.componentInstance['presets']()[0].resultado).toBeNull();
  });
});
