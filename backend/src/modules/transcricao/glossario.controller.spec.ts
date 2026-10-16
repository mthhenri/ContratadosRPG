import { describe, expect, it, vi } from "vitest";
import { PATH_METADATA } from "@nestjs/common/constants";
import { TipoUsuarioEnum } from "@contratados-rpg/shared/enums";
import { GlossarioController } from "./glossario.controller";
import type { GlossarioService } from "./glossario.service";

describe("GlossarioController", () => {
    const usuario = { sub: 7, login: "mestre", tipo: TipoUsuarioEnum.NORMAL, tokenVersao: 1 };
    const service = { criarTermo: vi.fn().mockResolvedValue({ id: 1 }), listarTermos: vi.fn().mockResolvedValue([]),
        alterarTermo: vi.fn().mockResolvedValue({ id: 5 }), excluirTermo: vi.fn().mockResolvedValue(undefined) };
    const controller = new GlossarioController(service as unknown as GlossarioService);

    it("usa raiz própria sob transcricao", () => {
        expect(Reflect.getMetadata(PATH_METADATA, GlossarioController)).toBe("transcricao/glossario");
    });
    it("o id da rota prevalece sobre o id do corpo", async () => {
        await controller.alterarTermo(5, { id: 999, termo: "Zeca" }, usuario);
        expect(service.alterarTermo).toHaveBeenCalledWith({ id: 5, termo: "Zeca" }, usuario);
        await controller.excluirTermo(5, usuario);
        expect(service.excluirTermo).toHaveBeenCalledWith({ id: 5 }, usuario);
    });
    it("a campanha da listagem vem da query", async () => {
        await controller.listarTermos(9, usuario);
        expect(service.listarTermos).toHaveBeenCalledWith({ campanhaId: 9 }, usuario);
    });
    it("criar repassa o corpo sem lógica", async () => {
        await controller.criarTermo({ campanhaId: 9, termo: "Zé" }, usuario);
        expect(service.criarTermo).toHaveBeenCalledWith({ campanhaId: 9, termo: "Zé" }, usuario);
    });
});
