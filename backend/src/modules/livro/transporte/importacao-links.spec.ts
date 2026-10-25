import { describe, expect, it } from "vitest";
import { adaptarFotografiaTrabalho } from "./importacao-links";
import type { LivroVersaoConteudoDto } from "@contratados-rpg/shared/dtos/livro";
import { TipoRegraPecaEnum } from "@contratados-rpg/shared/enums";

describe("adaptação da fotografia à Oficina", () => {
  it("resolve âncora atual e antiga para UUID estável e conserva dados ricos", () => {
    const conteudo: LivroVersaoConteudoDto = {
      codigo: "sistema",
      titulo: "Sistema",
      subtitulo: "",
      numero: "1",
      formato: 1,
      ancorasAntigas: { antiga: "atual" },
      pecas: [
        {
          identificador: "00000000-0000-4000-8000-000000000001",
          ancora: "atual",
          tipo: TipoRegraPecaEnum.SECAO,
          ordem: 0,
          dados: { titulo: "Título", nivel: 1, glifo: null },
          filhos: [
            {
              identificador: "00000000-0000-4000-8000-000000000002",
              ancora: null,
              tipo: TipoRegraPecaEnum.PARAGRAFO,
              ordem: 0,
              dados: {
                trechos: [
                  { tipo: "link-interno", ancora: "antiga", texto: "Link" },
                ],
              },
              filhos: [],
            },
          ],
        },
      ],
    };
    const trabalho = adaptarFotografiaTrabalho(conteudo);
    expect(trabalho.pecas[0].filhos[0].dados).toEqual({
      trechos: [
        {
          tipo: "link-interno",
          ancora: "atual",
          texto: "Link",
          identificador: conteudo.pecas[0].identificador,
        },
      ],
    });
    expect(conteudo.pecas[0].filhos[0].dados).not.toEqual(
      trabalho.pecas[0].filhos[0].dados,
    );
  });
});
