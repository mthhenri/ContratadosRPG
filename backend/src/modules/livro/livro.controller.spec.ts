import "reflect-metadata";
import { TipoLivroVersaoSituacaoEnum, TipoUsuarioEnum } from "@contratados-rpg/shared/enums";
import { describe, expect, it, vi } from "vitest";
import { IS_PUBLIC_KEY, TIPOS_PERMITIDOS_KEY } from "../../core/decorators";
import type { JwtPayload } from "../autenticacao/jwt-payload.interface";
import { LivroController } from "./livro.controller";
import type { LivroService } from "./livro.service";

describe("LivroController (m11-04)", () => {
  const servico = {
    listarLivros: vi.fn().mockResolvedValue([]),
    recuperarLivro: vi.fn().mockResolvedValue({}),
    recuperarPublicada: vi.fn().mockResolvedValue({}),
    recuperarMudancasPublicadas: vi.fn().mockResolvedValue({}),
    listarVersoes: vi.fn().mockResolvedValue([]),
    recuperarVersao: vi.fn().mockResolvedValue({}),
    publicar: vi.fn().mockResolvedValue({}),
  };
  const controller = new LivroController(servico as unknown as LivroService);
  const admin: JwtPayload = { sub: 1, login: "a", tipo: TipoUsuarioEnum.ADMIN, tokenVersao: 1 };

  it("a leitura aceita visitante e repassa o papel (ou null) à service", async () => {
    await controller.recuperar("sistema", undefined);
    expect(servico.recuperarLivro).toHaveBeenLastCalledWith({ codigo: "sistema", tipoUsuario: null });
    await controller.recuperar("sistema", admin);
    expect(servico.recuperarLivro).toHaveBeenLastCalledWith({ codigo: "sistema", tipoUsuario: "ADMIN" });
    await controller.listar(undefined);
    expect(servico.listarLivros).toHaveBeenLastCalledWith({ tipoUsuario: null });
  });

  it("mescla o código e o id da rota nos DTOs", async () => {
    await controller.recuperarVersao("sistema", 4, admin);
    expect(servico.recuperarVersao).toHaveBeenCalledWith({ codigo: "sistema", id: 4 }, admin);
    await controller.publicar("guia", { situacao: TipoLivroVersaoSituacaoEnum.RASCUNHO, numero: "1.0.0" }, admin);
    expect(servico.publicar).toHaveBeenCalledWith(
      { codigo: "guia", situacao: TipoLivroVersaoSituacaoEnum.RASCUNHO, numero: "1.0.0" },
      admin,
    );
  });

  it("consulta mudanças e publicada sem transmitir papel para a seleção", async () => {
    await controller.recuperarMudancasPublicadas("sistema", 4);
    expect(servico.recuperarMudancasPublicadas).toHaveBeenCalledWith({ codigo: "sistema", origemId: 4 });
    await controller.recuperarPublicada("sistema");
    expect(servico.recuperarPublicada).toHaveBeenCalledWith({ codigo: "sistema" });
  });

  it.each(["listar", "recuperar", "recuperarMudancasPublicadas", "recuperarPublicada"] as const)("%s é de login opcional e não é cacheada às cegas", (metodo) => {
    const manipulador = LivroController.prototype[metodo];
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, manipulador)).toBe("opcional");
    expect(Reflect.getMetadata("__headers__", manipulador)).toEqual([
      { name: "Cache-Control", value: "no-store" },
    ]);
  });

  it.each(["listarVersoes", "recuperarVersao", "publicar"] as const)("%s exige login e é só ADMIN", (metodo) => {
    const manipulador = LivroController.prototype[metodo];
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, manipulador)).toBeUndefined();
    expect(Reflect.getMetadata(TIPOS_PERMITIDOS_KEY, manipulador)).toEqual([TipoUsuarioEnum.ADMIN]);
  });
});
