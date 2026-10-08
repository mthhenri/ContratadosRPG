import { observarSecaoRegras } from "./regras-navegacao";

describe("Observação da seção de Regras", () => {
    afterEach(() => vi.restoreAllMocks());

    it("não sobrescreve a memória quando o painel minimizado não tem caixa visível", () => {
        const raiz = document.createElement("div");
        raiz.innerHTML = '<h2 id="ultima" data-ancora-regras></h2>';
        const area = document.createElement("div");
        const aoMudar = vi.fn();
        const desligar = observarSecaoRegras(raiz, ["ultima"], aoMudar, area);
        expect(aoMudar).not.toHaveBeenCalled();
        desligar();
    });

    it("observa somente a rolagem do painel e usa a linha do seu corpo", () => {
        const raiz = document.createElement("div");
        raiz.innerHTML = '<h2 id="vida" data-ancora-regras></h2>'
            + '<h2 id="energia" data-ancora-regras></h2>';
        const area = document.createElement("div");
        Object.defineProperties(area, {
            scrollHeight: { value: 4000 }, clientHeight: { value: 500 },
        });
        vi.spyOn(raiz.children[0], "getBoundingClientRect")
            .mockReturnValue({ top: 60 } as DOMRect);
        vi.spyOn(raiz.children[1], "getBoundingClientRect")
            .mockReturnValue({ top: 600 } as DOMRect);
        const adicionar = vi.spyOn(area, "addEventListener");
        const remover = vi.spyOn(area, "removeEventListener");
        const janela = vi.spyOn(window, "addEventListener");
        const aoMudar = vi.fn();
        const desligar = observarSecaoRegras(raiz, ["vida", "energia"], aoMudar, area,
            () => 80);
        expect(aoMudar).toHaveBeenLastCalledWith("vida");
        expect(adicionar).toHaveBeenCalledWith("scroll", expect.any(Function),
            { passive: true });
        expect(janela.mock.calls.some(chamada => chamada[0] === "scroll")).toBe(false);
        desligar();
        expect(remover).toHaveBeenCalledWith("scroll", expect.any(Function));
    });

    it("seleciona o último título quando o painel chega ao fim do documento", () => {
        const raiz = document.createElement("div");
        raiz.innerHTML = '<h2 id="vida" data-ancora-regras></h2>'
            + '<h2 id="energia" data-ancora-regras></h2>';
        const area = document.createElement("div");
        Object.defineProperties(area, {
            scrollHeight: { value: 1000 }, clientHeight: { value: 500 },
            scrollTop: { value: 500 },
        });
        const aoMudar = vi.fn();
        const desligar = observarSecaoRegras(raiz, ["vida", "energia"], aoMudar, area);
        expect(aoMudar).toHaveBeenLastCalledWith("energia");
        desligar();
    });
});
