import { TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { of } from "rxjs";
import { CategoriaNpcEnum } from "@contratados-rpg/shared/enums";
import { TemaService } from "../../../../core/services/tema.service";
import { FichaService } from "../../ficha.service";
import { FichaEdicaoNpcService } from "../../ficha-edicao-npc.service";
import { NpcEdicaoFormulario } from "../../npc-edicao-formulario.service";
import { criarFichaNpcTeste } from "../../testing/ficha-npc.fixture";
import { NpcHabilidadesLista } from "./npc-habilidades-lista.component";
import { NpcIdentidade } from "./npc-identidade.component";
import { NpcVisualizacao } from "./npc-visualizacao.component";

const aguardarMicrotarefas = () => new Promise((resolve) => setTimeout(resolve));

describe("NpcVisualizacao", () => {
    function montar(gerenciavel: boolean) {
        const ficha = criarFichaNpcTeste();
        const api = { alterarFichaNpc: vi.fn((_id, alteracao) => of({ ...ficha, ...alteracao })) };
        TestBed.configureTestingModule({ imports: [NpcVisualizacao], providers: [
            FichaEdicaoNpcService, NpcEdicaoFormulario,
            { provide: FichaService, useValue: api },
            { provide: TemaService, useValue: { accentEfetivo: () => "var(--accent)" } },
        ] });
        const edicao = TestBed.inject(FichaEdicaoNpcService);
        edicao.definirFicha(ficha);
        const fixture = TestBed.createComponent(NpcVisualizacao);
        fixture.componentRef.setInput("gerenciavel", gerenciavel); fixture.detectChanges();
        return { fixture, edicao, api, ficha, pagina: fixture.componentInstance,
            identidade: fixture.debugElement.query(By.directive(NpcIdentidade))
                .componentInstance as NpcIdentidade,
            formulario: fixture.componentInstance.formulario,
            raiz: fixture.nativeElement as HTMLElement };
    }

    it("Civil conserva Vida e snapshots, sem controles de Energia ou gestão para leitor", () => {
        const { raiz, pagina } = montar(false);
        expect(raiz.textContent).toContain("Sem Energia");
        expect(raiz.textContent).toContain("77");
        expect(raiz.querySelectorAll("input, textarea, select")).toHaveLength(0);
        expect(raiz.textContent).not.toContain("Adicionar habilidade");
        expect(pagina.dt("vigor")).toBeGreaterThan(0);
    });

    it("editar o nome não altera a cor da ficha (campos avulsos independentes)", async () => {
        const { pagina, fixture, edicao, raiz, api } = montar(true);
        pagina.formulario.editarAvulso("nome"); fixture.detectChanges();
        const entrada = raiz.querySelector<HTMLInputElement>('input[aria-label="Nome"]')!;
        entrada.value = "Novo nome";
        entrada.dispatchEvent(new Event("blur"));
        fixture.detectChanges();
        await aguardarMicrotarefas();
        expect(api.alterarFichaNpc.mock.calls[0][1].cor).toBeNull();
        expect(edicao.ficha()?.dados.vidaMaxima).toBe(77);
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

    describe("casco da ficha de Criatura (m4-14) e edição por bloco/valor avulso (m4-16)", () => {
        const botoesComTexto = (raiz: HTMLElement) => Array.from(
            raiz.querySelectorAll<HTMLButtonElement>("button[app-botao]"),
        ).map((botao) => botao.textContent?.trim());
        const rotulos = (raiz: HTMLElement) => Array.from(
            raiz.querySelectorAll("[aria-label]"),
        ).map((elemento) => elemento.getAttribute("aria-label"));

        it("mestre edita por ícone (lápis) ou valor avulso, sem botão de contorno solto no corpo",
            () => {
                const { raiz } = montar(true);
                expect(rotulos(raiz)).toEqual(expect.arrayContaining(["Editar nome",
                    "Editar função narrativa", "Editar categoria", "Editar nível",
                    "Editar defesa", "Editar bloquear", "Editar esquivar",
                    "Editar atributos", "Escolher retrato"]));
                // Cooperação edita na própria barra de escala (m4-17), sem lápis/valor avulso.
                expect(raiz.querySelector('input[type="range"][aria-label="Cooperação"]'))
                    .not.toBeNull();
                expect(rotulos(raiz)).not.toContain("Editar cooperação");
                const textos = botoesComTexto(raiz);
                for (const solto of ["Editar nome", "Editar categoria", "Escolher retrato",
                    "Editar conduta", "Adicionar habilidade"]) {
                    expect(textos).not.toContain(solto);
                }
            });

        it("leitor não recebe nenhum lápis, valor avulso nem selo do retrato", () => {
            const { raiz } = montar(false);
            const lista = rotulos(raiz);
            for (const rotulo of ["Editar nome", "Editar categoria", "Editar nível",
                "Editar cooperação", "Editar defesa", "Editar atributos", "Escolher retrato",
                "Editar habilidades"]) {
                expect(lista).not.toContain(rotulo);
            }
            expect(raiz.querySelector('input[type="range"]')).toBeNull();
            expect(raiz.querySelector('[role="meter"][aria-label="Cooperação"]')).not.toBeNull();
        });

        it("selos do retrato ficam sobre o avatar; enquadrar e remover só com imagem", () => {
            const { raiz, edicao, fixture } = montar(true);
            expect(raiz.querySelectorAll(".npc-identidade__avatar button")).toHaveLength(1);
            edicao.definirFicha({ ...criarFichaNpcTeste(), imagemUrl: "/uploads/npc.png" });
            fixture.detectChanges();
            expect(Array.from(raiz.querySelectorAll(".npc-identidade__avatar button"))
                .map((botao) => botao.getAttribute("aria-label")))
                .toEqual(["Enquadrar retrato", "Remover retrato", "Escolher retrato"]);
        });

        it("abas têm ícone e rótulo colapsável", () => {
            const { raiz } = montar(true);
            const abas = Array.from(raiz.querySelectorAll("button[app-aba]"));
            expect(abas.map((aba) => aba.textContent?.trim()))
                .toEqual(["Habilidades", "Conduta", "Sanidade"]);
            for (const aba of abas) {
                expect(aba.querySelector("app-icone")).not.toBeNull();
                expect(aba.querySelector(".abas__rotulo")).not.toBeNull();
            }
        });

        it("ícones por item de Habilidades só aparecem depois do lápis do cabeçalho", () => {
            const { raiz, edicao, fixture } = montar(true);
            const ficha = criarFichaNpcTeste();
            edicao.definirFicha({ ...ficha, dados: { ...ficha.dados,
                categoria: CategoriaNpcEnum.VETERANO, habilidades: [{
                    nomeNeutro: "Cobertura", nomeNarrativo: "", tipo: "PASSIVA" as never,
                    custoEnergia: 0, descricao: "Protege o grupo", restricao: "" }] } });
            fixture.detectChanges();
            expect(raiz.querySelectorAll(".npc-lista__acoes")).toHaveLength(0);
            (raiz.querySelector('button[aria-label="Editar habilidades"]') as HTMLButtonElement).click();
            fixture.detectChanges();
            expect(Array.from(raiz.querySelectorAll(".npc-lista__acoes button"))
                .map((botao) => botao.getAttribute("aria-label")))
                .toEqual(["Editar habilidade", "Remover habilidade"]);
        });

        it("Conduta e Sanidade editam por bloco (Salvar/Cancelar no próprio bloco)", () => {
            const { raiz, pagina, fixture } = montar(true);
            pagina.aba.set("conduta"); fixture.detectChanges();
            expect(rotulos(raiz)).toContain("Editar conduta");
            expect(botoesComTexto(raiz)).not.toContain("Editar conduta");
            (raiz.querySelector('button[aria-label="Editar conduta"]') as HTMLButtonElement).click();
            fixture.detectChanges();
            expect(botoesComTexto(raiz)).toEqual(expect.arrayContaining(["Salvar", "Cancelar"]));
            pagina.aba.set("sanidade"); fixture.detectChanges();
            expect(rotulos(raiz)).toEqual(expect.arrayContaining(["Editar sequelas",
                "Adicionar sequela", "Adicionar trauma"]));
        });

        it("lápis do bloco some durante a própria edição, mas reaparece desabilitado durante outra",
            () => {
                const { raiz, pagina, fixture } = montar(true);
                pagina.iniciar("atributos"); fixture.detectChanges();
                expect(raiz.querySelector('button[aria-label="Editar atributos"]')).toBeNull();
                const botaoNome = raiz.querySelector<HTMLButtonElement>(
                    'button[aria-label="Editar nome"]')!;
                expect(botaoNome.disabled).toBe(true);
            });

        it("Esc cancela o bloco Atributos em edição", () => {
            const { raiz, pagina, fixture, formulario } = montar(true);
            pagina.iniciar("atributos"); fixture.detectChanges();
            const editor = raiz.querySelector(".npc__editor--ativo") as HTMLElement;
            editor.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
            fixture.detectChanges();
            expect(formulario.grupo()).toBeNull();
        });

        it("entrar em edição foca o primeiro campo do bloco", async () => {
            const { pagina, fixture } = montar(true);
            pagina.iniciar("atributos"); fixture.detectChanges();
            await aguardarMicrotarefas();
            expect(document.activeElement?.tagName).toBe("INPUT");
            expect(document.activeElement?.closest(".npc__editor--ativo")).not.toBeNull();
        });

        it("foco volta ao lápis depois de cancelar o bloco", async () => {
            const { raiz, pagina, fixture } = montar(true);
            const botaoAtributos = raiz.querySelector<HTMLButtonElement>(
                'button[aria-label="Editar atributos"]')!;
            botaoAtributos.focus();
            pagina.iniciar("atributos"); fixture.detectChanges();
            pagina.formulario.cancelar(); fixture.detectChanges();
            await aguardarMicrotarefas(); fixture.detectChanges();
            expect(document.activeElement?.getAttribute("aria-label")).toBe("Editar atributos");
        });

        it("erro de validação do bloco Atributos aparece dentro do próprio bloco", async () => {
            const { raiz, pagina, fixture, formulario } = montar(true);
            pagina.iniciar("atributos"); fixture.detectChanges();
            formulario.formulario.controls.atributos.controls.luta.setValue(99);
            await formulario.salvar();
            fixture.detectChanges();
            const editor = raiz.querySelector(".npc__editor--ativo") as HTMLElement;
            expect(editor.querySelector(".npc__erro")).not.toBeNull();
            expect(raiz.querySelector(".ficha-pagina__erro")).toBeNull();
        });

        it("valor avulso confirma só aquele campo ao pressionar Enter", async () => {
            const { raiz, fixture, api, pagina } = montar(true);
            pagina.formulario.editarAvulso("nivel"); fixture.detectChanges();
            const entrada = raiz.querySelector<HTMLInputElement>('input[aria-label="Nível"]')!;
            entrada.value = "9";
            entrada.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
            await aguardarMicrotarefas();
            expect(api.alterarFichaNpc).toHaveBeenCalledTimes(1);
            expect(api.alterarFichaNpc.mock.calls[0][1].dados.nivel).toBe(9);
        });
        it("Ctrl+Enter salva o bloco Atributos em edição", async () => {
            const { raiz, pagina, fixture, formulario, api } = montar(true);
            pagina.iniciar("atributos"); fixture.detectChanges();
            formulario.formulario.controls.atributos.controls.vigor.setValue(2);
            const editor = raiz.querySelector(".npc__editor--ativo") as HTMLElement;
            editor.dispatchEvent(new KeyboardEvent("keydown",
                { key: "Enter", ctrlKey: true, bubbles: true }));
            await aguardarMicrotarefas();
            expect(api.alterarFichaNpc).toHaveBeenCalledTimes(1);
            expect(api.alterarFichaNpc.mock.calls[0][1].dados.atributos.vigor).toBe(2);
            expect(formulario.grupo()).toBeNull();
        });

        it("Salvar do bloco fica desabilitado enquanto há violação conhecida", () => {
            const { raiz, pagina, fixture, formulario } = montar(true);
            pagina.iniciar("atributos"); fixture.detectChanges();
            formulario.formulario.controls.atributos.controls.luta.setValue(99);
            fixture.detectChanges();
            const salvar = Array.from(raiz.querySelectorAll<HTMLButtonElement>(
                ".npc__editor--ativo button[app-botao]"))
                .find((botao) => botao.textContent?.trim() === "Salvar")!;
            expect(salvar.disabled).toBe(true);
        });

        it("gatilho bloqueado explica qual edição está aberta", () => {
            const { pagina, fixture, formulario } = montar(true);
            pagina.iniciar("conduta"); fixture.detectChanges();
            expect(formulario.tooltipBloqueio("atributos"))
                .toBe("Conclua ou cancele a edição de Conduta");
        });

        it("com um bloco aberto, máximo de Vida e cor não salvam o rascunho do bloco", async () => {
            const { pagina, identidade, fixture, formulario, api } = montar(true);
            pagina.iniciar("conduta"); fixture.detectChanges();
            formulario.formulario.controls.gatilhosFuga.setValue("Rascunho ainda aberto");
            await identidade.ajustarMaximo("vidaMaxima", 90);
            identidade.corSelecionada.setValue("#123456");
            await aguardarMicrotarefas();
            expect(api.alterarFichaNpc).not.toHaveBeenCalled();
            expect(identidade.corSelecionada.disabled).toBe(true);
            expect(formulario.grupo()).toBe("conduta");
        });

        it("Enter seguido do blur do campo gera um único PUT", async () => {
            const { raiz, fixture, api, pagina } = montar(true);
            pagina.formulario.editarAvulso("defesaBase"); fixture.detectChanges();
            const entrada = raiz.querySelector<HTMLInputElement>('input[aria-label="Defesa"]')!;
            entrada.value = "21";
            entrada.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
            entrada.dispatchEvent(new Event("blur"));
            await aguardarMicrotarefas();
            expect(api.alterarFichaNpc).toHaveBeenCalledTimes(1);
            expect(api.alterarFichaNpc.mock.calls[0][1].dados.defesaBase).toBe(21);
        });

        it("nome vazio sai da edição sem salvar", async () => {
            const { raiz, fixture, api, pagina, formulario } = montar(true);
            pagina.formulario.editarAvulso("nome"); fixture.detectChanges();
            const entrada = raiz.querySelector<HTMLInputElement>('input[aria-label="Nome"]')!;
            entrada.value = "   ";
            entrada.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
            await aguardarMicrotarefas();
            expect(api.alterarFichaNpc).not.toHaveBeenCalled();
            expect(formulario.campoAvulso()).toBeNull();
        });

        it("Habilidades sem \"Concluir\": Salvar com item inválido reabre o item", async () => {
            const { raiz, fixture, formulario, api } = montar(true);
            const lista = fixture.debugElement.query(By.directive(NpcHabilidadesLista))
                .componentInstance as NpcHabilidadesLista;
            lista.adicionar(); fixture.detectChanges();
            expect(raiz.textContent).not.toContain("Concluir");
            lista.indiceEditando.set(null); // o autor recolheu o item vazio editando outro
            await lista.salvar(); fixture.detectChanges();
            expect(api.alterarFichaNpc).not.toHaveBeenCalled();
            expect(lista.indiceEditando()).toBe(formulario.habilidades.length - 1);
            expect(raiz.querySelector(".npc-lista__item--editando .npc__erro")).not.toBeNull();
        });

        it("Esc numa lista fora de edição não cancela outro bloco aberto", () => {
            const { raiz, pagina, fixture, formulario } = montar(true);
            pagina.iniciar("atributos"); fixture.detectChanges();
            raiz.querySelector(".npc-lista")!.dispatchEvent(
                new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
            expect(formulario.grupo()).toBe("atributos");
        });
    });
});
