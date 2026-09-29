import "reflect-metadata";
import { RequestMethod } from "@nestjs/common";
import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { TipoUsuarioEnum } from "@contratados-rpg/shared/enums";
import { describe, expect, it, vi } from "vitest";
import type { JwtPayload } from "../autenticacao/jwt-payload.interface";
import type { CenaDocumentoService } from "./cena-documento.service";
import { CenaController } from "./cena.controller";
import type { CenaService } from "./cena.service";

describe("CenaController — limpar foco", () => {
    it("expõe DELETE em rota estática antes da remoção por documento e só delega", async () => {
        const limparFoco = vi.fn().mockResolvedValue([]);
        const controller = new CenaController(
            {} as CenaService,
            { limparFoco } as unknown as CenaDocumentoService,
        );
        const usuario: JwtPayload = {
            sub: 1, login: "mestre", tipo: TipoUsuarioEnum.NORMAL, tokenVersao: 1,
        };

        await expect(controller.limparFocoDocumento(900, usuario)).resolves.toEqual([]);
        expect(limparFoco).toHaveBeenCalledWith({ cenaId: 900 }, usuario);
        const metodo: unknown = Object.getOwnPropertyDescriptor(
            CenaController.prototype, "limparFocoDocumento",
        )?.value;
        expect(Reflect.getMetadata(PATH_METADATA, metodo as object)).toBe("cena/:id/documento/foco");
        expect(Reflect.getMetadata(METHOD_METADATA, metodo as object)).toBe(RequestMethod.DELETE);
        const nomes = Object.getOwnPropertyNames(CenaController.prototype);
        expect(nomes.indexOf("limparFocoDocumento")).toBeLessThan(nomes.indexOf("removerDocumento"));
    });
});
