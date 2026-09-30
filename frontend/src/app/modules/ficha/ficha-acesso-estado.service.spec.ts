import { TestBed } from "@angular/core/testing";
import { of, Subject, throwError } from "rxjs";
import type {
    FichaAcessoConcedidoDto, FichaAcessoResumoDto,
} from "@contratados-rpg/shared/dtos/ficha";
import { FichaService } from "./ficha.service";
import { FichaAcessoEstadoService } from "./ficha-acesso-estado.service";

describe("FichaAcessoEstadoService", () => {
    const acesso: FichaAcessoResumoDto = { usuarioId: 3, nome: "Helena" };

    function montar() {
        const api = {
            listarAcessos: vi.fn(() => of([acesso])),
            concederAcesso: vi.fn(() => of({ id: 10, fichaId: 8, usuarioId: 3 })),
            revogarAcesso: vi.fn(() => of({ fichaId: 8, usuarioId: 3 })),
        };
        TestBed.configureTestingModule({ providers: [FichaAcessoEstadoService,
            { provide: FichaService, useValue: api }] });
        return { estado: TestBed.inject(FichaAcessoEstadoService), api };
    }

    it("abre com carga da ficha escolhida e ignora resposta antiga após troca", async () => {
        const { estado, api } = montar();
        const antiga = new Subject<FichaAcessoResumoDto[]>();
        api.listarAcessos.mockReturnValueOnce(antiga);
        const primeira = estado.abrir(8);
        expect(estado.carregando()).toBe(true);
        expect(estado.acessos()).toEqual([]);
        await estado.abrir(9);
        antiga.next([{ ...acesso, nome: "Resposta antiga" }]);
        expect(await primeira).toBe(false);
        expect(estado.fichaId()).toBe(9);
        expect(estado.acessos()).toEqual([acesso]);
        expect(estado.carregando()).toBe(false);
        expect(api.listarAcessos.mock.calls).toEqual([[8], [9]]);
    });

    it("falha de carga oferece retry e impede conceder antes de conhecer os acessos", async () => {
        const { estado, api } = montar();
        api.listarAcessos.mockReturnValueOnce(throwError(() => new Error("indisponível")));
        expect(await estado.abrir(8)).toBe(false);
        estado.selecionarUsuario(3);
        expect(await estado.conceder()).toBe(false);
        expect(api.concederAcesso).not.toHaveBeenCalled();
        expect(estado.erro()).toContain("carregar");
        expect(await estado.recarregar()).toBe(true);
        expect(estado.erro()).toBeNull();
        expect(estado.acessos()).toEqual([acesso]);
    });

    it("concede somente após confirmação, refaz GET e bloqueia envio repetido", async () => {
        const { estado, api } = montar();
        const resposta = new Subject<FichaAcessoConcedidoDto>();
        api.listarAcessos.mockReturnValueOnce(of([]));
        api.concederAcesso.mockReturnValueOnce(resposta);
        await estado.abrir(8);
        estado.selecionarUsuario(3);
        const concedido = estado.conceder();
        expect(estado.ocupado()).toBe(true);
        expect(estado.acessos()).toEqual([]);
        expect(await estado.conceder()).toBe(false);
        estado.selecionarUsuario(4);
        expect(estado.usuarioSelecionado()).toBe(3);
        resposta.next({ id: 10, fichaId: 8, usuarioId: 3 });
        expect(await concedido).toBe(true);
        expect(api.concederAcesso).toHaveBeenCalledExactlyOnceWith(8, 3);
        expect(api.listarAcessos).toHaveBeenCalledTimes(2);
        expect(estado.acessos()).toEqual([acesso]);
        expect(estado.usuarioSelecionado()).toBeNull();
        expect(estado.ocupado()).toBe(false);
    });

    it("erro de concessão mantém seleção e acessos confirmados para tentar novamente", async () => {
        const { estado, api } = montar();
        await estado.abrir(8);
        estado.selecionarUsuario(4);
        api.concederAcesso.mockReturnValueOnce(throwError(() => new Error("falhou")));
        expect(await estado.conceder()).toBe(false);
        expect(estado.acessos()).toEqual([acesso]);
        expect(estado.usuarioSelecionado()).toBe(4);
        expect(estado.erro()).toContain("seleção foi mantida");
        expect(estado.ocupado()).toBe(false);
    });

    it("revoga pelo par ficha/usuário e recupera o recorte autorizado", async () => {
        const { estado, api } = montar();
        await estado.abrir(8);
        api.listarAcessos.mockReturnValueOnce(of([]));
        expect(await estado.revogar(3)).toBe(true);
        expect(api.revogarAcesso).toHaveBeenCalledExactlyOnceWith(8, 3);
        expect(estado.acessos()).toEqual([]);
    });

    it("erro de revogação conserva a lista confirmada", async () => {
        const { estado, api } = montar();
        await estado.abrir(8);
        api.revogarAcesso.mockReturnValueOnce(throwError(() => new Error("falhou")));
        expect(await estado.revogar(3)).toBe(false);
        expect(estado.acessos()).toEqual([acesso]);
        expect(estado.erro()).toContain("revogar");
    });

    it("distingue escrita confirmada de falha no refetch e exige recuperar a lista", async () => {
        const { estado, api } = montar();
        await estado.abrir(8);
        api.listarAcessos.mockReturnValueOnce(throwError(() => new Error("sem conexão")));
        expect(await estado.revogar(3)).toBe(false);
        expect(estado.erro()).toContain("confirmada");
        expect(estado.acessos()).toEqual([acesso]);
        expect(estado.pronto()).toBe(false);
        expect(await estado.revogar(3)).toBe(false);
        expect(api.revogarAcesso).toHaveBeenCalledTimes(1);
        api.listarAcessos.mockReturnValueOnce(of([]));
        expect(await estado.recarregar()).toBe(true);
        expect(estado.acessos()).toEqual([]);
    });

    it("fechar durante envio limpa o estado e impede resposta tardia de repor a lista", async () => {
        const { estado, api } = montar();
        const resposta = new Subject<FichaAcessoConcedidoDto>();
        api.concederAcesso.mockReturnValueOnce(resposta);
        await estado.abrir(8);
        estado.selecionarUsuario(4);
        const concedido = estado.conceder();
        estado.fechar();
        resposta.next({ id: 11, fichaId: 8, usuarioId: 4 });
        expect(await concedido).toBe(false);
        expect(api.listarAcessos).toHaveBeenCalledTimes(1);
        expect(estado.fichaId()).toBeNull();
        expect(estado.usuarioSelecionado()).toBeNull();
        expect(estado.acessos()).toEqual([]);
        expect(estado.ocupado()).toBe(false);
    });

    it("aplica somente o GET mais recente da mesma ficha", async () => {
        const { estado, api } = montar();
        await estado.abrir(8);
        const antiga = new Subject<FichaAcessoResumoDto[]>();
        api.listarAcessos.mockReturnValueOnce(antiga);
        const primeira = estado.recarregar();
        api.listarAcessos.mockReturnValueOnce(of([]));
        await estado.recarregar();
        antiga.next([acesso]);
        expect(await primeira).toBe(false);
        expect(estado.acessos()).toEqual([]);
        expect(estado.pronto()).toBe(true);
    });
});
