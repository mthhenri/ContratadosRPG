import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { LivroPacoteItemDto, LivroPecaDto } from "@contratados-rpg/shared/dtos/livro";
import { TipoRegraPecaEnum as Tipo } from "@contratados-rpg/shared/enums";
import { criarPacoteLivros, serializarCanonico, validarPacoteLivros } from "./pacote-livros";

export const livrosDeTeste = (): LivroPacoteItemDto[] =>
  ["sistema", "guia"].map((codigo, indice) => ({
    codigo,
    titulo: codigo,
    ordem: indice + 1,
    numero: "1.0",
    formato: 1,
    publicacaoData: "2026-10-22T12:00:00.123456Z",
    nota: indice === 0 ? "## Nota\nIntegral" : null,
    conteudo: { codigo, titulo: codigo, subtitulo: "", numero: "1.0", formato: 1, pecas: [] },
  }));
const data = "2026-10-22T13:00:00.000Z";

describe("pacote de livros publicados", () => {
  it("ordena chaves recursivamente, preservando ordem dos arrays e Unicode", () => {
    expect(serializarCanonico({ z: [{ b: "á", a: 2 }, 1], a: null })).toBe(
      '{"a":null,"z":[{"a":2,"b":"á"},1]}',
    );
  });
  it("hash cobre conteúdo e todos os metadados, sem o próprio hash", () => {
    const pacote = criarPacoteLivros(livrosDeTeste(), data);
    const { sha256, ...corpo } = pacote;
    expect(sha256).toBe(createHash("sha256").update(serializarCanonico(corpo)).digest("hex"));
    expect(validarPacoteLivros(JSON.parse(JSON.stringify(pacote)))).toEqual(pacote);
    expect(pacote.livros[0].publicacaoData).toBe("2026-10-22T12:00:00.123456Z");
    expect(() =>
      validarPacoteLivros({ ...pacote, exportacaoData: "2026-10-23T13:00:00Z" }),
    ).toThrow();
  });
  it.each(["../../escape", "..\\escape", "1.0\n", "1 0", "1/0", "x".repeat(41)])(
    "recusa número editorial inseguro mesmo com hash recalculado: %j",
    (numero) => {
      const pacote = criarPacoteLivros(livrosDeTeste(), data);
      const livros = pacote.livros.map((livro) => ({
        ...livro,
        numero,
        conteudo: { ...livro.conteudo, numero },
      }));
      const corpo = { formato: pacote.formato, exportacaoData: pacote.exportacaoData, livros };
      const sha256 = createHash("sha256").update(serializarCanonico(corpo)).digest("hex");
      expect(() => validarPacoteLivros({ ...corpo, sha256 })).toThrow();
    },
  );
  it("aceita sufixo editorial local seguro", () => {
    const livros = livrosDeTeste().map((livro) => ({
      ...livro,
      numero: "4.1.6-local",
      conteudo: { ...livro.conteudo, numero: "4.1.6-local" },
    }));
    expect(criarPacoteLivros(livros, data).livros[0].numero).toBe("4.1.6-local");
  });
  it.each([null, {}, [], { formato: 2 }, { livros: [null] }])(
    "recusa estrutura hostil: %j",
    (valor) => {
      expect(() => validarPacoteLivros(valor)).toThrow();
    },
  );
  it("recusa pacote incompleto, duplicado, metadados divergentes e campos extras", () => {
    const livros = livrosDeTeste();
    expect(() => criarPacoteLivros(livros.slice(0, 1), data)).toThrow();
    expect(() => criarPacoteLivros([livros[0], livros[0]], data)).toThrow();
    expect(() => criarPacoteLivros([{ ...livros[0], numero: "outro" }, livros[1]], data)).toThrow();
    expect(() =>
      criarPacoteLivros([{ ...livros[0], usuarioId: 7 } as LivroPacoteItemDto, livros[1]], data),
    ).toThrow();
  });
  it("não aceita JSON não finito, ciclos ou objetos com protótipo especial", () => {
    expect(() => serializarCanonico(NaN)).toThrow();
    const ciclo: unknown[] = [];
    ciclo.push(ciclo);
    expect(() => serializarCanonico(ciclo)).toThrow();
    expect(() => validarPacoteLivros(new Date())).toThrow();
  });
  const secao = (identificador = "00000000-0000-4000-8000-000000000001"): LivroPecaDto => ({
    identificador,
    ancora: "secao",
    tipo: Tipo.SECAO,
    ordem: 0,
    dados: { titulo: "Seção", nivel: 1, glifo: null },
    filhos: [],
  });
  const comPecas = (pecas: readonly LivroPecaDto[]): LivroPacoteItemDto[] => {
    const livros = livrosDeTeste();
    return [{ ...livros[0], conteudo: { ...livros[0].conteudo, pecas } }, livros[1]];
  };
  it("recusa UUID fora da forma canônica mesmo com integridade recalculada", () => {
    const pacote = criarPacoteLivros(comPecas([secao("abcdef00-0000-4000-8000-000000000001")]), data);
    const livros = pacote.livros.map(livro => ({ ...livro, conteudo: {
      ...livro.conteudo, pecas: livro.conteudo.pecas.map(peca => ({
        ...peca, identificador: peca.identificador.toUpperCase(),
      })),
    } }));
    const corpo = { formato: pacote.formato, exportacaoData: pacote.exportacaoData, livros };
    const sha256 = createHash("sha256").update(serializarCanonico(corpo)).digest("hex");
    expect(() => validarPacoteLivros({ ...corpo, sha256 })).toThrow();
  });
  it("aceita árvore rica com links e mapa de âncoras antigas", () => {
    const destino = secao();
    const livros = comPecas([
      {
        ...destino,
        filhos: [
          {
            identificador: "00000000-0000-4000-8000-000000000002",
            ancora: null,
            ordem: 0,
            tipo: Tipo.PARAGRAFO,
            dados: {
              trechos: [
                {
                  tipo: "negrito",
                  filhos: [
                    {
                      tipo: "link-interno",
                      texto: "Destino",
                      ancora: "secao",
                      identificador: destino.identificador,
                    },
                  ],
                },
              ],
            },
            filhos: [],
          },
        ],
      },
    ]);
    livros[0] = {
      ...livros[0],
      conteudo: { ...livros[0].conteudo, ancorasAntigas: { antiga: "secao" } },
    };
    expect(criarPacoteLivros(livros, data).livros).toEqual(livros);
  });
  it("recusa UUID global duplicado e formato de dados ou trecho malicioso", () => {
    const livros = comPecas([secao()]);
    livros[1] = { ...livros[1], conteudo: { ...livros[1].conteudo, pecas: [secao()] } };
    expect(() => criarPacoteLivros(livros, data)).toThrow();
    for (const dados of [
      { titulo: [], nivel: 1, glifo: null },
      { titulo: "x", nivel: 1, glifo: null, usuarioId: 7 },
    ]) {
      expect(() =>
        criarPacoteLivros(comPecas([{ ...secao(), dados } as unknown as LivroPecaDto]), data),
      ).toThrow();
    }
    expect(() =>
      criarPacoteLivros(
        comPecas([
          {
            ...secao(),
            filhos: [
              {
                ...secao("00000000-0000-4000-8000-000000000002"),
                ancora: null,
                tipo: Tipo.PARAGRAFO,
                dados: { trechos: [{ tipo: "negrito", filhos: [null] }] },
              } as unknown as LivroPecaDto,
            ],
          },
        ]),
        data,
      ),
    ).toThrow();
  });
  it("recusa âncoras antigas ausentes e links a peças ou âncoras inexistentes", () => {
    const livros = comPecas([secao()]);
    livros[0] = {
      ...livros[0],
      conteudo: { ...livros[0].conteudo, ancorasAntigas: { antiga: "nao-existe" } },
    };
    expect(() => criarPacoteLivros(livros, data)).toThrow();
    const filho = {
      ...secao("00000000-0000-4000-8000-000000000002"),
      tipo: Tipo.PARAGRAFO,
      ancora: null,
      dados: { trechos: [{ tipo: "link-interno", texto: "x", ancora: "nao-existe" }] },
    } as LivroPecaDto;
    expect(() => criarPacoteLivros(comPecas([{ ...secao(), filhos: [filho] }]), data)).toThrow();
  });
});
