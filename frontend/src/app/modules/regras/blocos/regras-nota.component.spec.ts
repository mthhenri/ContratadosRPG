import { TestBed } from "@angular/core/testing";
import { RegrasNota } from "./regras-nota.component";
import { RegrasBloco, RegrasTrecho } from "../regras.model";

type Nota = Extract<RegrasBloco, { tipo: "nota" }>;
const texto = (valor: string): RegrasTrecho => ({ tipo: "texto", texto: valor });

function montar(trechos: RegrasTrecho[]): HTMLElement {
    const fixture = TestBed.createComponent(RegrasNota);
    fixture.componentRef.setInput("bloco", { tipo: "nota", trechos } satisfies Nota);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
}

describe("RegrasNota", () => {
    it("estrutura os efeitos ▢ em lista e mantém a ressalva associada ao conjunto (RV-06)", () => {
        const raiz = montar([
            { tipo: "italico", filhos: [texto("⬦ Amaldiçoado pelo Passado Descrição.")] },
            texto(" Você recebe: ▢ +1 dado. ▢ +2 no limite. ▢ +1 Formação extra. "),
            { tipo: "italico", filhos: [texto("No caso da Peculiaridade")] }, texto(", a formação se mantém"),
        ]);
        const itens = Array.from(raiz.querySelectorAll(".regras-nota__efeitos li"));
        expect(itens.map((item) => item.textContent?.replace(/\s+/g, " ").trim())).toEqual(["▢+1 dado.", "▢+2 no limite.", "▢+1 Formação extra."]);
        expect(raiz.querySelector("p")?.textContent).toContain("Você recebe:");
        expect(raiz.querySelector(".regras-nota__ressalva")?.textContent).toContain("No caso da Peculiaridade, a formação se mantém");
    });

    it("nota comum continua um parágrafo único", () => {
        const raiz = montar([texto("Uma nota qualquer.")]);
        expect(raiz.querySelector(".regras-nota__efeitos")).toBeNull();
        expect(raiz.querySelector("p")?.textContent).toContain("Uma nota qualquer.");
    });
});
