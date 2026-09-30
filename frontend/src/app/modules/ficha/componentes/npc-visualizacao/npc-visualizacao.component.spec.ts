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
});
