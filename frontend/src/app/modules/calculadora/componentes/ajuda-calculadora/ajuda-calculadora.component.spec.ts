import { TestBed } from '@angular/core/testing';

import { AjudaCalculadora } from './ajuda-calculadora.component';
import { AbaAjuda, CONTEUDO_AJUDA } from './conteudo-ajuda';

/**
 * Prova o componente único de ajuda reutilizado nas 6 abas (m1-12): o gatilho abre um modal com
 * o conteúdo da aba informada pelo input `aba`, e o modal fecha por botão. O texto vem de
 * `CONTEUDO_AJUDA` (nenhum conteúdo duplicado por aba).
 */
describe('AjudaCalculadora', () => {
  async function montar(aba: AbaAjuda) {
    await TestBed.configureTestingModule({ imports: [AjudaCalculadora] }).compileComponents();
    const fixture = TestBed.createComponent(AjudaCalculadora);
    fixture.componentRef.setInput('aba', aba);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      raiz,
      abrir: () => {
        raiz.querySelector<HTMLButtonElement>('.ajuda-gatilho')!.click();
        fixture.detectChanges();
      },
    };
  }

  it('exibe o gatilho e mantém o modal fechado por padrão', async () => {
    const { raiz } = await montar('dt');
    expect(raiz.querySelector('.ajuda-gatilho')).not.toBeNull();
    expect(raiz.querySelector('.ajuda-modal')).toBeNull();
  });

  it('abre o modal com o título e todos os passos da aba ao clicar no gatilho', async () => {
    const { raiz, abrir } = await montar('dt');
    abrir();

    expect(raiz.querySelector('.ajuda-modal')).not.toBeNull();
    expect(raiz.querySelector('.ajuda-modal__titulo')?.textContent?.trim()).toBe(
      CONTEUDO_AJUDA.dt.titulo,
    );
    expect(raiz.querySelectorAll('.ajuda-modal__item').length).toBe(
      CONTEUDO_AJUDA.dt.passos.length,
    );
  });

  it('seleciona o conteúdo pela aba informada (não duplica por aba)', async () => {
    const { raiz, abrir } = await montar('compras');
    abrir();
    expect(raiz.querySelector('.ajuda-modal__titulo')?.textContent?.trim()).toBe(
      CONTEUDO_AJUDA.compras.titulo,
    );
  });

  it('Limpar pede confirmação: 1º clique vira "Tem certeza?", 2º clique emite `limpar`', async () => {
    const { fixture, raiz } = await montar('agente');
    let emitido = 0;
    fixture.componentInstance.limpar.subscribe(() => (emitido += 1));

    const botao = raiz.querySelector<HTMLButtonElement>('.ajuda-limpar')!;
    expect(botao.textContent?.trim()).toContain('Limpar');

    // 1º clique: só arma a confirmação — não emite e não abre o modal de ajuda.
    botao.click();
    fixture.detectChanges();
    expect(emitido).toBe(0);
    expect(botao.textContent?.trim()).toContain('Tem certeza?');
    expect(botao.classList.contains('ajuda-limpar--confirmando')).toBe(true);
    expect(raiz.querySelector('.ajuda-modal')).toBeNull();

    // 2º clique: confirma, emite e o rótulo volta a "Limpar".
    botao.click();
    fixture.detectChanges();
    expect(emitido).toBe(1);
    expect(botao.textContent?.trim()).toContain('Limpar');
    expect(botao.classList.contains('ajuda-limpar--confirmando')).toBe(false);
  });

  it('reverte o Limpar de "Tem certeza?" para "Limpar" após 3s sem 2º clique', async () => {
    const { fixture, raiz } = await montar('agente');
    let emitido = 0;
    fixture.componentInstance.limpar.subscribe(() => (emitido += 1));
    const botao = raiz.querySelector<HTMLButtonElement>('.ajuda-limpar')!;

    vi.useFakeTimers();
    try {
      botao.click();
      fixture.detectChanges();
      expect(botao.textContent?.trim()).toContain('Tem certeza?');

      vi.advanceTimersByTime(3000);
      fixture.detectChanges();
      expect(botao.textContent?.trim()).toContain('Limpar');
      expect(emitido).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('fecha o modal ao clicar em Fechar', async () => {
    const { fixture, raiz, abrir } = await montar('descanso');
    abrir();
    expect(raiz.querySelector('.ajuda-modal')).not.toBeNull();

    raiz.querySelector<HTMLButtonElement>('.ajuda-btn')!.click();
    fixture.detectChanges();
    expect(raiz.querySelector('.ajuda-modal')).toBeNull();
  });
});
