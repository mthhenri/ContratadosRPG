import type { LivroPecaDto, LivroVersaoConteudoDto } from "@contratados-rpg/shared/dtos/livro";
import { TipoLivroVersaoSituacaoEnum, TipoRegraPecaEnum } from "@contratados-rpg/shared/enums";
import { validarArvoreLivro } from "@contratados-rpg/shared/livro";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { converterRegrasEmPecas } from "./converter-regras-em-pecas";
import { importarLivro, importarLivros, type DependenciasImportacao } from "./importar-livro";
import { lerFontesDeRegras, type FonteDeRegras } from "./ler-fontes-regras";
import { projetarPecasEmRegras } from "./projetar-pecas-em-regras";
import type { NormalizadoDocumento } from "./regras-normalizadas.tipos";

/** UUID determinístico por ordem de geração, para o teste ser reprodutível. */
function criarGerador(): () => string {
  let contador = 0;
  return () => `00000000-0000-4000-8000-${(++contador).toString(16).padStart(12, "0")}`;
}

type Valor = null | boolean | number | string | Valor[] | { [chave: string]: Valor };

/**
 * Diferenças que a ida e volta aceita (cada uma está em `diagnostico.md` da spec). Aplicadas ao
 * documento original do normalizador, nunca à projeção:
 * 1. campos de auditoria `cabecalho`/`linhas` dos blocos estruturados (D1) — a paridade com o `.md`
 *    é esta própria prova, não um dado a mais guardado;
 * 2. na ficha de criatura, os blocos `identidade`/`atributos`/`habilidade-criatura` repetidos dentro
 *    das seções (a ficha os guarda uma só vez, em `dados` e nas peças filhas);
 * 3. nas grades de referência, `cabecalho`/`linhas` (a estrutura é a apresentação, D8).
 * O selo de versão da capa não é diferença: viaja no campo `selo` da peça `ABERTURA`.
 */
function reduzirAoQueOContratoGuarda(documento: NormalizadoDocumento): Valor {
  const BLOCOS_COM_FONTE_DERIVADA = new Set([
    "arquetipos",
    "subclasse",
    "termos",
    "equipamentos",
    "modificacoes",
    "amplificadores",
    "modulos",
    "niveis-ameaca",
    "faixas",
    "identidade",
    "atributos",
  ]);
  const reduzir = (valor: Valor, naFicha: boolean): Valor => {
    if (Array.isArray(valor)) {
      return valor
        .filter((item) => {
          const tipo = typeof item === "object" && item !== null && !Array.isArray(item) ? item["tipo"] : null;
          return !(naFicha && (tipo === "identidade" || tipo === "atributos" || tipo === "habilidade-criatura"));
        })
        .map((item) => reduzir(item, naFicha));
    }
    if (typeof valor !== "object" || valor === null) return valor;
    const resultado: { [chave: string]: Valor } = {};
    const tipo = valor["tipo"];
    for (const [chave, conteudo] of Object.entries(valor)) {
      resultado[chave] = reduzir(conteudo, tipo === "ficha-criatura" ? chave === "filhos" : naFicha);
    }
    const fonteDerivada =
      (typeof tipo === "string" && BLOCOS_COM_FONTE_DERIVADA.has(tipo)) ||
      (tipo === "grade" && "referencia" in valor);
    if (fonteDerivada) {
      resultado["cabecalho"] = [];
      resultado["linhas"] = [];
    }
    return resultado;
  };
  return reduzir(documento as unknown as Valor, false);
}

/** O `identificador` de um link é dado novo da peça; a projeção devolve o que o leitor já lê. */
function semIdentificadorDeLink(valor: Valor): Valor {
  if (Array.isArray(valor)) return valor.map(semIdentificadorDeLink);
  if (typeof valor !== "object" || valor === null) return valor;
  const resultado: { [chave: string]: Valor } = {};
  for (const [chave, conteudo] of Object.entries(valor)) {
    if (chave === "identificador" && valor["tipo"] === "link-interno") continue;
    resultado[chave] = semIdentificadorDeLink(conteudo);
  }
  return resultado;
}

function percorrer(pecas: readonly LivroPecaDto[], visita: (peca: LivroPecaDto, pai: LivroPecaDto | null) => void, pai: LivroPecaDto | null = null): void {
  for (const peca of pecas) {
    visita(peca, pai);
    percorrer(peca.filhos, visita, peca);
  }
}

describe("importador dos livros de regras (m11-03)", () => {
  let fontes: FonteDeRegras[];

  beforeAll(async () => {
    fontes = await lerFontesDeRegras(undefined, (especificador) => import(/* @vite-ignore */ especificador));
  });

  it.each(["sistema", "guia"])("converte %s numa árvore válida, sem órfã nem link solto", (codigo) => {
    const fonte = fontes.find((candidata) => candidata.documento.id === codigo)!;
    const conteudo = converterRegrasEmPecas(fonte.documento, { gerarIdentificador: criarGerador() });

    expect(validarArvoreLivro({ pecas: conteudo.pecas, modo: "trabalho" })).toEqual([]);
    expect(validarArvoreLivro({ pecas: conteudo.pecas, modo: "fotografia" })).toEqual([]);

    const identificadores = new Set<string>();
    percorrer(conteudo.pecas, (peca) => identificadores.add(peca.identificador));
    let total = 0;
    percorrer(conteudo.pecas, () => total++);
    expect(identificadores.size).toBe(total);
    expect(conteudo).toMatchObject({ formato: 1, codigo, numero: fonte.documento.versao });
  });

  it.each(["sistema", "guia"])("ida e volta de %s: a fotografia projetada é o JSON de hoje", (codigo) => {
    const fonte = fontes.find((candidata) => candidata.documento.id === codigo)!;
    const conteudo = converterRegrasEmPecas(fonte.documento, { gerarIdentificador: criarGerador() });
    // A fotografia vai e volta pelo JSONB: a prova passa pelo mesmo caminho do banco.
    const recuperado = JSON.parse(JSON.stringify(conteudo)) as LivroVersaoConteudoDto;

    const projetado = semIdentificadorDeLink(
      JSON.parse(JSON.stringify(projetarPecasEmRegras(recuperado))) as Valor,
    );
    expect(projetado).toEqual(reduzirAoQueOContratoGuarda(fonte.documento));
  });

  it("a ida e volta enxerga uma perda de conteúdo (a prova não é vazia)", () => {
    const fonte = fontes.find((candidata) => candidata.documento.id === "sistema")!;
    const conteudo = converterRegrasEmPecas(fonte.documento, { gerarIdentificador: criarGerador() });
    const recuperado = JSON.parse(JSON.stringify(conteudo)) as {
      pecas: { tipo: string; dados: { trechos?: unknown[] }; filhos: unknown[] }[];
    };
    const esperado = reduzirAoQueOContratoGuarda(fonte.documento);
    expect(JSON.stringify(esperado).length).toBeGreaterThan(300_000);

    const primeiro = recuperado.pecas.find((peca) => peca.tipo === "ABERTURA")!;
    primeiro.dados.trechos = primeiro.dados.trechos!.slice(1);
    const projetado = semIdentificadorDeLink(
      JSON.parse(JSON.stringify(projetarPecasEmRegras(recuperado as unknown as LivroVersaoConteudoDto))) as Valor,
    );
    expect(projetado).not.toEqual(esperado);
  });

  it("preserva as âncoras de hoje: toda âncora do normalizador existe como âncora de peça", () => {
    for (const fonte of fontes) {
      const conteudo = converterRegrasEmPecas(fonte.documento, { gerarIdentificador: criarGerador() });
      const doConteudo = new Set<string>();
      percorrer(conteudo.pecas, (peca) => {
        if (peca.ancora !== null) doConteudo.add(peca.ancora);
      });
      const doNormalizador = new Set<string>();
      const coletar = (valor: unknown): void => {
        if (Array.isArray(valor)) valor.forEach(coletar);
        else if (typeof valor === "object" && valor !== null) {
          const registro = valor as Record<string, unknown>;
          if (typeof registro["ancora"] === "string" && registro["tipo"] !== "link-interno") {
            doNormalizador.add(registro["ancora"]);
          }
          Object.values(registro).forEach(coletar);
        }
      };
      coletar(fonte.documento);
      expect([...doNormalizador].filter((ancora) => !doConteudo.has(ancora))).toEqual([]);
    }
  });

  it("o selo de versão da capa vai para a abertura só do livro que o tem", () => {
    const selos = Object.fromEntries(
      fontes.map((fonte) => {
        const conteudo = converterRegrasEmPecas(fonte.documento, { gerarIdentificador: criarGerador() });
        const abertura = conteudo.pecas.find((peca) => peca.tipo === TipoRegraPecaEnum.ABERTURA)!;
        return [fonte.documento.id, (abertura.dados as { selo?: string }).selo];
      }),
    );
    expect(selos).toEqual({ sistema: "VERSÃO 4.1.4", guia: undefined });
  });

  it("toda classe vira peça com os três arquétipos e a habilidade inicial de cada um", () => {
    const sistema = fontes.find((fonte) => fonte.documento.id === "sistema")!;
    const conteudo = converterRegrasEmPecas(sistema.documento, { gerarIdentificador: criarGerador() });
    const classes: LivroPecaDto[] = [];
    percorrer(conteudo.pecas, (peca) => {
      if (peca.tipo === TipoRegraPecaEnum.CLASSE) classes.push(peca);
    });
    expect(classes).toHaveLength(3);
    for (const classe of classes) {
      const arquetipos = classe.filhos.filter((filho) => filho.tipo === TipoRegraPecaEnum.ARQUETIPO);
      expect(arquetipos).toHaveLength(3);
      for (const arquetipo of arquetipos) {
        const iniciais = arquetipo.filhos.filter(
          (filho) => (filho.dados as { inicial?: boolean }).inicial === true,
        );
        expect(iniciais).toHaveLength(1);
      }
    }
  });

  it("recusa bloco que o contrato não modela em vez de perder conteúdo", () => {
    const documento: NormalizadoDocumento = {
      tipo: "documento",
      id: "sistema",
      titulo: "Sistema",
      versao: "1.0.0",
      filhos: [
        {
          tipo: "lista",
          ordenada: false,
          inicio: 1,
          itens: [[{ tipo: "exemplo", trechos: [] }]],
        },
      ],
    };
    expect(() => converterRegrasEmPecas(documento)).toThrow(/dentro de item de lista/);
  });

  it("recusa bloco genérico que perderia conteúdo (com filhos ou sem texto)", () => {
    const documento = (bloco: object): NormalizadoDocumento =>
      ({ tipo: "documento", id: "sistema", titulo: "S", versao: "1.0.0", filhos: [bloco] }) as NormalizadoDocumento;
    const paragrafo = { tipo: "paragrafo", trechos: [{ tipo: "texto", texto: "x" }] };
    expect(() =>
      converterRegrasEmPecas(documento({ tipo: "generico", motivo: "m", trechos: [], origemMarkdown: "", filhos: [paragrafo] })),
    ).toThrow(/sem perder conteúdo/);
    expect(() =>
      converterRegrasEmPecas(documento({ tipo: "generico", motivo: "m", trechos: [], origemMarkdown: "texto" })),
    ).toThrow(/sem perder conteúdo/);
  });

  it("recusa bloco da ficha de criatura que difere do que a ficha guarda", () => {
    const guia = fontes.find((fonte) => fonte.documento.id === "guia")!;
    const copia = JSON.parse(JSON.stringify(guia.documento)) as NormalizadoDocumento;
    const alterar = (valor: unknown): boolean => {
      if (Array.isArray(valor)) return valor.some(alterar);
      if (typeof valor !== "object" || valor === null) return false;
      const registro = valor as Record<string, unknown>;
      if (registro["tipo"] === "habilidade-criatura") {
        registro["nome"] = `${String(registro["nome"])} (alterada)`;
        return true;
      }
      return Object.entries(registro).some(([chave, conteudoDoCampo]) => chave !== "habilidades" && alterar(conteudoDoCampo));
    };
    expect(alterar(copia)).toBe(true);
    expect(() => converterRegrasEmPecas(copia)).toThrow(/difere do que a ficha guarda/);
  });

  it("recusa link interno sem peça de destino", () => {
    const documento: NormalizadoDocumento = {
      tipo: "documento",
      id: "sistema",
      titulo: "Sistema",
      versao: "1.0.0",
      filhos: [
        { tipo: "paragrafo", trechos: [{ tipo: "link-interno", texto: "ver", ancora: "nao-existe" }] },
      ],
    };
    expect(() => converterRegrasEmPecas(documento)).toThrow(/sem peça de destino/);
  });
});

describe("importarLivro", () => {
  const conteudo = (): LivroVersaoConteudoDto =>
    converterRegrasEmPecas(
      {
        tipo: "documento",
        id: "guia",
        titulo: "Guia",
        versao: "1.0.0",
        filhos: [
          {
            tipo: "secao",
            nivel: 1,
            glifo: "⬢",
            titulo: "Capítulo",
            ancora: "capitulo",
            filhos: [{ tipo: "paragrafo", trechos: [{ tipo: "texto", texto: "Olá" }] }],
          },
        ],
      },
      { gerarIdentificador: criarGerador() },
    );

  function criarDependencias(existentes: { id: number; pecaPaiId: number | null; revisao: number }[] = []) {
    let proximoId = 100;
    const criarPeca = vi.fn((dto: { pecaPaiId: number | null }) =>
      Promise.resolve({ id: ++proximoId, pecaPaiId: dto.pecaPaiId }),
    );
    const removerPeca = vi.fn().mockResolvedValue(1);
    const criarVersao = vi.fn().mockResolvedValue({ id: 7 });
    const removerVersoes = vi.fn().mockResolvedValue(1);
    const criarLivro = vi.fn().mockResolvedValue({ id: 3 });
    const dependencias = {
      livros: { recuperarLivro: vi.fn().mockResolvedValue(null), criarLivro },
      pecas: { listarArvore: vi.fn().mockResolvedValue(existentes), criarPeca, removerPeca },
      versoes: { criarVersao, removerVersoes },
      executarEmTransacao: <T>(operacao: () => Promise<T>) => operacao(),
    } as unknown as DependenciasImportacao;
    return { dependencias, criarPeca, removerPeca, criarVersao, criarLivro, removerVersoes };
  }

  it("grava o livro, as peças do pai para as filhas e a primeira fotografia PUBLICADA", async () => {
    const { dependencias, criarPeca, criarVersao, criarLivro } = criarDependencias();
    const resumo = await importarLivro(dependencias, {
      conteudo: conteudo(),
      ordemDoLivro: 2,
      usuarioId: 9,
      refazer: false,
    });

    expect(criarLivro).toHaveBeenCalledWith({ codigo: "guia", titulo: "Guia", ordem: 2 });
    expect(criarPeca.mock.calls.map(([dto]) => dto.pecaPaiId)).toEqual([null, 101]);
    expect(criarVersao).toHaveBeenCalledWith(
      expect.objectContaining({
        livroId: 3,
        situacao: TipoLivroVersaoSituacaoEnum.PUBLICADA,
        numero: "1.0.0",
        formato: 1,
        usuarioId: 9,
      }),
    );
    expect(resumo).toEqual({ livroId: 3, codigo: "guia", numero: "1.0.0", pecas: 2, versaoId: 7 });
  });

  it("valida todos os livros antes de abrir a transação e grava todos numa só", async () => {
    const { dependencias, criarLivro } = criarDependencias();
    const executar = vi.fn(<T>(operacao: () => Promise<T>) => operacao());
    const ruim = { ...conteudo(), pecas: [{ ...conteudo().pecas[0], ancora: null, dados: { titulo: 1 } }] };
    await expect(
      importarLivros({ ...dependencias, executarEmTransacao: executar as unknown as DependenciasImportacao["executarEmTransacao"] }, [
        { conteudo: conteudo(), ordemDoLivro: 1, usuarioId: 9, refazer: false },
        { conteudo: ruim as unknown as LivroVersaoConteudoDto, ordemDoLivro: 2, usuarioId: 9, refazer: false },
      ]),
    ).rejects.toThrow(/pendência/);
    expect(executar).not.toHaveBeenCalled();
    expect(criarLivro).not.toHaveBeenCalled();
  });

  it("aborta sem alterar nada quando o livro já tem peças", async () => {
    const { dependencias, criarPeca, removerPeca, criarVersao } = criarDependencias([
      { id: 1, pecaPaiId: null, revisao: 1 },
    ]);
    await expect(
      importarLivro(dependencias, { conteudo: conteudo(), ordemDoLivro: 2, usuarioId: 9, refazer: false }),
    ).rejects.toThrow(/já tem 1 peça/);
    expect(criarPeca).not.toHaveBeenCalled();
    expect(removerPeca).not.toHaveBeenCalled();
    expect(criarVersao).not.toHaveBeenCalled();
  });

  it("com refazer remove só as raízes (a exclusão leva as filhas) e importa de novo", async () => {
    const { dependencias, criarPeca, removerPeca, removerVersoes } = criarDependencias([
      { id: 1, pecaPaiId: null, revisao: 4 },
      { id: 2, pecaPaiId: 1, revisao: 1 },
    ]);
    await importarLivro(dependencias, { conteudo: conteudo(), ordemDoLivro: 2, usuarioId: 9, refazer: true });
    expect(removerPeca.mock.calls).toEqual([[{ id: 1, revisao: 4 }]]);
    expect(removerVersoes).toHaveBeenCalledWith({ livroId: 3 });
    expect(criarPeca).toHaveBeenCalledTimes(2);
  });

  it("recusa uma árvore com pendência antes de abrir a transação", async () => {
    const { dependencias, criarLivro } = criarDependencias();
    const invalido: LivroVersaoConteudoDto = {
      ...conteudo(),
      pecas: [
        {
          identificador: "00000000-0000-4000-8000-0000000000aa",
          ancora: null,
          tipo: TipoRegraPecaEnum.PARAGRAFO,
          ordem: 0,
          dados: {
            trechos: [{ tipo: "link-interno", texto: "x", ancora: "nada", identificador: "inexistente" }],
          },
          filhos: [],
        },
      ],
    };
    await expect(
      importarLivro(dependencias, { conteudo: invalido, ordemDoLivro: 2, usuarioId: 9, refazer: false }),
    ).rejects.toThrow(/pendência/);
    expect(criarLivro).not.toHaveBeenCalled();
  });
});
