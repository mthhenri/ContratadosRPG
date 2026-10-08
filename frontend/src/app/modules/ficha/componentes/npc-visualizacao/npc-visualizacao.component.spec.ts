import { TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { of, Subject, throwError } from "rxjs";
import { CategoriaNpcEnum, PatenteEnum } from "@contratados-rpg/shared/enums";
import { listarBibliotecaHabilidadesNpc } from "@contratados-rpg/shared/regras/npc";
import { TemaService } from "../../../../core/services/tema.service";
import { FichaService } from "../../ficha.service";
import { FichaEdicaoNpcService } from "../../ficha-edicao-npc.service";
import { NpcEdicaoFormulario } from "../../npc-edicao-formulario.service";
import { criarFichaNpcTeste } from "../../testing/ficha-npc.fixture";
import { NpcHabilidadesLista } from "./npc-habilidades-lista.component";
import { NpcIdentidade } from "./npc-identidade.component";
import { NpcVisualizacao } from "./npc-visualizacao.component";
import { NpcRolagemService } from "../../npc-rolagem.service";

const aguardarMicrotarefas = () => new Promise((resolve) => setTimeout(resolve));

describe("NpcVisualizacao", () => {
    function montar(gerenciavel: boolean, ficha = criarFichaNpcTeste()) {
        const api = { alterarFichaNpc: vi.fn((_id, alteracao) => of({ ...ficha, ...alteracao })) };
        TestBed.configureTestingModule({ imports: [NpcVisualizacao], providers: [
            FichaEdicaoNpcService, NpcEdicaoFormulario,
            { provide: NpcRolagemService, useValue: { rolar: vi.fn() } },
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
        const { raiz, pagina, fixture } = montar(false);
        expect(raiz.textContent).toContain("Sem Energia");
        expect(raiz.textContent).toContain("77");
        expect(raiz.querySelectorAll("input, textarea, select")).toHaveLength(0);
        pagina.aba.set("habilidades"); fixture.detectChanges();
        expect(raiz.textContent).not.toContain("＋ Personalizada");
        expect(raiz.textContent).not.toContain("＋ Da biblioteca");
        expect(raiz.querySelector('app-npc-atributos [aria-label="Vigor — DT 17"]')).not.toBeNull();
    });

    describe("Atributos no ladrilho compartilhado do Jogador (m4-18)", () => {
        it("mostra os dez valores base na ordem Físicos/Mentais, com sigla e DT acessível", () => {
            const { raiz, ficha } = montar(false);
            const card = raiz.querySelector("app-npc-atributos")!;
            expect(card).not.toBeNull();
            expect(Array.from(card.querySelectorAll(".npc-atributos__rotulo-grupo"))
                .map((grupo) => grupo.textContent?.trim())).toEqual(["Físicos", "Mentais"]);
            const nomes = ["Destreza", "Força", "Luta", "Pontaria", "Vigor", "Intelecto",
                "Medicina", "Sentidos", "Social", "Vontade"];
            const siglas = ["DES", "FOR", "LUT", "PON", "VIG", "INT", "MED", "SEN", "SOC", "VON"];
            const valores = Object.values(ficha.dados.atributos);
            const ladrilhos = Array.from(card.querySelectorAll("app-atributo-ficha"));
            expect(ladrilhos).toHaveLength(10);
            ladrilhos.forEach((ladrilho, indice) => {
                const sigla = ladrilho.querySelector(".ficha-atributo__abrev")!;
                expect(sigla.textContent?.trim()).toBe(siglas[indice]);
                expect(sigla.getAttribute("aria-label"))
                    .toBe(`${nomes[indice]} — DT ${10 + ficha.dados.nivel + valores[indice] * 2}`);
                expect(sigla.getAttribute("tabindex")).toBe("0");
                expect(ladrilho.querySelector(".ficha-atributo__valor")?.textContent?.trim())
                    .toBe(String(valores[indice]));
            });
            expect(card.querySelector("app-campo")).toBeNull();
            // Faixa de resumo (m4-21) no lugar de Proficiência/Maestria; Civil sem Competências.
            expect(Array.from(card.querySelectorAll(".npc-atributos__resumo app-stat"))
                .map((stat) => stat.textContent?.replace(/\s+/g, " ").trim()))
                .toEqual(["DT 10 + Nível + ATR×2", "Competências Nenhuma", "Modificador —"]);
            expect(card.querySelector(".ficha-atributo__competencia")).toBeNull();
            expect(card.querySelector(".ficha-atributo__rolar, .ficha-atributo__estrela, " +
                ".ficha-atributo__maestria, .ficha-atributo__lesao, " +
                ".ficha-atributo__dados-badge")).toBeNull();
            expect(card.textContent).not.toContain("Alterar atributos mantém os recursos salvos");
        });

        it("edita na mesma caixa com stepper e persiste só atributos, conservando snapshots", async () => {
            const { raiz, pagina, fixture, formulario, api, ficha } = montar(true);
            pagina.iniciar("atributos"); fixture.detectChanges();
            const card = raiz.querySelector("app-npc-atributos")!;
            expect(card.querySelectorAll(".ficha-atributo--edicao")).toHaveLength(10);
            expect(card.querySelectorAll("app-step-input")).toHaveLength(30);
            expect(card.querySelector(".ficha-atributo__modificador, .ficha-atributo__dados"))
                .not.toBeNull();
            expect(card.textContent).toContain("Alterar atributos mantém os recursos salvos");
            formulario.formulario.controls.atributos.controls.destreza.setValue(2);
            await formulario.salvar(); fixture.detectChanges();
            const gravado = api.alterarFichaNpc.mock.calls[0][1].dados;
            expect(gravado).toMatchObject({ ...ficha.dados, competencias: [],
                modificadoresTeste: { luta: 0 }, dadosTeste: { luta: 0 },
                atributos: { ...ficha.dados.atributos, destreza: 2 } });
            expect(card.textContent).not.toContain("Alterar atributos mantém os recursos salvos");
        });

        it.each([-1, 1.5, 3])("valor inválido %s bloqueia Salvar com erro dentro do card", (valor) => {
            const { raiz, pagina, fixture, formulario } = montar(true);
            pagina.iniciar("atributos"); fixture.detectChanges();
            formulario.formulario.controls.atributos.controls.destreza.setValue(valor);
            fixture.detectChanges();
            const card = raiz.querySelector("app-npc-atributos")!;
            const salvar = Array.from(card.querySelectorAll<HTMLButtonElement>("button[app-botao]"))
                .find((botao) => botao.textContent?.trim() === "Salvar")!;
            expect(salvar.disabled).toBe(true);
            expect(card.querySelector('[role="alert"]')).not.toBeNull();
        });

        it("conserva o rascunho e apresenta falha dentro do card; Cancelar descarta", async () => {
            const { raiz, pagina, fixture, formulario, api, edicao } = montar(true);
            api.alterarFichaNpc.mockImplementationOnce(() => throwError(() =>
                ({ error: { mensagem: "Falha controlada" } })));
            pagina.iniciar("atributos"); fixture.detectChanges();
            formulario.formulario.controls.atributos.controls.destreza.setValue(2);
            expect(await formulario.salvar()).toBe(false); fixture.detectChanges();
            const card = raiz.querySelector("app-npc-atributos")!;
            expect(card.querySelector('[role="alert"]')?.textContent)
                .toContain("Não foi possível salvar. Rascunho mantido para tentar novamente.");
            expect(card.querySelectorAll(".ficha-atributo--edicao")).toHaveLength(10);
            expect(edicao.rascunho()?.dados.atributos.destreza).toBe(2);
            formulario.cancelar(); fixture.detectChanges();
            expect(card.querySelectorAll(".ficha-atributo--edicao")).toHaveLength(0);
            expect(edicao.ficha()?.dados.atributos.destreza).toBe(1);
        });

        it("durante o PUT todos os passos ficam bloqueados e o bloco anuncia ocupado", async () => {
            const { raiz, pagina, fixture, formulario, api, ficha } = montar(true);
            const resposta = new Subject<typeof ficha>();
            api.alterarFichaNpc.mockImplementationOnce(() => resposta);
            pagina.iniciar("atributos"); fixture.detectChanges();
            formulario.formulario.controls.atributos.controls.destreza.setValue(2);
            const salvamento = formulario.salvar(); fixture.detectChanges();
            const card = raiz.querySelector("app-npc-atributos")!;
            expect(card.querySelector('[aria-busy="true"]')).not.toBeNull();
            expect(Array.from(card.querySelectorAll<HTMLButtonElement>("app-step-input button"))
                .every((botao) => botao.disabled)).toBe(true);
            resposta.next({ ...ficha, dados: { ...ficha.dados,
                atributos: { ...ficha.dados.atributos, destreza: 2 } } });
            resposta.complete(); expect(await salvamento).toBe(true);
        });
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
                .toEqual(["Conduta", "Equipamento", "Habilidades", "Sanidade"]);
            for (const aba of abas) {
                expect(aba.querySelector("app-icone")).not.toBeNull();
                expect(aba.querySelector(".abas__rotulo")).not.toBeNull();
            }
        });

        it("ícones por item de Habilidades só aparecem depois do lápis do cabeçalho", () => {
            const { raiz, edicao, fixture, pagina } = montar(true);
            pagina.aba.set("habilidades");
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
            expect(document.activeElement?.getAttribute("aria-label")).toBe("Diminuir Destreza");
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
            const { raiz, fixture, formulario, api, pagina } = montar(true);
            pagina.aba.set("habilidades"); fixture.detectChanges();
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
            pagina.aba.set("habilidades");
            pagina.iniciar("atributos"); fixture.detectChanges();
            raiz.querySelector(".npc-lista")!.dispatchEvent(
                new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
            expect(formulario.grupo()).toBe("atributos");
        });
    });

    describe("revisão visual e de usabilidade (m4-21)", () => {
        function elite() {
            const ficha = criarFichaNpcTeste();
            return { ...ficha, dados: { ...ficha.dados, categoria: CategoriaNpcEnum.ELITE,
                atributos: { ...ficha.dados.atributos, luta: 3, pontaria: 2 },
                competencias: ["destreza", "forca", "vigor", "intelecto"] as const,
                patenteEquivalente: PatenteEnum.FORCA_TAREFA,
                habilidades: listarBibliotecaHabilidadesNpc({ categoria: CategoriaNpcEnum.ELITE })
                    .slice(0, 4).map(({ habilidade }) => habilidade) } };
        }

        it("Competência marca o ladrilho com o dado e o resumo conta X/Y", () => {
            const { raiz } = montar(false, elite() as never);
            const marcados = Array.from(raiz.querySelectorAll(
                "app-npc-atributos .ficha-atributo--competencia .ficha-atributo__abrev"))
                .map((sigla) => sigla.textContent?.trim());
            expect(marcados).toEqual(["DES", "FOR", "VIG", "INT"]);
            expect(raiz.querySelector(".ficha-atributo__competencia-selo")?.textContent?.trim())
                .toBe("+2D6");
            expect(raiz.querySelector(".npc-atributos__resumo")?.textContent).toContain("4/4");
        });

        it("bloco Atributos não edita Categoria; Competência alterna no próprio ladrilho", () => {
            const { raiz, pagina, fixture, formulario } = montar(true, elite() as never);
            pagina.iniciar("atributos"); fixture.detectChanges();
            const card = raiz.querySelector("app-npc-atributos")!;
            expect(card.querySelector('[aria-label="Categoria do rascunho"]')).toBeNull();
            expect(card.querySelector("app-npc-competencias")).toBeNull();
            const luta = card.querySelector<HTMLButtonElement>('[aria-label="Competência em Luta"]')!;
            expect(luta.disabled).toBe(true); // limite de 4 já atingido
            card.querySelector<HTMLButtonElement>('[aria-label="Competência em Força"]')!.click();
            fixture.detectChanges();
            expect(formulario.formulario.controls.competencias.value)
                .toEqual(["destreza", "vigor", "intelecto"]);
            expect(luta.disabled).toBe(false);
            luta.click(); fixture.detectChanges();
            expect(formulario.formulario.controls.competencias.value)
                .toEqual(["destreza", "vigor", "intelecto", "luta"]);
        });

        it("Patente fica na Identidade e salva só esse campo", async () => {
            const { raiz, fixture, api, pagina } = montar(true, elite() as never);
            expect(raiz.querySelector("app-npc-identidade")?.textContent).toContain("Força Tarefa");
            pagina.formulario.editarAvulso("patenteEquivalente"); fixture.detectChanges();
            const seletor = raiz.querySelector<HTMLSelectElement>(
                'select[aria-label="Patente Equivalente"]')!;
            expect(Array.from(seletor.options).map((opcao) => opcao.textContent?.trim()))
                .toEqual(["Sem patente", "Força Tarefa", "Força Tarefa Especial",
                    "Operações Especiais"]);
            seletor.value = PatenteEnum.OPERACOES_ESPECIAIS;
            seletor.dispatchEvent(new Event("change"));
            await aguardarMicrotarefas();
            expect(api.alterarFichaNpc).toHaveBeenCalledTimes(1);
            expect(api.alterarFichaNpc.mock.calls[0][1].dados.patenteEquivalente)
                .toBe(PatenteEnum.OPERACOES_ESPECIAIS);
        });

        it("Civil mostra Patente \"—\" sem edição", () => {
            const { raiz } = montar(true);
            expect(raiz.querySelector('[aria-label="Editar patente equivalente"]')).toBeNull();
            expect(raiz.querySelector("app-npc-identidade")?.textContent).toContain("Patente");
        });

        it("troca que invalida só Competências abre Atributos com a nova e salva num PUT",
            async () => {
                const { identidade, formulario, edicao, api, fixture, raiz } =
                    montar(true, elite() as never);
                formulario.editarAvulso("categoria");
                identidade.confirmarCategoria(CategoriaNpcEnum.VETERANO);
                fixture.detectChanges();
                expect(api.alterarFichaNpc).not.toHaveBeenCalled();
                expect(formulario.grupo()).toBe("atributos");
                expect(edicao.rascunho()?.dados.categoria).toBe(CategoriaNpcEnum.VETERANO);
                // Força Tarefa não está na faixa do Veterano: sai junto com a troca.
                expect(edicao.rascunho()?.dados.patenteEquivalente).toBeUndefined();
                // O blur do <select> que sai do DOM não pode desfazer o bloco recém-aberto.
                formulario.cancelarAvulso();
                expect(formulario.grupo()).toBe("atributos");
                raiz.querySelector<HTMLButtonElement>('[aria-label="Competência em Força"]')!
                    .click();
                fixture.detectChanges();
                expect(edicao.violacoes()).toEqual([]);
                expect(await formulario.salvar()).toBe(true);
                const gravado = api.alterarFichaNpc.mock.calls[0][1].dados;
                expect(gravado.categoria).toBe(CategoriaNpcEnum.VETERANO);
                expect(gravado.competencias).toEqual(["destreza", "vigor", "intelecto"]);
                expect("patenteEquivalente" in gravado).toBe(false);
            });

        it("troca que invalida habilidades não abre bloco sem saída — explica na Identidade",
            () => {
                const { identidade, formulario, edicao, api, fixture, raiz } =
                    montar(true, elite() as never);
                formulario.editarAvulso("categoria");
                identidade.confirmarCategoria(CategoriaNpcEnum.LENDARIO);
                fixture.detectChanges();
                expect(api.alterarFichaNpc).not.toHaveBeenCalled();
                expect(formulario.grupo()).toBeNull();
                expect(edicao.rascunho()).toBeNull();
                expect(raiz.querySelector("app-npc-identidade [role=alert]")?.textContent)
                    .toContain("Para mudar para Lendário, ajuste antes — habilidades:");
            });

        it("Patente que estoura modificação de item explica qual item", async () => {
            const ficha = elite();
            const { formulario, fixture, raiz, api } = montar(true, { ...ficha, dados: {
                ...ficha.dados, inventario: [{ nome: "Colete de Kevlar",
                    categoria: "PROTECOES" as never, custo: 500, peso: 2, quantidade: 1,
                    guardada: false, modificacoes: [{ nome: "Resistente", empilhamentos: 2 }] }],
            } } as never);
            formulario.editarAvulso("patenteEquivalente"); fixture.detectChanges();
            const seletor = raiz.querySelector<HTMLSelectElement>(
                'select[aria-label="Patente Equivalente"]')!;
            seletor.value = "";
            seletor.dispatchEvent(new Event("change"));
            await aguardarMicrotarefas(); fixture.detectChanges();
            expect(api.alterarFichaNpc).not.toHaveBeenCalled();
            expect(raiz.querySelector("app-npc-identidade")?.textContent)
                .toContain("modificação sem patente equivalente escolhida");
        });

        it("cor da ficha é escolhida pelo retrato; sem faixa de rodapé", () => {
            const { raiz } = montar(true);
            expect(raiz.querySelector(
                '.npc-identidade__avatar input[type="color"][aria-label="Cor de identidade da ficha"]'))
                .not.toBeNull();
            expect(raiz.querySelector(".npc-identidade__rodape")).toBeNull();
        });

        it("\"＋ Personalizada\" abre item em branco no rascunho, já em edição", () => {
            const { raiz, pagina, fixture, formulario } = montar(true, elite() as never);
            pagina.aba.set("habilidades"); fixture.detectChanges();
            Array.from(raiz.querySelectorAll<HTMLButtonElement>("button"))
                .find((botao) => botao.textContent?.trim() === "＋ Personalizada")!.click();
            fixture.detectChanges();
            expect(formulario.grupo()).toBe("habilidades");
            expect(formulario.habilidades.length).toBe(5);
            expect(raiz.querySelector(".npc-lista__item--editando input")).not.toBeNull();
        });

        it("\"Da biblioteca\" filtra pela Categoria e adiciona ao rascunho do bloco", () => {
            const { raiz, pagina, fixture, formulario } = montar(true, elite() as never);
            pagina.aba.set("habilidades"); fixture.detectChanges();
            const lista = fixture.debugElement.query(By.directive(NpcHabilidadesLista))
                .componentInstance as NpcHabilidadesLista;
            lista.abrirBiblioteca(); fixture.detectChanges();
            expect(lista.categoriaBiblioteca()).toBe(CategoriaNpcEnum.ELITE);
            expect(lista.modelosBiblioteca()).toHaveLength(6);
            expect(lista.naLista("Condicionamento Extremo")).toBe(true);
            lista.adicionarDaBiblioteca(lista.modelosBiblioteca()[5].habilidade);
            fixture.detectChanges();
            expect(formulario.grupo()).toBe("habilidades");
            expect(formulario.habilidades.length).toBe(5);
            expect(raiz.textContent).toContain("Pressão Interrogatória");
        });
    });
});
