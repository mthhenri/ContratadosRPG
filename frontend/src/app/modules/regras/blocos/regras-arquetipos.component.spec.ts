import { TestBed } from "@angular/core/testing";
import { RegrasArquetipos as BlocoArquetipos, RegrasBloco, RegrasClasse, RegrasTrecho } from "../regras.model";
import { RegrasArquetipos } from "./regras-arquetipos.component";

const texto = (valor: string): RegrasTrecho[] => [{ tipo: "texto", texto: valor }];
const habilidade = (nome: string): RegrasBloco => ({ tipo: "habilidade", nome, custo: 2,
    reacao: false, glifo: "◈", trechos: texto("Descrição de " + nome) });
const bloco: BlocoArquetipos = {
    tipo: "arquetipos", classe: "Combatente", cabecalho: [texto("FONTE NÃO DUPLICADA")], linhas: [],
    arquetipos: ["Lutador", "Mercenário", "Vanguarda"].map(nome => ({ nome,
        citacao: texto("Citação " + nome), atributosBonus: texto("+1 FOR"),
        habilidades: [habilidade("Habilidade " + nome)],
        habilidadesGeraisMelhoradas: [habilidade("Melhorada " + nome)],
    })),
};
const iniciais: RegrasClasse["arquetipos"] = ["Mercenário", "Vanguarda", "Lutador"]
    .map(nome => ({ nome, habilidadeInicial: habilidade("Inicial " + nome) }));

function montar() {
    const fixture = TestBed.createComponent(RegrasArquetipos);
    fixture.componentRef.setInput("bloco", bloco);
    fixture.componentRef.setInput("iniciais", iniciais);
    fixture.detectChanges();
    return fixture;
}

describe("RegrasArquetipos", () => {
    it("associa habilidade inicial por nome e conserva todo conteúdo de cada painel sem duplicar a fonte", () => {
        const fixture = montar();
        const raiz: HTMLElement = fixture.nativeElement;
        const paineis = Array.from(raiz.querySelectorAll<HTMLElement>('[role="tabpanel"]'));
        expect(paineis.length).toBe(3);
        paineis.forEach((painel, indice) => {
            const nome = bloco.arquetipos[indice].nome;
            expect(painel.textContent).toContain("Inicial " + nome);
            expect(painel.textContent).toContain("Habilidade " + nome);
            expect(painel.textContent).toContain("Melhorada " + nome);
            expect(painel.textContent).toContain("Habilidade inicial do arquétipo");
            expect(painel.textContent).toContain("Habilidades gerais melhoradas");
            expect(painel.hidden).toBe(indice !== 0);
        });
        expect(raiz.textContent).not.toContain("FONTE NÃO DUPLICADA");
    });

    it("clique e teclado ativam o painel correspondente e mantêm a associação ARIA", () => {
        const fixture = montar();
        const raiz: HTMLElement = fixture.nativeElement;
        const abas = Array.from(raiz.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
        const paineis = Array.from(raiz.querySelectorAll<HTMLElement>('[role="tabpanel"]'));
        abas[1].click();
        fixture.detectChanges();
        expect(paineis[1].hidden).toBe(false);
        expect(abas[1].getAttribute("aria-selected")).toBe("true");
        abas[1].focus();
        abas[1].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
        fixture.detectChanges();
        expect(document.activeElement).toBe(abas[2]);
        expect(paineis[2].hidden).toBe(false);
        expect(paineis[1].hidden).toBe(true);
        expect(abas[2].getAttribute("aria-controls")).toBe(paineis[2].id);
        expect(paineis[2].getAttribute("aria-labelledby")).toBe(abas[2].id);
        abas[2].dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
        fixture.detectChanges();
        expect(paineis[0].hidden).toBe(false);
    });

    it("encaminha links internos das habilidades para o leitor", () => {
        const fixture = montar();
        fixture.componentRef.setInput("bloco", { ...bloco, arquetipos: [{ ...bloco.arquetipos[0],
            habilidades: [{ tipo: "paragrafo", trechos: [{ tipo: "link-interno", ancora: "vida", texto: "Vida" }] }],
        }] });
        fixture.detectChanges();
        const navegar = vi.fn();
        fixture.componentInstance.navegarAncora.subscribe(navegar);
        const link = fixture.nativeElement.querySelector("a") as HTMLAnchorElement;
        link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        expect(navegar).toHaveBeenCalledWith("vida");
    });

    it("usa o primeiro arquétipo ao mudar o bloco quando a seleção anterior deixa de existir", () => {
        const fixture = montar();
        const raiz: HTMLElement = fixture.nativeElement;
        raiz.querySelectorAll<HTMLButtonElement>('[role="tab"]')[2].click();
        fixture.detectChanges();
        fixture.componentRef.setInput("bloco", { ...bloco, classe: "Suporte",
            arquetipos: [{ ...bloco.arquetipos[0], nome: "Paramédico" }],
        });
        fixture.detectChanges();
        expect(raiz.querySelector<HTMLElement>('[role="tabpanel"]')?.hidden).toBe(false);
        expect(raiz.querySelector('[role="tab"]')?.getAttribute("aria-selected")).toBe("true");
    });
});
