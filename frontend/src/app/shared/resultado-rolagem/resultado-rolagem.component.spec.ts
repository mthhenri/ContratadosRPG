import { TestBed } from '@angular/core/testing';

import { TipoDanoEnum } from '@contratados-rpg/shared/enums';
import type { ResultadoRolagemDto } from '@contratados-rpg/shared/regras/rolagem';
import { ResultadoRolagem } from './resultado-rolagem.component';

/**
 * Prova o detalhamento de rolagem, com foco na cor por tipo de dano dos dadinhos do pool (I-011):
 * mesma paleta do chip de resumo (`__grupo`), aplicada ao dado individual — a pista visual que
 * faltava numa fórmula com vários tipos misturados (`4d6[F] + 4d6[Q]`).
 */
describe('ResultadoRolagem', () => {
  function montar(resultado: ResultadoRolagemDto) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [ResultadoRolagem] });
    const fixture = TestBed.createComponent(ResultadoRolagem);
    fixture.componentRef.setInput('resultado', resultado);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  const resultadoBase = (dados: ResultadoRolagemDto['dados']): ResultadoRolagemDto => ({
    dados, atributos: [], constante: 0, total: dados.reduce((soma, d) => soma + d.subtotal, 0),
  });

  it('sem tipoDano no termo, o dado fica só na classe base neutra', () => {
    const raiz = montar(resultadoBase([{ sinal: 1, faces: 6, valores: [4], subtotal: 4 }]));
    const dado = raiz.querySelector('.resultado-rolagem__dado')!;
    expect(dado.className.trim()).toBe('resultado-rolagem__dado');
  });

  it('com tipoDano, cada dadinho do pool ganha o modificador do próprio tipo', () => {
    const raiz = montar(resultadoBase([
      { sinal: 1, faces: 6, valores: [4, 2], subtotal: 6, tipoDano: TipoDanoEnum.FISICO },
      { sinal: 1, faces: 6, valores: [5, 1], subtotal: 6, tipoDano: TipoDanoEnum.QUIMICO },
    ]));

    const termos = raiz.querySelectorAll('.resultado-rolagem__dado-termo');
    expect(termos).toHaveLength(2);
    termos[0].querySelectorAll('.resultado-rolagem__dado').forEach((dado) => {
      expect(dado.classList.contains('resultado-rolagem__dado--fisico')).toBe(true);
    });
    termos[1].querySelectorAll('.resultado-rolagem__dado').forEach((dado) => {
      expect(dado.classList.contains('resultado-rolagem__dado--quimico')).toBe(true);
    });
  });

  it('um termo Composto ([A-B], sem tipoDano no dado) não ganha cor de tipo nenhuma', () => {
    const raiz = montar(resultadoBase([
      { sinal: 1, faces: 6, valores: [3], subtotal: 3, composto: [TipoDanoEnum.FISICO, TipoDanoEnum.QUIMICO] },
    ]));
    const dado = raiz.querySelector('.resultado-rolagem__dado')!;
    expect(dado.className.trim()).toBe('resultado-rolagem__dado');
  });

  it('dado mantido (kh/kl) com tipoDano combina as duas classes — cor de tipo e --escolhido juntas', () => {
    const raiz = montar(resultadoBase([
      { sinal: 1, faces: 6, valores: [6, 6, 1], subtotal: 12, mantidos: [6, 6], tipoDano: TipoDanoEnum.BALISTICO },
    ]));
    const dados = raiz.querySelectorAll('.resultado-rolagem__dado');
    expect(dados[0].classList.contains('resultado-rolagem__dado--balistico')).toBe(true);
    expect(dados[0].classList.contains('resultado-rolagem__dado--escolhido')).toBe(true);
    expect(dados[2].classList.contains('resultado-rolagem__dado--balistico')).toBe(true);
    expect(dados[2].classList.contains('resultado-rolagem__dado--descartado')).toBe(true);
  });
});
