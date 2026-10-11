import { describe, expect, it } from "vitest";
import { TipoRegraPecaEnum as Tipo } from "../enums/tipo-regra-peca.enum";
import type { LivroPecaDto, LivroVersaoConteudoDto } from "../dtos/livro/livro-peca.dtos";
import { projetarPecasEmRegras } from "./projetar-pecas-em-regras";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const habilidade: LivroPecaDto = {
  identificador: id(3), ancora: null, tipo: Tipo.HABILIDADE, ordem: 0, filhos: [],
  dados: { nome: "Golpe", custo: 2, reacao: false, glifo: null, trechos: [{ tipo: "texto", texto: "Bate." }] },
};
const conteudo: LivroVersaoConteudoDto = {
  formato: 1, codigo: "sistema", titulo: "Sistema", subtitulo: "x", numero: "1.0.0",
  pecas: [
    {
      identificador: id(1), ancora: "agentes", tipo: Tipo.SECAO, ordem: 0,
      dados: { titulo: "Agentes", nivel: 1, glifo: null },
      filhos: [
        { identificador: id(2), ancora: null, tipo: Tipo.PARAGRAFO, ordem: 0, dados: { trechos: [{ tipo: "texto", texto: "Oi" }] }, filhos: [] },
        habilidade,
      ],
    },
  ],
};

describe("projetarPecasEmRegras — incluirPecas", () => {
  it("por padrão o resultado é o do leitor, sem identificadores", () => {
    expect(JSON.stringify(projetarPecasEmRegras(conteudo))).not.toContain("\"peca\"");
  });

  it("com incluirPecas cada bloco carrega o identificador da sua peça", () => {
    const documento = projetarPecasEmRegras(conteudo, { incluirPecas: true });
    const secao = documento.filhos.find((filho) => filho.tipo === "secao");
    expect(secao).toMatchObject({ peca: id(1) });
    const filhos = secao && "filhos" in secao ? secao.filhos : [];
    expect(filhos.map((filho) => (filho as { peca?: string }).peca)).toEqual([id(2), id(3)]);
    // E a flag não vaza para a chamada seguinte.
    expect(JSON.stringify(projetarPecasEmRegras(conteudo))).not.toContain("\"peca\"");
  });
});
