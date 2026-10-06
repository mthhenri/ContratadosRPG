import { TestBed } from "@angular/core/testing";
import { of, throwError } from "rxjs";
import { HabilidadeTipoNpcEnum } from "@contratados-rpg/shared/enums";
import { FichaService } from "./ficha.service";
import { FichaEdicaoNpcService } from "./ficha-edicao-npc.service";
import { NpcEdicaoFormulario } from "./npc-edicao-formulario.service";
import { criarFichaNpcTeste } from "./testing/ficha-npc.fixture";

describe("NpcEdicaoFormulario", () => {
    function montar() {
        const ficha = criarFichaNpcTeste();
        const api = { alterarFichaNpc: vi.fn((_id, alteracao) => of({ ...ficha, ...alteracao })) };
        TestBed.configureTestingModule({ providers: [FichaEdicaoNpcService, NpcEdicaoFormulario,
            { provide: FichaService, useValue: api }] });
        const edicao = TestBed.inject(FichaEdicaoNpcService);
        edicao.definirFicha(ficha);
        const formulario = TestBed.inject(NpcEdicaoFormulario);
        TestBed.tick();
        return { formulario, edicao, ficha, api };
    }

    // === Bloco (lápis + Salvar/Cancelar no próprio bloco) ===

    it("salva um bloco (Conduta) sozinho, sem grupo acumulado de outro bloco", async () => {
        const { formulario, edicao, api } = montar();
        formulario.iniciar("conduta");
        formulario.formulario.controls.gatilhosFuga.setValue("Foge com Vida baixa");
        expect(await formulario.salvar()).toBe(true);
        expect(api.alterarFichaNpc.mock.calls[0][1].dados.condutaCombate.gatilhosFuga)
            .toBe("Foge com Vida baixa");
        expect(edicao.rascunho()).toBeNull();
        expect(formulario.grupo()).toBeNull();
    });

    it("voltar um campo ao valor salvo também volta no rascunho (corrige a violação)", () => {
        const { formulario, edicao, ficha } = montar();
        formulario.iniciar("atributos");
        const luta = formulario.formulario.controls.atributos.controls.luta;
        luta.setValue(99);
        expect(edicao.violacoes().length).toBeGreaterThan(0);
        luta.setValue(ficha.dados.atributos.luta);
        expect(edicao.rascunho()?.dados.atributos.luta).toBe(ficha.dados.atributos.luta);
        expect(edicao.violacoes()).toEqual([]);
    });

    it("atualização de rascunho não apaga espaços enquanto o usuário escreve", () => {
        const { formulario, edicao } = montar();
        formulario.iniciar("conduta");
        formulario.formulario.controls.gatilhosFuga.setValue("Perigo para ");
        TestBed.tick();
        expect(formulario.formulario.controls.gatilhosFuga.value).toBe("Perigo para ");
        expect(edicao.rascunho()?.dados.condutaCombate.gatilhosFuga).toBe("Perigo para ");
    });

    it("cancela o bloco sem enviar alterações", () => {
        const { formulario, edicao, ficha, api } = montar();
        formulario.iniciar("atributos");
        formulario.formulario.controls.atributos.controls.luta.setValue(2);
        formulario.cancelar(); TestBed.tick();
        expect(edicao.ficha()).toEqual(ficha);
        expect(edicao.rascunho()).toBeNull();
        expect(api.alterarFichaNpc).not.toHaveBeenCalled();
    });

    it("um bloco por vez: iniciar outro grupo enquanto um já edita é ignorado", () => {
        const { formulario } = montar();
        formulario.iniciar("conduta");
        formulario.iniciar("atributos");
        expect(formulario.grupo()).toBe("conduta");
        formulario.cancelar();
        formulario.iniciar("atributos");
        expect(formulario.grupo()).toBe("atributos");
    });

    it("remoto chega ao bloco em edição sem apagar a alteração local nem notas privadas",
        async () => {
            const { formulario, edicao, ficha, api } = montar();
            formulario.iniciar("conduta");
            formulario.formulario.controls.gatilhosFuga.setValue("Gatilho local");
            edicao.absorverRemoto({ ...ficha, dados: { ...ficha.dados, vidaAtual: 4,
                condutaCombate: { ...ficha.dados.condutaCombate,
                    prioridadesAlvo: "Prioridade remota" } } });
            TestBed.tick();
            expect(formulario.formulario.controls.gatilhosFuga.value).toBe("Gatilho local");
            expect(formulario.formulario.controls.prioridadesAlvo.value).toBe("Prioridade remota");
            expect(await formulario.salvar()).toBe(true);
            expect(api.alterarFichaNpc.mock.calls[0][1].dados).toMatchObject({
                vidaAtual: 4, anotacoes: "Informação privada do mestre",
                condutaCombate: { gatilhosFuga: "Gatilho local",
                    prioridadesAlvo: "Prioridade remota" },
            });
        });

    it("remoção remota de campos opcionais não reaparece no próximo editor", () => {
        const { formulario, edicao, ficha } = montar();
        const habilidade = { nomeNeutro: "Apoio", nomeNarrativo: "Socorro",
            restricao: "Apenas em abrigo", tipo: HabilidadeTipoNpcEnum.PASSIVA,
            descricao: "Organiza retirada" };
        const base = { ...ficha, dados: { ...ficha.dados, habilidades: [habilidade] } };
        edicao.definirFicha(base); formulario.iniciar("habilidades");
        const remota = { nomeNeutro: habilidade.nomeNeutro, tipo: habilidade.tipo,
            descricao: habilidade.descricao };
        edicao.absorverRemoto({ ...base, dados: { ...base.dados, habilidades: [remota] } });
        TestBed.tick();
        expect(formulario.habilidades.at(0).controls.nomeNarrativo.value).toBe("");
        expect(formulario.habilidades.at(0).controls.restricao.value).toBe("");
    });

    it("não envia item incompleto e conserva o bloco após falha de gravação", async () => {
        const { formulario, edicao, api } = montar();
        formulario.iniciar("conduta");
        formulario.formulario.controls.gatilhosFuga.setValue("");
        expect(await formulario.salvar()).toBe(false);
        expect(api.alterarFichaNpc).not.toHaveBeenCalled();
        formulario.formulario.controls.gatilhosFuga.setValue("Proteger civis");
        api.alterarFichaNpc.mockReturnValueOnce(throwError(() => new Error("indisponível")));
        expect(await formulario.salvar()).toBe(false);
        TestBed.tick();
        expect(formulario.grupo()).toBe("conduta");
        expect(edicao.rascunho()?.dados.condutaCombate.gatilhosFuga).toBe("Proteger civis");
    });

    // === Valor avulso (clique → input → Enter confirma e persiste só aquele campo) ===

    it("confirmarAvulso persiste só o campo editado, com um único PUT", async () => {
        const { formulario, edicao, ficha, api } = montar();
        formulario.editarAvulso("nivel");
        expect(formulario.campoAvulso()).toBe("nivel");
        await formulario.confirmarAvulso("nivel",
            (atual) => ({ ...atual, dados: { ...atual.dados, nivel: 15 } }));
        expect(api.alterarFichaNpc).toHaveBeenCalledExactlyOnceWith(ficha.id, {
            nome: ficha.nome, cor: null, imagemFoco: null, oculta: true,
            dados: { ...ficha.dados, nivel: 15 },
        });
        expect(edicao.ficha()?.dados.nivel).toBe(15);
        expect(formulario.campoAvulso()).toBeNull();
    });

    it("cancelarAvulso não persiste nada", () => {
        const { formulario, edicao, api } = montar();
        formulario.editarAvulso("nome");
        formulario.cancelarAvulso();
        expect(formulario.campoAvulso()).toBeNull();
        expect(edicao.rascunho()).toBeNull();
        expect(api.alterarFichaNpc).not.toHaveBeenCalled();
    });

    it("confirmarAvulso com violação mantém o campo em edição com o valor e o erro", async () => {
        const { formulario, edicao } = montar();
        formulario.editarAvulso("cooperacao");
        await formulario.confirmarAvulso("cooperacao",
            (atual) => ({ ...atual, dados: { ...atual.dados, cooperacao: 11 } }));
        expect(formulario.campoAvulso()).toBe("cooperacao");
        expect(edicao.rascunho()?.dados.cooperacao).toBe(11);
        expect(edicao.erro()).toBeTruthy();
        formulario.cancelarAvulso();
        expect(formulario.campoAvulso()).toBeNull();
        expect(edicao.rascunho()).toBeNull();
    });

    // === Um por vez entre bloco e valor avulso (decisão 1) ===

    it("um bloco ativo bloqueia um valor avulso, e vice-versa", () => {
        const { formulario } = montar();
        formulario.iniciar("atributos");
        formulario.editarAvulso("nome");
        expect(formulario.campoAvulso()).toBeNull();
        expect(formulario.bloqueadoPorOutro("nome")).toBe(true);
        expect(formulario.tooltipBloqueio("nome")).toContain("Atributos");
        formulario.cancelar();

        formulario.editarAvulso("nome");
        formulario.iniciar("atributos");
        expect(formulario.grupo()).toBeNull();
        expect(formulario.bloqueadoPorOutro("atributos")).toBe(true);
        expect(formulario.tooltipBloqueio("atributos")).toContain("nome");
    });
});
