/**
 * Capítulo visível (pn-09): observa os títulos da nota e informa qual é o último que já passou da
 * linha de leitura, logo abaixo da topbar. Função com efeito colateral no DOM, por isso fora de
 * `patchnote-formato.ts` (puro) e fora da página (já extensa).
 *
 * A linha de leitura é o `scroll-margin-top` dos títulos (pn-07) mais 1px, e o observador vigia uma
 * faixa de 1px nela: o título entra e sai da faixa exatamente quando cruza a linha, então cada
 * evento só precisa reler as posições. Escolhe o último título que cruzou, nunca o "mais visível",
 * para o destaque não pular entre capítulos curtos.
 */
export function observarCapituloAtivo(
  raiz: HTMLElement,
  ids: readonly string[],
  aoMudar: (id: string | null) => void,
): () => void {
  const titulos = ids
    .map((id) => raiz.querySelector<HTMLElement>(`[id="${id}"]`))
    .filter((titulo): titulo is HTMLElement => titulo !== null);
  if (titulos.length === 0 || typeof IntersectionObserver === 'undefined') {
    return () => undefined;
  }

  const linhaDeLeitura = (): number =>
    (Number.parseFloat(getComputedStyle(titulos[0]).scrollMarginTop) || 0) + 1;

  const recalcular = (): void => {
    const linha = linhaDeLeitura();
    let ativo: string | null = null;
    for (const titulo of titulos) {
      if (titulo.getBoundingClientRect().top > linha) {
        break;
      }
      ativo = titulo.id;
    }
    aoMudar(ativo);
  };

  let observador: IntersectionObserver | undefined;
  const observar = (): void => {
    observador?.disconnect();
    const linha = Math.round(linhaDeLeitura());
    const abaixo = Math.max(0, window.innerHeight - linha - 1);
    observador = new IntersectionObserver(recalcular, {
      rootMargin: `-${linha}px 0px -${abaixo}px 0px`,
    });
    titulos.forEach((titulo) => observador!.observe(titulo));
  };

  observar();
  recalcular();
  // A faixa é medida em px a partir da altura da janela: redimensionar a refaz.
  window.addEventListener('resize', observar);

  return () => {
    window.removeEventListener('resize', observar);
    observador?.disconnect();
  };
}
