import type { LivroVersaoRecuperadaDto, RegraPecaArvoreItemDto } from "@contratados-rpg/shared/dtos/livro";
import { TipoLivroVersaoSituacaoEnum, TipoRegraPecaEnum, TipoUsuarioEnum } from "@contratados-rpg/shared/enums";
import { describe, expect, it, vi } from "vitest";
import { BusinessException, ResourceNotFoundException, UnauthorizedAccessException } from "../../core/exceptions";
import type { TransacaoService } from "../../database/transacao.service";
import type { JwtPayload } from "../autenticacao/jwt-payload.interface";
import { LivroService } from "./livro.service";

const livro = { id: 1, codigo: "sistema", titulo: "Sistema", ordem: 1 };
const admin: JwtPayload = { sub: 7, login: "a", tipo: TipoUsuarioEnum.ADMIN, tokenVersao: 1 };
const normal: JwtPayload = { sub: 8, login: "n", tipo: TipoUsuarioEnum.NORMAL, tokenVersao: 1 };

const versao = (id: number, situacao: TipoLivroVersaoSituacaoEnum, livroId = 1): LivroVersaoRecuperadaDto => ({
  id,
  livroId,
  situacao,
  numero: `1.0.${id}`,
  formato: 1,
  publicacaoData: "2026-10-10T00:00:00.000000Z",
  usuarioId: 7,
  nota: null,
  conteudo: { formato: 1, codigo: "sistema", titulo: "Sistema", subtitulo: "Nova Era", numero: `1.0.${id}`, pecas: [] },
});

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const peca = (id: number, extra: Partial<RegraPecaArvoreItemDto>): RegraPecaArvoreItemDto => ({
  id,
  livroId: 1,
  pecaPaiId: null,
  tipo: TipoRegraPecaEnum.PARAGRAFO,
  identificador: uuid(id),
  ancora: null,
  ordem: 0,
  dados: { trechos: [{ tipo: "texto", texto: "x" }] },
  revisao: 1,
  ...extra,
});

function criar(
  opcoes: {
    publicada?: LivroVersaoRecuperadaDto | null;
    rascunho?: LivroVersaoRecuperadaDto | null;
    arvore?: RegraPecaArvoreItemDto[];
    antigas?: { regraPecaId: number; identificador: string; ancora: string }[];
  } = {},
) {
  const criarVersao = vi.fn((dto: { situacao: TipoLivroVersaoSituacaoEnum; numero: string }) =>
    Promise.resolve({ ...versao(50, dto.situacao), numero: dto.numero }),
  );
  const livroRepository = {
    recuperarLivro: vi.fn((dto: { codigo: string }) => Promise.resolve(dto.codigo === "sistema" ? livro : null)),
    listarLivros: vi.fn().mockResolvedValue([livro]),
  };
  const regraPecaRepository = {
    listarArvore: vi.fn().mockResolvedValue(opcoes.arvore ?? []),
    listarAncorasAntigas: vi.fn().mockResolvedValue(opcoes.antigas ?? []),
  };
  const livroVersaoRepository = {
    recuperarVersaoAtual: vi.fn((dto: { situacao: TipoLivroVersaoSituacaoEnum }) =>
      Promise.resolve(
        (dto.situacao === TipoLivroVersaoSituacaoEnum.PUBLICADA ? opcoes.publicada : opcoes.rascunho) ?? null,
      ),
    ),
    criarVersao,
    listarVersoes: vi.fn().mockResolvedValue([]),
    recuperarVersao: vi.fn(),
  };
  const transacao = { executar: <T>(operacao: () => Promise<T>) => operacao() } as unknown as TransacaoService;
  const servico = new LivroService(
    livroRepository as never,
    regraPecaRepository as never,
    livroVersaoRepository as never,
    transacao,
  );
  return { servico, criarVersao, livroVersaoRepository };
}

describe("LivroService — leitura por papel", () => {
  const publicada = versao(10, TipoLivroVersaoSituacaoEnum.PUBLICADA);
  const rascunhoNovo = versao(11, TipoLivroVersaoSituacaoEnum.RASCUNHO);
  const rascunhoVelho = versao(9, TipoLivroVersaoSituacaoEnum.RASCUNHO);

  it.each([
    ["visitante", null],
    ["NORMAL", TipoUsuarioEnum.NORMAL],
  ])("%s lê só a publicada, mesmo com rascunho mais novo", async (_nome, tipoUsuario) => {
    const { servico } = criar({ publicada, rascunho: rascunhoNovo });
    const leitura = await servico.recuperarLivro({ codigo: "sistema", tipoUsuario });
    expect(leitura.situacao).toBe(TipoLivroVersaoSituacaoEnum.PUBLICADA);
    expect(leitura.numero).toBe("1.0.10");
    expect(JSON.stringify(leitura)).not.toContain("usuarioId");
  });

  it.each([TipoUsuarioEnum.TESTER, TipoUsuarioEnum.ADMIN])(
    "%s lê o rascunho quando ele é mais novo",
    async (tipoUsuario) => {
      const { servico } = criar({ publicada, rascunho: rascunhoNovo });
      const leitura = await servico.recuperarLivro({ codigo: "sistema", tipoUsuario });
      expect(leitura.situacao).toBe(TipoLivroVersaoSituacaoEnum.RASCUNHO);
    },
  );

  it("TESTER volta à publicada quando o rascunho ficou para trás", async () => {
    const { servico } = criar({ publicada, rascunho: rascunhoVelho });
    const leitura = await servico.recuperarLivro({ codigo: "sistema", tipoUsuario: TipoUsuarioEnum.TESTER });
    expect(leitura.situacao).toBe(TipoLivroVersaoSituacaoEnum.PUBLICADA);
  });

  it("rascunho nunca vaza: sem publicada, o público recebe 404 e o livro some da lista", async () => {
    const { servico } = criar({ rascunho: rascunhoNovo });
    await expect(servico.recuperarLivro({ codigo: "sistema", tipoUsuario: null })).rejects.toThrow(
      ResourceNotFoundException,
    );
    await expect(servico.listarLivros({ tipoUsuario: null })).resolves.toEqual([]);
    await expect(servico.listarLivros({ tipoUsuario: TipoUsuarioEnum.TESTER })).resolves.toHaveLength(1);
  });

  it("livro inexistente é 404", async () => {
    const { servico } = criar({ publicada });
    await expect(servico.recuperarLivro({ codigo: "nada", tipoUsuario: null })).rejects.toThrow(
      ResourceNotFoundException,
    );
  });
});

describe("LivroService — versões (só ADMIN)", () => {
  it("recusa quem não é ADMIN, inclusive o acesso direto por id", async () => {
    const { servico, livroVersaoRepository } = criar();
    await expect(servico.listarVersoes({ codigo: "sistema" }, normal)).rejects.toThrow(UnauthorizedAccessException);
    await expect(servico.recuperarVersao({ codigo: "sistema", id: 9 }, normal)).rejects.toThrow(
      UnauthorizedAccessException,
    );
    expect(livroVersaoRepository.recuperarVersao).not.toHaveBeenCalled();
  });

  it("não entrega a fotografia de outro livro", async () => {
    const { servico, livroVersaoRepository } = criar();
    livroVersaoRepository.recuperarVersao.mockResolvedValue(versao(9, TipoLivroVersaoSituacaoEnum.PUBLICADA, 2));
    await expect(servico.recuperarVersao({ codigo: "sistema", id: 9 }, admin)).rejects.toThrow(
      ResourceNotFoundException,
    );
  });
});

describe("LivroService — publicar", () => {
  const secao = peca(1, {
    tipo: TipoRegraPecaEnum.SECAO,
    ancora: "agentes",
    dados: { titulo: "Agentes", nivel: 1, glifo: null },
  });
  const comLink = peca(2, {
    pecaPaiId: 1,
    dados: { trechos: [{ tipo: "link-interno", texto: "Agentes", ancora: "velha", identificador: uuid(1) }] },
  });

  it("recusa quem não é ADMIN antes de ler qualquer coisa", async () => {
    const { servico, criarVersao } = criar({ arvore: [secao] });
    await expect(
      servico.publicar({ codigo: "sistema", situacao: TipoLivroVersaoSituacaoEnum.PUBLICADA, numero: "1.0.0" }, normal),
    ).rejects.toThrow(UnauthorizedAccessException);
    expect(criarVersao).not.toHaveBeenCalled();
  });

  it("fotografa a árvore aninhada, resolve o link pela âncora atual e guarda as âncoras antigas", async () => {
    const { servico, criarVersao } = criar({
      arvore: [secao, comLink],
      antigas: [{ regraPecaId: 1, identificador: uuid(1), ancora: "agentes-antigos" }],
    });
    const resultado = await servico.publicar(
      { codigo: "sistema", situacao: TipoLivroVersaoSituacaoEnum.PUBLICADA, numero: "1.1.0", nota: " Primeira " },
      admin,
    );
    const dto = criarVersao.mock.calls[0][0] as unknown as {
      conteudo: {
        pecas: { filhos: { dados: { trechos: { ancora: string }[] } }[] }[];
        ancorasAntigas: unknown;
      };
      usuarioId: number;
      nota: string;
    };
    expect(dto.conteudo.pecas).toHaveLength(1);
    expect(dto.conteudo.pecas[0].filhos[0].dados.trechos[0].ancora).toBe("agentes");
    expect(dto.conteudo.ancorasAntigas).toEqual({ "agentes-antigos": "agentes" });
    expect(dto.usuarioId).toBe(7);
    expect(dto.nota).toBe("Primeira");
    expect(resultado.pendencias).toEqual([]);
  });

  it("versão com pendência é recusada com a lista; rascunho com a mesma pendência passa", async () => {
    const vazia = peca(3, {
      pecaPaiId: 1,
      tipo: TipoRegraPecaEnum.SECAO,
      dados: { titulo: " ", nivel: 2, glifo: null },
      ancora: "vazia",
    });
    const { servico, criarVersao } = criar({ arvore: [secao, vazia] });

    await expect(
      servico.publicar({ codigo: "sistema", situacao: TipoLivroVersaoSituacaoEnum.PUBLICADA, numero: "1.1.0" }, admin),
    ).rejects.toThrow(BusinessException);
    expect(criarVersao).not.toHaveBeenCalled();

    const rascunho = await servico.publicar(
      { codigo: "sistema", situacao: TipoLivroVersaoSituacaoEnum.RASCUNHO, numero: "1.1.0" },
      admin,
    );
    expect(rascunho.pendencias.length).toBeGreaterThan(0);
    expect(criarVersao).toHaveBeenCalledOnce();
  });

  it("pendência estrutural recusa até o rascunho", async () => {
    const quebrada = peca(3, { pecaPaiId: 1, tipo: TipoRegraPecaEnum.SECAO, dados: { titulo: "x" } as never });
    const { servico, criarVersao } = criar({ arvore: [secao, quebrada] });
    await expect(
      servico.publicar({ codigo: "sistema", situacao: TipoLivroVersaoSituacaoEnum.RASCUNHO, numero: "1.1.0" }, admin),
    ).rejects.toThrow(BusinessException);
    expect(criarVersao).not.toHaveBeenCalled();
  });

  it("não acusa duas vezes o mesmo link, mas lista o segundo link quebrado da mesma peça", async () => {
    const doisLinks = peca(2, {
      pecaPaiId: 1,
      dados: {
        trechos: [
          { tipo: "link-interno", texto: "Sumiu", ancora: "x", identificador: uuid(99) },
          { tipo: "link-interno", texto: "Sem âncora", ancora: "y", identificador: uuid(3) },
        ],
      },
    });
    const semAncora = peca(3, { pecaPaiId: 1, tipo: TipoRegraPecaEnum.SECAO, dados: { titulo: "S", nivel: 2, glifo: null } });
    const { servico } = criar({ arvore: [secao, doisLinks, semAncora] });
    const resultado = await servico.publicar(
      { codigo: "sistema", situacao: TipoLivroVersaoSituacaoEnum.RASCUNHO, numero: "1.0.0" },
      admin,
    );
    expect(resultado.pendencias.map((pendencia) => pendencia.mensagem.match(/"(.*?)"/)?.[1]).sort()).toEqual([
      "Sem âncora",
      "Sumiu",
    ]);
  });

  it("número ou nota com tipo errado dá 400, não 500", async () => {
    const { servico } = criar({ arvore: [secao] });
    await expect(
      servico.publicar({ codigo: "sistema", situacao: TipoLivroVersaoSituacaoEnum.RASCUNHO, numero: 415 as never }, admin),
    ).rejects.toThrow(BusinessException);
    await expect(
      servico.publicar(
        { codigo: "sistema", situacao: TipoLivroVersaoSituacaoEnum.RASCUNHO, numero: "1", nota: 7 as never },
        admin,
      ),
    ).rejects.toThrow(BusinessException);
  });

  it("recusa livro vazio e número em branco", async () => {
    const { servico } = criar({ arvore: [] });
    await expect(
      servico.publicar({ codigo: "sistema", situacao: TipoLivroVersaoSituacaoEnum.RASCUNHO, numero: "1.0.0" }, admin),
    ).rejects.toMatchObject({ response: { mensagem: expect.stringContaining("nenhuma peça") as string } });
    await expect(
      servico.publicar({ codigo: "sistema", situacao: TipoLivroVersaoSituacaoEnum.RASCUNHO, numero: "  " }, admin),
    ).rejects.toThrow(BusinessException);
  });

  it("publicar de novo cria outra fotografia (não altera a anterior)", async () => {
    const { servico, criarVersao } = criar({ arvore: [secao] });
    const dto = { codigo: "sistema", situacao: TipoLivroVersaoSituacaoEnum.PUBLICADA, numero: "1.0.0" };
    await servico.publicar(dto, admin);
    await servico.publicar({ ...dto, numero: "1.0.1" }, admin);
    expect(criarVersao).toHaveBeenCalledTimes(2);
  });
});
