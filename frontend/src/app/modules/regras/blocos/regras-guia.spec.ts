import { TestBed } from "@angular/core/testing";
import { RegrasConteudo, RegrasFichaCriatura } from "../regras.model";
import { RegrasConteudoRender } from "./regras-conteudo.component";

describe("Blocos ricos do Guia", () => {
    function renderizar(filhos: readonly RegrasConteudo[]) {
        const fixture = TestBed.createComponent(RegrasConteudoRender);
        fixture.componentRef.setInput("filhos", filhos);
        fixture.componentRef.setInput("documento", "guia");
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    }

    it("conserva zero nos atributos e mostra categoria/modificador em texto", () => {
        const raiz = renderizar([
            { tipo: "atributos", cabecalho: [], linhas: [], atributos: [
                { nome: "Social", valor: 0, modificador: "Frágil", bonus: "+2" },
            ] },
            { tipo: "habilidade-criatura", nome: "Observação", categoria: "DE GATILHO",
                rotulo: "Observação [De Gatilho]", trechos: [{ tipo: "texto", texto: "Imediato" }] },
        ]);
        expect(raiz.querySelector("app-stat")?.textContent).toContain("0");
        expect(raiz.textContent).toContain("Frágil +2");
        expect(raiz.textContent).toContain("DE GATILHO");
    });

    it("ordena o roteiro pela fonte e conserva filhos com links navegáveis", () => {
        const raiz = renderizar([{ tipo: "roteiro", etapas: [
            { ordem: 3, titulo: [{ tipo: "texto", texto: "Identidade" }],
                descricao: [{ tipo: "texto", texto: "Primeiro o conceito." }] },
        ], filhos: [{ tipo: "nota", trechos: [{ tipo: "texto", texto: "Revise o conceito" }] }] }]);
        expect(raiz.querySelector("li")?.value).toBe(3);
        expect(raiz.textContent).toContain("Primeiro o conceito.");
        expect(raiz.textContent).toContain("Revise o conceito");
    });

    it("usa a marca própria nos oito NAs e não confunde o índice de Médio", () => {
        const raiz = renderizar([{ tipo: "niveis-ameaca", cabecalho: [], linhas: [],
            niveis: Array.from({ length: 8 }, (_, nivel) => ({ nivel,
                referenciaImagem: "ignorada", descricao: [{ tipo: "texto", texto: `Nível ${nivel}`
                } as const] })),
        }]);
        expect(raiz.querySelectorAll('app-icone[nome="contratados"]')).toHaveLength(8);
        expect(raiz.querySelector('app-icone[nome="scp"]')).toBeNull();
        expect(raiz.querySelector(".regras-ameaca--media")?.textContent).toContain("NA 3");
        expect(raiz.querySelector(".regras-ameaca--catastrofica")).not.toBeNull();
    });

    it("apresenta saúde e ataques tipados sem reconstruir fórmulas", () => {
        const ficha: RegrasFichaCriatura = {
            tipo: "ficha-criatura", nome: "A Estátua",
            identidade: { tipo: "identidade", cabecalho: [], linhas: [], campos: [
                { rotulo: "NA", nivel: 3, valor: [{ tipo: "texto", texto: "Médio" }] },
            ] },
            atributos: { tipo: "atributos", cabecalho: [], linhas: [], atributos: [] },
            vidaMaxima: "30 × 35 = 1.050", defesaBase: "15 + VD ÷ 2 = 30",
            resistencias: [{ tipo: "texto", texto: "Físico 36" }], fraquezas: [],
            regeneracao: [], porte: [], deslocamento: [], cadencia: "Singular",
            ataques: [{ nome: "Pancada", acao: "Movimento", teste: "Luta 5D20+12",
                dano: "3D12+4", efeito: [] }], habilidades: [], filhos: [
                { tipo: "secao", nivel: 4, glifo: "⬦", titulo: "Regeneração e Deslocamento",
                    ancora: "estatua-deslocamento", filhos: [{ tipo: "paragrafo",
                        trechos: [{ tipo: "texto", texto: "Regeneração Natural Nenhuma." }] }] },
                { tipo: "secao", nivel: 4, glifo: "⬦", titulo: "Ações, Ataques e Habilidades",
                    ancora: "estatua-ataques", filhos: [
                        { tipo: "paragrafo", trechos: [{ tipo: "texto",
                            texto: "Cadência: Singular. Somente quando não observada." }] },
                        { tipo: "paragrafo", trechos: [{ tipo: "texto",
                            texto: "Ataques Pancada | Movimento | Luta 5D20+12 | 3D12+4" }] },
                    ] },
            ],
        };
        const raiz = renderizar([ficha]);
        expect(raiz.textContent).toContain("30 × 35 = 1.050");
        expect(raiz.textContent).toContain("Luta 5D20+12");
        expect(raiz.textContent).toContain("Físico 36");
        expect(raiz.querySelector("table")).toBeNull();
        expect(raiz.querySelector('[appstatvalor][tabindex="0"]')).not.toBeNull();
        expect(raiz.textContent?.match(/Luta 5D20\+12/g)).toHaveLength(1);
        expect(raiz.textContent?.match(/Regeneração Natural Nenhuma\./g)).toHaveLength(1);
        expect(raiz.textContent).toContain("Somente quando não observada.");
        expect(raiz.querySelector("#estatua-ataques")).not.toBeNull();
    });
});
