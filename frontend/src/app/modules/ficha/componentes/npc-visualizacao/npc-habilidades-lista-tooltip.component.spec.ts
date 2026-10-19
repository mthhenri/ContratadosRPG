import { TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { of } from "rxjs";
import { CategoriaNpcEnum, HabilidadeTipoNpcEnum } from "@contratados-rpg/shared/enums";
import { TemaService } from "../../../../core/services/tema.service";
import { Tooltip } from "../../../../shared/tooltip/tooltip.directive";
import { Stat } from "../../../../shared/ui/stat/stat.component";
import { BarraRecurso } from "../../../../shared/ui/barra-recurso/barra-recurso.component";
import { FichaService } from "../../ficha.service";
import { FichaEdicaoNpcService } from "../../ficha-edicao-npc.service";
import { NpcEdicaoFormulario } from "../../npc-edicao-formulario.service";
import { criarFichaNpcTeste } from "../../testing/ficha-npc.fixture";
import { NpcHabilidadesLista } from "./npc-habilidades-lista.component";

describe("Tooltips de recursos — recorte T3", () => {
    function montarNpc() {
        const fichaBase = criarFichaNpcTeste();
        const ficha = { ...fichaBase, dados: { ...fichaBase.dados,
            categoria: CategoriaNpcEnum.OPERATIVO,
            habilidades: [
                { nomeNeutro: "Ativa positiva", tipo: HabilidadeTipoNpcEnum.ATIVA,
                    custoEnergia: 4, descricao: "Teste de custo próprio." },
                { nomeNeutro: "Ativa zero", tipo: HabilidadeTipoNpcEnum.ATIVA,
                    custoEnergia: 0, descricao: "Custo zero." },
                { nomeNeutro: "Ativa sem valor", tipo: HabilidadeTipoNpcEnum.ATIVA,
                    descricao: "Mesmo fallback visual de zero." },
                { nomeNeutro: "Passiva", tipo: HabilidadeTipoNpcEnum.PASSIVA,
                    descricao: "Sem custo." },
            ],
        } };
        TestBed.configureTestingModule({ imports: [NpcHabilidadesLista], providers: [
            FichaEdicaoNpcService, NpcEdicaoFormulario,
            { provide: FichaService, useValue: { alterarFichaNpc: vi.fn(() => of(ficha)) } },
            { provide: TemaService, useValue: { accentEfetivo: () => "var(--accent)" } },
        ] });
        TestBed.inject(FichaEdicaoNpcService).definirFicha(ficha);
        const fixture = TestBed.createComponent(NpcHabilidadesLista);
        fixture.componentRef.setInput("gerenciavel", true);
        fixture.detectChanges();
        return fixture;
    }

    it("NPC lista: custo positivo, zero e ausente usam o mesmo valor visível; passiva não recebe custo", () => {
        const fixture = montarNpc();
        const iconesCusto = fixture.debugElement.queryAll(By.css(".npc-lista__itens app-icone[nome='energia']"));
        const dicas = iconesCusto.map((elemento) => elemento.injector.get(Tooltip).appTooltip());
        for (const icone of iconesCusto) {
            const host = icone.nativeElement as HTMLElement;
            expect(host.tabIndex).toBe(0);
            expect(host.getAttribute("aria-label")).toBe(icone.injector.get(Tooltip).appTooltip());
            expect(host.getAttribute("aria-hidden")).not.toBe("true");
            host.focus();
            expect(document.activeElement).toBe(host);
        }
        expect(dicas).toEqual(["4 de Energia", "0 de Energia", "0 de Energia"]);
        expect(fixture.nativeElement.querySelectorAll(".npc-lista__itens app-icone[nome='energia']"))
            .toHaveLength(3);
    });

    it("NPC biblioteca: cada modelo ativo usa seu próprio custo e passivos não recebem tooltip de Energia", () => {
        const fixture = montarNpc();
        fixture.componentInstance.abrirBiblioteca();
        fixture.detectChanges();
        const modelos = fixture.componentInstance.modelosBiblioteca();
        const esperados = modelos.filter((modelo) => modelo.habilidade.tipo === HabilidadeTipoNpcEnum.ATIVA)
            .map((modelo) => `${modelo.habilidade.custoEnergia} de Energia`);
        expect(esperados.length).toBeGreaterThan(0);
        const iconesCusto = fixture.debugElement.queryAll(By.css(".npc-biblioteca app-icone[nome='energia']"));
        const dicas = iconesCusto.map((elemento) => elemento.injector.get(Tooltip).appTooltip());
        for (const icone of iconesCusto) {
            const host = icone.nativeElement as HTMLElement;
            expect(host.tabIndex).toBe(0);
            expect(host.getAttribute("aria-label")).toBe(icone.injector.get(Tooltip).appTooltip());
            expect(host.getAttribute("aria-hidden")).not.toBe("true");
            host.focus();
            expect(document.activeElement).toBe(host);
        }
        expect(dicas).toEqual(esperados);
    });

    for (const nome of ["Vida", "Energia", "Defesa"]) {
        it(`Stat mantém só o nome ${nome}, inclusive quando o valor é textual/ausente`, () => {
            TestBed.configureTestingModule({ imports: [Stat] });
            const fixture = TestBed.createComponent(Stat);
            fixture.componentRef.setInput("rotulo", nome);
            fixture.componentRef.setInput("icone", nome.toLowerCase());
            for (const valor of [12, "14 / 60", null]) {
                fixture.componentRef.setInput("valor", valor);
                fixture.detectChanges();
                const icone = fixture.debugElement.query(By.css(".stat__rotulo app-icone"));
                expect(icone.injector.get(Tooltip).appTooltip()).toBe(nome);
            }
        });
    }

    for (const nome of ["Vida", "Energia"]) {
        it(`BarraRecurso mantém ${nome} independente do valor atual/máximo e da dica explicativa`, () => {
            TestBed.configureTestingModule({ imports: [BarraRecurso] });
            const fixture = TestBed.createComponent(BarraRecurso);
            fixture.componentRef.setInput("rotulo", nome);
            fixture.componentRef.setInput("recurso", nome.toLowerCase());
            fixture.componentRef.setInput("atual", 14);
            fixture.componentRef.setInput("maximo", 60);
            fixture.componentRef.setInput("dica", "Explicação preservada");
            fixture.detectChanges();
            const icone = fixture.debugElement.query(By.css(".barra-recurso__icone"));
            expect(icone.injector.get(Tooltip).appTooltip()).toBe(nome);
            const rotulo = fixture.debugElement.query(By.css(".barra-recurso__rotulo"));
            expect(rotulo.injector.get(Tooltip).appTooltip()).toBe("Explicação preservada");
        });
    }
});
