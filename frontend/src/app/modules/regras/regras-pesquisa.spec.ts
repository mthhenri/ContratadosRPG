import { normalizarPesquisaRegras, pesquisarRegras } from "./regras-pesquisa";
import { destacarPesquisa, projetarTextosPesquisa, revelarOcorrencia } from "./regras-pesquisa-dom";

describe("Pesquisa pura de Regras", () => {
    // Trechos reais: Sistema (Vida) e Guia (Roteiro/Identidade e Classificação).
    const textos = [
        { texto: "Quando se chega a zero de vida, seu corpo começa a ceder aos danos recebidos, "
            + "entrando na condição de Morrendo.", caminho: ["⬡ Saúde", "⬥ Vida"], ancora: "vida" },
        { texto: "Definindo o Nível de Ameaça (NA)",
            caminho: ["Guia de Criação de Ameaças"], ancora: "nivel-de-ameaca" },
    ];

    it("busca termos dos dois livros sem acento ou caixa, com offsets originais", () => {
        expect(pesquisarRegras(textos, "MORRENDO")[0].destaque).toBe("Morrendo");
        const resultado = pesquisarRegras(textos, "nivel de ameaca")[0];
        expect(resultado.destaque).toBe("Nível de Ameaça");
        expect(resultado.ancora).toBe("nivel-de-ameaca");
        expect(resultado.caminho).toEqual(["Guia de Criação de Ameaças"]);
    });
    it("conserva offsets UTF-16 e acentos decompostos", () => {
        const resultado = pesquisarRegras([{ ...textos[0], texto: "🧪 Ac\u0327a\u0303o" }], "acao")[0];
        expect(resultado.inicio).toBe(3);
        expect(resultado.destaque).toBe("Ac\u0327a\u0303o");
    });
    it("usa termo literal, repetições, vazio e limite mínimo", () => {
        const texto = [{ ...textos[0], texto: "1D6+1 / 1d6+1" }];
        expect(pesquisarRegras(texto, "1d6+1")).toHaveLength(2);
        expect(pesquisarRegras(textos, "[")).toEqual([]);
        expect(pesquisarRegras(textos, "")).toEqual([]);
        expect(pesquisarRegras(textos, "inexistente")).toEqual([]);
    });
    it("tarja impede casar através de conteúdo censurado", () => {
        const texto = [{ ...textos[0], texto: "Classe \uFFFC inferior" }];
        expect(pesquisarRegras(texto, "Classe inferior")).toEqual([]);
        expect(pesquisarRegras(texto, "\uFFFC inferior")).toEqual([]);
        expect(normalizarPesquisaRegras("SANIDADE")).toBe("sanidade");
    });
});

describe("Projeção e destaque seguro do formato canônico", () => {
    it("busca frase através de negrito e restaura os mesmos nós de texto", () => {
        const raiz = document.createElement("div");
        raiz.innerHTML = "<app-regras-inline>Perde <strong>Vida</strong> atual.</app-regras-inline>";
        const original = raiz.querySelector("strong")!.firstChild;
        const textos = projetarTextosPesquisa(raiz);
        const resultados = pesquisarRegras(textos, "perde vida");
        expect(resultados).toHaveLength(1);
        const destaques = destacarPesquisa(textos, resultados);
        expect(destaques.marcas[0].map(marca => marca.textContent).join("")).toBe("Perde Vida");
        destaques.limpar();
        expect(raiz.querySelector("strong")!.firstChild).toBe(original);
        expect(raiz.textContent).toBe("Perde Vida atual.");
        expect(raiz.querySelector("mark")).toBeNull();
    });
    it("exclui controles, ícones e tarjas; mantém uma barreira na frase", () => {
        const raiz = document.createElement("div");
        raiz.innerHTML = '<button>Oculto</button><span aria-hidden="true">Oculto</span>'
            + '<app-regras-inline>Classe <span class="regras-inline__tarja"></span>'
            + "inferior</app-regras-inline>";
        const textos = projetarTextosPesquisa(raiz);
        expect(textos).toHaveLength(1);
        expect(textos[0].texto).toBe("Classe \uFFFCinferior");
        expect(pesquisarRegras(textos, "oculto")).toEqual([]);
    });
    it("projeta abas ocultas e revela somente a aba da ocorrência", () => {
        const raiz = document.createElement("div");
        raiz.innerHTML = '<button id="aba-teste">Aba</button>'
            + '<div appAbaPainel hidden aria-labelledby="aba-teste">Atirador</div>';
        document.body.append(raiz);
        const clicar = vi.fn(); raiz.querySelector("button")!.addEventListener("click", clicar);
        const textos = projetarTextosPesquisa(raiz);
        const destaques = destacarPesquisa(textos, pesquisarRegras(textos, "atirador"));
        revelarOcorrencia(destaques.marcas[0][0]);
        expect(clicar).toHaveBeenCalledOnce();
        destaques.limpar(); raiz.remove();
    });
});
