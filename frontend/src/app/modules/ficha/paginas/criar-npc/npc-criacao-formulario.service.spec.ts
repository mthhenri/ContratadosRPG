import { TestBed } from "@angular/core/testing";
import { CategoriaNpcEnum, HabilidadeTipoNpcEnum, PatenteEnum } from "@contratados-rpg/shared/enums";
import { NpcCriacaoFormulario } from "./npc-criacao-formulario.service";

describe("NpcCriacaoFormulario", () => {
    function montar() {
        TestBed.configureTestingModule({ providers: [NpcCriacaoFormulario] });
        return TestBed.inject(NpcCriacaoFormulario);
    }

    it("criação conserva escolha explícita de patente e acusa troca para Categoria incompatível", () => {
        const criacao = montar();
        criacao.formulario.controls.patenteEquivalente.setValue(PatenteEnum.OPERADOR);
        expect(criacao.dados().patenteEquivalente).toBe(PatenteEnum.OPERADOR);
        expect(criacao.violacoesEtapa(3)).toEqual([]);
        criacao.formulario.controls.categoria.setValue(CategoriaNpcEnum.CIVIL);
        expect(criacao.violacoesEtapa(3).join(" ")).toContain("Civil");
    });

    it("aceita o Operativo do Guia v4.2.0 com Social zero e mantém o snapshot", () => {
        const criacao = montar();
        criacao.formulario.patchValue({ atributos: {
            luta: 3, pontaria: 3, forca: 3, destreza: 2, social: 0,
        } });
        expect(criacao.distribuicao()).toEqual({ distribuidos: 6, restantes: 0, violacoes: [] });
        criacao.formulario.controls.competencias.setValue(["luta", "pontaria"]);
        expect(criacao.violacoesEtapa(1)).toEqual([]);
        expect(criacao.dados().atributos.social).toBe(0);
    });

    it("troca entre categorias não Civis preserva zeros escolhidos", () => {
        const criacao = montar();
        criacao.formulario.patchValue({ atributos: { luta: 0, pontaria: 0, social: 0 } });
        criacao.formulario.controls.categoria.setValue(CategoriaNpcEnum.VETERANO);
        expect(criacao.estado().atributos).toMatchObject({ luta: 0, pontaria: 0, social: 0 });
        expect(criacao.distribuicao().restantes).toBe(14);
    });

    it("Civil não ganha pontos dos zeros bloqueados; exceções são independentes", () => {
        const criacao = montar();
        criacao.formulario.controls.categoria.setValue(CategoriaNpcEnum.CIVIL);
        expect(criacao.distribuicao().restantes).toBe(2);
        criacao.liberarCombateCivil("luta");
        criacao.formulario.controls.atributos.controls.luta.setValue(0);
        expect(criacao.distribuicao().restantes).toBe(3);
        expect(criacao.formulario.controls.atributos.controls.pontaria.disabled).toBe(true);
        criacao.liberarCombateCivil("pontaria");
        criacao.formulario.controls.atributos.controls.pontaria.setValue(0);
        expect(criacao.distribuicao().restantes).toBe(4);
        criacao.liberarCombateCivil("luta");
        expect(criacao.distribuicao().restantes).toBe(3);
        expect(criacao.pontariaCivilLiberada()).toBe(true);
        criacao.formulario.controls.categoria.setValue(CategoriaNpcEnum.OPERATIVO);
        expect(criacao.estado().atributos).toMatchObject({ luta: 1, pontaria: 0 });
    });

    it.each([
        [CategoriaNpcEnum.OPERATIVO, 85, 14, null],
        [CategoriaNpcEnum.VETERANO, 165, 21, null],
        [CategoriaNpcEnum.ELITE, 285, 27, 3],
        [CategoriaNpcEnum.LENDARIO, 480, 37, 6],
    ])("%s reproduz o guia com N4, VIG3 e DES3", (categoria, vida, energia, recarga) => {
        const criacao = montar();
        criacao.formulario.patchValue({ categoria, nivel: 4,
            atributos: { vigor: 3, destreza: 3 } });
        expect(criacao.dados()).toMatchObject({ vidaMaxima: vida, vidaAtual: vida,
            defesaBase: 14, bloquear: 17, esquivar: 17,
            energia: { maxima: energia, atual: energia, recargaPorTurno: recarga } });
        expect(criacao.calcularDt("vigor")).toBe(20);
        expect(criacao.calcularDt("social")).toBe(16);
    });

    it("Civil inicia combate em zero, bloqueado e sem Energia", () => {
        const criacao = montar();
        criacao.formulario.controls.categoria.setValue(CategoriaNpcEnum.CIVIL);
        expect(criacao.estado().atributos).toMatchObject({ luta: 0, pontaria: 0 });
        expect(criacao.formulario.controls.atributos.controls.luta.disabled).toBe(true);
        expect(criacao.dados().energia).toEqual({ maxima: 0, atual: 0, recargaPorTurno: null });
        expect(criacao.distribuicao().restantes).toBe(2);
        criacao.liberarCombateCivil("luta");
        expect(criacao.estado().atributos).toMatchObject({ luta: 1, pontaria: 0 });
        expect(criacao.formulario.controls.atributos.controls.luta.enabled).toBe(true);
        expect(criacao.distribuicao().restantes).toBe(2);
        expect(criacao.dados()).not.toHaveProperty("lutaCivilLiberada");
        criacao.liberarCombateCivil("luta");
        expect(criacao.estado().atributos.luta).toBe(0);
    });

    it("sair de Civil restaura a base de combate e mantém Cooperação/Nível", () => {
        const criacao = montar();
        criacao.formulario.patchValue({ categoria: CategoriaNpcEnum.CIVIL,
            cooperacao: 0, nivel: 20 });
        criacao.formulario.controls.categoria.setValue(CategoriaNpcEnum.OPERATIVO);
        expect(criacao.estado()).toMatchObject({ cooperacao: 0, nivel: 20,
            atributos: { luta: 1, pontaria: 1 } });
        expect(criacao.referenciaCooperacao()?.rotulo).toBe("Hostil");
    });

    it("não reduz silenciosamente valores ao trocar Categoria", () => {
        const criacao = montar();
        criacao.formulario.patchValue({ categoria: CategoriaNpcEnum.LENDARIO,
            atributos: { vigor: 6 } });
        criacao.formulario.controls.categoria.setValue(CategoriaNpcEnum.OPERATIVO);
        expect(criacao.estado().atributos.vigor).toBe(6);
        expect(criacao.violacoesEtapa(1).join(" ")).toContain("acima do limite");
    });

    it("campos opcionais vazios são omitidos, passiva não recebe custo", () => {
        const criacao = montar();
        criacao.adicionarHabilidade(HabilidadeTipoNpcEnum.PASSIVA);
        criacao.habilidades.at(0).patchValue({ nomeNeutro: " Guarda ", descricao: " Protege ",
            custoEnergia: 9 });
        expect(criacao.dados().habilidades[0]).toEqual({ nomeNeutro: "Guarda",
            descricao: "Protege", tipo: HabilidadeTipoNpcEnum.PASSIVA });
        expect(criacao.dados()).not.toHaveProperty("anotacoes");
        expect(criacao.dados().sanidade).toEqual({ sequelas: [], traumas: [] });
    });

    it("sanidade mantém descrição/tratamento e exclusão marca alterações", () => {
        const criacao = montar();
        criacao.adicionarSanidade("traumas");
        criacao.traumas.at(0).patchValue({ nome: " Medo ", descricao: " Fogo ", tratado: true });
        expect(criacao.dados().sanidade.traumas).toEqual([
            { nome: "Medo", descricao: "Fogo", tratado: true },
        ]);
        criacao.formulario.markAsPristine();
        criacao.removerLinha("traumas", 0);
        expect(criacao.formulario.dirty).toBe(true);
        expect(criacao.dados().sanidade.traumas).toEqual([]);
    });

    it("revisão aponta etapa correta para conteúdo obrigatório vazio ou inválido", () => {
        const criacao = montar();
        expect(new Set(criacao.pendencias().map(({ etapa }) => etapa)))
            .toEqual(new Set([0, 1, 2, 4]));
        criacao.adicionarHabilidade(HabilidadeTipoNpcEnum.ATIVA);
        criacao.habilidades.at(0).patchValue({ nomeNeutro: "A", descricao: "B", custoEnergia: -1 });
        expect(criacao.violacoesEtapa(2).join(" ")).toContain("custo");
    });
});
