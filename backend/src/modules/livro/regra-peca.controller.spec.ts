import "reflect-metadata";
import { TipoUsuarioEnum } from "@contratados-rpg/shared/enums";
import { describe, expect, it, vi } from "vitest";
import { IS_PUBLIC_KEY, TIPOS_PERMITIDOS_KEY } from "../../core/decorators";
import type { JwtPayload } from "../autenticacao/jwt-payload.interface";
import { RegraPecaController } from "./regra-peca.controller";
import type { RegraPecaService } from "./regra-peca.service";

describe("RegraPecaController (m11-06)", () => {
  const servico = {
    listarArvore: vi.fn().mockResolvedValue([]),
    recuperarPeca: vi.fn().mockResolvedValue({}),
    alterarDados: vi.fn().mockResolvedValue({}),
    alterarNome: vi.fn().mockResolvedValue({}),
    alterarPosicao: vi.fn().mockResolvedValue({}),
    duplicar: vi.fn().mockResolvedValue({}),
    excluir: vi.fn().mockResolvedValue({}),
    restaurar: vi.fn().mockResolvedValue({}),
  };
  const controller = new RegraPecaController(servico as unknown as RegraPecaService);
  const admin: JwtPayload = { sub: 1, login: "a", tipo: TipoUsuarioEnum.ADMIN, tokenVersao: 1 };

  it("mescla o código, o id e a revisão da rota nos DTOs", async () => {
    await controller.alterarDados("sistema", 4, { dados: { trechos: [] }, revisao: 2 }, admin);
    expect(servico.alterarDados).toHaveBeenCalledWith({ codigo: "sistema", id: 4, dados: { trechos: [] }, revisao: 2 }, admin);
    await controller.alterarPosicao("sistema", 4, { pecaPaiId: null, indice: 1, revisao: 2 }, admin);
    expect(servico.alterarPosicao).toHaveBeenCalledWith({ codigo: "sistema", id: 4, pecaPaiId: null, indice: 1, revisao: 2 }, admin);
    await controller.alterarNome("sistema", 4, { nome: "Novo", revisao: 2 }, admin);
    expect(servico.alterarNome).toHaveBeenCalledWith({ codigo: "sistema", id: 4, nome: "Novo", revisao: 2 }, admin);
    await controller.excluir("sistema", 4, 3, admin);
    expect(servico.excluir).toHaveBeenCalledWith({ codigo: "sistema", id: 4, revisao: 3 }, admin);
    await controller.duplicar("sistema", 4, admin);
    expect(servico.duplicar).toHaveBeenCalledWith({ codigo: "sistema", id: 4 }, admin);
    await controller.restaurar("sistema", 4, admin);
    expect(servico.restaurar).toHaveBeenCalledWith({ codigo: "sistema", id: 4 }, admin);
  });

  it("toda rota exige login e é só ADMIN (metadado da classe)", () => {
    expect(Reflect.getMetadata(TIPOS_PERMITIDOS_KEY, RegraPecaController)).toEqual([TipoUsuarioEnum.ADMIN]);
    for (const metodo of Object.getOwnPropertyNames(RegraPecaController.prototype).filter((nome) => nome !== "constructor")) {
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, (RegraPecaController.prototype as never)[metodo])).toBeUndefined();
    }
  });
});
