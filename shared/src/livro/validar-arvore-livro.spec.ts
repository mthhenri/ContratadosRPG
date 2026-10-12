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
    const pendencias = validar([habilidade("h"), peca(Tipo.ARQUETIPO, "a", { nome: "A", citacao: [], atributosBonus: [texto("+1 FOR")] })]);
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

describe("validarArvoreLivro — equipamentos, modificações e amplificadores (m11-08)", () => {
  const equipamento = (dados: Record<string, unknown>) =>
    peca(Tipo.EQUIPAMENTOS, "armas", { categoria: "Corpo a Corpo" }, [
      peca(Tipo.EQUIPAMENTO, "faca", {
        nome: "Faca", custo: [texto("$ 10")], descricao: [texto("Curta.")], peso: [texto("1")], danos: [], ...dados,
      }),
    ]);
  const mensagens = (pecas: readonly LivroPecaDto[]) => validar(pecas).map((item) => item.mensagem);

  it("aceita um equipamento completo", () => {
    expect(validar([equipamento({})])).toEqual([]);
  });

  it("pede custo, peso e descrição do equipamento", () => {
    expect(mensagens([equipamento({ custo: [], peso: [texto(" ")], descricao: [] })])).toEqual([
      "Falta o custo do equipamento.",
      "Falta o peso do equipamento.",
      "Falta a descrição do equipamento.",
    ]);
  });

  it("acusa dano sem valor", () => {
    const danos = [{ rotulo: "DANO", trechos: [] }];
    expect(mensagens([equipamento({ danos })])).toEqual(["Há um dano sem valor."]);
    const completos = [{ rotulo: "DANO", trechos: [texto("1d6")] }];
    expect(validar([equipamento({ danos: completos })])).toEqual([]);
  });

  it("acusa dano sem rótulo como estrutural e categoria vazia como conteúdo", () => {
    const dano = equipamento({ danos: [{ trechos: [] }] });
    expect(validar([dano]).map((item) => item.gravidade)).toEqual([Gravidade.ESTRUTURAL]);
    const vazia = peca(Tipo.EQUIPAMENTOS, "armas", { categoria: " " });
    expect(mensagens([vazia])).toEqual(["Falta preencher \"categoria\"."]);
  });

  it("exige empilhamento válido, efeito e bloqueio na modificação", () => {
    const modificacao = (dados: Record<string, unknown>) =>
      peca(Tipo.MODIFICACOES, "mods", { categoria: "Corpo a Corpo" }, [
        peca(Tipo.MODIFICACAO, "leve", {
          nome: "Leve", empilhamento: "■□□", efeito: [texto("Menos peso.")], bloqueia: [texto("—")], ...dados,
        }),
      ]);
    expect(validar([modificacao({})])).toEqual([]);
    expect(mensagens([modificacao({ empilhamento: "", efeito: [], bloqueia: [] })])).toEqual([
      "Falta o empilhamento (ao menos um ■ inicial).",
      "Falta o efeito.",
      "Falta o que a modificação bloqueia (use — se nada).",
    ]);
    expect(mensagens([modificacao({ empilhamento: "□■" })])).toEqual(["Falta o empilhamento (ao menos um ■ inicial)."]);
  });

  it("exige empilhamento válido e efeito no amplificador", () => {
    const amplificador = (dados: Record<string, unknown>) =>
      peca(Tipo.AMPLIFICADORES, "amps", {}, [
        peca(Tipo.AMPLIFICADOR, "vida", { nome: "Vida", empilhamento: "■", efeito: [texto("+5 Vida.")], ...dados }),
      ]);
    expect(validar([amplificador({})])).toEqual([]);
    expect(mensagens([amplificador({ empilhamento: "", efeito: [] })])).toEqual([
      "Falta o empilhamento (ao menos um ■ inicial).",
      "Falta o efeito.",
    ]);
  });
});

describe("validarArvoreLivro — classe, arquétipo e subclasse (m11-08)", () => {
  const mensagens = (pecas: readonly LivroPecaDto[]) => validar(pecas).map((item) => item.mensagem);
  const subclasse = (dados: Record<string, unknown>) => peca(Tipo.SUBCLASSE, "sub", {
    nome: "Sub", classe: "Experimento", citacao: [], custos: [[texto("2 Vida")]], saude, progressao: saude,
    atributosBonus: [texto("+1 FOR")], ...dados,
  }, [habilidade("ini")]);

  it("aceita uma subclasse completa", () => {
    expect(validar([subclasse({})])).toEqual([]);
  });

  it("pede saúde, progressão, bônus, classe e custos da subclasse", () => {
    const vazia = { vida: [], energia: [] };
    expect(mensagens([subclasse({ saude: vazia, progressao: vazia, atributosBonus: [], classe: " ", custos: [[]] })])).toEqual([
      "Falta a Vida e a Energia iniciais.",
      "Falta a progressão de Vida e de Energia por nível.",
      "Faltam os atributos bônus.",
      "Falta a classe da subclasse.",
      "Falta o custo do experimento (ao menos um, sem linha vazia).",
    ]);
  });

  it("pede os atributos bônus do arquétipo e a saúde da classe", () => {
    const arquetipo = peca(Tipo.CLASSE, "c", { nome: "C", citacao: [], saude: { vida: [], energia: [] }, progressao: saude,
      cabecalho: [], linhas: [] }, [peca(Tipo.ARQUETIPO, "a", { nome: "A", citacao: [], atributosBonus: [] }, [habilidade("h")])]);
    expect(mensagens([arquetipo])).toEqual(["Falta a Vida e a Energia iniciais.", "Faltam os atributos bônus."]);
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

describe("validarArvoreLivro — dados que não são objeto", () => {
  it.each([null, undefined, "x", 7, []])("não lança com dados %j e acusa DADOS_INVALIDOS", (dados) => {
    const peca = { identificador: "00000000-0000-4000-8000-000000000001", ancora: null, tipo: Tipo.PARAGRAFO, ordem: 0, dados: dados as never, filhos: [] };
    const pendencias = validarArvoreLivro({ pecas: [peca], modo: "trabalho" });
    expect(pendencias.map((pendencia) => pendencia.codigo)).toContain(Codigo.DADOS_INVALIDOS);
  });
});
