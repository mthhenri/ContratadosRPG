/** Mesma linha de leitura dos patchnotes; mede ao final de cada frame de rolagem. */
export function observarSecaoRegras(
    raiz: HTMLElement, ancoras: readonly string[], aoMudar: (ancora: string | null) => void,
): () => void {
    const elementos = new Map([...raiz.querySelectorAll<HTMLElement>("[data-ancora-regras]")]
        .map((elemento) => [elemento.id, elemento]));
    const titulos = ancoras.map((ancora) => elementos.get(ancora))
        .filter((elemento): elemento is HTMLElement => Boolean(elemento));
    let frame: number | undefined;
    const recalcular = (): void => {
        frame = undefined;
        if (!titulos.length) {
            return;
        }
        const altura = document.scrollingElement?.scrollHeight
            ?? document.documentElement.scrollHeight;
        if (window.scrollY + window.innerHeight >= altura - 2) {
            // Um capítulo curto no fim não consegue alcançar a linha de leitura.
            aoMudar(titulos[titulos.length - 1].id);
            return;
        }
        // Margem de 2px absorve o arredondamento fracionário de scrollIntoView no browser.
        const linha = (Number.parseFloat(getComputedStyle(titulos[0]).scrollMarginTop) || 0) + 2;
        let ativo: string | null = null;
        for (const titulo of titulos) {
            if (titulo.getBoundingClientRect().top > linha) {
                break;
            }
            ativo = titulo.id;
        }
        aoMudar(ativo);
    };
    const agendar = (): void => {
        if (frame === undefined) {
            frame = requestAnimationFrame(recalcular);
        }
    };
    window.addEventListener("scroll", agendar, { passive: true });
    window.addEventListener("resize", agendar);
    recalcular();
    return () => {
        window.removeEventListener("scroll", agendar);
        window.removeEventListener("resize", agendar);
        if (frame !== undefined) {
            cancelAnimationFrame(frame);
        }
    };
}
