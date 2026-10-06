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
