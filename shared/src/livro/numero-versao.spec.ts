import { describe, expect, it } from "vitest";
import { TipoLivroVersaoSituacaoEnum as Situacao } from "../enums/tipo-livro-versao-situacao.enum";
import { sugerirNumeroVersao } from "./numero-versao";

const versao = (numero: string, situacao: Situacao, publicacaoData: string) => ({ numero, situacao, publicacaoData });

describe("sugerirNumeroVersao", () => {
  it("soma um ao patch da última versão publicada", () => {
    expect(sugerirNumeroVersao([versao("4.1.4", Situacao.PUBLICADA, "2026-10-01T10:00:00Z")])).toBe("4.1.5");
  });

  it("usa a mais recente por data, em qualquer ordem da lista", () => {
    expect(sugerirNumeroVersao([
      versao("4.1.5", Situacao.PUBLICADA, "2026-10-05T10:00:00Z"),
      versao("4.1.4", Situacao.PUBLICADA, "2026-10-01T10:00:00Z"),
    ])).toBe("4.1.6");
  });

  it("ignora rascunhos", () => {
    expect(sugerirNumeroVersao([
      versao("9.9.9", Situacao.RASCUNHO, "2026-10-09T10:00:00Z"),
      versao("4.1.4", Situacao.PUBLICADA, "2026-10-01T10:00:00Z"),
    ])).toBe("4.1.5");
  });

  it("sem versão publicada sugere a primeira", () => {
    expect(sugerirNumeroVersao([])).toBe("1.0.0");
    expect(sugerirNumeroVersao([versao("0.1.0", Situacao.RASCUNHO, "2026-10-01T10:00:00Z")])).toBe("1.0.0");
  });

  it("número fora do padrão não tem sugestão", () => {
    expect(sugerirNumeroVersao([versao("4.1", Situacao.PUBLICADA, "2026-10-01T10:00:00Z")])).toBe("");
    expect(sugerirNumeroVersao([versao("v4.1.4-beta", Situacao.PUBLICADA, "2026-10-01T10:00:00Z")])).toBe("");
  });

  it("mantém zeros à esquerda fora do patch e soma números grandes", () => {
    expect(sugerirNumeroVersao([versao("10.20.99", Situacao.PUBLICADA, "2026-10-01T10:00:00Z")])).toBe("10.20.100");
  });
});
