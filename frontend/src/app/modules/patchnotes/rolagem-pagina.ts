import { DestroyRef, type Signal, afterNextRender, inject, signal } from '@angular/core';

/**
 * Rolagem da página dos patchnotes (pn-11): quando a leitura passou do começo (para o botão de voltar
 * ao topo) e a volta ao topo em si. Chamar `sinalRolagemPassou` num contexto de injeção (construtor ou
 * inicializador de campo): o ouvinte de `scroll` nasce depois do primeiro render e morre com o
 * componente.
 */
export function sinalRolagemPassou(limite: number): Signal<boolean> {
  const destroyRef = inject(DestroyRef);
  const passou = signal(false);
  afterNextRender(() => {
    const atualizar = (): void => passou.set(window.scrollY > limite);
    atualizar();
    window.addEventListener('scroll', atualizar, { passive: true });
    destroyRef.onDestroy(() => window.removeEventListener('scroll', atualizar));
  });
  return passou.asReadonly();
}

/** Rola a janela ao topo; suave, salvo com `prefers-reduced-motion`. */
export function rolarAoTopo(suave: boolean): void {
  const reduzMovimento = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  window.scrollTo({ top: 0, behavior: suave && !reduzMovimento ? 'smooth' : 'auto' });
}

/**
 * Avisa quando a leitura **volta** ao topo da página depois de ter saído dele (pn-11). Só conta a volta:
 * abrir a página já no topo (ex.: um link com fragmento, antes de rolar até ele) não dispara. Mesmas
 * regras de injeção e de ciclo de vida de `sinalRolagemPassou`.
 */
export function aoVoltarAoTopo(aoVoltar: () => void): void {
  const destroyRef = inject(DestroyRef);
  afterNextRender(() => {
    let saiu = false;
    const verificar = (): void => {
      if (window.scrollY > 50) {
        saiu = true;
      } else if (saiu && window.scrollY <= 2) {
        saiu = false;
        aoVoltar();
      }
    };
    window.addEventListener('scroll', verificar, { passive: true });
    destroyRef.onDestroy(() => window.removeEventListener('scroll', verificar));
  });
}
