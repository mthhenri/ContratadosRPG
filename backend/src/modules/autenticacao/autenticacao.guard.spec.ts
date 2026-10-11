import { UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { afterEach, describe, expect, it, vi } from "vitest";
import { JwtAuthGuard } from "./autenticacao.guard";

describe("JwtAuthGuard — rota de login opcional", () => {
  const contexto = { getHandler: vi.fn(), getClass: vi.fn() } as unknown as ExecutionContext;
  const guardComMetadado = (valor: unknown) =>
    new JwtAuthGuard({ getAllAndOverride: () => valor } as unknown as Reflector);

  afterEach(() => vi.restoreAllMocks());

  it("token ausente ou inválido segue como visitante, sem erro", async () => {
    const autenticar = vi
      .spyOn(AuthGuard("jwt").prototype as { canActivate: () => unknown }, "canActivate")
      .mockRejectedValue(new UnauthorizedException());
    await expect(guardComMetadado("opcional").canActivate(contexto)).resolves.toBe(true);
    expect(autenticar).toHaveBeenCalledOnce();
  });

  it("token válido é processado normalmente", async () => {
    const autenticar = vi
      .spyOn(AuthGuard("jwt").prototype as { canActivate: () => unknown }, "canActivate")
      .mockResolvedValue(true);
    await expect(guardComMetadado("opcional").canActivate(contexto)).resolves.toBe(true);
    expect(autenticar).toHaveBeenCalledOnce();
  });

  it("rota pública comum continua sem tentar autenticar; rota protegida segue exigindo token", async () => {
    const autenticar = vi
      .spyOn(AuthGuard("jwt").prototype as { canActivate: () => unknown }, "canActivate")
      .mockRejectedValue(new UnauthorizedException());
    expect(guardComMetadado(true).canActivate(contexto)).toBe(true);
    expect(autenticar).not.toHaveBeenCalled();
    await expect(guardComMetadado(undefined).canActivate(contexto)).rejects.toThrow(UnauthorizedException);
  });
});
