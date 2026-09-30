import { TestBed } from "@angular/core/testing";
import { signal } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { of, Subject, throwError } from "rxjs";
import { SessaoService } from "../../../../core/services/sessao.service";
import { TempoRealService } from "../../../../core/services/tempo-real.service";
import { TopbarContextoService } from "../../../../core/services/topbar-contexto.service";
import { ConfirmacaoService } from "../../../../shared/ui/confirmacao/confirmacao.service";
import { NotificacaoService } from "../../../../shared/ui/notificacao/notificacao.service";
import { CampanhaService } from "../../../campanha/campanha.service";
import { FichaService } from "../../ficha.service";
import { RolagemService } from "../../rolagem.service";
import { criarFichaNpcTeste } from "../../testing/ficha-npc.fixture";
import { NpcVisualizar } from "./visualizar-npc.page";
import type { FichaNpcRecuperadaDto } from "@contratados-rpg/shared/dtos/ficha";

describe("NpcVisualizar — acesso e recuperação", () => {
    async function montar(proprietario = true) {
        const ficha = criarFichaNpcTeste();
        const api = { recuperarFichaNpc: vi.fn(() => of(ficha)),
            alterarFichaNpc: vi.fn((_id, alteracao) => of({ ...ficha, ...alteracao })) };
        const alterada = new Subject<{ id: number }>();
        const reconexao = new Subject<void>();
        const revogado = new Subject<{ fichaId: number; usuarioId: number }>();
        const tempoReal = { fichaAlterada$: alterada, reconexao$: reconexao,
            acessoRevogado$: revogado, rolagemRegistrada$: new Subject(),
            rolagemExcluida$: new Subject(), conectar: vi.fn(), entrarSalaFicha: vi.fn(),
            sairSalaFicha: vi.fn(), entrarSalaCampanha: vi.fn(), sairSalaCampanha: vi.fn() };
        const router = { navigate: vi.fn() };
        const confirmacao = { confirmar: vi.fn(() => Promise.resolve(false)) };
        TestBed.configureTestingModule({ imports: [NpcVisualizar], providers: [
            { provide: FichaService, useValue: api },
            { provide: ActivatedRoute, useValue: {
                snapshot: { paramMap: { get: () => String(ficha.id) } }, parent: null } },
            { provide: Router, useValue: router },
            { provide: SessaoService, useValue: { usuario: signal({ id: proprietario ? 4 : 3 }) } },
            { provide: TempoRealService, useValue: tempoReal },
            { provide: TopbarContextoService, useValue: { definir: vi.fn(), limpar: vi.fn() } },
            { provide: ConfirmacaoService, useValue: confirmacao },
            { provide: NotificacaoService, useValue: { notificar: vi.fn() } },
            { provide: CampanhaService, useValue: { recuperarCampanha: vi.fn(() => of({ nome: "Teste" })),
                listarMembros: vi.fn(() => of([])) } },
            { provide: RolagemService, useValue: { listarPorFicha: vi.fn(() => of({
                itens: [], paginaAtual: 1, totalPaginas: 1 })) } },
        ] });
        const fixture = TestBed.createComponent(NpcVisualizar);
        // Aguarda carga inicial; os testes exercitam orquestração sem renderizar utilitários.
        await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
        return { fixture, pagina: fixture.componentInstance, ficha, api, tempoReal,
            alterada, reconexao, revogado, router, confirmacao };
    }

    it("reconexão refaz GET tipado e mescla rascunho sem recomputar snapshots", async () => {
        const { pagina, ficha, api, reconexao, tempoReal } = await montar();
        pagina.formulario.iniciar("identidade");
        pagina.formulario.formulario.controls.cooperacao.setValue(9);
        api.recuperarFichaNpc.mockReturnValue(of({ ...ficha,
            dados: { ...ficha.dados, vidaAtual: 4 } }));
        reconexao.next(); await Promise.resolve();
        expect(api.recuperarFichaNpc).toHaveBeenCalledTimes(2);
        expect(pagina.edicao.rascunho()?.dados).toMatchObject({ cooperacao: 9, vidaAtual: 4,
            vidaMaxima: 77, defesaBase: 18 });
        expect(tempoReal.entrarSalaCampanha).toHaveBeenCalledWith(2);
    });

    it("revogação apaga dados antes de navegar e ignora recuperação atrasada", async () => {
        const { pagina, api, revogado, reconexao, router } = await montar(false);
        expect(pagina.gerenciavel()).toBe(false);
        const resposta = new Subject<FichaNpcRecuperadaDto>();
        api.recuperarFichaNpc.mockReturnValue(resposta);
        reconexao.next();
        revogado.next({ fichaId: 8, usuarioId: 3 });
        expect(pagina.edicao.ficha()).toBeNull();
        expect(pagina.historico()).toEqual([]);
        expect(router.navigate).toHaveBeenCalledWith(["/campanhas", 2]);
        resposta.next(criarFichaNpcTeste()); await Promise.resolve();
        expect(pagina.edicao.ficha()).toBeNull();
    });

    it("403 depois da reconexão expulsa mesmo quando não chegou o evento de revogação", async () => {
        const { pagina, api, reconexao, router } = await montar(false);
        api.recuperarFichaNpc.mockReturnValue(throwError(() => ({ status: 403 })));
        reconexao.next(); await Promise.resolve();
        expect(pagina.edicao.ficha()).toBeNull();
        expect(router.navigate).toHaveBeenCalled();
    });

    it("erro inicial permite retry e leitor não inicia persistência", async () => {
        const { pagina, api } = await montar(false);
        api.recuperarFichaNpc.mockReturnValueOnce(throwError(() => ({ status: 503 })));
        await pagina.carregar(); expect(pagina.erroCarga()).toBe(true);
        await pagina.carregar(); expect(pagina.erroCarga()).toBe(false);
        await pagina.salvar(); expect(api.alterarFichaNpc).not.toHaveBeenCalled();
    });

    it("protege saída com rascunho e abandona salas ao destruir", async () => {
        const { pagina, fixture, confirmacao, tempoReal } = await montar();
        expect(pagina.podeSair()).toBe(true);
        pagina.formulario.iniciar("identidade");
        expect(await pagina.podeSair()).toBe(false);
        expect(confirmacao.confirmar).toHaveBeenCalled();
        fixture.destroy();
        expect(tempoReal.sairSalaFicha).toHaveBeenCalledWith(8);
        expect(tempoReal.sairSalaCampanha).toHaveBeenCalledWith(2);
        expect(pagina.edicao.ficha()).toBeNull();
    });
});
