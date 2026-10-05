import { TestBed } from "@angular/core/testing";
import { of, Subject, throwError } from "rxjs";
import type { FichaResumoDto, FichaVisibilidadeAlteradaDto } from "@contratados-rpg/shared/dtos/ficha";
import { CategoriaNpcEnum, ClasseEnum, NivelAmeacaEnum, TipoCampanhaMembroPapelEnum,
    TipoFichaEnum } from "@contratados-rpg/shared/enums";
import { TempoRealService } from "../../../../core/services/tempo-real.service";
import { FichaService } from "../../../ficha/ficha.service";
import { FichaAcessoEstadoService } from "../../../ficha/ficha-acesso-estado.service";
import { CampanhaFichaAcesso } from "./campanha-ficha-acesso.component";

describe("CampanhaFichaAcesso", () => {
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
        const visibilidade = new Subject<FichaVisibilidadeAlteradaDto>();
        const reconexao = new Subject<void>();
        const api = {
            listarAcessos: vi.fn(() => of([{ usuarioId: 4, nome: "Já concedido" }])),
            concederAcesso: vi.fn(() => of({ id: 1, fichaId: 8, usuarioId: 3 })),
            revogarAcesso: vi.fn(() => of({ fichaId: 8, usuarioId: 4 })),
        };
        TestBed.configureTestingModule({ imports: [CampanhaFichaAcesso],
            providers: [{ provide: FichaService, useValue: api },
                { provide: TempoRealService, useValue: {
                    fichaVisibilidadeAlterada$: visibilidade, reconexao$: reconexao,
                } }] });
        const fixture = TestBed.createComponent(CampanhaFichaAcesso);
        fixture.componentRef.setInput("fichas", [npc, criatura]);
        fixture.componentRef.setInput("campanhaId", 2);
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

    it("não renderiza nada nem carrega concessões enquanto não é aberto", () => {
        const { raiz, api } = montar();
        expect(raiz.querySelector("app-modal")).toBeNull();
        expect(api.listarAcessos).not.toHaveBeenCalled();
    });

    it("abrir(fichaId) carrega as concessões da ficha e mostra o diálogo", async () => {
        const { fixture, raiz, api } = montar();
        fixture.componentInstance.abrir(8);
        await fixture.whenStable();
        fixture.detectChanges();
        expect(api.listarAcessos).toHaveBeenCalledWith(8);
        expect(raiz.querySelector("app-modal")?.textContent).toContain("Helena");
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
