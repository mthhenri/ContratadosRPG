import { describe, expect, it } from "vitest";
import { TipoRegraPecaEnum as Tipo } from "../enums/tipo-regra-peca.enum";
import { LivroPendenciaGravidadeEnum as Gravidade } from "../enums/livro-pendencia-codigo.enum";
import type { RegraPecaEsqueletoDto } from "../dtos/livro/livro-operacao.dtos";
import type { LivroPecaDto } from "../dtos/livro/livro-peca.dtos";
import { LIVRO_FILHOS_PERMITIDOS, LIVRO_RAIZ_PERMITIDA } from "./aninhamento";
import { campoNomeDaPeca, criarEsqueletoPeca, derivarAncora, derivarAncoraUnica } from "./esqueletos";
import { validarArvoreLivro } from "./validar-arvore-livro";

function paraPeca(esqueleto: RegraPecaEsqueletoDto, contador: { n: number }): LivroPecaDto {
  contador.n += 1;
  return {
    identificador: `00000000-0000-4000-8000-${String(contador.n).padStart(12, "0")}`,
    ancora: null,
    tipo: esqueleto.tipo,
    ordem: 0,
    dados: esqueleto.dados,
    filhos: esqueleto.filhos.map((filho) => paraPeca(filho, contador)),
  };
}

describe("criarEsqueletoPeca", () => {
  it.each(Object.values(Tipo))("%s nasce sem pendência estrutural", (tipo) => {
    const contador = { n: 0 };
    const peca = paraPeca(criarEsqueletoPeca(tipo), contador);
    // Tipo que só existe dentro de outro (origem, termo…) é validado dentro do primeiro pai que o aceita.
    const tipoPai = Object.values(Tipo).find((pai) => LIVRO_FILHOS_PERMITIDOS[pai].includes(tipo) && !LIVRO_RAIZ_PERMITIDA.includes(tipo));
    const pecas = tipoPai ? [{ ...paraPeca(criarEsqueletoPeca(tipoPai), contador), filhos: [peca] }] : [peca];
    const pendencias = validarArvoreLivro({ pecas, modo: "trabalho" });
    expect(pendencias.filter((p) => p.gravidade === Gravidade.ESTRUTURAL)).toEqual([]);
  });

  it("os filhos do esqueleto cabem no pai", () => {
    for (const tipo of Object.values(Tipo)) {
      for (const filho of criarEsqueletoPeca(tipo).filhos) {
        expect(LIVRO_FILHOS_PERMITIDOS[tipo]).toContain(filho.tipo);
      }
    }
  });

  it("arquétipo e subclasse nascem com a habilidade inicial vazia", () => {
    for (const tipo of [Tipo.ARQUETIPO, Tipo.SUBCLASSE]) {
      const [inicial, ...resto] = criarEsqueletoPeca(tipo).filhos;
      expect(resto).toEqual([]);
      expect(inicial.tipo).toBe(Tipo.HABILIDADE);
      expect(inicial.dados).toMatchObject({ nome: "", inicial: true, trechos: [] });
    }
  });

  it("classe nasce com saúde, progressão e arquétipos vazios", () => {
    const classe = criarEsqueletoPeca(Tipo.CLASSE);
    expect(classe.filhos).toEqual([]);
    expect(classe.dados).toMatchObject({
      saude: { vida: [], energia: [] },
      progressao: { vida: [], energia: [] },
    });
  });

  it("o esqueleto de peça com nome tem o campo de nome vazio", () => {
    for (const tipo of Object.values(Tipo)) {
      const campo = campoNomeDaPeca(tipo);
      if (campo) expect((criarEsqueletoPeca(tipo).dados as unknown as Record<string, unknown>)[campo]).toBe("");
    }
  });
});

describe("âncoras", () => {
  it("deriva sem acento, minúscula e com hífen", () => {
    expect(derivarAncora("Energia & Vida: Ação!")).toBe("energia-vida-acao");
    expect(derivarAncora("???")).toBe("secao");
  });

  it("colisão resolve com sufixo estável", () => {
    const usadas = new Set(["golpe", "golpe-2"]);
    expect(derivarAncoraUnica("Golpe", usadas)).toBe("golpe-3");
    expect(derivarAncoraUnica("Golpe", usadas)).toBe("golpe-3");
    expect(derivarAncoraUnica("Outro", usadas)).toBe("outro");
  });
});
