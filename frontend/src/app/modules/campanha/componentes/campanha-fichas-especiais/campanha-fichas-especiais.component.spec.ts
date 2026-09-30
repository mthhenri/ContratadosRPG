import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { of, Subject, throwError } from "rxjs";
import type { FichaResumoDto, FichaVisibilidadeAlteradaDto } from "@contratados-rpg/shared/dtos/ficha";
import { CategoriaNpcEnum, ClasseEnum, NivelAmeacaEnum, TipoCampanhaMembroPapelEnum,
    TipoFichaEnum } from "@contratados-rpg/shared/enums";
import { TempoRealService } from "../../../../core/services/tempo-real.service";
import { FichaService } from "../../../ficha/ficha.service";
import { FichaAcessoEstadoService } from "../../../ficha/ficha-acesso-estado.service";
import { CampanhaFichasEspeciais } from "./campanha-fichas-especiais.component";
import { agruparFichasPorMembro } from "../../campanha-equipe.util";

describe("CampanhaFichasEspeciais", () => {
    const npc: FichaResumoDto = {
        id: 8, usuarioId: 2, nome: "Helena", tipo: TipoFichaEnum.NPC,
        campanhaId: 2, campanhaNome: "Campanha", imagemUrl: null,
        categoria: CategoriaNpcEnum.CIVIL, classe: ClasseEnum.CIVIL, arquetipo: null,
        nivel: 3, vidaAtual: 20, vidaMaxima: 25, energiaAtual: 0, energiaMaxima: 0,
        morrendo: false, machucado: false, inconsciente: false,
    };
    const criatura: FichaResumoDto = { ...npc, id: 9, nome: "A Estátua",
        tipo: TipoFichaEnum.CRIATURA, na: NivelAmeacaEnum.MEDIA, vd: 30, defesa: 30 };

    function montar(gerenciavel = true) {
        const visibilidade = new Subject<FichaVisibilidadeAlteradaDto>();
        const reconexao = new Subject<void>();
        const api = {
            listarAcessos: vi.fn(() => of([{ usuarioId: 4, nome: "Já concedido" }])),
            concederAcesso: vi.fn(() => of({ id: 1, fichaId: 8, usuarioId: 3 })),
            revogarAcesso: vi.fn(() => of({ fichaId: 8, usuarioId: 4 })),
        };
        TestBed.configureTestingModule({ imports: [CampanhaFichasEspeciais],
            providers: [provideRouter([]), { provide: FichaService, useValue: api },
                { provide: TempoRealService, useValue: {
                    fichaVisibilidadeAlterada$: visibilidade, reconexao$: reconexao,
                } }] });
        const fixture = TestBed.createComponent(CampanhaFichasEspeciais);
        fixture.componentRef.setInput("fichas", [npc, criatura]);
        fixture.componentRef.setInput("campanhaId", 2);
        fixture.componentRef.setInput("gerenciavel", gerenciavel);
        fixture.componentRef.setInput("membros", [
            { usuarioId: 2, nome: "Mestre", papel: TipoCampanhaMembroPapelEnum.MESTRE, fichas: [] },
            { usuarioId: 3, nome: "Jogador elegível", papel: TipoCampanhaMembroPapelEnum.JOGADOR, fichas: [] },
            { usuarioId: 4, nome: "Já concedido", papel: TipoCampanhaMembroPapelEnum.JOGADOR, fichas: [] },
            { usuarioId: 5, nome: "Espectador", papel: TipoCampanhaMembroPapelEnum.ESPECTADOR, fichas: [] },
        ]);
        fixture.detectChanges();
        const estado = fixture.debugElement.injector.get(FichaAcessoEstadoService);
        const raiz = fixture.nativeElement as HTMLElement;
        return { fixture, estado, raiz, api, visibilidade, reconexao };
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

    it("leitor não recebe criação, gestão de acesso, menu ou carga de concessões", () => {
        const { raiz, api } = montar(false);
        expect(raiz.querySelectorAll("app-cartao-ficha-acervo")).toHaveLength(2);
        expect(raiz.querySelectorAll("button")).toHaveLength(0);
        expect(raiz.textContent).not.toContain("Novo NPC");
        expect(api.listarAcessos).not.toHaveBeenCalled();
    });

    it("exibe concedidos e oferece somente jogadores ainda sem acesso", async () => {
        const { fixture, raiz, estado } = montar();
        await estado.abrir(8);
        fixture.detectChanges();
        const nomes = Array.from(raiz.querySelectorAll("app-modal option"))
            .map((opcao) => opcao.textContent?.trim());
        expect(nomes).toEqual(["Selecione um jogador…", "Jogador elegível"]);
        expect(raiz.querySelector("app-modal")?.textContent).toContain("Já concedido");
        estado.selecionarUsuario(3);
        await estado.conceder();
        fixture.detectChanges();
        expect(raiz.querySelector<HTMLSelectElement>("app-modal select")?.value).toContain("null");
    });

    it("revalida apenas o diálogo aberto da campanha, inclusive na reconexão", async () => {
        const { fixture, estado, api, visibilidade, reconexao } = montar();
        visibilidade.next({ campanhaId: 2 });
        expect(api.listarAcessos).not.toHaveBeenCalled();
        await estado.abrir(8);
        visibilidade.next({ campanhaId: 99 });
        expect(api.listarAcessos).toHaveBeenCalledTimes(1);
        visibilidade.next({ campanhaId: 2 });
        await fixture.whenStable();
        reconexao.next();
        await fixture.whenStable();
        expect(api.listarAcessos).toHaveBeenCalledTimes(3);
        fixture.componentRef.setInput("fichas", [criatura]);
        fixture.detectChanges();
        expect(estado.fichaId()).toBeNull();
    });

    it("erro de carga mostra retry, sem apresentar vazio como lista confirmada", async () => {
        const { fixture, raiz, estado, api } = montar();
        api.listarAcessos.mockReturnValueOnce(throwError(() => new Error("falhou")));
        await estado.abrir(8);
        fixture.detectChanges();
        expect(raiz.querySelector("app-modal")?.textContent).toContain("Tentar novamente");
        expect(raiz.querySelector("app-modal")?.textContent).not.toContain("Nenhum acesso concedido");
    });

    it("limpa seleção quando outra sessão concede ao mesmo jogador", async () => {
        const { fixture, estado, api } = montar();
        await estado.abrir(8);
        estado.selecionarUsuario(3);
        fixture.detectChanges();
        api.listarAcessos.mockReturnValueOnce(of([{ usuarioId: 3, nome: "Jogador elegível" }]));
        await estado.recarregar();
        fixture.detectChanges();
        expect(estado.usuarioSelecionado()).toBeNull();
    });
});
