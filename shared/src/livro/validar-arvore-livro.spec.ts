import { describe, expect, it } from "vitest";
import { TipoRegraPecaEnum as Tipo } from "../enums/tipo-regra-peca.enum";
import {
  LivroPendenciaCodigoEnum as Codigo,
  LivroPendenciaGravidadeEnum as Gravidade,
} from "../enums/livro-pendencia-codigo.enum";
import { LivroPecaDto } from "../dtos/livro/livro-peca.dtos";
import { LivroTrechoDto } from "../dtos/livro/livro-trecho.dtos";
import { LIVRO_FILHOS_PERMITIDOS, LIVRO_RAIZ_PERMITIDA } from "./aninhamento";
import { validarArvoreLivro } from "./validar-arvore-livro";

const texto = (valor: string): LivroTrechoDto => ({ tipo: "texto", texto: valor });

function peca<T extends Tipo>(
  tipo: T,
  identificador: string,
  dados: unknown,
  filhos: readonly LivroPecaDto[] = [],
  ancora: string | null = null,
): LivroPecaDto {
  return { identificador, ancora, tipo, ordem: 0, dados: dados as never, filhos };
}

const saude = { vida: [texto("Inicial = 10")], energia: [texto("Inicial = 5")] };

function habilidade(identificador: string, nome = "Golpe Certeiro", trechos = [texto("Causa dano.")]) {
  return peca(Tipo.HABILIDADE, identificador, {
    nome,
    custo: 2,
    reacao: false,
    glifo: "⬦",
    trechos,
  });
}

/** Trecho do Sistema: uma classe com um arquétipo e habilidades, dentro de uma seção. */
function livroValido(): LivroPecaDto[] {
  return [
    peca(Tipo.ABERTURA, "abertura", { titulo: "Registro", trechos: [texto("Oficial.")] }),
    peca(
      Tipo.SECAO,
      "capitulo",
      { titulo: "Classes", nivel: 1, glifo: "⬢" },
      [
        peca(Tipo.PARAGRAFO, "intro", {
          trechos: [{ tipo: "link-interno", texto: "Combatente", ancora: "combatente", identificador: "combatente" }],
        }),
        peca(
          Tipo.CLASSE,
          "combatente",
          {
            nome: "Combatente",
            citacao: [texto('"Força."')],
            saude,
            progressao: saude,
            cabecalho: [[texto("Nível")]],
            linhas: [[[texto("1")]]],
          },
          [
            habilidade("golpe"),
            peca(
              Tipo.ARQUETIPO,
              "lutador",
              { nome: "Lutador", citacao: [], atributosBonus: [texto("+1 FOR")] },
              [habilidade("soco", "Soco Forte")],
              "lutador",
            ),
          ],
          "combatente",
        ),
      ],
      "classes",
    ),
  ];
}

const validar = (pecas: readonly LivroPecaDto[], modo: "trabalho" | "fotografia" = "trabalho") =>
  validarArvoreLivro({ pecas, modo });

describe("validarArvoreLivro", () => {
  it("aceita um trecho real (classe com arquétipo e habilidades) sem pendências", () => {
    expect(validar(livroValido())).toEqual([]);
  });

  it("na fotografia, resolve o link pela âncora", () => {
    expect(validar(livroValido(), "fotografia")).toEqual([]);
  });

  it("acusa identificador duplicado como estrutural, com o caminho da peça", () => {
    const pecas = livroValido();
    pecas.push(peca(Tipo.SECAO, "combatente", { titulo: "Outra", nivel: 1, glifo: null }));
    const [pendencia] = validar(pecas);
    expect(pendencia.codigo).toBe(Codigo.IDENTIFICADOR_DUPLICADO);
    expect(pendencia.gravidade).toBe(Gravidade.ESTRUTURAL);
    expect(pendencia.caminho).toEqual(["Outra"]);
  });

  it("acusa âncora duplicada, mas aceita várias peças sem âncora", () => {
    const pecas = livroValido();
    pecas.push(peca(Tipo.PARAGRAFO, "a", { trechos: [] }));
    pecas.push(peca(Tipo.PARAGRAFO, "b", { trechos: [] }));
    expect(validar(pecas)).toEqual([]);
    pecas.push(peca(Tipo.SECAO, "repetida", { titulo: "X", nivel: 1, glifo: null }, [], "classes"));
    const pendencias = validar(pecas);
    expect(pendencias).toHaveLength(1);
    expect(pendencias[0].codigo).toBe(Codigo.ANCORA_DUPLICADA);
  });

  it("acusa filho não permitido para o pai", () => {
    const pecas = [
      peca(Tipo.CLASSE, "c", {
        nome: "C", citacao: [], saude, progressao: saude, cabecalho: [], linhas: [],
      }, [peca(Tipo.PARAGRAFO, "p", { trechos: [] })]),
    ];
    const pendencias = validar(pecas);
    expect(pendencias.map((item) => item.codigo)).toEqual([Codigo.FILHO_NAO_PERMITIDO]);
    expect(pendencias[0].mensagem).toContain("dentro de CLASSE");
  });

  it("acusa tipo que não pode ficar na raiz", () => {
    const pendencias = validar([habilidade("h"), peca(Tipo.ARQUETIPO, "a", { nome: "A", citacao: [], atributosBonus: [] })]);
    expect(pendencias.map((item) => item.codigo)).toEqual([Codigo.FILHO_NAO_PERMITIDO]);
    expect(pendencias[0].mensagem).toContain("na raiz do livro");
  });

  it("acusa dados incoerentes com o tipo como estrutural", () => {
    const pendencias = validar([peca(Tipo.HABILIDADE, "h", { nome: "X", custo: "abc", reacao: false, glifo: null })]);
    const campos = pendencias.map((item) => item.mensagem);
    expect(pendencias.every((item) => item.codigo === Codigo.DADOS_INVALIDOS)).toBe(true);
    expect(pendencias.every((item) => item.gravidade === Gravidade.ESTRUTURAL)).toBe(true);
    expect(campos.some((mensagem) => mensagem.includes('"custo"'))).toBe(true);
    expect(campos.some((mensagem) => mensagem.includes('"trechos"'))).toBe(true);
  });

  it("acusa nível de seção fora de 1 a 4 e grade sem a forma da apresentação", () => {
    const pendencias = validar([
      peca(Tipo.SECAO, "s", { titulo: "S", nivel: 7, glifo: null }),
      peca(Tipo.GRADE, "g", { apresentacao: "cartoes", colunas: 3 }),
      peca(Tipo.GRADE, "h", { apresentacao: "estranha", colunas: 3 }),
    ]);
    expect(pendencias).toHaveLength(3);
    expect(pendencias.every((item) => item.codigo === Codigo.DADOS_INVALIDOS)).toBe(true);
  });

  it("trata campo vazio como pendência de conteúdo (habilidade sem nome nem efeito)", () => {
    const pendencias = validar([habilidade("h", "  ", [])]);
    expect(pendencias.map((item) => item.codigo)).toEqual([
      Codigo.CONTEUDO_INCOMPLETO,
      Codigo.CONTEUDO_INCOMPLETO,
    ]);
    expect(pendencias.every((item) => item.gravidade === Gravidade.CONTEUDO)).toBe(true);
  });

  it("acusa link para identificador inexistente como pendência de conteúdo", () => {
    const pecas = [
      peca(Tipo.PARAGRAFO, "p", {
        trechos: [{ tipo: "negrito", filhos: [{ tipo: "link-interno", texto: "Sumiu", ancora: "sumiu", identificador: "removida" }] }],
      }),
    ];
    const [pendencia] = validar(pecas);
    expect(pendencia.codigo).toBe(Codigo.LINK_INEXISTENTE);
    expect(pendencia.gravidade).toBe(Gravidade.CONTEUDO);
  });

  it("acusa link sem identificador na cópia de trabalho como estrutural", () => {
    const pecas = [
      peca(Tipo.PARAGRAFO, "p", { trechos: [{ tipo: "link-interno", texto: "Solto", ancora: "solto" }] }),
    ];
    const [pendencia] = validar(pecas);
    expect(pendencia.codigo).toBe(Codigo.LINK_SEM_IDENTIFICADOR);
    expect(pendencia.gravidade).toBe(Gravidade.ESTRUTURAL);
  });

  it("na fotografia, link para âncora inexistente é pendência", () => {
    const pecas = [
      peca(Tipo.PARAGRAFO, "p", { trechos: [{ tipo: "link-interno", texto: "X", ancora: "nada" }] }),
    ];
    expect(validar(pecas, "fotografia").map((item) => item.codigo)).toEqual([Codigo.LINK_INEXISTENTE]);
  });

  it("resolve link para peça que aparece depois na árvore", () => {
    const pecas = [
      peca(Tipo.PARAGRAFO, "p", { trechos: [{ tipo: "link-interno", texto: "Adiante", ancora: "depois", identificador: "alvo" }] }),
      peca(Tipo.SECAO, "alvo", { titulo: "Depois", nivel: 1, glifo: null }, [], "depois"),
    ];
    expect(validar(pecas)).toEqual([]);
  });
});

describe("tabela de aninhamento", () => {
  it("cobre todos os tipos de peça", () => {
    expect(Object.keys(LIVRO_FILHOS_PERMITIDOS).sort()).toEqual(Object.values(Tipo).sort());
  });

  it("itens só ficam dentro do container correto", () => {
    expect(LIVRO_FILHOS_PERMITIDOS[Tipo.CLASSE]).toEqual([Tipo.HABILIDADE, Tipo.ARQUETIPO]);
    expect(LIVRO_RAIZ_PERMITIDA).not.toContain(Tipo.ARQUETIPO);
    expect(LIVRO_RAIZ_PERMITIDA).not.toContain(Tipo.EQUIPAMENTO);
  });
});
