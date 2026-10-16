import { describe, expect, it, vi } from "vitest";
import { PATH_METADATA, GUARDS_METADATA } from "@nestjs/common/constants";
import { TipoUsuarioEnum } from "@contratados-rpg/shared/enums";
import { AplicativoImportacaoController } from "./aplicativo-importacao.controller";
import { DispositivoGuard } from "./dispositivo.guard";
import type { DispositivoAutenticado } from "./dispositivo.repository";
import type { FaixaAjusteService } from "./faixa-ajuste.service";
import type { GlossarioService } from "./glossario.service";
import { FaixaAjusteController, IdentidadeController } from "./identidade.controller";
import type { IdentidadeService } from "./identidade.service";
import type { TranscricaoService } from "./transcricao.service";

const usuario = { sub: 7, login: "mestre", tipo: TipoUsuarioEnum.NORMAL, tokenVersao: 1 };
const dispositivo: DispositivoAutenticado = { ...usuario, dispositivoId: 1, dispositivoIdentificador: "uuid" };
const ajuste = { participante: "A", identidadeConfirmada: true, deslocamentoMilissegundos: 0, silencioInicialMilissegundos: null };

describe("IdentidadeController e FaixaAjusteController (web)", () => {
    const identidades = { criarIdentidade: vi.fn(), listarIdentidades: vi.fn(), alterarIdentidade: vi.fn(), excluirIdentidade: vi.fn() };
    const faixas = { alterarFaixa: vi.fn() };
    const controller = new IdentidadeController(identidades as unknown as IdentidadeService);
    const ajusteController = new FaixaAjusteController(faixas as unknown as FaixaAjusteService);

    it("usa raízes próprias", () => {
        expect(Reflect.getMetadata(PATH_METADATA, IdentidadeController)).toBe("transcricao/identidade");
        expect(Reflect.getMetadata(PATH_METADATA, FaixaAjusteController)).toBe("transcricao/faixa");
    });
    it("o id da rota prevalece sobre o id do corpo", async () => {
        await controller.alterarIdentidade(5, { id: 999, participante: "Ana" }, usuario);
        expect(identidades.alterarIdentidade).toHaveBeenCalledWith({ id: 5, participante: "Ana" }, usuario);
        await controller.excluirIdentidade(5, usuario);
        expect(identidades.excluirIdentidade).toHaveBeenCalledWith({ id: 5 }, usuario);
        await ajusteController.alterarFaixa(3, { id: 999, ...ajuste }, usuario);
        expect(faixas.alterarFaixa).toHaveBeenCalledWith({ id: 3, ...ajuste }, usuario);
    });
    it("a campanha da listagem vem da query", async () => {
        await controller.listarIdentidades(9, usuario);
        expect(identidades.listarIdentidades).toHaveBeenCalledWith({ campanhaId: 9 }, usuario);
    });
});

describe("AplicativoImportacaoController (credencial de dispositivo)", () => {
    const glossario = { listarTermos: vi.fn() };
    const identidades = { listarIdentidades: vi.fn(), criarIdentidade: vi.fn() };
    const faixas = { listarFaixas: vi.fn(), criarFaixa: vi.fn() };
    const ajustes = { alterarFaixa: vi.fn() };
    const controller = new AplicativoImportacaoController(glossario as unknown as GlossarioService,
        identidades as unknown as IdentidadeService, faixas as unknown as TranscricaoService, ajustes as unknown as FaixaAjusteService);

    it("fica sob /transcricao/aplicativo e exige o guard do dispositivo, não o JWT web", () => {
        expect(Reflect.getMetadata(PATH_METADATA, AplicativoImportacaoController)).toBe("transcricao/aplicativo");
        expect(Reflect.getMetadata(GUARDS_METADATA, AplicativoImportacaoController)).toContain(DispositivoGuard);
    });
    it("o id da rota prevalece sobre o do corpo e o usuário é o do dispositivo", async () => {
        await controller.criarFaixa(11, { sessaoId: 999, nomeArquivo: "a.wav", participante: "A", deslocamentoMilissegundos: 0 }, dispositivo);
        expect(faixas.criarFaixa).toHaveBeenCalledWith({ sessaoId: 11, nomeArquivo: "a.wav", participante: "A", deslocamentoMilissegundos: 0 }, dispositivo);
        await controller.alterarFaixa(3, { id: 999, ...ajuste }, dispositivo);
        expect(ajustes.alterarFaixa).toHaveBeenCalledWith({ id: 3, ...ajuste }, dispositivo);
        await controller.listarGlossario(9, dispositivo);
        expect(glossario.listarTermos).toHaveBeenCalledWith({ campanhaId: 9 }, dispositivo);
        await controller.listarIdentidades(9, dispositivo);
        expect(identidades.listarIdentidades).toHaveBeenCalledWith({ campanhaId: 9 }, dispositivo);
        await controller.listarFaixas(11, dispositivo);
        expect(faixas.listarFaixas).toHaveBeenCalledWith({ sessaoId: 11 }, dispositivo);
    });
});
