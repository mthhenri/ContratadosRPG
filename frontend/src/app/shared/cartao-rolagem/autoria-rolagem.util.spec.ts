import { describe, expect, it } from "vitest";

import { montarAutoriaRolagem } from "./autoria-rolagem.util";

describe("montarAutoriaRolagem", () => {
  it("junta autor e ficha quando a rolagem partiu de uma ficha", () => {
    expect(montarAutoriaRolagem({ nomeAutor: "Codex", nomeFicha: "Vera" })).toBe("Codex · Vera");
  });

  it("junta autor e combatente avulso (nome resolvido pelo COALESCE do repositório)", () => {
    expect(montarAutoriaRolagem({ nomeAutor: "Codex", nomeFicha: "Capanga" })).toBe(
      "Codex · Capanga",
    );
  });

  it('mostra "Mestre" como origem na rolagem avulsa do mestre na campanha (P-076)', () => {
    expect(montarAutoriaRolagem({ nomeAutor: "Codex", nomeFicha: null })).toBe("Codex · Mestre");
  });

  it("mostra só o autor quando a tela omite a ficha (mostrarFicha = false)", () => {
    expect(montarAutoriaRolagem({ nomeAutor: "Codex", nomeFicha: "Vera" }, false)).toBe("Codex");
    expect(montarAutoriaRolagem({ nomeAutor: "Codex", nomeFicha: null }, false)).toBe("Codex");
  });
});
