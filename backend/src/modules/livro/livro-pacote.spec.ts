import "reflect-metadata";
import type { Knex } from "knex";
import { describe, expect, it, vi } from "vitest";
import { TipoUsuarioEnum } from "@contratados-rpg/shared/enums";
import { IS_PUBLIC_KEY, TIPOS_PERMITIDOS_KEY } from "../../core/decorators";
import { UnauthorizedAccessException } from "../../core/exceptions";
import { operacoesContratosPublicos } from "../../core/openapi/contratos-gerados";
import type { JwtPayload } from "../autenticacao/jwt-payload.interface";
import { LivroPacoteController } from "./livro-pacote.controller";
import { LivroPacoteService } from "./livro-pacote.service";
import { LivroPacoteRepository } from "./livro-pacote.repository";

const admin: JwtPayload = { sub: 1, login: "admin", tipo: TipoUsuarioEnum.ADMIN, tokenVersao: 1 };
const livros = () =>
  ["sistema", "guia"].map((codigo, indice) => ({
    codigo,
    titulo: codigo,
    ordem: indice,
    numero: "1.0",
    formato: 1,
    publicacaoData: "2026-10-22T12:00:00.123456Z",
    nota: null,
    conteudo: { codigo, titulo: codigo, subtitulo: "", numero: "1.0", formato: 1, pecas: [] },
  }));

describe("exportação administrativa de livros", () => {
  it.each([undefined, TipoUsuarioEnum.NORMAL, TipoUsuarioEnum.TESTER])(
    "service recusa papel %s antes de consultar",
    async (tipo) => {
      const listarPublicacoesAtuais = vi.fn();
      const service = new LivroPacoteService({ listarPublicacoesAtuais } as never);
      await expect(
        service.exportarPublicados(tipo ? { ...admin, tipo } : (undefined as never)),
      ).rejects.toBeInstanceOf(UnauthorizedAccessException);
      expect(listarPublicacoesAtuais).not.toHaveBeenCalled();
    },
  );
  it("entrega um pacote completo e recusa qualquer publicação faltante", async () => {
    const listarPublicacoesAtuais = vi.fn().mockResolvedValue(livros());
    const service = new LivroPacoteService({ listarPublicacoesAtuais } as never);
    expect((await service.exportarPublicados(admin)).livros).toEqual(livros());
    listarPublicacoesAtuais.mockResolvedValue(livros().slice(0, 1));
    await expect(service.exportarPublicados(admin)).rejects.toThrow();
    listarPublicacoesAtuais.mockResolvedValue([{ ...livros()[0], formato: 500 }, livros()[1]]);
    await expect(service.exportarPublicados(admin)).rejects.toThrow();
  });
  it("controller exige autenticação ADMIN, proíbe cache e só repassa", async () => {
    const exportarPublicados = vi.fn().mockResolvedValue({});
    const controller = new LivroPacoteController({ exportarPublicados } as never);
    await controller.exportarPublicados(admin);
    expect(exportarPublicados).toHaveBeenCalledWith(admin);
    // eslint-disable-next-line @typescript-eslint/unbound-method -- inspeciona metadata Nest
    const metodo = LivroPacoteController.prototype.exportarPublicados;
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, metodo)).toBeUndefined();
    expect(Reflect.getMetadata(TIPOS_PERMITIDOS_KEY, metodo)).toEqual([TipoUsuarioEnum.ADMIN]);
    expect(Reflect.getMetadata("__headers__", metodo)).toEqual([
      { name: "Cache-Control", value: "no-store" },
    ]);
  });
  it("contrato OpenAPI identifica a rota privada e o DTO portátil", () => {
    expect(operacoesContratosPublicos["LivroPacoteController_exportarPublicados"]).toMatchObject({
      caminho: "/livros/pacotes/publicados",
      metodo: "get",
      publica: false,
      responseSchema: "LivroPacoteDto",
    });
  });
  it("repositório seleciona publicações atuais em um snapshot, sem trabalho nem autoria", async () => {
    const raw = vi.fn().mockResolvedValue({ rows: livros() });
    expect(
      await new LivroPacoteRepository({ raw } as unknown as Knex).listarPublicacoesAtuais(),
    ).toEqual(livros());
    expect(raw).toHaveBeenCalledTimes(1);
    const [sql, parametros] = raw.mock.calls[0] as [string, object];
    expect(parametros).toEqual({ situacao: "PUBLICADA", sistema: "sistema", guia: "guia" });
    expect(sql).toContain("livro_versao.publicacao_data DESC, livro_versao.id DESC");
    expect(sql).toContain("livro_versao.is_deleted = false");
    expect(sql).toContain("tipo_livro_versao_situacao.is_deleted = false");
    expect(sql).toContain("livro.is_deleted = false");
    expect(sql).not.toMatch(/regra_peca|usuario_id|RASCUNHO|ORDER BY livro_versao.numero/);
  });
});
