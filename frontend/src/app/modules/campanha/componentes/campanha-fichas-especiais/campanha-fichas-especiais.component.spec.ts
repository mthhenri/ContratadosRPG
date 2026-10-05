import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import type { FichaResumoDto } from "@contratados-rpg/shared/dtos/ficha";
import { CategoriaNpcEnum, ClasseEnum, NivelAmeacaEnum, TipoFichaEnum } from "@contratados-rpg/shared/enums";
import { CampanhaFichasEspeciais } from "./campanha-fichas-especiais.component";
import { agruparFichasPorMembro } from "../../campanha-equipe.util";

describe("CampanhaFichasEspeciais (visão do jogador, somente leitura)", () => {
    const npc: FichaResumoDto = {
        id: 8, usuarioId: 2, nome: "Helena", tipo: TipoFichaEnum.NPC,
        campanhaId: 2, campanhaNome: "Campanha", imagemUrl: null,
        categoria: CategoriaNpcEnum.CIVIL, classe: ClasseEnum.CIVIL, arquetipo: null,
        nivel: 3, vidaAtual: 20, vidaMaxima: 25, energiaAtual: 0, energiaMaxima: 0,
        morrendo: false, machucado: false, inconsciente: false,
    };
    const criatura: FichaResumoDto = { ...npc, id: 9, nome: "A Estátua",
        tipo: TipoFichaEnum.CRIATURA, na: NivelAmeacaEnum.MEDIA, vd: 30, defesa: 30 };

    function montar() {
        TestBed.configureTestingModule({ imports: [CampanhaFichasEspeciais],
            providers: [provideRouter([])] });
        const fixture = TestBed.createComponent(CampanhaFichasEspeciais);
        fixture.componentRef.setInput("fichas", [npc, criatura]);
        fixture.componentRef.setInput("campanhaId", 2);
        fixture.detectChanges();
        return { fixture, raiz: fixture.nativeElement as HTMLElement };
    }

    it("não projeta NPCs ou criaturas como agentes do Esquadrão", () => {
        const agente = { ...npc, id: 10, tipo: TipoFichaEnum.JOGADOR };
        const grupos = agruparFichasPorMembro([npc, criatura, agente]);
        expect(grupos.get(2)?.map((ficha) => ficha.id)).toEqual([10]);
    });

    it("apresenta recortes distintos e abre as rotas dedicadas, com filtro por tipo", () => {
        const { fixture, raiz } = montar();
        const links = Array.from(raiz.querySelectorAll(".acervo__cartao-link"));
        expect(links.map((link) => link.getAttribute("href")))
            .toEqual(["/campanhas/2/npc/8", "/fichas/criatura/9"]);
        expect(links[0].textContent).toContain("Civil · Nível 3");
        expect(links[0].textContent).not.toContain("Energia");
        expect(links[1].textContent).toContain("VD 30");
        const filtro = raiz.querySelector("select")!;
        filtro.value = TipoFichaEnum.NPC;
        filtro.dispatchEvent(new Event("change"));
        fixture.detectChanges();
        expect(raiz.querySelectorAll("app-cartao-ficha-acervo")).toHaveLength(1);
    });

    it("não oferece criação, gestão de acesso nem menu — só leitura", () => {
        const { raiz } = montar();
        expect(raiz.querySelectorAll("app-cartao-ficha-acervo")).toHaveLength(2);
        expect(raiz.querySelectorAll("button")).toHaveLength(0);
        expect(raiz.textContent).not.toContain("Novo NPC");
        expect(raiz.textContent).not.toContain("Acesso de jogadores");
    });
});
