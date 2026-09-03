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

  /** ui-22: leitor de tela anuncia o dado descartado pelo keep, hoje só opacidade + risco. */
  it('dado descartado pelo keep ganha aria-label "(descartado)"; o mantido não', () => {
    const raiz = montar(resultadoBase([
      { sinal: 1, faces: 6, valores: [6, 1], subtotal: 6, mantidos: [6] },
    ]));
    const dados = raiz.querySelectorAll('.resultado-rolagem__dado');
    expect(dados[0].getAttribute('aria-label')).toBeNull();
    expect(dados[1].getAttribute('aria-label')).toBe('1 (descartado)');
  });

  /** Redesign SVG dos dados: face padrão (d4..d20) troca o quadradinho pela silhueta do dado. */
  it('face padrão (ex.: d6) renderiza o ícone do dado; face fora do conjunto cai no fallback', () => {
    const raiz = montar(resultadoBase([
      { sinal: 1, faces: 6, valores: [4], subtotal: 4 },
      { sinal: 1, faces: 3, valores: [2], subtotal: 2 },
    ]));
    const dados = raiz.querySelectorAll('.resultado-rolagem__dado');
    expect(dados[0].querySelector('app-icone')).not.toBeNull();
    expect(dados[1].querySelector('app-icone')).toBeNull();
  });

  /** Rótulo `NdM` saiu (a forma do dado já diz o tipo); só sobra o "−" de um pool subtraído. */
  it('sem rótulo NdM; pool subtraído (sinal < 0) mostra só o sinal "−"', () => {
    const raiz = montar(resultadoBase([
      { sinal: -1, faces: 6, valores: [4], subtotal: -4 },
    ]));
    expect(raiz.querySelector('.resultado-rolagem__dado-nota')).toBeNull();
    expect(raiz.querySelector('.resultado-rolagem__dado-sinal')?.textContent?.trim()).toBe('−');
  });

  /** ui-22: variante de linha do painel lateral/feed — a bandeja continua na forma cheia. */
  it('[compacto] aplica o modificador --compacto na raiz; sem o input, a forma continua cheia', () => {
    const resultado = resultadoBase([{ sinal: 1, faces: 20, valores: [15], subtotal: 15 }]);

    const cheia = montar(resultado);
    expect(cheia.querySelector('.resultado-rolagem')!.classList.contains('resultado-rolagem--compacto')).toBe(false);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [ResultadoRolagem] });
    const fixture = TestBed.createComponent(ResultadoRolagem);
    fixture.componentRef.setInput('resultado', resultado);
    fixture.componentRef.setInput('compacto', true);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    const raizCompacta = raiz.querySelector('.resultado-rolagem')!;
    expect(raizCompacta.classList.contains('resultado-rolagem--compacto')).toBe(true);
  });
});
