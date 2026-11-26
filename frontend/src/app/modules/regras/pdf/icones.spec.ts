import { TestBed } from "@angular/core/testing";
import type { NormalizadoDocumento } from "@contratados-rpg/shared/livro";
import { Icone } from "../../../shared/icone/icone.component";
import { comporLivro } from "./compositor";
import { type Comando, type ElementoSvg, ICONES_DO_PDF, comandosDoCaminho, desenhoDeIcone } from "./icones";
import { PincelFalso } from "./pincel-falso";

const arredondar = (comandos: readonly Comando[]) => comandos.map(
    ([letra, ...numeros]) => [letra, ...numeros.map((numero) => Math.round(numero * 100) / 100)]);
const elemento = (
    tagName: string, atributos: Record<string, string> = {}, children: ElementoSvg[] = [],
): ElementoSvg => ({ tagName, children, getAttribute: (nome) => atributos[nome] ?? null });
const svg = (...filhos: ElementoSvg[]) => elemento("svg", {}, filhos);

describe("Ícones no PDF", () => {
    it("lê comandos relativos, horizontais e verticais como pontos absolutos", () => {
        expect(arredondar(comandosDoCaminho("M4 4l10 10h2v-3H5V1z"))).toEqual(
            [["M", 4, 4], ["L", 14, 14], ["L", 16, 14], ["L", 16, 11], ["L", 5, 11], ["L", 5, 1], ["Z"]]);
    });

    it("trata como reta o par que sobra depois do M e separa números colados", () => {
        expect(arredondar(comandosDoCaminho("M15.5 8.5 13.4 13.4m1.5.5-.5-1"))).toEqual(
            [["M", 15.5, 8.5], ["L", 13.4, 13.4], ["M", 14.9, 13.9], ["L", 14.4, 12.9]]);
    });

    it("espelha o controle anterior na curva abreviada", () => {
        const [, , segunda] = arredondar(comandosDoCaminho("M0 0C0 1 1 2 2 2s2 1 2 2"));
        expect(segunda).toEqual(["C", 3, 2, 4, 3, 4, 4]);
    });

    it("converte o arco em curvas que passam pelo meio e terminam no destino", () => {
        const curvas = arredondar(comandosDoCaminho("M2 12a10 10 0 0 0 20 0"));
        expect(curvas.map((comando) => comando.slice(-2))).toEqual([[2, 12], [12, 22], [22, 12]]);
    });

    it("desenha círculo e retângulo e respeita o preenchimento do elemento", () => {
        const { tracos } = desenhoDeIcone(svg(
            elemento("circle", { cx: "12", cy: "12", r: "2", fill: "currentColor" }),
            elemento("rect", { x: "4", y: "5", width: "6", height: "3" })), false);
        expect(tracos.map((traco) => traco.cheio)).toEqual([true, false]);
        expect(arredondar(tracos[0].comandos)[0]).toEqual(["M", 14, 12]);
        expect(arredondar(tracos[1].comandos)).toEqual(
            [["M", 4, 5], ["L", 10, 5], ["L", 10, 8], ["L", 4, 8], ["Z"]]);
    });

    it("aplica a rotação do grupo aos pontos", () => {
        const { tracos } = desenhoDeIcone(svg(elemento("g", { transform: "rotate(90 12 12)" },
            [elemento("path", { d: "M12 2L14 12" })])), false);
        expect(arredondar(tracos[0].comandos)).toEqual([["M", 22, 12], ["L", 12, 14]]);
    });

    it("recusa o elemento que não sabe desenhar", () => {
        expect(() => desenhoDeIcone(svg(elemento("text")), false)).toThrow();
    });

    it("lê todos os ícones que o PDF pede do desenho do próprio site", () => {
        for (const nome of ICONES_DO_PDF) {
            const fixture = TestBed.createComponent(Icone);
            fixture.componentRef.setInput("nome", nome);
            fixture.detectChanges();
            const raiz = (fixture.nativeElement as HTMLElement).querySelector("svg")!;
            expect(desenhoDeIcone(raiz, false).tracos.length, nome).toBeGreaterThan(0);
        }
    });

    const t = (texto: string) => [{ tipo: "texto" as const, texto }];
    const documento: NormalizadoDocumento = {
        tipo: "documento", id: "sistema", titulo: "Sistema", versao: "1",
        filhos: [{ tipo: "secao", nivel: 1, glifo: "⬢", titulo: "Classes", ancora: "classes", filhos: [
            { tipo: "classe", nome: "Combatente", ancora: "combatente", cabecalho: [], linhas: [],
                citacao: t("Frente."), saude: { vida: t("30"), energia: t("15") },
                progressao: { vida: t("7"), energia: t("4") }, arquetipos: [],
                habilidades: [{ tipo: "habilidade", nome: "Aparar", custo: 2, reacao: false, glifo: "◈",
                    trechos: t("Apara.") }] },
        ] }],
    };
    const desenho = { preenchido: false, tracos: [{ cheio: false, comandos: comandosDoCaminho("M0 0L1 1") }] };
    const compor = (icones?: Record<string, typeof desenho>) => {
        const pincel = new PincelFalso();
        comporLivro(documento, { pincel, icones });
        return pincel;
    };

    it("põe o ícone na classe, na saúde e no custo da habilidade", () => {
        const pincel = compor({ combatente: desenho, vida: desenho, energia: desenho });
        // Classe, vida inicial, energia inicial e custo.
        expect(pincel.caminhos).toBe(4);
        expect(pincel.textos).toContain("2");
        expect(pincel.textos).not.toContain("2 E");
    });

    it("sem os ícones, mantém o símbolo e a sigla de Energia", () => {
        const pincel = compor();
        expect(pincel.caminhos).toBe(0);
        expect(pincel.textos).toContain("2 E");
    });
});
