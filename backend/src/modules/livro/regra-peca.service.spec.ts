import type { RegraPecaArvoreItemDto } from "@contratados-rpg/shared/dtos/livro";
import { TipoRegraPecaEnum as Tipo, TipoUsuarioEnum } from "@contratados-rpg/shared/enums";
import { describe, expect, it, vi } from "vitest";
import {
  BusinessException,
  ResourceConflictException,
  ResourceNotFoundException,
  UnauthorizedAccessException,
} from "../../core/exceptions";
import type { TransacaoService } from "../../database/transacao.service";
import type { JwtPayload } from "../autenticacao/jwt-payload.interface";
import { criarEsqueletoPeca } from "@contratados-rpg/shared/livro";
import { RegraPecaService } from "./regra-peca.service";

const admin: JwtPayload = { sub: 7, login: "a", tipo: TipoUsuarioEnum.ADMIN, tokenVersao: 1 };
const normal: JwtPayload = { sub: 8, login: "n", tipo: TipoUsuarioEnum.NORMAL, tokenVersao: 1 };
const livro = { id: 1, codigo: "sistema", titulo: "Sistema", ordem: 1 };

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const secao = (id: number, pai: number | null, ordem: number, revisao = 1): RegraPecaArvoreItemDto => ({
  id, livroId: 1, pecaPaiId: pai, tipo: Tipo.SECAO, identificador: uuid(id), ancora: `s${id}`, ordem,
  dados: { titulo: `S${id}`, nivel: 1, glifo: null }, revisao,
});
const paragrafo = (id: number, pai: number | null, ordem: number, revisao = 1): RegraPecaArvoreItemDto => ({
  id, livroId: 1, pecaPaiId: pai, tipo: Tipo.PARAGRAFO, identificador: uuid(id), ancora: null, ordem,
  dados: { trechos: [{ tipo: "texto", texto: `p${id}` }] }, revisao,
});

/** Repositório em memória: o bastante para conferir a orquestração da service. */
function criar(inicial: RegraPecaArvoreItemDto[]) {
  const linhas = inicial.map((item) => ({ ...item }));
  let proximoId = 100;
  const antigas: { regraPecaId: number; identificador: string; ancora: string }[] = [];
  const repositorio = {
    listarArvore: vi.fn(() => Promise.resolve(linhas.map((item) => ({ ...item })))),
    recuperarPeca: vi.fn((dto: { id: number }) => Promise.resolve(linhas.find((item) => item.id === dto.id) ? { ...linhas.find((item) => item.id === dto.id)! } : null)),
    alterarDados: vi.fn((dto: { id: number; dados: unknown; revisao: number }) => {
      const peca = linhas.find((item) => item.id === dto.id && item.revisao === dto.revisao);
      if (!peca) return Promise.resolve(null);
      Object.assign(peca, { dados: dto.dados, revisao: peca.revisao + 1 });
      return Promise.resolve({ ...peca });
    }),
    alterarPosicao: vi.fn((dto: { id: number; pecaPaiId: number | null; ordem: number; revisao: number }) => {
      const peca = linhas.find((item) => item.id === dto.id && item.revisao === dto.revisao);
      if (!peca) return Promise.resolve(null);
      Object.assign(peca, { pecaPaiId: dto.pecaPaiId, ordem: dto.ordem, revisao: peca.revisao + 1 });
      return Promise.resolve({ ...peca });
    }),
    alterarOrdem: vi.fn((dto: { id: number; ordem: number }) => {
      const peca = linhas.find((item) => item.id === dto.id);
      if (peca) peca.ordem = dto.ordem;
      return Promise.resolve(peca ? 1 : 0);
    }),
    criarPeca: vi.fn((dto: { pecaPaiId: number | null; tipo: Tipo; identificador: string; ancora: string | null; ordem: number; dados: unknown }) => {
      const nova = { id: ++proximoId, livroId: 1, revisao: 1, ...dto } as RegraPecaArvoreItemDto;
      linhas.push(nova);
      return Promise.resolve({ ...nova });
    }),
    removerPeca: vi.fn((dto: { id: number; revisao: number }) => {
      const peca = linhas.find((item) => item.id === dto.id && item.revisao === dto.revisao);
      return Promise.resolve(peca ? 1 : 0);
    }),
    restaurarPeca: vi.fn().mockResolvedValue(2),
    alterarAncora: vi.fn((dto: { id: number; ancora: string | null; revisao: number }) => {
      const peca = linhas.find((item) => item.id === dto.id && item.revisao === dto.revisao);
      if (!peca) return Promise.resolve(null);
      Object.assign(peca, { ancora: dto.ancora, revisao: peca.revisao + 1 });
      return Promise.resolve({ ...peca });
    }),
    listarAncorasAntigas: vi.fn(() => Promise.resolve(antigas.map((item) => ({ ...item })))),
    criarAncoraAntiga: vi.fn((dto: { regraPecaId: number; ancora: string }) => {
      antigas.push({ regraPecaId: dto.regraPecaId, identificador: uuid(dto.regraPecaId), ancora: dto.ancora });
      return Promise.resolve(true);
    }),
  };
  const livros = {
    recuperarLivro: vi.fn((dto: { codigo: string }) => Promise.resolve(dto.codigo === "sistema" ? livro : null)),
    bloquearLivro: vi.fn().mockResolvedValue(undefined),
  };
  // Como o banco: falha no meio da transação desfaz tudo o que ela gravou.
  const transacao = {
    executar: async <T>(operacao: () => Promise<T>) => {
      const copia = linhas.map((item) => ({ ...item }));
      const copiaAntigas = antigas.map((item) => ({ ...item }));
      try {
        return await operacao();
      } catch (erro) {
        linhas.splice(0, linhas.length, ...copia);
        antigas.splice(0, antigas.length, ...copiaAntigas);
        throw erro;
      }
    },
  } as unknown as TransacaoService;
  const servico = new RegraPecaService(livros as never, repositorio as never, transacao);
  return { servico, repositorio, linhas, livros, antigas };
}

const mensagem = (trecho: string) => ({ response: { mensagem: expect.stringContaining(trecho) as string } });

const ordensDe = (linhas: RegraPecaArvoreItemDto[], pai: number | null) =>
  linhas
    .filter((item) => item.pecaPaiId === pai)
    .sort((primeira, segunda) => primeira.ordem - segunda.ordem)
    .map((item) => item.id);

describe("RegraPecaService — permissão e revisão", () => {
  it("recusa quem não é ADMIN em toda operação, sem tocar o repositório", async () => {
    const { servico, repositorio } = criar([secao(1, null, 0)]);
    const falhas = [
      servico.listarArvore({ codigo: "sistema" }, normal),
      servico.recuperarPeca({ codigo: "sistema", id: 1 }, normal),
      servico.alterarDados({ codigo: "sistema", id: 1, dados: secao(1, null, 0).dados, revisao: 1 }, normal),
      servico.alterarPosicao({ codigo: "sistema", id: 1, pecaPaiId: null, indice: 0, revisao: 1 }, normal),
      servico.duplicar({ codigo: "sistema", id: 1 }, normal),
      servico.excluir({ codigo: "sistema", id: 1, revisao: 1 }, normal),
      servico.restaurar({ codigo: "sistema", id: 1 }, normal),
    ];
    for (const falha of falhas) await expect(falha).rejects.toThrow(UnauthorizedAccessException);
    expect(repositorio.listarArvore).not.toHaveBeenCalled();
    expect(repositorio.alterarDados).not.toHaveBeenCalled();
    expect(repositorio.removerPeca).not.toHaveBeenCalled();
  });

  it("peça de outro livro ou livro inexistente é 404", async () => {
    const { servico, linhas } = criar([secao(1, null, 0)]);
    linhas[0].livroId = 2;
    await expect(servico.recuperarPeca({ codigo: "sistema", id: 1 }, admin)).rejects.toThrow(ResourceNotFoundException);
    await expect(servico.listarArvore({ codigo: "nada" }, admin)).rejects.toThrow(ResourceNotFoundException);
  });

  it("alterar dados: aplica e sobe a revisão; revisão defasada é conflito, sem sobrescrever", async () => {
    const { servico, linhas } = criar([paragrafo(2, null, 0)]);
    const dados = { trechos: [{ tipo: "texto" as const, texto: "novo" }] };
    const { peca } = await servico.alterarDados({ codigo: "sistema", id: 2, dados, revisao: 1 }, admin);
    expect(peca.revisao).toBe(2);
    expect(linhas[0].dados).toEqual(dados);

    await expect(
      servico.alterarDados({ codigo: "sistema", id: 2, dados: { trechos: [] }, revisao: 1 }, admin),
    ).rejects.toThrow(ResourceConflictException);
    expect(linhas[0].dados).toEqual(dados);
  });

  it("recusa dados com forma errada e revisão ausente (400), mas aceita campo vazio (pendência, não erro)", async () => {
    const { servico, repositorio } = criar([paragrafo(2, null, 0)]);
    await expect(
      servico.alterarDados({ codigo: "sistema", id: 2, dados: { texto: "x" } as never, revisao: 1 }, admin),
    ).rejects.toThrow(BusinessException);
    await expect(
      servico.alterarDados({ codigo: "sistema", id: 2, dados: { trechos: [] }, revisao: undefined as never }, admin),
    ).rejects.toThrow(BusinessException);
    expect(repositorio.alterarDados).not.toHaveBeenCalled();
    await expect(
      servico.alterarDados({ codigo: "sistema", id: 2, dados: { trechos: [] }, revisao: 1 }, admin),
    ).resolves.toBeDefined();
  });
});

describe("RegraPecaService — mover", () => {
  const arvore = () => [
    secao(1, null, 0),
    paragrafo(2, 1, 0),
    paragrafo(3, 1, 1),
    paragrafo(4, 1, 2),
    secao(5, null, 1),
  ];

  it("reordena entre irmãs e devolve só as peças cuja posição mudou", async () => {
    const { servico, linhas } = criar(arvore());
    const { pecas } = await servico.alterarPosicao({ codigo: "sistema", id: 4, pecaPaiId: 1, indice: 0, revisao: 1 }, admin);
    expect(ordensDe(linhas, 1)).toEqual([4, 2, 3]);
    expect(pecas.map((peca) => [peca.id, peca.ordem]).sort()).toEqual([[2, 1], [3, 2], [4, 0]]);
  });

  it("move para outro pai e fecha o lugar; o índice maior que o fim vai para o fim", async () => {
    const { servico, linhas } = criar([...arvore(), paragrafo(6, 5, 0)]);
    await servico.alterarPosicao({ codigo: "sistema", id: 2, pecaPaiId: 5, indice: 99, revisao: 1 }, admin);
    expect(ordensDe(linhas, 5)).toEqual([6, 2]);
    expect(linhas.find((item) => item.id === 2)?.pecaPaiId).toBe(5);
  });

  it("recusa mover para dentro da própria subárvore, para tipo que não cabe e para pai inexistente", async () => {
    const { servico } = criar(arvore());
    await expect(
      servico.alterarPosicao({ codigo: "sistema", id: 1, pecaPaiId: 1, indice: 0, revisao: 1 }, admin),
    ).rejects.toThrow(BusinessException);
    const { servico: outro } = criar([...arvore(), { ...paragrafo(6, null, 2) }]);
    await expect(
      outro.alterarPosicao({ codigo: "sistema", id: 5, pecaPaiId: 2, indice: 0, revisao: 1 }, admin),
    ).rejects.toMatchObject(mensagem("não pode ficar dentro"));
    await expect(
      outro.alterarPosicao({ codigo: "sistema", id: 5, pecaPaiId: 999, indice: 0, revisao: 1 }, admin),
    ).rejects.toThrow(ResourceNotFoundException);
  });

  it("revisão defasada: conflito e nenhuma irmã alterada", async () => {
    const { servico, repositorio, linhas } = criar(arvore());
    linhas.find((item) => item.id === 4)!.revisao = 3;
    await expect(
      servico.alterarPosicao({ codigo: "sistema", id: 4, pecaPaiId: 1, indice: 0, revisao: 1 }, admin),
    ).rejects.toThrow(ResourceConflictException);
    expect(repositorio.alterarOrdem).not.toHaveBeenCalled();
  });

  it("índice inválido é 400", async () => {
    const { servico } = criar(arvore());
    await expect(
      servico.alterarPosicao({ codigo: "sistema", id: 4, pecaPaiId: 1, indice: -1, revisao: 1 }, admin),
    ).rejects.toThrow(BusinessException);
  });
});

describe("RegraPecaService — criar", () => {
  const dadosParagrafo = { trechos: [{ tipo: "texto" as const, texto: "novo" }] };

  it("cria depois da irmã indicada, sem âncora, deslocando as seguintes", async () => {
    const { servico, linhas } = criar([secao(1, null, 0), paragrafo(2, 1, 0), paragrafo(3, 1, 1)]);
    const { peca, pecas } = await servico.criar(
      { codigo: "sistema", tipo: Tipo.PARAGRAFO, pecaPaiId: 1, indice: 1, dados: dadosParagrafo },
      admin,
    );
    expect(peca.ancora).toBeNull();
    expect(peca.ordem).toBe(1);
    expect(ordensDe(linhas, 1)).toEqual([2, peca.id, 3]);
    expect(pecas.map((item) => [item.id, item.ordem])).toEqual([[3, 2]]);
  });

  it("recusa tipo que não cabe no pai, pai inexistente, dados malformados e não-ADMIN", async () => {
    const { servico } = criar([secao(1, null, 0), paragrafo(2, 1, 0)]);
    const base = { codigo: "sistema", tipo: Tipo.PARAGRAFO, pecaPaiId: 1, indice: 0, dados: dadosParagrafo };
    await expect(servico.criar({ ...base, pecaPaiId: 2 }, admin)).rejects.toThrow(BusinessException);
    await expect(servico.criar({ ...base, pecaPaiId: 999 }, admin)).rejects.toThrow(ResourceNotFoundException);
    await expect(servico.criar({ ...base, dados: { texto: "x" } as never }, admin)).rejects.toThrow(BusinessException);
    await expect(servico.criar({ ...base, dados: null as never }, admin)).rejects.toThrow(BusinessException);
    await expect(servico.criar(base, normal)).rejects.toThrow(UnauthorizedAccessException);
  });
});

describe("RegraPecaService — criar com esqueleto", () => {
  const esqueletoArquetipo = criarEsqueletoPeca(Tipo.ARQUETIPO);
  const classe = (id: number): RegraPecaArvoreItemDto => ({
    id, livroId: 1, pecaPaiId: null, tipo: Tipo.CLASSE, identificador: uuid(id), ancora: null, ordem: 0,
    dados: criarEsqueletoPeca(Tipo.CLASSE).dados, revisao: 1,
  });
  const pedido = {
    codigo: "sistema",
    tipo: Tipo.ARQUETIPO,
    pecaPaiId: 1,
    indice: 0,
    dados: esqueletoArquetipo.dados,
    filhos: esqueletoArquetipo.filhos,
  };

  it("cria o arquétipo com a habilidade inicial vazia dentro dele", async () => {
    const { servico, linhas } = criar([classe(1)]);
    const { peca, filhas } = await servico.criar(pedido, admin);
    expect(filhas).toHaveLength(1);
    expect(filhas[0]).toMatchObject({ tipo: Tipo.HABILIDADE, pecaPaiId: peca.id, ordem: 0 });
    expect(filhas[0].dados).toMatchObject({ inicial: true, nome: "" });
    expect(linhas).toHaveLength(3);
  });

  it("é atômico: falha ao criar a filha não deixa o arquétipo pela metade", async () => {
    const { servico, repositorio, linhas } = criar([classe(1)]);
    const original = repositorio.criarPeca.getMockImplementation()!;
    repositorio.criarPeca.mockImplementationOnce(original).mockRejectedValueOnce(new Error("banco caiu"));
    await expect(servico.criar(pedido, admin)).rejects.toThrow("banco caiu");
    expect(linhas.map((item) => item.id)).toEqual([1]);
  });

  it("recusa arquétipo e subclasse sem a habilidade inicial (a projeção do livro quebraria)", async () => {
    const { servico, linhas } = criar([classe(1)]);
    await expect(servico.criar({ ...pedido, filhos: [] }, admin)).rejects.toThrow(BusinessException);
    await expect(servico.criar({ ...pedido, filhos: undefined }, admin)).rejects.toThrow(BusinessException);
    expect(linhas).toHaveLength(1);
  });

  it("recusa filho que não cabe no pai, dados malformados e esqueleto grande demais", async () => {
    const { servico, linhas } = criar([classe(1)]);
    const habilidade = criarEsqueletoPeca(Tipo.HABILIDADE);
    const invalidos = [
      [{ tipo: Tipo.SECAO, dados: criarEsqueletoPeca(Tipo.SECAO).dados, filhos: [] }],
      [{ tipo: Tipo.HABILIDADE, dados: { nome: 1 } as never, filhos: [] }],
      [{ ...habilidade, filhos: [habilidade] }],
      Array.from({ length: 21 }, () => habilidade),
    ];
    for (const filhos of invalidos) {
      await expect(servico.criar({ ...pedido, filhos }, admin)).rejects.toThrow(BusinessException);
    }
    expect(linhas).toHaveLength(1);
  });
});

describe("RegraPecaService — âncora do primeiro nome", () => {
  const nova = (tipo: Tipo, dados: unknown, ancora: string | null = null): RegraPecaArvoreItemDto => ({
    id: 1, livroId: 1, pecaPaiId: null, tipo, identificador: uuid(1), ancora, ordem: 0, dados: dados as never, revisao: 1,
  });

  it("seção nova ganha a âncora quando recebe o primeiro título", async () => {
    const { servico } = criar([nova(Tipo.SECAO, { titulo: "", nivel: 2, glifo: null })]);
    const { peca } = await servico.alterarDados(
      { codigo: "sistema", id: 1, dados: { titulo: "Armas Longas", nivel: 2, glifo: null }, revisao: 1 }, admin);
    expect(peca.ancora).toBe("armas-longas");
  });

  it("não troca a âncora de quem já tem, e peça sem âncora de link (parágrafo) segue sem", async () => {
    const com = criar([nova(Tipo.SECAO, { titulo: "A", nivel: 2, glifo: null }, "velha")]);
    const r1 = await com.servico.alterarDados(
      { codigo: "sistema", id: 1, dados: { titulo: "B", nivel: 2, glifo: null }, revisao: 1 }, admin);
    expect(r1.peca.ancora).toBe("velha");
    const sem = criar([nova(Tipo.PARAGRAFO, { trechos: [] })]);
    const r2 = await sem.servico.alterarDados(
      { codigo: "sistema", id: 1, dados: { trechos: [{ tipo: "texto", texto: "x" }] }, revisao: 1 }, admin);
    expect(r2.peca.ancora).toBeNull();
  });

  it("título ainda vazio não gera âncora", async () => {
    const { servico } = criar([nova(Tipo.SECAO, { titulo: "", nivel: 2, glifo: null })]);
    const { peca } = await servico.alterarDados(
      { codigo: "sistema", id: 1, dados: { titulo: "  ", nivel: 2, glifo: null }, revisao: 1 }, admin);
    expect(peca.ancora).toBeNull();
  });
});

describe("RegraPecaService — renomear", () => {
  const comAncora = (id: number, ancora: string | null, titulo: string): RegraPecaArvoreItemDto => ({
    ...secao(id, null, id),
    ancora,
    dados: { titulo, nivel: 1, glifo: null },
  });
  const renomear = (servico: RegraPecaService, id: number, nome: string, revisao = 1) =>
    servico.alterarNome({ codigo: "sistema", id, nome, revisao }, admin);

  it("grava o nome, deriva a âncora nova e guarda a antiga", async () => {
    const { servico, antigas } = criar([comAncora(1, "velho", "Velho")]);
    const { peca, ancoraAntiga } = await renomear(servico, 1, "Título Novo");
    expect(peca.dados).toMatchObject({ titulo: "Título Novo" });
    expect(peca.ancora).toBe("titulo-novo");
    expect(peca.revisao).toBe(3);
    expect(ancoraAntiga).toBe("velho");
    expect(antigas).toEqual([expect.objectContaining({ regraPecaId: 1, ancora: "velho" })]);
  });

  it("colisão com âncora atual ou antiga de outra peça resolve com sufixo", async () => {
    const { servico, antigas } = criar([comAncora(1, "a", "A"), comAncora(2, "golpe", "Golpe"), comAncora(3, "x", "X")]);
    antigas.push({ regraPecaId: 3, identificador: uuid(3), ancora: "golpe-2" });
    const { peca } = await renomear(servico, 1, "Golpe");
    expect(peca.ancora).toBe("golpe-3");
  });

  it("voltar ao nome antigo reaproveita a própria âncora antiga", async () => {
    const { servico } = criar([comAncora(1, "velho", "Velho")]);
    const primeira = await renomear(servico, 1, "Novo");
    const volta = await renomear(servico, 1, "Velho", primeira.peca.revisao);
    expect(volta.peca.ancora).toBe("velho");
  });

  it("peça sem âncora ganha uma, sem registrar antiga", async () => {
    const { servico, repositorio } = criar([comAncora(1, null, "")]);
    const { ancoraAntiga, peca } = await renomear(servico, 1, "Nova");
    expect(peca.ancora).toBe("nova");
    expect(ancoraAntiga).toBeNull();
    expect(repositorio.criarAncoraAntiga).not.toHaveBeenCalled();
  });

  it("mesmo nome não registra a âncora atual como antiga", async () => {
    const { servico, repositorio } = criar([comAncora(1, "velho", "Velho")]);
    const { ancoraAntiga } = await renomear(servico, 1, "Velho");
    expect(ancoraAntiga).toBeNull();
    expect(repositorio.criarAncoraAntiga).not.toHaveBeenCalled();
  });

  it("recusa revisão defasada, nome vazio, tipo sem nome e não-ADMIN", async () => {
    const { servico } = criar([comAncora(1, "a", "A"), paragrafo(2, 1, 0)]);
    await expect(renomear(servico, 1, "B", 9)).rejects.toThrow(ResourceConflictException);
    await expect(renomear(servico, 1, "   ")).rejects.toThrow(BusinessException);
    await expect(renomear(servico, 2, "B")).rejects.toThrow(BusinessException);
    await expect(servico.alterarNome({ codigo: "sistema", id: 1, nome: "B", revisao: 1 }, normal)).rejects.toThrow(
      UnauthorizedAccessException,
    );
  });
});

describe("RegraPecaService — duplicar, excluir e restaurar", () => {
  it("duplica a peça com as descendentes logo depois dela: ids novos, sem âncora, irmãs deslocadas", async () => {
    const { servico, linhas } = criar([secao(1, null, 0), secao(5, 1, 0), paragrafo(6, 5, 0), paragrafo(7, 1, 1), secao(8, null, 1)]);
    const resultado = await servico.duplicar({ codigo: "sistema", id: 5 }, admin);

    const copia = linhas.find((item) => item.id === resultado.copiaId)!;
    expect(copia.pecaPaiId).toBe(1);
    expect(copia.ancora).toBeNull();
    expect(copia.identificador).not.toBe(uuid(5));
    expect(copia.dados).toEqual(secao(5, 1, 0).dados);
    expect(ordensDe(linhas, 1)).toEqual([5, copia.id, 7]);
    const filhaDaCopia = linhas.find((item) => item.pecaPaiId === copia.id)!;
    expect(filhaDaCopia.dados).toEqual(paragrafo(6, 5, 0).dados);
    expect(filhaDaCopia.identificador).not.toBe(uuid(6));
    expect(new Set(linhas.map((item) => item.identificador)).size).toBe(linhas.length);
    expect(resultado.pecas.map((peca) => peca.id)).toEqual(expect.arrayContaining([copia.id, filhaDaCopia.id, 7]));
    expect(linhas.find((item) => item.id === 8)?.ordem).toBe(1);
  });

  it("excluir: revisão certa remove; defasada é conflito; peça de outro livro é 404", async () => {
    const { servico } = criar([paragrafo(2, null, 0, 4)]);
    await expect(servico.excluir({ codigo: "sistema", id: 2, revisao: 3 }, admin)).rejects.toThrow(ResourceConflictException);
    await expect(servico.excluir({ codigo: "sistema", id: 2, revisao: 4 }, admin)).resolves.toEqual({ removidas: 1 });
    await expect(servico.excluir({ codigo: "sistema", id: 99, revisao: 1 }, admin)).rejects.toThrow(ResourceNotFoundException);
  });

  it("mover, duplicar e restaurar travam o livro antes de ler a árvore (edições de estrutura em série)", async () => {
    const { servico, livros, repositorio } = criar([secao(1, null, 0), paragrafo(2, 1, 0)]);
    const ordem: string[] = [];
    livros.bloquearLivro.mockImplementation(() => {
      ordem.push("trava");
      return Promise.resolve();
    });
    repositorio.listarArvore.mockImplementation(() => {
      ordem.push("leitura");
      return Promise.resolve([secao(1, null, 0), paragrafo(2, 1, 0)]);
    });
    await servico.alterarPosicao({ codigo: "sistema", id: 2, pecaPaiId: 1, indice: 0, revisao: 1 }, admin).catch(() => undefined);
    await servico.duplicar({ codigo: "sistema", id: 2 }, admin).catch(() => undefined);
    await servico.restaurar({ codigo: "sistema", id: 1 }, admin).catch(() => undefined);
    expect(ordem.filter((passo) => passo === "trava")).toHaveLength(3);
    expect(ordem[0]).toBe("trava");
    expect(ordem.indexOf("leitura")).toBeGreaterThan(0);
  });

  it("restaurar só no livro da URL e devolve a subárvore mesmo com ids fora de ordem", async () => {
    const { servico, repositorio } = criar([secao(40, null, 0), secao(30, 40, 0), paragrafo(50, 30, 0)]);
    const { pecas } = await servico.restaurar({ codigo: "sistema", id: 40 }, admin);
    expect(repositorio.restaurarPeca).toHaveBeenCalledWith({ id: 40, livroId: 1 });
    expect(pecas.map((peca) => peca.id).sort()).toEqual([30, 40, 50]);
  });

  it("revisão ou índice acima do inteiro do banco é 400, não 500", async () => {
    const { servico } = criar([paragrafo(2, null, 0)]);
    await expect(servico.excluir({ codigo: "sistema", id: 2, revisao: 3_000_000_000 }, admin)).rejects.toThrow(BusinessException);
    await expect(
      servico.alterarPosicao({ codigo: "sistema", id: 2, pecaPaiId: null, indice: 3_000_000_000, revisao: 1 }, admin),
    ).rejects.toThrow(BusinessException);
  });

  it("dados nulo ou ausente é 400, não 500", async () => {
    const { servico } = criar([paragrafo(2, null, 0)]);
    await expect(servico.alterarDados({ codigo: "sistema", id: 2, dados: null as never, revisao: 1 }, admin)).rejects.toThrow(BusinessException);
    await expect(servico.alterarDados({ codigo: "sistema", id: 2, dados: undefined as never, revisao: 1 }, admin)).rejects.toThrow(BusinessException);
  });

  it("restaurar: devolve a subárvore reativada; sem nada a restaurar ou âncora tomada é conflito", async () => {
    const { servico, repositorio } = criar([secao(1, null, 0), paragrafo(2, 1, 0)]);
    const { pecas } = await servico.restaurar({ codigo: "sistema", id: 1 }, admin);
    expect(pecas.map((peca) => peca.id)).toEqual([1, 2]);

    repositorio.restaurarPeca.mockResolvedValueOnce(0);
    await expect(servico.restaurar({ codigo: "sistema", id: 1 }, admin)).rejects.toMatchObject(mensagem("Nada para restaurar"));
    repositorio.restaurarPeca.mockRejectedValueOnce(Object.assign(new Error("duplicate key"), { code: "23505" }));
    await expect(servico.restaurar({ codigo: "sistema", id: 1 }, admin)).rejects.toMatchObject(mensagem("âncora"));
  });
});

describe("RegraPecaService — estruturas que o livro exige", () => {
  const habilidade = (id: number, pai: number, ordem: number, inicial: boolean): RegraPecaArvoreItemDto => ({
    id, livroId: 1, pecaPaiId: pai, tipo: Tipo.HABILIDADE, identificador: uuid(id), ancora: null, ordem, revisao: 1,
    dados: { nome: `H${id}`, custo: 1, reacao: false, glifo: null, trechos: [{ tipo: "texto", texto: "x" }], ...(inicial ? { inicial: true } : {}) },
  });
  const roteiro = (id: number): RegraPecaArvoreItemDto => ({
    id, livroId: 1, pecaPaiId: null, tipo: Tipo.ROTEIRO, identificador: uuid(id), ancora: null, ordem: 0, revisao: 1,
    dados: { etapas: [], introducaoQuantidade: 1, conclusaoQuantidade: 0 },
  });

  it("não exclui nem duplica a habilidade inicial", async () => {
    const { servico } = criar([
      { ...secao(1, null, 0), tipo: Tipo.SUBCLASSE, dados: { nome: "S", classe: "C", citacao: [], custos: [], saude: { vida: [], energia: [] }, progressao: { vida: [], energia: [] }, atributosBonus: [], apresentacao: "saude", itens: [] } as never },
      habilidade(2, 1, 0, true),
    ]);
    await expect(servico.excluir({ codigo: "sistema", id: 2, revisao: 1 }, admin)).rejects.toMatchObject(mensagem("habilidade inicial"));
    await expect(servico.duplicar({ codigo: "sistema", id: 2 }, admin)).rejects.toMatchObject(mensagem("habilidade inicial"));
  });

  it("não cria, move, duplica nem exclui filhos de um roteiro", async () => {
    const { servico } = criar([roteiro(1), paragrafo(2, 1, 0), paragrafo(3, 1, 1)]);
    const dados = { trechos: [{ tipo: "texto" as const, texto: "n" }] };
    await expect(servico.criar({ codigo: "sistema", tipo: Tipo.PARAGRAFO, pecaPaiId: 1, indice: 0, dados }, admin)).rejects.toMatchObject(mensagem("roteiro"));
    await expect(servico.alterarPosicao({ codigo: "sistema", id: 3, pecaPaiId: 1, indice: 0, revisao: 1 }, admin)).rejects.toMatchObject(mensagem("roteiro"));
    await expect(servico.duplicar({ codigo: "sistema", id: 2 }, admin)).rejects.toMatchObject(mensagem("roteiro"));
    await expect(servico.excluir({ codigo: "sistema", id: 2, revisao: 1 }, admin)).rejects.toMatchObject(mensagem("roteiro"));
  });
});
