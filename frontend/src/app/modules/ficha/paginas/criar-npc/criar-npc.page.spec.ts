import { TestBed } from "@angular/core/testing";
import { ActivatedRoute, Router } from "@angular/router";
import { Subject } from "rxjs";
import { CategoriaNpcEnum, TipoFichaEnum } from "@contratados-rpg/shared/enums";
import type { FichaNpcCriadaDto } from "@contratados-rpg/shared/dtos/ficha";
import { ConfirmacaoService } from "../../../../shared/ui/confirmacao/confirmacao.service";
import { NotificacaoService } from "../../../../shared/ui/notificacao/notificacao.service";
import { FichaService } from "../../ficha.service";
import { NpcCriar } from "./criar-npc.page";

describe("NpcCriar", () => {
    function montar(campanhaId: string | null = null) {
        const resposta = new Subject<FichaNpcCriadaDto>();
        const api = { criarFichaNpc: vi.fn(() => resposta) };
        const router = { navigate: vi.fn() };
        const confirmacao = { confirmar: vi.fn(() => Promise.resolve(false)) };
        TestBed.configureTestingModule({ imports: [NpcCriar], providers: [
            { provide: ActivatedRoute, useValue: {
                snapshot: { paramMap: { get: () => campanhaId } }, parent: null,
            } },
            { provide: Router, useValue: router },
            { provide: FichaService, useValue: api },
            { provide: ConfirmacaoService, useValue: confirmacao },
            { provide: NotificacaoService, useValue: { notificar: vi.fn() } },
        ] });
        const fixture = TestBed.createComponent(NpcCriar);
        const pagina = fixture.componentInstance;
        fixture.detectChanges();
        return { fixture, pagina, api, resposta, router, confirmacao };
    }

    function preencherCivil(pagina: NpcCriar): void {
        pagina.criacao.formulario.patchValue({ categoria: CategoriaNpcEnum.CIVIL,
            nome: " Helena ", funcao: " Médica ",
            atributos: { vigor: 2, intelecto: 2 }, gatilhosFuga: "Perigo",
            prioridadesAlvo: "Evitar", reacaoFerimentoSevero: "Buscar ajuda" });
    }

    it.each([null, "7"])("saída da criação abre NPC por tipo, campanha %s", (campanhaId) => {
        const { pagina, resposta, router } = montar(campanhaId);
        preencherCivil(pagina); pagina.registrar();
        resposta.next({ id: 9, campanhaId: campanhaId ? 7 : null, usuarioId: 1,
            tipo: TipoFichaEnum.NPC, nome: "Helena", cor: null, imagemUrl: null,
            dados: pagina.criacao.dados() });
        pagina.abrirNpc();
        expect(router.navigate).toHaveBeenCalledWith(campanhaId
            ? ["/campanhas", 7, "npc", 9] : ["/fichas", "npc", 9]);
    });

    it("bloqueia avanço vazio e revisão permite corrigir pela etapa", () => {
        const { pagina, fixture } = montar();
        pagina.avancar();
        expect(pagina.etapa()).toBe(0);
        expect(pagina.mostrarErros()).toBe(true);
        pagina.irEtapa(4); fixture.detectChanges();
        const botao = fixture.nativeElement.querySelector("app-npc-revisao button") as HTMLButtonElement;
        botao.click();
        expect(pagina.etapa()).toBe(0);
    });

    it("voltar preserva identidade e valores do distribuidor", () => {
        const { pagina, fixture } = montar();
        pagina.criacao.formulario.patchValue({ nome: "Helena", funcao: "Contato" });
        pagina.avancar();
        pagina.criacao.formulario.controls.atributos.controls.vigor.setValue(3);
        pagina.irEtapa(0); fixture.detectChanges();
        expect(pagina.criacao.estado().atributos.vigor).toBe(3);
        expect((fixture.nativeElement.querySelector("input") as HTMLInputElement).value).toBe("Helena");
    });

    it("envio ocupado não duplica e bloqueia navegação; falha mantém dados e admite retry", () => {
        const { pagina, api, resposta } = montar("7");
        preencherCivil(pagina); pagina.irEtapa(4);
        const dados = pagina.criacao.dados();
        pagina.registrar(); pagina.registrar(); pagina.irEtapa(0);
        expect(api.criarFichaNpc).toHaveBeenCalledExactlyOnceWith({ campanhaId: 7,
            nome: "Helena", dados });
        expect(pagina.etapa()).toBe(4);
        expect(pagina.podeSair()).toBe(false);
        resposta.error(new Error("Falha temporária"));
        expect(pagina.enviando()).toBe(false);
        expect(pagina.erroEnvio()).toContain("mantido");
        expect(pagina.criacao.dados()).toEqual(dados);
        const segundaResposta = new Subject<FichaNpcCriadaDto>();
        api.criarFichaNpc.mockReturnValue(segundaResposta);
        pagina.registrar();
        expect(api.criarFichaNpc).toHaveBeenCalledTimes(2);
    });

    it("sucesso tipado fica no guia e volta ao acervo, sem abrir ficha de jogador", () => {
        const { pagina, resposta, router, fixture } = montar();
        preencherCivil(pagina); pagina.registrar();
        resposta.next({ id: 9, campanhaId: null, usuarioId: 1, tipo: TipoFichaEnum.NPC,
            nome: "Helena", cor: null, imagemUrl: null, dados: pagina.criacao.dados() });
        resposta.complete(); fixture.detectChanges();
        expect(pagina.registrado()).toBe(true);
        expect(router.navigate).not.toHaveBeenCalled();
        expect(fixture.nativeElement.textContent).toContain("NPC registrado");
        expect(pagina.podeSair()).toBe(true);
        pagina.voltarAoDestino();
        expect(router.navigate).toHaveBeenCalledWith(["/fichas"]);
    });

    it("protege saída com alterações e fechamento da aba", async () => {
        const { pagina, confirmacao } = montar();
        expect(pagina.podeSair()).toBe(true);
        pagina.criacao.formulario.markAsDirty();
        expect(await pagina.podeSair()).toBe(false);
        expect(confirmacao.confirmar).toHaveBeenCalled();
        const evento = { preventDefault: vi.fn(), returnValue: undefined };
        pagina.protegerFechamento(evento as unknown as BeforeUnloadEvent);
        expect(evento.preventDefault).toHaveBeenCalled();
    });

    it("mantém valor acima do teto visível até correção ao trocar Categoria", () => {
        const { pagina, fixture } = montar();
        pagina.criacao.formulario.patchValue({ categoria: CategoriaNpcEnum.LENDARIO,
            atributos: { vigor: 6 } });
        pagina.criacao.formulario.controls.categoria.setValue(CategoriaNpcEnum.OPERATIVO);
        pagina.irEtapa(1); fixture.detectChanges();
        const vigor = fixture.nativeElement.querySelector('[aria-label="Vigor"]') as HTMLInputElement;
        expect(vigor.value).toBe("6");
        expect(pagina.criacao.violacoesEtapa(1).join(" ")).toContain("acima do limite");
    });
});
