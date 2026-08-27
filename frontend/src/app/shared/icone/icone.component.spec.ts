import { TestBed } from '@angular/core/testing';

import { Icone, IconeNome } from './icone.component';

/**
 * Prova o componente de ícone reutilizável: renderiza um SVG monocromático (herda a cor via
 * `currentColor`, sem emoji) e desenha formas diferentes conforme o `nome`.
 */
describe('Icone', () => {
  function montar(nome: IconeNome) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [Icone] });
    const fixture = TestBed.createComponent(Icone);
    fixture.componentRef.setInput('nome', nome);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  /** Assinatura das formas do glifo (jsdom não serializa innerHTML de SVG). */
  function assinatura(nome: IconeNome): string {
    const formas = montar(nome).querySelectorAll('svg > circle, svg > path, svg > rect');
    return Array.from(formas)
      .map((forma) => forma.tagName + (forma.getAttribute('d') ?? forma.getAttribute('r') ?? ''))
      .join('|');
  }

  it('renderiza um <svg> que herda a cor do texto (currentColor)', () => {
    const raiz = montar('agente');
    const svg = raiz.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('stroke')).toBe('currentColor');
    expect(svg!.querySelectorAll('circle, path, rect').length).toBeGreaterThan(0);
  });

  it('desenha formas distintas para nomes distintos', () => {
    expect(assinatura('descanso')).not.toBe(assinatura('compras'));
  });

  it('distingue visualmente a simulação da calculadora aritmética', () => {
    expect(assinatura('simulacao')).not.toBe(assinatura('calculadora'));
  });

  it('representa a simulação como árvore vertical de cenários', () => {
    expect(montar('simulacao').querySelectorAll('svg > circle')).toHaveLength(7);
  });

  it('renderiza o glifo monocromático próprio de documentos', () => {
    const nome: IconeNome = 'documentos';
    const raiz = montar(nome);
    const svg = raiz.querySelector('svg');

    expect(svg?.getAttribute('stroke')).toBe('currentColor');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(assinatura(nome)).not.toBe('');
    expect(assinatura(nome)).not.toBe(assinatura('anotacoes'));
  });
});
