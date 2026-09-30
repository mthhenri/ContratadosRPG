import { TestBed } from "@angular/core/testing";
import { of, throwError } from "rxjs";
import { CategoriaNpcEnum, HabilidadeTipoNpcEnum } from "@contratados-rpg/shared/enums";
import { FichaService } from "./ficha.service";
import { FichaEdicaoNpcService } from "./ficha-edicao-npc.service";
import { NpcEdicaoFormulario, criarHabilidadeFormulario } from "./npc-edicao-formulario.service";
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

    it("troca de grupo conserva Categoria, atributos e listas no mesmo rascunho", async () => {
        const { formulario, edicao, api } = montar();
        formulario.iniciar("identidade");
        formulario.formulario.controls.categoria.setValue(CategoriaNpcEnum.OPERATIVO);
        formulario.formulario.controls.nivel.setValue(20);
        formulario.iniciar("atributos");
        formulario.formulario.controls.atributos.controls.luta.setValue(3);
        formulario.iniciar("habilidades");
        formulario.habilidades.push(criarHabilidadeFormulario({ nomeNeutro: "Treino médico",
            tipo: HabilidadeTipoNpcEnum.PASSIVA, descricao: "Reconhece o perigo" }));
        formulario.habilidades.push(criarHabilidadeFormulario({ nomeNeutro: "Retirada",
            tipo: HabilidadeTipoNpcEnum.ATIVA, custoEnergia: 2, descricao: "Busca abrigo" }));
        expect(await formulario.salvar()).toBe(true);
        expect(api.alterarFichaNpc.mock.calls[0][1].dados).toMatchObject({
            categoria: CategoriaNpcEnum.OPERATIVO, nivel: 20, atributos: { luta: 3 },
            vidaMaxima: 77, defesaBase: 18, energia: { maxima: 0, atual: 0 },
        });
        expect(edicao.ficha()?.dados.habilidades).toHaveLength(2);
        expect(formulario.grupo()).toBeNull();
    });

    it("atualização de rascunho não apaga espaços enquanto o usuário escreve", () => {
        const { formulario, edicao } = montar();
        formulario.iniciar("conduta");
        formulario.formulario.controls.gatilhosFuga.setValue("Perigo para ");
        TestBed.tick();
        expect(formulario.formulario.controls.gatilhosFuga.value).toBe("Perigo para ");
        expect(edicao.rascunho()?.dados.condutaCombate.gatilhosFuga).toBe("Perigo para ");
    });

    it("remoto chega ao formulário sem apagar Cooperação local nem notas privadas", async () => {
        const { formulario, edicao, ficha, api } = montar();
        formulario.iniciar("identidade");
        formulario.formulario.controls.cooperacao.setValue(9);
        edicao.absorverRemoto({ ...ficha, dados: { ...ficha.dados, vidaAtual: 4,
            identidadeNarrativa: { ...ficha.dados.identidadeNarrativa, funcao: "Função remota" } } });
        TestBed.tick();
        expect(formulario.formulario.controls.funcao.value).toBe("Função remota");
        expect(formulario.formulario.controls.cooperacao.value).toBe(9);
        formulario.formulario.controls.nome.setValue("Nome local");
        expect(await formulario.salvar()).toBe(true);
        expect(api.alterarFichaNpc.mock.calls[0][1].dados).toMatchObject({
            vidaAtual: 4, anotacoes: "Informação privada do mestre",
            identidadeNarrativa: { nome: "Nome local", funcao: "Função remota" },
        });
    });

    it("cancela todos os grupos sem enviar alterações", () => {
        const { formulario, edicao, ficha, api } = montar();
        formulario.iniciar("identidade"); formulario.formulario.controls.nome.setValue("Rascunho");
        formulario.iniciar("atributos"); formulario.formulario.controls.atributos.controls.luta.setValue(2);
        formulario.cancelar(); TestBed.tick();
        expect(edicao.ficha()).toEqual(ficha);
        expect(edicao.rascunho()).toBeNull();
        expect(api.alterarFichaNpc).not.toHaveBeenCalled();
    });

    it("remoção remota de campos opcionais não reaparece no próximo editor", () => {
        const { formulario, edicao, ficha } = montar();
        const habilidade = { nomeNeutro: "Apoio", nomeNarrativo: "Socorro",
            restricao: "Apenas em abrigo", tipo: HabilidadeTipoNpcEnum.PASSIVA,
            descricao: "Organiza retirada" };
        const base = { ...ficha, dados: { ...ficha.dados,
            categoria: CategoriaNpcEnum.OPERATIVO, habilidades: [habilidade] } };
        edicao.definirFicha(base); formulario.iniciar("identidade");
        const remota = { nomeNeutro: habilidade.nomeNeutro, tipo: habilidade.tipo,
            descricao: habilidade.descricao };
        edicao.absorverRemoto({ ...base, dados: { ...base.dados, habilidades: [remota] } });
        TestBed.tick();
        expect(formulario.habilidades.at(0).controls.nomeNarrativo.value).toBe("");
        expect(formulario.habilidades.at(0).controls.restricao.value).toBe("");
    });

    it("não envia item incompleto e conserva editor após falha de gravação", async () => {
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
});
