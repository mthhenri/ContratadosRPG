/** Mesma linha de leitura dos patchnotes; mede ao final de cada frame de rolagem. */
export function observarSecaoRegras(
    raiz: HTMLElement, ancoras: readonly string[], aoMudar: (ancora: string | null) => void,
    areaRolagem?: HTMLElement,
    linhaLeitura?: () => number,
): () => void {
    const elementos = new Map([...raiz.querySelectorAll<HTMLElement>("[data-ancora-regras]")]
        .map((elemento) => [elemento.dataset["ancoraRegras"] || elemento.id, elemento]));
    const titulos = ancoras.map((ancora) => elementos.get(ancora))
        .filter((elemento): elemento is HTMLElement => Boolean(elemento));
    let frame: number | undefined;
    const recalcular = (): void => {
        frame = undefined;
        if (!titulos.length || (areaRolagem && areaRolagem.clientHeight === 0)) {
            return;
        }
        const altura = areaRolagem?.scrollHeight ?? document.scrollingElement?.scrollHeight
            ?? document.documentElement.scrollHeight;
        const posicao = areaRolagem?.scrollTop ?? window.scrollY;
        const alturaVisivel = areaRolagem?.clientHeight ?? window.innerHeight;
        if (posicao + alturaVisivel >= altura - 2) {
            // Um capítulo curto no fim não consegue alcançar a linha de leitura.
            const ultimo = titulos[titulos.length - 1];
            aoMudar(ultimo.dataset["ancoraRegras"] || ultimo.id);
            return;
        }
        // Margem de 2px absorve o arredondamento fracionário de scrollIntoView no browser.
        const linha = linhaLeitura ? linhaLeitura() + 2
            : areaRolagem ? areaRolagem.getBoundingClientRect().top + 14
                : (Number.parseFloat(getComputedStyle(titulos[0]).scrollMarginTop) || 0) + 2;
        let ativo: string | null = null;
        for (const titulo of titulos) {
            if (titulo.getBoundingClientRect().top > linha) {
                break;
            }
            ativo = titulo.dataset["ancoraRegras"] || titulo.id;
        }
        aoMudar(ativo);
    };
    const agendar = (): void => {
        if (frame === undefined) {
            frame = requestAnimationFrame(recalcular);
        }
    };
    const alvoRolagem = areaRolagem ?? window;
    alvoRolagem.addEventListener("scroll", agendar, { passive: true });
    window.addEventListener("resize", agendar);
    recalcular();
    return () => {
        alvoRolagem.removeEventListener("scroll", agendar);
        window.removeEventListener("resize", agendar);
        if (frame !== undefined) {
            cancelAnimationFrame(frame);
        }
    };
}
