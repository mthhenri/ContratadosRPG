import { TestBed } from "@angular/core/testing";
import { RegrasGrade as BlocoGrade, RegrasTrecho } from "../regras.model";
import { RegrasGrade } from "./regras-grade.component";

const texto = (valor: string): RegrasTrecho[] => [{ tipo: "texto", texto: valor }];
const fonte: BlocoGrade = { tipo: "grade", colunas: 2,
    cabecalho: [texto("VIDA"), texto("ENERGIA")],
    linhas: [[texto("Inicial = 10 + VIGOR · Progressão: VIG"),
        texto("Inicial = 5 + ( DESTREZA × 2 ) · Progressão: DES")]] };

describe("RegrasGrade — RV-04", () => {
    it("mantém recurso, fórmula e progressão na mesma unidade sem duplicar a fonte", () => {
        const fixture = TestBed.createComponent(RegrasGrade);
        fixture.componentRef.setInput("bloco", { ...fonte, referencia: { tipo: "saude", itens: [
            { rotulo: "VIDA", conteudo: texto("Inicial = 10 + VIGOR"), nota: "Progressão: VIG", variante: "vida" },
            { rotulo: "ENERGIA", conteudo: texto("Inicial = 5 + ( DESTREZA × 2 )"), nota: "Progressão: DES", variante: "energia" },
        ] } });
        fixture.detectChanges();
        const raiz: HTMLElement = fixture.nativeElement;
        const stats = raiz.querySelectorAll("app-stat");
        expect(stats.length).toBe(2);
        expect(stats[0].textContent).toContain("VIDA");
        expect(stats[0].textContent).toContain("10 + VIGOR");
        expect(stats[0].textContent).toContain("Progressão: VIG");
        expect(stats[0].textContent).not.toContain("DESTREZA");
        expect(stats[1].textContent).toContain("ENERGIA");
        expect(stats[1].textContent).toContain("Progressão: DES");
        expect(raiz.querySelector(".regras-grade__celula")).toBeNull();
    });

    it("renderiza título da coleção separado dos pares e conserva links navegáveis", () => {
        const fixture = TestBed.createComponent(RegrasGrade);
        fixture.componentRef.setInput("bloco", { ...fonte, referencia: { tipo: "cartoes",
            titulo: "Nível de Criatura", itens: [{ rotulo: "Afinidade superior à 30",
                conteudo: [{ tipo: "link-interno", texto: "AMEAÇA APOCALÍPTICA", ancora: "classificacao" }] }] } });
        const navegar = vi.fn();
        fixture.componentInstance.navegarAncora.subscribe(navegar);
        fixture.detectChanges();
        const raiz: HTMLElement = fixture.nativeElement;
        expect(raiz.querySelector(".regras-referencia")?.textContent).not.toContain("Nível de Criatura");
        expect(raiz.querySelector(".regras-referencia app-cartao")?.textContent).toContain("Afinidade superior à 30");
        raiz.querySelector<HTMLAnchorElement>("a")?.click();
        expect(navegar).toHaveBeenCalledWith("classificacao");
    });

    it("mantém o fallback para grades sem reconhecimento explícito", () => {
        const fixture = TestBed.createComponent(RegrasGrade);
        fixture.componentRef.setInput("bloco", fonte);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelectorAll(".regras-grade__celula").length).toBe(4);
        expect(fixture.nativeElement.querySelector("app-regras-grade-referencia")).toBeNull();
    });
});
