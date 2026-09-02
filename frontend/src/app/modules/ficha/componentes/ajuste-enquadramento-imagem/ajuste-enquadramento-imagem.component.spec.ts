import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { AjusteEnquadramentoImagem } from './ajuste-enquadramento-imagem.component';

function montar(origem: File | string, focoInicial: { x: number; y: number; escala: number } | null = null) {
  TestBed.configureTestingModule({ imports: [AjusteEnquadramentoImagem] });
  const fixture = TestBed.createComponent(AjusteEnquadramentoImagem);
  fixture.componentRef.setInput('origem', origem);
  fixture.componentRef.setInput('focoInicial', focoInicial);
  fixture.detectChanges();
  const confirmados: { x: number; y: number; escala: number }[] = [];
  const cancelados: void[] = [];
  fixture.componentInstance.confirmar.subscribe((f) => confirmados.push(f));
  fixture.componentInstance.cancelar.subscribe(() => cancelados.push(undefined));
  return { fixture, raiz: fixture.nativeElement as HTMLElement, confirmados, cancelados };
}

// `currentTarget` de mentira: o teste prova a matemática de arrasto sem depender do
// `setPointerCapture` real do navegador (que exige uma sessão de ponteiro ativa de verdade).
function alvoDeMentira(): EventTarget & { setPointerCapture: () => void; releasePointerCapture: () => void } {
  return { setPointerCapture: vi.fn(), releasePointerCapture: vi.fn() } as unknown as EventTarget & {
    setPointerCapture: () => void;
    releasePointerCapture: () => void;
  };
}

function caixaDeMentira(largura: number, altura: number): HTMLElement {
  return { clientWidth: largura, clientHeight: altura } as HTMLElement;
}

describe('AjusteEnquadramentoImagem', () => {
  it('sem focoInicial, começa centralizado e sem zoom (x=50, y=50, escala=1)', () => {
    const { confirmados, fixture } = montar('https://exemplo.test/avatar.webp');
    fixture.componentInstance['confirmarEnquadramento']();
    expect(confirmados).toEqual([{ x: 50, y: 50, escala: 1 }]);
  });

  it('com focoInicial, parte do enquadramento já salvo', () => {
    const { confirmados, fixture } = montar('https://exemplo.test/avatar.webp', { x: 20, y: 80, escala: 2 });
    fixture.componentInstance['confirmarEnquadramento']();
    expect(confirmados).toEqual([{ x: 20, y: 80, escala: 2 }]);
  });

  it('origem como URL (string) vira o `previewUrl` direto, sem criar object URL', () => {
    const espiao = vi.spyOn(URL, 'createObjectURL');
    const { fixture } = montar('https://exemplo.test/avatar.webp');
    expect(fixture.componentInstance['previewUrl']()).toBe('https://exemplo.test/avatar.webp');
    expect(espiao).not.toHaveBeenCalled();
    espiao.mockRestore();
  });

  it('origem como File cria um object URL e revoga ao destruir', () => {
    const url = 'blob:fake-url';
    const criarEspiao = vi.spyOn(URL, 'createObjectURL').mockReturnValue(url);
    const revogarEspiao = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const arquivo = new File(['conteudo'], 'avatar.png', { type: 'image/png' });

    const { fixture } = montar(arquivo);
    expect(fixture.componentInstance['previewUrl']()).toBe(url);
    expect(criarEspiao).toHaveBeenCalledWith(arquivo);

    fixture.destroy();
    expect(revogarEspiao).toHaveBeenCalledWith(url);

    criarEspiao.mockRestore();
    revogarEspiao.mockRestore();
  });

  it('sem zoom (escala 1), arrastar não move nada — precisa dar zoom antes de enquadrar', () => {
    const { fixture } = montar('https://exemplo.test/avatar.webp');
    const componente = fixture.componentInstance;
    const caixa = caixaDeMentira(200, 200);

    componente['aoIniciarArrasto']({ currentTarget: alvoDeMentira(), pointerId: 1, clientX: 0, clientY: 0 } as unknown as PointerEvent);
    componente['aoMoverArrasto']({ clientX: 40, clientY: 0 } as unknown as PointerEvent, caixa);

    expect(componente['x']()).toBe(50);
    expect(componente['y']()).toBe(50);
  });

  it('com zoom, arrastar pra direita revela mais do lado esquerdo da imagem (x diminui)', () => {
    const { fixture } = montar('https://exemplo.test/avatar.webp', { x: 50, y: 50, escala: 2 });
    const componente = fixture.componentInstance;
    const caixa = caixaDeMentira(200, 200);

    componente['aoIniciarArrasto']({ currentTarget: alvoDeMentira(), pointerId: 1, clientX: 0, clientY: 0 } as unknown as PointerEvent);
    componente['aoMoverArrasto']({ clientX: 40, clientY: 0 } as unknown as PointerEvent, caixa);

    expect(componente['x']()).toBe(30); // 50 - (40/200*100)/(2-1)
    expect(componente['y']()).toBe(50);
  });

  it('com zoom, arrastar pra baixo revela mais do topo da imagem (y diminui) e satura em 0/100', () => {
    const { fixture } = montar('https://exemplo.test/avatar.webp', { x: 50, y: 50, escala: 2 });
    const componente = fixture.componentInstance;
    const caixa = caixaDeMentira(100, 100);

    componente['aoIniciarArrasto']({ currentTarget: alvoDeMentira(), pointerId: 1, clientX: 0, clientY: 0 } as unknown as PointerEvent);
    componente['aoMoverArrasto']({ clientX: 0, clientY: 999 } as unknown as PointerEvent, caixa);

    expect(componente['y']()).toBe(0); // satura, nunca fica negativo
  });

  it('não move nada se aoMoverArrasto for chamado sem arrasto iniciado', () => {
    const { fixture } = montar('https://exemplo.test/avatar.webp', { x: 50, y: 50, escala: 2 });
    const componente = fixture.componentInstance;
    componente['aoMoverArrasto']({ clientX: 999, clientY: 999 } as unknown as PointerEvent, caixaDeMentira(100, 100));
    expect(componente['x']()).toBe(50);
    expect(componente['y']()).toBe(50);
  });

  it('a barra de zoom respeita min/max e reflete no confirmar', () => {
    const { fixture, confirmados } = montar('https://exemplo.test/avatar.webp');
    const componente = fixture.componentInstance;
    componente['aoAjustarEscala']({ target: { valueAsNumber: 2.5 } } as unknown as Event);
    componente['confirmarEnquadramento']();
    expect(confirmados).toEqual([{ x: 50, y: 50, escala: 2.5 }]);
  });

  it('cancelar emite `cancelar` sem confirmar nada', () => {
    const { raiz, confirmados, cancelados } = montar('https://exemplo.test/avatar.webp');
    const botaoCancelar = raiz.querySelector('.botao--secundario') as HTMLButtonElement;
    botaoCancelar.click();
    expect(cancelados.length).toBe(1);
    expect(confirmados.length).toBe(0);
  });

  it('confirmar pelo botão renderizado emite o enquadramento atual', () => {
    const { raiz, confirmados } = montar('https://exemplo.test/avatar.webp', { x: 10, y: 90, escala: 1.2 });
    const botaoConfirmar = raiz.querySelector('.botao--primario') as HTMLButtonElement;
    botaoConfirmar.click();
    expect(confirmados).toEqual([{ x: 10, y: 90, escala: 1.2 }]);
  });

  it('apresenta Cancelar antes de Confirmar nos botões médios canônicos', () => {
    const { raiz } = montar('https://exemplo.test/avatar.webp');
    const acoes = [...raiz.querySelectorAll('.enquadramento__acoes .botao')] as HTMLButtonElement[];

    expect(acoes.map((botao) => botao.textContent?.trim())).toEqual(['Cancelar', 'Confirmar']);
    expect(acoes.every((botao) => botao.classList.contains('botao--medio'))).toBe(true);
  });
});
