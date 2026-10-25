import { describe, expect, it, vi } from "vitest";
import { executarPacoteLocal } from "./importar-pacote-runtime";

describe("travas de transporte local", () => {
  it.each([false, true])(
    "recusa ambiente remoto antes de conectar, inclusive simular=%s",
    async (simular) => {
      const conectar = vi.fn();
      await expect(
        executarPacoteLocal(
          {
            argumentos: [
              "--arquivo=x",
              "--usuario=1",
              ...(simular ? ["--simular"] : []),
            ],
            ambiente: { APP_AMBIENTE: "production" },
            restaurar: false,
          },
          { conectar },
        ),
      ).rejects.toThrow();
      expect(conectar).not.toHaveBeenCalled();
    },
  );
  it("recusa usuário ausente também na simulação", async () => {
    await expect(
      executarPacoteLocal({
        argumentos: ["--arquivo=x", "--simular"],
        ambiente: {},
        restaurar: false,
      }),
    ).rejects.toThrow(/usuario/);
  });
});
