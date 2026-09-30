import { TestBed } from "@angular/core/testing";
import { of, Subject, throwError, type Observable } from "rxjs";
import type {
    FichaNpcAlteradaDto, FichaNpcAlterarDto, FichaNpcVitalidadeAlterarDto,
} from "@contratados-rpg/shared/dtos/ficha";
import { FichaService } from "./ficha.service";
import { FichaEdicaoNpcService } from "./ficha-edicao-npc.service";
import { criarFichaNpcTeste } from "./testing/ficha-npc.fixture";

describe("FichaEdicaoNpcService", () => {
    function montar() {
        const ficha = criarFichaNpcTeste();
        const resposta = new Subject<FichaNpcAlteradaDto>();
        const api = {
            alterarFichaNpc: vi.fn<(id: number, alteracao: FichaNpcAlterarDto)
                => Observable<FichaNpcAlteradaDto>>(() => resposta),
            alterarVitalidadeNpc: vi.fn<(id: number, ajuste: FichaNpcVitalidadeAlterarDto)
                => Observable<FichaNpcAlteradaDto>>(() => of(ficha)),
        };
        TestBed.configureTestingModule({ providers: [FichaEdicaoNpcService,
            { provide: FichaService, useValue: api }] });
        const edicao = TestBed.inject(FichaEdicaoNpcService);
        edicao.definirFicha(ficha);
        return { edicao, ficha, api, resposta };
    }

    it("mantém rascunho separado, permite cancelar e não recalcula snapshots", () => {
        const { edicao, ficha, api } = montar();
        edicao.iniciarEdicao();
        edicao.alterarRascunho((atual) => ({ ...atual,
            dados: { ...atual.dados, nivel: 20 } }));
        expect(edicao.ficha()).toEqual(ficha);
        expect(edicao.rascunho()?.dados.nivel).toBe(20);
        expect(edicao.rascunho()?.dados.vidaMaxima).toBe(77);
        edicao.cancelarEdicao();
        expect(edicao.rascunho()).toBeNull();
        expect(api.alterarFichaNpc).not.toHaveBeenCalled();
    });

    it("salva o grupo conjuntamente com validação compartilhada e conserva máximos", async () => {
        const { edicao, ficha, api, resposta } = montar();
        edicao.iniciarEdicao();
        const alterada = { ...ficha, dados: { ...ficha.dados, nivel: 20, cooperacao: 10,
            atributos: { ...ficha.dados.atributos, luta: 2 } } };
        edicao.alterarRascunho(() => alterada);
        const salvo = edicao.salvar();
        expect(api.alterarFichaNpc).toHaveBeenCalledExactlyOnceWith(ficha.id, {
            nome: ficha.nome, cor: null, imagemFoco: null, oculta: true, dados: alterada.dados,
        });
        resposta.next(alterada);
        expect(await salvo).toBe(true);
        expect(edicao.ficha()).toEqual(alterada);
        expect(edicao.rascunho()).toBeNull();
        expect(edicao.estadoPersistencia()).toBe("salvo");
    });

    it("bloqueia o envio inválido sem descartar os valores para correção", async () => {
        const { edicao, api } = montar();
        edicao.iniciarEdicao();
        edicao.alterarRascunho((atual) => ({ ...atual,
            dados: { ...atual.dados, cooperacao: 11 } }));
        expect(await edicao.salvar()).toBe(false);
        expect(api.alterarFichaNpc).not.toHaveBeenCalled();
        expect(edicao.violacoes().join(" ")).toContain("cooperação");
        expect(edicao.rascunho()?.dados.cooperacao).toBe(11);
    });

    it("erro mantém rascunho e permite tentar novamente", async () => {
        const { edicao, ficha, api, resposta } = montar();
        edicao.iniciarEdicao();
        edicao.alterarRascunho((atual) => ({ ...atual,
            dados: { ...atual.dados, cooperacao: 9 } }));
        api.alterarFichaNpc.mockReturnValueOnce(throwError(() => new Error("indisponível")));
        expect(await edicao.salvar()).toBe(false);
        expect(edicao.estadoPersistencia()).toBe("erro");
        expect(edicao.erro()).toContain("mantido");
        expect(edicao.ficha()).toEqual(ficha);
        expect(edicao.rascunho()?.dados.cooperacao).toBe(9);
        const salvo = edicao.salvar();
        expect(api.alterarFichaNpc).toHaveBeenCalledTimes(2);
        resposta.next(edicao.rascunho()!);
        expect(await salvo).toBe(true);
    });

    it("envio ocupado impede repetição, cancelamento e alteração do grupo", async () => {
        const { edicao, ficha, api, resposta } = montar();
        edicao.iniciarEdicao();
        const salvo = edicao.salvar();
        expect(await edicao.salvar()).toBe(false);
        edicao.cancelarEdicao();
        edicao.alterarRascunho((atual) => ({ ...atual, nome: "Ignorado" }));
        expect(edicao.rascunho()?.nome).toBe(ficha.nome);
        expect(api.alterarFichaNpc).toHaveBeenCalledTimes(1);
        resposta.next(ficha);
        expect(await salvo).toBe(true);
    });

    it("mescla remoto sem perder campos locais nem sobrescrever recursos de outra sessão",
        async () => {
            const { edicao, ficha, resposta, api } = montar();
            edicao.iniciarEdicao();
            edicao.alterarRascunho((atual) => ({ ...atual,
                dados: { ...atual.dados, cooperacao: 9 } }));
            const remoto = { ...ficha, dados: { ...ficha.dados, vidaAtual: 15,
                anotacoes: "Notas alteradas em outra sessão" } };
            edicao.absorverRemoto(remoto);
            expect(edicao.ficha()).toEqual(remoto);
            expect(edicao.rascunho()?.dados.cooperacao).toBe(9);
            expect(edicao.rascunho()?.dados.vidaAtual).toBe(15);
            const salvo = edicao.salvar();
            expect(api.alterarFichaNpc.mock.calls[0][1].dados.vidaAtual).toBe(15);
            resposta.next(edicao.rascunho()!);
            expect(await salvo).toBe(true);
        });

    it("ajuste pontual absorve Morrendo decidido pela API e preserva edição de Conduta",
        async () => {
            const { edicao, ficha, api } = montar();
            edicao.iniciarEdicao();
            edicao.alterarRascunho((atual) => ({ ...atual, dados: { ...atual.dados,
                condutaCombate: { ...atual.dados.condutaCombate, gatilhosFuga: "Retirada" } } }));
            const alterada = { ...ficha, dados: { ...ficha.dados,
                vidaAtual: -4, condicoes: { morrendo: true } } };
            api.alterarVitalidadeNpc.mockReturnValueOnce(of(alterada));
            expect(await edicao.ajustarVitalidade({ vidaAtual: -4 })).toBe(true);
            expect(api.alterarVitalidadeNpc).toHaveBeenCalledExactlyOnceWith(8, { vidaAtual: -4 });
            expect(edicao.ficha()?.dados.condicoes?.morrendo).toBe(true);
            expect(edicao.rascunho()?.dados.vidaAtual).toBe(-4);
            expect(edicao.rascunho()?.dados.condutaCombate.gatilhosFuga).toBe("Retirada");
        });

    it("falha de vitalidade conserva o estado confirmado", async () => {
        const { edicao, ficha, api } = montar();
        api.alterarVitalidadeNpc.mockReturnValueOnce(throwError(() => new Error("falhou")));
        expect(await edicao.ajustarVitalidade({ vidaAtual: 0 })).toBe(false);
        expect(edicao.ficha()).toEqual(ficha);
        expect(edicao.estadoPersistencia()).toBe("erro");
    });

    it("limpeza por perda de acesso impede resposta tardia de repor dados privados", async () => {
        const { edicao, ficha, resposta } = montar();
        edicao.iniciarEdicao();
        const salvo = edicao.salvar();
        edicao.limpar();
        resposta.next(ficha);
        expect(await salvo).toBe(false);
        expect(edicao.ficha()).toBeNull();
        expect(edicao.rascunho()).toBeNull();
        expect(edicao.estadoPersistencia()).toBe("ocioso");
    });
});
