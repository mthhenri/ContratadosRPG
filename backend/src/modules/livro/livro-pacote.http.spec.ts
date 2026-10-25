import "reflect-metadata";
import { Module, type INestApplication } from "@nestjs/common";
import { NestFactory, Reflector } from "@nestjs/core";
import type { Request, Response, NextFunction } from "express";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { TipoUsuarioEnum } from "@contratados-rpg/shared/enums";
import { AutorizacaoGuard } from "../usuario/autorizacao.guard";
import type { UsuarioService } from "../usuario/usuario.service";
import { LivroPacoteController } from "./livro-pacote.controller";
import { LivroPacoteService } from "./livro-pacote.service";

const listarPublicacoesAtuais = vi.fn().mockResolvedValue(
  ["sistema", "guia"].map((codigo, ordem) => ({
    codigo,
    titulo: codigo,
    ordem,
    numero: "atual",
    formato: 1,
    publicacaoData: "2026-10-22T00:00:00Z",
    nota: null,
    conteudo: { codigo, titulo: codigo, subtitulo: "", numero: "atual", formato: 1, pecas: [] },
  })),
);

// O transformador do Vitest não emite metadata de parâmetros como o compilador Nest.
Reflect.defineMetadata("design:paramtypes", [LivroPacoteService], LivroPacoteController);

@Module({
  controllers: [LivroPacoteController],
  providers: [
    {
      provide: LivroPacoteService,
      useFactory: () => new LivroPacoteService({ listarPublicacoesAtuais } as never),
    },
  ],
})
class PacoteHttpTestModule {}

/** HTTP real e guard real; identificação de sessão substitui JWT/banco neste recorte. */
describe("GET /livros/pacotes/publicados", () => {
  let aplicacao: INestApplication;
  let endereco: string;
  beforeAll(async () => {
    aplicacao = await NestFactory.create(PacoteHttpTestModule, { logger: false });
    aplicacao.use((requisicao: Request, _resposta: Response, proximo: NextFunction) => {
      const tipo = requisicao.headers["x-tipo"] as TipoUsuarioEnum | undefined;
      if (tipo)
        requisicao.user = {
          sub: Object.values(TipoUsuarioEnum).indexOf(tipo),
          login: "teste",
          tipo,
          tokenVersao: 1,
        };
      proximo();
    });
    aplicacao.useGlobalGuards(
      new AutorizacaoGuard(new Reflector(), {
        recuperarSessao: ({ id }: { id: number }) =>
          Promise.resolve({
            tipo: Object.values(TipoUsuarioEnum)[id],
            tokenVersao: 1,
            isDeleted: false,
          }),
      } as unknown as UsuarioService),
    );
    await aplicacao.listen(0, "127.0.0.1");
    endereco = await aplicacao.getUrl();
  });
  afterAll(async () => {
    await aplicacao?.close();
  });

  it.each([
    [undefined, 401],
    [TipoUsuarioEnum.NORMAL, 403],
    [TipoUsuarioEnum.TESTER, 403],
    [TipoUsuarioEnum.ADMIN, 200],
  ] as const)("papel %s recebe HTTP %s", async (tipo, status) => {
    const resposta = await fetch(`${endereco}/livros/pacotes/publicados`, {
      headers: tipo ? { "x-tipo": tipo } : {},
    });
    expect(resposta.status).toBe(status);
    if (status === 200) {
      expect(resposta.headers.get("cache-control")).toBe("no-store");
      expect(((await resposta.json()) as { livros: unknown[] }).livros).toHaveLength(2);
    }
  });
});
