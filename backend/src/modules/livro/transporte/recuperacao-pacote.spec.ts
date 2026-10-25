import { describe, expect, it } from "vitest";
import type {
  LivroRecuperacaoDto,
  LivroRecuperacaoEstadoDto,
} from "@contratados-rpg/shared/dtos/livro";
import { criarRecuperacao, validarRecuperacao } from "./recuperacao-pacote";

const base = {
  created_date: "2026-10-22T12:00:00Z",
  updated_date: "2026-10-22T12:00:00Z",
  is_deleted: false,
  deleted_date: null,
};
const estados = (): LivroRecuperacaoEstadoDto[] =>
  ["sistema", "guia"].map((codigo, indice) => ({
    codigo,
    livro: { ...base, id: indice + 1, codigo, titulo: codigo, ordem: indice },
    pecas: [],
    ancoras: [],
    versoes: [],
  }));
const montar = (valor = estados()): LivroRecuperacaoDto =>
  criarRecuperacao({
    formato: 1,
    criacaoData: base.created_date,
    alvo: {
      host: "localhost",
      porta: 5434,
      nome: "contratados_rpg",
      sistemaIdentificador: "123",
      bancoOid: 123,
    },
    estados: valor,
  });

describe("recuperação do estado lógico de livros", () => {
  it("valida hash e o conjunto completo mesmo quando um livro não existia", () => {
    const pacote = montar([
      { codigo: "sistema", livro: null, pecas: [], ancoras: [], versoes: [] },
      estados()[1],
    ]);
    expect(validarRecuperacao(pacote)).toEqual(pacote);
    expect(() =>
      validarRecuperacao({ ...pacote, criacaoData: "2026-10-21T12:00:00Z" }),
    ).toThrow(/integridade/);
    expect(() =>
      validarRecuperacao(
        criarRecuperacao({ ...pacote, estados: [pacote.estados[0]] }),
      ),
    ).toThrow(/Conjunto/);
  });
  it("recusa referência a outro livro e ciclo mesmo com hash recalculado", () => {
    const originais = estados();
    const peca = {
      ...base,
      id: 7,
      livro_id: 1,
      peca_pai_id: 7,
      tipo_regra_peca_id: 1,
      identificador: "00000000-0000-4000-8000-000000000007",
      ancora: null,
      ordem: 0,
      dados: { titulo: "Seção", nivel: 1 as const, glifo: null },
      revisao: 1,
    };
    expect(() =>
      validarRecuperacao(
        montar([{ ...originais[0], pecas: [peca] }, originais[1]]),
      ),
    ).toThrow(/Ciclo/);
    expect(() =>
      validarRecuperacao(
        montar([
          { ...originais[0], pecas: [{ ...peca, livro_id: 2 }] },
          originais[1],
        ]),
      ),
    ).toThrow(/Escopo/);
  });
  it("preserva rascunho com pendência de conteúdo e recusa shape corrompido", () => {
    const originais = estados();
    const versao = {
      ...base,
      id: 1,
      livro_id: 1,
      tipo_livro_versao_situacao_id: 2,
      numero: "1",
      formato: 1,
      publicacao_data: base.created_date,
      usuario_id: 1,
      nota: null,
      conteudo: {
        codigo: "sistema",
        titulo: "Sistema",
        subtitulo: "",
        numero: "1",
        formato: 1,
        pecas: [
          {
            identificador: "00000000-0000-4000-8000-000000000001",
            ancora: "secao",
            ordem: 0,
            tipo: "SECAO",
            dados: { titulo: "", nivel: 1, glifo: null },
            filhos: [],
          },
        ],
      },
    };
    const pacote = montar([
      { ...originais[0], versoes: [versao] } as LivroRecuperacaoEstadoDto,
      originais[1],
    ]);
    expect(validarRecuperacao(pacote)).toEqual(pacote);
    const adulterado = structuredClone(pacote) as unknown as {
      estados: { versoes: { conteudo: { pecas: { dados: unknown }[] } }[] }[];
    };
    adulterado.estados[0].versoes[0].conteudo.pecas[0].dados = {
      titulo: [],
      nivel: 1,
      glifo: null,
    };
    expect(() =>
      validarRecuperacao(
        criarRecuperacao(adulterado as unknown as LivroRecuperacaoDto),
      ),
    ).toThrow();
  });
});
