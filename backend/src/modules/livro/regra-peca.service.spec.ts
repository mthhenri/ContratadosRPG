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
  const repositorio = {
    listarArvore: vi.fn(() => Promise.resolve(linhas.map((item) => ({ ...item })))),
    recuperarPeca: vi.fn((dto: { id: number }) => Promise.resolve(linhas.find((item) => item.id === dto.id) ?? null)),
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
  };
  const livros = {
    recuperarLivro: vi.fn((dto: { codigo: string }) => Promise.resolve(dto.codigo === "sistema" ? livro : null)),
    bloquearLivro: vi.fn().mockResolvedValue(undefined),
  };
  const transacao = { executar: <T>(operacao: () => Promise<T>) => operacao() } as unknown as TransacaoService;
  const servico = new RegraPecaService(livros as never, repositorio as never, transacao);
  return { servico, repositorio, linhas, livros };
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
