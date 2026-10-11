import { describe, expect, it } from "vitest";
import {
  LivroMudancaSituacaoEnum as Situacao,
  LivroTextoOperacaoEnum as Operacao,
} from "../enums/livro-comparacao.enum";
import { TipoRegraPecaEnum as Tipo } from "../enums/tipo-regra-peca.enum";
import type { LivroPecaDto } from "../dtos/livro/livro-peca.dtos";
import type { LivroTrechoDto } from "../dtos/livro/livro-trecho.dtos";
import { compararLivros } from "./comparar-livros";
import { compararTextoRico } from "./diff-texto-rico";

const id = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
const texto = (valor: string): LivroTrechoDto => ({ tipo: "texto", texto: valor });
const negrito = (valor: string): LivroTrechoDto => ({ tipo: "negrito", filhos: [texto(valor)] });

const paragrafo = (n: number, trechos: LivroTrechoDto[], ordem = 0): LivroPecaDto => ({
  identificador: id(n),
  ancora: null,
  tipo: Tipo.PARAGRAFO,
  ordem,
  dados: { trechos },
  filhos: [],
});
const secao = (n: number, titulo: string, filhos: LivroPecaDto[] = [], ordem = 0, ancora: string | null = null): LivroPecaDto => ({
  identificador: id(n),
  ancora,
  tipo: Tipo.SECAO,
  ordem,
  dados: { titulo, nivel: 1, glifo: null },
  filhos,
});

const situacoes = (pecasAntes: LivroPecaDto[], pecasDepois: LivroPecaDto[]) =>
  compararLivros(pecasAntes, pecasDepois).mudancas.map((mudanca) => [mudanca.situacao, mudanca.identificador]);

describe("compararLivros", () => {
  const base = () => [secao(1, "Agentes", [paragrafo(2, [texto("Um texto.")]), paragrafo(3, [texto("Outro.")], 1)])];

  it("sem diferença: nenhuma mudança, mesmo com as chaves em outra ordem e campos ignoráveis", () => {
    const mesma = JSON.parse(JSON.stringify(base())) as LivroPecaDto[];
    // `revisao` é da linha do banco, nunca conteúdo; as chaves de `dados` chegam em outra ordem.
    Object.assign(mesma[0], { revisao: 7, dados: { glifo: null, nivel: 1, titulo: "Agentes" } });
    const resultado = compararLivros(base(), mesma);
    expect(resultado.mudancas).toEqual([]);
    expect(resultado.resumo).toEqual({
      total: 0,
      porSituacao: { NOVA: 0, REMOVIDA: 0, ALTERADA: 0, MOVIDA: 0 },
      porTipo: {},
    });
  });

  it("nova e removida (as filhas de uma peça nova também são novas)", () => {
    const depois = [...base(), secao(10, "Novo capítulo", [paragrafo(11, [texto("x")])], 1)];
    expect(situacoes(base(), depois)).toEqual([
      [Situacao.NOVA, id(10)],
      [Situacao.NOVA, id(11)],
    ]);
    const removida = [secao(1, "Agentes", [paragrafo(2, [texto("Um texto.")])])];
    const resultado = compararLivros(base(), removida);
    expect(resultado.mudancas).toEqual([
      { identificador: id(3), tipo: Tipo.PARAGRAFO, caminho: ["Agentes", Tipo.PARAGRAFO], situacao: Situacao.REMOVIDA },
    ]);
  });

  it("alterada em campo simples: aponta o campo, o antes e o depois", () => {
    const depois = base();
    (depois[0].dados as { nivel: number }).nivel = 2;
    const [mudanca] = compararLivros(base(), depois).mudancas;
    expect(mudanca).toMatchObject({
      situacao: Situacao.ALTERADA,
      identificador: id(1),
      campos: [{ campo: "nivel", antes: 1, depois: 2 }],
    });
  });

  it("renomeada (o título muda, o identificador não) é alterada, nunca removida + nova", () => {
    const depois = base();
    (depois[0].dados as { titulo: string }).titulo = "Agentes de Campo";
    const resultado = compararLivros(base(), depois);
    expect(resultado.mudancas.map((mudanca) => mudanca.situacao)).toEqual([Situacao.ALTERADA]);
    expect(resultado.mudancas[0].campos?.[0]).toMatchObject({ campo: "titulo", antes: "Agentes", depois: "Agentes de Campo" });
  });

  it("alterada em texto rico: diff palavra a palavra", () => {
    const antes = [paragrafo(1, [texto("O agente recebe 3 de dano por rodada.")])];
    const depois = [paragrafo(1, [texto("O agente recebe 5 de dano por turno.")])];
    const [mudanca] = compararLivros(antes, depois).mudancas;
    const diff = mudanca.campos?.[0].texto ?? [];
    expect(mudanca.campos?.[0].campo).toBe("trechos");
    expect(diff.filter((parte) => parte.operacao === Operacao.REMOVIDO).map((parte) => parte.texto)).toEqual(["3", "rodada."]);
    expect(diff.filter((parte) => parte.operacao === Operacao.ADICIONADO).map((parte) => parte.texto)).toEqual(["5", "turno."]);
    expect(diff.map((parte) => parte.texto).join("")).not.toBe("");
  });

  it("alteração só de formatação: FORMATACAO, sem REMOVIDO nem ADICIONADO", () => {
    const antes = [paragrafo(1, [texto("Soma a "), texto("Força"), texto(" no dano.")])];
    const depois = [paragrafo(1, [texto("Soma a "), negrito("Força"), texto(" no dano.")])];
    const diff = compararLivros(antes, depois).mudancas[0].campos?.[0].texto ?? [];
    expect(diff.some((parte) => parte.operacao === Operacao.REMOVIDO || parte.operacao === Operacao.ADICIONADO)).toBe(false);
    expect(diff.find((parte) => parte.operacao === Operacao.FORMATACAO)).toEqual({
      operacao: Operacao.FORMATACAO,
      texto: "Força",
      marcasAntes: [],
      marcasDepois: ["negrito"],
    });
  });

  it("mudar a palavra e a formatação são coisas separadas", () => {
    const diff = compararTextoRico([texto("um "), negrito("alfa"), texto(" fim")], [texto("um "), negrito("beta"), texto(" fim")]);
    expect(diff.map((parte) => [parte.operacao, parte.texto])).toEqual([
      [Operacao.IGUAL, "um "],
      [Operacao.REMOVIDO, "alfa"],
      [Operacao.ADICIONADO, "beta"],
      [Operacao.IGUAL, " fim"],
    ]);
  });

  it("link: mudar o destino é formatação; renomear o destino (só a âncora cacheada) não é mudança", () => {
    const link = (identificador: string, ancora: string): LivroTrechoDto => ({
      tipo: "link-interno",
      texto: "Saúde",
      ancora,
      identificador,
    });
    expect(compararLivros([paragrafo(1, [link(id(9), "saude")])], [paragrafo(1, [link(id(9), "saude-nova")])]).mudancas).toEqual([]);
    const diff = compararLivros([paragrafo(1, [link(id(9), "saude")])], [paragrafo(1, [link(id(8), "saude")])]).mudancas[0].campos?.[0].texto;
    expect(diff?.[0].operacao).toBe(Operacao.FORMATACAO);
  });

  it("âncora alterada é mudança da peça e registra a antiga", () => {
    const antes = [secao(1, "Agentes", [], 0, "agentes")];
    const depois = [secao(1, "Agentes", [], 0, "agentes-de-campo")];
    expect(compararLivros(antes, depois).mudancas[0].campos).toEqual([
      { campo: "ancora", antes: "agentes", depois: "agentes-de-campo" },
    ]);
  });

  it("campos aninhados (células de tabela) usam o caminho dentro de dados", () => {
    const tabela = (celula: string): LivroPecaDto => ({
      identificador: id(1),
      ancora: null,
      tipo: Tipo.TABELA,
      ordem: 0,
      dados: { cabecalho: [[texto("A")]], linhas: [[[texto("x")], [texto(celula)]]] },
      filhos: [],
    });
    const [mudanca] = compararLivros([tabela("y")], [tabela("z")]).mudancas;
    expect(mudanca.campos?.map((campo) => campo.campo)).toEqual(["linhas.0.1"]);
  });

  describe("movimentos", () => {
    const irmas = (ordens: number[]) => [secao(1, "Pai", ordens.map((n, indice) => paragrafo(n, [texto(`p${n}`)], indice)))];

    it("movida entre irmãs: só a que mudou de lugar", () => {
      expect(situacoes(irmas([2, 3, 4, 5]), irmas([2, 4, 5, 3]))).toEqual([[Situacao.MOVIDA, id(3)]]);
      expect(compararLivros(irmas([2, 3, 4, 5]), irmas([2, 4, 5, 3])).mudancas[0].posicao).toEqual({
        paiAntes: id(1),
        paiDepois: id(1),
        ordemAntes: 1,
        ordemDepois: 3,
      });
    });

    it("inserir um item no começo não move as seguintes (ordem relativa, não índice bruto)", () => {
      expect(situacoes(irmas([2, 3, 4]), irmas([9, 2, 3, 4]))).toEqual([[Situacao.NOVA, id(9)]]);
    });

    it("remover um item não move as seguintes", () => {
      expect(situacoes(irmas([2, 3, 4]), irmas([3, 4]))).toEqual([[Situacao.REMOVIDA, id(2)]]);
    });

    it("movida entre pais", () => {
      const antes = [secao(1, "A", [paragrafo(3, [texto("x")])]), secao(2, "B", [], 1)];
      const depois = [secao(1, "A"), secao(2, "B", [paragrafo(3, [texto("x")])], 1)];
      const [mudanca] = compararLivros(antes, depois).mudancas;
      expect(mudanca).toMatchObject({
        situacao: Situacao.MOVIDA,
        identificador: id(3),
        caminho: ["B", Tipo.PARAGRAFO],
        posicao: { paiAntes: id(1), paiDepois: id(2) },
      });
    });

    it("alterada e movida ao mesmo tempo: duas mudanças do mesmo identificador", () => {
      const antes = [secao(1, "A", [paragrafo(3, [texto("velho")])]), secao(2, "B", [], 1)];
      const depois = [secao(1, "A"), secao(2, "B", [paragrafo(3, [texto("novo")])], 1)];
      expect(situacoes(antes, depois)).toEqual([
        [Situacao.ALTERADA, id(3)],
        [Situacao.MOVIDA, id(3)],
      ]);
    });

    it("mover uma peça com os filhos não move os filhos", () => {
      const antes = [secao(1, "A", [secao(5, "Sub", [paragrafo(6, [texto("x")])])]), secao(2, "B", [], 1)];
      const depois = [secao(1, "A"), secao(2, "B", [secao(5, "Sub", [paragrafo(6, [texto("x")])])], 1)];
      expect(situacoes(antes, depois)).toEqual([[Situacao.MOVIDA, id(5)]]);
    });
  });

  it("resumo agregado por situação e por tipo", () => {
    const antes = [secao(1, "A", [paragrafo(2, [texto("a")]), paragrafo(3, [texto("b")], 1)])];
    const depois = [secao(1, "A", [paragrafo(2, [texto("a!")]), paragrafo(9, [texto("c")], 1)])];
    expect(compararLivros(antes, depois).resumo).toEqual({
      total: 3,
      porSituacao: { NOVA: 1, REMOVIDA: 1, ALTERADA: 1, MOVIDA: 0 },
      porTipo: { PARAGRAFO: 3 },
    });
  });

  it("é determinístico e não altera as entradas", () => {
    const antes = base();
    const depois = base();
    (depois[0].filhos[0].dados as { trechos: LivroTrechoDto[] }).trechos = [texto("Mudou.")];
    const copiaAntes = JSON.stringify(antes);
    const primeira = compararLivros(antes, depois);
    const segunda = compararLivros(antes, depois);
    expect(JSON.stringify(primeira)).toBe(JSON.stringify(segunda));
    expect(JSON.stringify(antes)).toBe(copiaAntes);
  });
});

/** Cópia da árvore que o teste pode editar (o contrato é somente leitura). */
interface PecaMutavel {
  identificador: string;
  ordem: number;
  dados: unknown;
  filhos: PecaMutavel[];
}

describe("compararLivros — desempenho", () => {
  /** Gerador pseudoaleatório determinístico (mulberry32). */
  function aleatorio(semente: number): () => number {
    let estado = semente;
    return () => {
      estado = (estado + 0x6d2b79f5) | 0;
      let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const palavras = "agente dano rodada energia vida defesa teste habilidade classe nível bônus alcance reação ataque".split(" ");

  function livro(capitulos: number, secoesPorCapitulo: number, paragrafosPorSecao: number): LivroPecaDto[] {
    const sorteio = aleatorio(42);
    let contador = 0;
    const frase = () =>
      Array.from({ length: 25 + Math.floor(sorteio() * 40) }, () => palavras[Math.floor(sorteio() * palavras.length)]).join(" ");
    const paragrafos = (quantidade: number): LivroPecaDto[] =>
      Array.from({ length: quantidade }, (_, p) => paragrafo(++contador, [texto(frase()), negrito(frase())], p));
    const secoes = (c: number): LivroPecaDto[] =>
      Array.from({ length: secoesPorCapitulo }, (_, s) =>
        secao(++contador, `Seção ${c}.${s}`, paragrafos(paragrafosPorSecao), s),
      );
    return Array.from({ length: capitulos }, (_, c) => secao(++contador, `Capítulo ${c}`, secoes(c), c));
  }

  it("compara duas cópias de ~3000 peças, com alterações conhecidas, em tempo interativo", () => {
    const antes = livro(12, 10, 24); // 12 + 120 + 2880 peças
    const depois = JSON.parse(JSON.stringify(antes)) as PecaMutavel[];
    // 30 parágrafos alterados, 1 movido de capítulo, 1 removido, 1 nova.
    let alterados = 0;
    for (const capitulo of depois) {
      for (const sub of capitulo.filhos.slice(0, 3)) {
        for (const peca of sub.filhos.slice(0, 3)) {
          (peca.dados as { trechos: LivroTrechoDto[] }).trechos.push(texto(" ACRESCENTADO"));
          alterados++;
        }
      }
    }
    const movida = depois[0].filhos[5].filhos.splice(2, 1)[0];
    depois[1].filhos[5].filhos.push({ ...movida, ordem: 99 });
    const removida = depois[2].filhos[5].filhos.splice(0, 1)[0];
    depois[3].filhos.push(secao(900_000, "Nova seção", [], 50) as unknown as PecaMutavel);

    const inicio = performance.now();
    const resultado = compararLivros(antes, depois as unknown as LivroPecaDto[]);
    const duracao = performance.now() - inicio;

    expect(resultado.resumo.porSituacao).toEqual({ NOVA: 1, REMOVIDA: 1, ALTERADA: alterados, MOVIDA: 1 });
    expect(resultado.mudancas.find((mudanca) => mudanca.situacao === Situacao.REMOVIDA)?.identificador).toBe(removida.identificador);
    // Limite de uso interativo (medido ~50 ms; folga para máquinas lentas).
    expect(duracao).toBeLessThan(1500);
  });
});
