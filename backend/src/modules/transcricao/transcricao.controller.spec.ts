import { describe, expect, it, vi } from "vitest";
import { PATH_METADATA } from "@nestjs/common/constants";
import { TipoUsuarioEnum } from "@contratados-rpg/shared/enums";
import { TranscricaoController } from "./transcricao.controller";
import type { TranscricaoService } from "./transcricao.service";

describe("TranscricaoController", () => {
    it("usa raiz própria e delega identidade de rota sobre ids do corpo", async () => {
        const usuario = { sub: 7, login: "mestre", tipo: TipoUsuarioEnum.NORMAL, tokenVersao: 1 };
        const service = { alterarSessao: vi.fn().mockResolvedValue({ id: 1 }),
            criarFaixa: vi.fn().mockResolvedValue({ id: 3 }) };
        const controller = new TranscricaoController(service as unknown as TranscricaoService);
        expect(Reflect.getMetadata(PATH_METADATA, TranscricaoController)).toBe("transcricao");
        await controller.alterarSessao(1, { id: 999, titulo: "Nome" }, usuario);
        expect(service.alterarSessao).toHaveBeenCalledWith({ id: 1, titulo: "Nome" }, usuario);
        await controller.criarFaixa(1, { sessaoId: 999, nomeArquivo: "a.wav", participante: "A",
            deslocamentoMilissegundos: 0 }, usuario);
        expect(service.criarFaixa).toHaveBeenCalledWith({ sessaoId: 1, nomeArquivo: "a.wav",
            participante: "A", deslocamentoMilissegundos: 0 }, usuario);
    });
});
