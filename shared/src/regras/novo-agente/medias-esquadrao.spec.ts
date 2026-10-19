import { describe, expect, it } from "vitest";
import { calcularMediasEsquadrao } from "./medias-esquadrao";

/** sistema-v4.1.5.md, “Iniciando um Novo Agente”: conjunto autorizado vem do chamador. */
describe("calcularMediasEsquadrao", () => {
  it("mantém as médias fracionárias para o arredondamento posterior canônico", () => {
    expect(calcularMediasEsquadrao({ fichas: [
      { nivel: 2, prestigio: 4 }, { nivel: 3, prestigio: 7 },
    ] })).toEqual({ mediaNivel: 2.5, mediaPrestigio: 5.5, quantidade: 2 });
  });

  it("retorna zero no conjunto vazio, preservando o tratamento de primeiro agente", () => {
    expect(calcularMediasEsquadrao({ fichas: [] })).toEqual({
      mediaNivel: 0, mediaPrestigio: 0, quantidade: 0,
    });
  });

  it("ignora nulos e ausências em cada média sem excluir a ficha da quantidade", () => {
    expect(calcularMediasEsquadrao({ fichas: [
      { nivel: 2, prestigio: null }, { nivel: null, prestigio: 8 }, { nivel: 4 },
    ] })).toEqual({ mediaNivel: 3, mediaPrestigio: 8, quantidade: 3 });
  });

  it("distingue zero informado de ausência e não modifica as referências", () => {
    const fichas = Object.freeze([
      Object.freeze({ nivel: 0, prestigio: 0 }), Object.freeze({ nivel: 2, prestigio: 4 }),
    ]);
    expect(calcularMediasEsquadrao({ fichas })).toEqual({ mediaNivel: 1, mediaPrestigio: 2, quantidade: 2 });
  });

  it("mantém quantidade mesmo quando nenhum agente informa os campos", () => {
    expect(calcularMediasEsquadrao({ fichas: [{ nivel: null, prestigio: null }] })).toEqual({
      mediaNivel: 0, mediaPrestigio: 0, quantidade: 1,
    });
  });
});
