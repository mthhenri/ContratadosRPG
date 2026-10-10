import { TestBed } from "@angular/core/testing";
import { RegrasBloco, RegrasConteudo, RegrasTrecho } from "../regras.model";
import { RegrasConteudoRender } from "./regras-conteudo.component";

/** Blocos da `revisao-visual-regras`: termos, grade, abertura, subclasse e cor de recurso. */
describe("Revisão visual das Regras", () => {
    const texto = (valor: string): RegrasTrecho[] => [{ tipo: "texto", texto: valor }];
    const habilidade = (nome: string, custo: number, reacao = false): RegrasBloco => ({
        tipo: "habilidade", nome, custo, reacao, glifo: "◈", trechos: texto("Descrição."),
    });

    function renderizar(filhos: readonly RegrasConteudo[]) {
        const fixture = TestBed.createComponent(RegrasConteudoRender);
        fixture.componentRef.setInput("filhos", filhos);
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    }

    it("termos mostram número, nome, rótulo e descrição em lista de definições", () => {
        const raiz = renderizar([{ tipo: "termos", variante: "penalidades", cabecalho: [], linhas: [],
            itens: [{ numero: 2, nome: "Exausto", descricao: texto("Todas as habilidades custam +1 E") },
                { nome: "Destreza", rotulo: "Atributo Físico", descricao: texto("Velocidade.") }] }]);
        expect(raiz.querySelector(".regras-termos--penalidades")?.tagName).toBe("DL");
        const nomes = Array.from(raiz.querySelectorAll("dt")).map(item => item.textContent?.replace(/\s+/g, " ").trim());
        expect(nomes).toEqual(["2 Exausto", "Destreza Atributo Físico"]);
        expect(raiz.querySelector(".regras-termos__numero")?.textContent).toBe("2");
        expect(raiz.querySelectorAll("dd")[1].textContent).toContain("Velocidade.");
    });

    it("grade descarta células vazias e limita as colunas às preenchidas", () => {
        const raiz = renderizar([{ tipo: "grade", colunas: 6,
            cabecalho: [texto("Nível de Criatura"), [], [], [], [], []], linhas: [[texto("A"), [], [], [], [], []]] }]);
        expect(raiz.querySelectorAll(".regras-grade__celula")).toHaveLength(2);
        expect((raiz.querySelector(".regras-grade") as HTMLElement).style
            .getPropertyValue("--regras-grade-colunas")).toBe("2");
    });

    it("abertura separa o título do registro e mantém as quebras da fonte", () => {
        const raiz = renderizar([{ tipo: "abertura", titulo: ">>>> Registro de documentação oficial",
            trechos: [{ tipo: "italico", filhos: texto("Linha um") }, ...texto("\n"),
                { tipo: "italico", filhos: texto("Linha dois") }] }]);
        expect(raiz.querySelector(".regras-abertura__titulo")?.textContent)
            .toBe(">>>> Registro de documentação oficial");
        expect(raiz.querySelector(".regras-abertura__texto")?.textContent).toContain("Linha um\nLinha dois");
    });

    it("mantém cada módulo junto de seu efeito em vez de empilhar títulos antes dos dados", () => {
        const raiz = renderizar([{ tipo: "grade", colunas: 2,
            cabecalho: [texto("Módulo V"), texto("Módulo IV")],
            linhas: [[texto("Efeito V"), texto("Efeito IV")]] }]);
        const cartoes = Array.from(raiz.querySelectorAll("app-cartao"));
        expect(cartoes).toHaveLength(2);
        expect(cartoes[0].textContent).toContain("Módulo V");
        expect(cartoes[0].textContent).toContain("Efeito V");
        expect(cartoes[0].textContent).not.toContain("Efeito IV");
        expect(cartoes[1].textContent).toContain("Módulo IV");
        expect(cartoes[1].textContent).toContain("Efeito IV");
    });

    it("dimensiona a tabela pelo maior número de células, mesmo com cabeçalho incompleto", () => {
        const raiz = renderizar([{ tipo: "tabela", cabecalho: [texto("Nome"), texto("Efeitos")],
            linhas: [[texto("◎ Conservador"), texto("■■"), texto("Efeito")]] }]);
        expect((raiz.querySelector(".regras-tabela") as HTMLElement).style
            .getPropertyValue("--regras-tabela-colunas")).toBe("3");
        expect(Array.from(raiz.querySelectorAll("th")).map(celula => celula.textContent))
            .toEqual(["Nome", "Efeitos"]);
    });

    it("tabela de amplificadores não é detectada pelo renderer da tabela genérica", () => {
        const raiz = renderizar([{ tipo: "tabela",
            cabecalho: [texto("Nome"), texto("Efeitos"), []],
            linhas: [[texto("◎ Conservador"), texto("■■"), texto("Efeito")]] }]);
        expect(raiz.querySelector(".regras-tabela--amplificadores")).toBeNull();
        expect(raiz.querySelector("app-empilhamento")).toBeNull();
    });

    it("subclasse mostra tipo, custos, Vida/Energia com faixa, bônus e habilidades", () => {
        const raiz = renderizar([{ tipo: "subclasse", nome: "Experimento Bestial", classe: "Combatente",
            ancora: "experimento-bestial",
            citacao: texto("“Carne reforçada.”"), cabecalho: [], linhas: [],
            custos: [texto("AGENTES DESTA CLASSE RECEBEM O DOBRO"), texto("SEU LIMITE"), texto("EM NÍVEL 0")],
            saude: { vida: texto("30 + VIG × 5"), energia: texto("22 + DES × 2") },
            progressao: { vida: texto("9 + VIG × 2"), energia: texto("5 + DES × 2") },
            atributosBonus: texto("+1 em Força +1 em Vigor"),
            habilidadeInicial: habilidade("Musculatura de Impacto", 0),
            habilidades: [habilidade("Adaptabilidade", 4), habilidade("Casca Grossa", 6, true)] }]);
        expect(raiz.querySelector(".regras-subclasse__tipo")?.textContent).toContain("Subclasse · Combatente");
        expect(raiz.querySelectorAll(".regras-subclasse__custos li")).toHaveLength(3);
        expect(raiz.querySelectorAll(".stat--faixa")).toHaveLength(2);
        expect(raiz.querySelector(".stat--vida .stat__nota")?.textContent).toContain("Por nível: +9 + VIG × 2");
        expect(Array.from(raiz.querySelectorAll(".regras-subclasse__bonus app-chip"))
            .map(chip => chip.textContent?.trim())).toEqual(["+1 em Força", "+1 em Vigor"]);
        expect(raiz.querySelector(".regras-destaque--inicial")?.textContent).toContain("Musculatura de Impacto");
        expect(raiz.querySelector("app-cartao app-icone[cartaoIndice]")).not.toBeNull();
        expect(raiz.querySelector('[data-ancora-regras="experimento-bestial"]')?.id)
            .toBe("experimento-bestial");
        expect(raiz.querySelectorAll(".regras-subclasse__habilidades app-regras-habilidade")).toHaveLength(2);
    });

    it("habilidade usa chip de Energia azul e Reação roxa", () => {
        const raiz = renderizar([habilidade("Aparar", 3, true)]);
        expect(raiz.querySelector(".chip--severidade-energia")?.textContent).toContain("3");
        expect(raiz.querySelector(".chip--severidade-ajuda")?.textContent).toContain("REAÇÃO");
    });

    it("Vida e Energia no texto corrido ganham a cor do recurso sem mudar o texto", () => {
        const raiz = renderizar([{ tipo: "paragrafo", trechos: [...texto("Recupera 2D4 de Vida e "),
            { tipo: "negrito", filhos: texto("Energia") }, ...texto(". Vidas e energia ficam.")] }]);
        expect(raiz.querySelector(".regras-inline__recurso--vida")?.textContent).toBe("Vida");
        expect(raiz.querySelector("strong .regras-inline__recurso--energia")?.textContent).toBe("Energia");
        expect(raiz.querySelectorAll(".regras-inline__recurso--vida, .regras-inline__recurso--energia"))
            .toHaveLength(2);
        expect(raiz.querySelector("p")?.textContent?.replace(/\s+/g, " ").trim())
            .toBe("Recupera 2D4 de Vida e Energia. Vidas e energia ficam.");
    });

    it("tabela sem cabeçalho não renderiza thead", () => {
        const raiz = renderizar([{ tipo: "tabela", cabecalho: [],
            linhas: [[texto("Irrelevante"), texto("DT 5")]] }]);
        expect(raiz.querySelector("thead")).toBeNull();
        expect(raiz.querySelector("td")?.textContent).toContain("Irrelevante");
    });
});
