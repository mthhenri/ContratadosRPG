import { TestBed } from "@angular/core/testing";
import { CategoriaNpcEnum } from "@contratados-rpg/shared/enums";
import { TemaService } from "../../../../core/services/tema.service";
import { FichaService } from "../../ficha.service";
import { FichaEdicaoNpcService } from "../../ficha-edicao-npc.service";
import { NpcEdicaoFormulario } from "../../npc-edicao-formulario.service";
import { criarFichaNpcTeste } from "../../testing/ficha-npc.fixture";
import { NpcVisualizacao } from "./npc-visualizacao.component";

describe("NpcVisualizacao", () => {
    function montar(gerenciavel: boolean) {
        TestBed.configureTestingModule({ imports: [NpcVisualizacao], providers: [
            FichaEdicaoNpcService, NpcEdicaoFormulario,
            { provide: FichaService, useValue: {} },
            { provide: TemaService, useValue: { accentEfetivo: () => "var(--accent)" } },
        ] });
        const edicao = TestBed.inject(FichaEdicaoNpcService);
        edicao.definirFicha(criarFichaNpcTeste());
        const fixture = TestBed.createComponent(NpcVisualizacao);
        fixture.componentRef.setInput("gerenciavel", gerenciavel); fixture.detectChanges();
        return { fixture, edicao, pagina: fixture.componentInstance,
            raiz: fixture.nativeElement as HTMLElement };
    }

    it("Civil conserva Vida e snapshots, sem controles de Energia ou gestão para leitor", () => {
        const { raiz, pagina } = montar(false);
        expect(raiz.textContent).toContain("Sem Energia");
        expect(raiz.textContent).toContain("77");
        expect(raiz.querySelectorAll("input, textarea, select")).toHaveLength(0);
        expect(raiz.textContent).not.toContain("Adicionar habilidade");
        expect(raiz.textContent).not.toContain("Editar recursos");
        expect(pagina.dt("vigor")).toBeGreaterThan(0);
    });

    it("editar identidade não substitui cor ausente pela cor do tema", () => {
        const { pagina, fixture, edicao } = montar(true);
        pagina.iniciar("identidade"); fixture.detectChanges();
        expect(edicao.rascunho()?.cor).toBeNull();
        expect(edicao.rascunho()?.dados.vidaMaxima).toBe(77);
    });

    it("Pool exibe recarga salva; Reserva Fixa oculta esse metadado", () => {
        const { pagina, fixture, edicao, raiz } = montar(false);
        const ficha = criarFichaNpcTeste();
        edicao.definirFicha({ ...ficha, dados: { ...ficha.dados, categoria: CategoriaNpcEnum.ELITE,
            energia: { maxima: 90, atual: 101, recargaPorTurno: 13 } } });
        fixture.detectChanges();
        expect(raiz.textContent).toContain("Recarga 13/turno");
        expect(pagina.dados().energia.maxima).toBe(90);
        edicao.definirFicha({ ...ficha,
            dados: { ...ficha.dados, categoria: CategoriaNpcEnum.VETERANO } });
        fixture.detectChanges();
        expect(raiz.textContent).toContain("Reserva Fixa");
        expect(raiz.textContent).not.toContain("Recarga 13");
    });
    describe("casco da ficha de Criatura (m4-14)", () => {
        const botoesComTexto = (raiz: HTMLElement) => Array.from(
            raiz.querySelectorAll<HTMLButtonElement>("button[app-botao]"),
        ).map((botao) => botao.textContent?.trim());
        const rotulos = (raiz: HTMLElement) => Array.from(
            raiz.querySelectorAll("[aria-label]"),
        ).map((elemento) => elemento.getAttribute("aria-label"));

        it("mestre edita por ícone (lápis) e não há botão de contorno solto no corpo", () => {
            const { raiz } = montar(true);
            expect(rotulos(raiz)).toEqual(expect.arrayContaining(["Editar identidade",
                "Editar recursos", "Alterar Cooperação", "Editar atributos", "Escolher retrato"]));
            const textos = botoesComTexto(raiz);
            for (const solto of ["Editar recursos", "Alterar Cooperação", "Escolher retrato",
                "Editar conduta", "Adicionar habilidade"]) {
                expect(textos).not.toContain(solto);
            }
        });

        it("leitor não recebe nenhum lápis nem selo do retrato", () => {
            const { raiz } = montar(false);
            const lista = rotulos(raiz);
            for (const rotulo of ["Editar identidade", "Editar recursos", "Alterar Cooperação",
                "Editar atributos", "Escolher retrato", "Editar habilidades"]) {
                expect(lista).not.toContain(rotulo);
            }
        });

        it("selos do retrato ficam sobre o avatar; enquadrar e remover só com imagem", () => {
            const { raiz, edicao, fixture } = montar(true);
            expect(raiz.querySelectorAll(".npc__avatar button")).toHaveLength(1);
            edicao.definirFicha({ ...criarFichaNpcTeste(), imagemUrl: "/uploads/npc.png" });
            fixture.detectChanges();
            expect(Array.from(raiz.querySelectorAll(".npc__avatar button"))
                .map((botao) => botao.getAttribute("aria-label")))
                .toEqual(["Enquadrar retrato", "Remover retrato", "Escolher retrato"]);
        });

        it("abas têm ícone e rótulo colapsável", () => {
            const { raiz } = montar(true);
            const abas = Array.from(raiz.querySelectorAll("button[app-aba]"));
            expect(abas.map((aba) => aba.textContent?.trim()))
                .toEqual(["Habilidades", "Conduta", "Sanidade"]);
            for (const aba of abas) {
                expect(aba.querySelector("app-icone")).not.toBeNull();
                expect(aba.querySelector(".abas__rotulo")).not.toBeNull();
            }
        });

        it("ícones por item de Habilidades só aparecem depois do lápis do cabeçalho", () => {
            const { raiz, edicao, fixture } = montar(true);
            const ficha = criarFichaNpcTeste();
            edicao.definirFicha({ ...ficha, dados: { ...ficha.dados,
                categoria: CategoriaNpcEnum.VETERANO, habilidades: [{
                    nomeNeutro: "Cobertura", nomeNarrativo: "", tipo: "PASSIVA" as never,
                    custoEnergia: 0, descricao: "Protege o grupo", restricao: "" }] } });
            fixture.detectChanges();
            expect(raiz.querySelectorAll(".npc-lista__acoes")).toHaveLength(0);
            (raiz.querySelector('button[aria-label="Editar habilidades"]') as HTMLButtonElement).click();
            fixture.detectChanges();
            expect(Array.from(raiz.querySelectorAll(".npc-lista__acoes button"))
                .map((botao) => botao.getAttribute("aria-label")))
                .toEqual(["Editar habilidade", "Remover habilidade"]);
        });

        it("Conduta e Sanidade editam por lápis, sem botão de contorno no corpo", () => {
            const { raiz, pagina, fixture } = montar(true);
            pagina.aba.set("conduta"); fixture.detectChanges();
            expect(rotulos(raiz)).toContain("Editar conduta");
            expect(botoesComTexto(raiz)).not.toContain("Editar conduta");
            pagina.aba.set("sanidade"); fixture.detectChanges();
            expect(rotulos(raiz)).toEqual(expect.arrayContaining(["Editar sequelas",
                "Adicionar sequela", "Adicionar trauma"]));
        });
    });
});
