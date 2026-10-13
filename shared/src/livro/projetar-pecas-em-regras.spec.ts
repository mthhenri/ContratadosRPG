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

  it("os itens de equipamentos, modificações e amplificadores também carregam a peça", () => {
    const t = (texto: string) => [{ tipo: "texto" as const, texto }];
    const item = (n: number, tipo: Tipo, dados: unknown): LivroPecaDto =>
      ({ identificador: id(n), ancora: null, tipo, ordem: 0, filhos: [], dados: dados as never });
    const container = (n: number, tipo: Tipo, dados: unknown, filho: LivroPecaDto): LivroPecaDto =>
      ({ identificador: id(n), ancora: null, tipo, ordem: 0, dados: dados as never, filhos: [filho] });
    const livro: LivroVersaoConteudoDto = { ...conteudo, pecas: [
      container(10, Tipo.EQUIPAMENTOS, { categoria: "Armas" }, item(11, Tipo.EQUIPAMENTO,
        { nome: "Faca", custo: t("1"), descricao: t("x"), peso: t("1"), danos: [] })),
      container(20, Tipo.MODIFICACOES, { categoria: "Armas" }, item(21, Tipo.MODIFICACAO,
        { nome: "Leve", empilhamento: "■", efeito: t("x"), bloqueia: t("—") })),
      container(30, Tipo.AMPLIFICADORES, {}, item(31, Tipo.AMPLIFICADOR,
        { nome: "Vida", empilhamento: "■", efeito: t("x") })),
    ] };
    const itens = projetarPecasEmRegras(livro, { incluirPecas: true }).filhos
      .filter((filho) => filho.tipo === "equipamentos" || filho.tipo === "modificacoes" || filho.tipo === "amplificadores")
      .map((filho) => (filho as unknown as { itens: readonly { peca?: string }[] }).itens[0].peca);
    expect(itens).toEqual([id(11), id(21), id(31)]);
    expect(JSON.stringify(projetarPecasEmRegras(livro))).not.toContain("\"peca\"");
  });

  it("a lista carrega a peça; a sublista dentro de um item não", () => {
    const sublista = { tipo: "lista", ordenada: false, inicio: 1, itens: [[{ tipo: "paragrafo", trechos: [{ tipo: "texto", texto: "Filho" }] }]] };
    const livro: LivroVersaoConteudoDto = { ...conteudo, pecas: [{
      identificador: id(40), ancora: null, tipo: Tipo.LISTA, ordem: 0, filhos: [],
      dados: { ordenada: true, inicio: 1, itens: [[sublista]] } as never,
    }] };
    const lista = projetarPecasEmRegras(livro, { incluirPecas: true }).filhos.find((filho) => filho.tipo === "lista") as { itens: unknown[][] } | undefined;
    expect(lista).toMatchObject({ peca: id(40) });
    expect(JSON.stringify(lista?.itens[0][0])).not.toContain("\"peca\"");
    expect(JSON.stringify(projetarPecasEmRegras(livro))).not.toContain("\"peca\"");
  });
});
