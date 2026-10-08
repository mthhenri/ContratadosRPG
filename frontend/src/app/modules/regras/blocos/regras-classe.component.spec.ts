import { TestBed } from "@angular/core/testing";
import { RegrasClasse as BlocoClasse, RegrasTrecho } from "../regras.model";
import { RegrasClasse } from "./regras-classe.component";
import { recuperarIconeIdentidade } from "./regras-identidade-icone";

const texto = (valor: string): RegrasTrecho[] => [{ tipo: "texto", texto: valor }];
const bloco: BlocoClasse = { tipo: "classe", nome: "Combatente", citacao: texto("Citação da classe"),
    cabecalho: [texto("FONTE NÃO DUPLICADA")], linhas: [],
    saude: { vida: texto("30 + VIG × 4"), energia: texto("15 + DES × 2") },
    progressao: { vida: texto("7 + VIG × 2"), energia: texto("4 + DES × 2") },
    habilidades: [{ tipo: "habilidade", nome: "Abrir Cabeças", custo: 2, reacao: false,
        glifo: "◈", trechos: texto("Descrição canônica") }],
    arquetipos: [{ nome: "Lutador", habilidadeInicial: { tipo: "habilidade", nome: "Força Bruta",
        custo: 4, reacao: false, glifo: "◈", trechos: texto("Inicial canônica") } }],
};

describe("RegrasClasse", () => {
    it("preserva fórmulas e progressão com stats canônicos e habilidade inicial nas abas", () => {
        const fixture = TestBed.createComponent(RegrasClasse);
        fixture.componentRef.setInput("bloco", bloco);
        fixture.detectChanges();
        const raiz: HTMLElement = fixture.nativeElement;
        const stats = raiz.querySelectorAll("app-stat");
        expect(stats.length).toBe(2);
        expect(stats[0].textContent).toContain("30 + VIG × 4");
        expect(stats[0].textContent).toContain("Por nível: +7 + VIG × 2");
        expect(stats[1].textContent).toContain("15 + DES × 2");
        expect(raiz.querySelector('[role="tabpanel"]')?.textContent).toContain("Força Bruta");
        expect(raiz.textContent).not.toContain("FONTE NÃO DUPLICADA");
        expect(raiz.querySelectorAll("table").length).toBe(0);
    });

    it("identifica classes, arquétipos acentuados e subclasses usando o catálogo aprovado", () => {
        expect(recuperarIconeIdentidade("Combatente")).toBe("combatente");
        expect(recuperarIconeIdentidade("Acadêmico")).toBe("academico");
        expect(recuperarIconeIdentidade("Experimento Híbrido")).toBe("hibrido");
        expect(recuperarIconeIdentidade("Inventado")).toBeUndefined();
    });
});
