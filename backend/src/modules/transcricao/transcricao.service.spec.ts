import type { SessaoTranscricaoInternoCriarDto } from "@contratados-rpg/shared/dtos/transcricao";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TipoCampanhaMembroPapelEnum, TipoUsuarioEnum } from "@contratados-rpg/shared/enums";
import { ResourceNotFoundException, UnauthorizedAccessException } from "../../core/exceptions";
import type { CampanhaService } from "../campanha/campanha.service";
import type { CampanhaRepository } from "../campanha/campanha.repository";
import type { TransacaoService } from "../../database/transacao.service";
import type { TranscricaoRepository } from "./transcricao.repository";
import { TranscricaoService } from "./transcricao.service";

const usuario = { sub: 7, login: "mestre", tipo: TipoUsuarioEnum.NORMAL, tokenVersao: 1 };
const sessao = { id: 1, identificador: "uuid", campanhaId: 9, titulo: "Sessão",
    arquivada: false, createdDate: "2026-10-14", updatedDate: "2026-10-14" };

describe("TranscricaoService — isolamento e metadados", () => {
    const repositorio = {
        recuperarSessao: vi.fn(), criarSessao: vi.fn(), listarSessoes: vi.fn(),
        alterarSessao: vi.fn(), alterarArquivamento: vi.fn(), excluirSessao: vi.fn(),
        criarFaixa: vi.fn(), listarFaixas: vi.fn(), recuperarFaixa: vi.fn(),
    };
    const campanha = { validarMembro: vi.fn(), ehMestre: (papel: string) => papel === "MESTRE" };
    const campanhaRepositorio = { recuperarPorId: vi.fn() };
    const transacao = { executar: vi.fn(async (corpo: () => Promise<unknown>) => corpo()) };
    let service: TranscricaoService;
    beforeEach(() => {
        vi.clearAllMocks();
        repositorio.recuperarSessao.mockResolvedValue(sessao);
        repositorio.criarSessao.mockImplementation((dto: SessaoTranscricaoInternoCriarDto) => Promise.resolve({ ...sessao, ...dto }));
        repositorio.alterarSessao.mockResolvedValue(sessao);
        repositorio.alterarArquivamento.mockResolvedValue({ ...sessao, arquivada: true });
        repositorio.listarSessoes.mockResolvedValue([sessao]);
        repositorio.listarFaixas.mockResolvedValue([]);
        campanha.validarMembro.mockResolvedValue({ papel: TipoCampanhaMembroPapelEnum.MESTRE });
        campanhaRepositorio.recuperarPorId.mockResolvedValue({ id: 9 });
        service = new TranscricaoService(repositorio as unknown as TranscricaoRepository,
            campanha as unknown as CampanhaService,
            campanhaRepositorio as unknown as CampanhaRepository,
            transacao as unknown as TransacaoService);
    });
    it("cria sessão com identidade do servidor e título normalizado", async () => {
        const criada = await service.criarSessao({ campanhaId: 9, titulo: " Sessão " }, usuario);
        expect(criada.identificador).toMatch(/^[a-f0-9-]{36}$/);
        expect(criada.titulo).toBe("Sessão");
        expect(campanha.validarMembro).toHaveBeenCalledWith({ campanhaId: 9, usuarioId: 7 });
    });
    it.each(["JOGADOR", "ESPECTADOR"])("nega %s com mesmo erro de recurso ausente", async (papel) => {
        campanha.validarMembro.mockResolvedValue({ papel });
        await expect(service.recuperarSessao({ id: 1 }, usuario))
            .rejects.toBeInstanceOf(ResourceNotFoundException);
        await expect(service.excluirSessao({ id: 1 }, usuario))
            .rejects.toBeInstanceOf(ResourceNotFoundException);
        expect(repositorio.excluirSessao).not.toHaveBeenCalled();
    });
    it("ADMIN e TESTER sem MESTRE não recebem bypass", async () => {
        campanha.validarMembro.mockResolvedValue({ papel: "JOGADOR" });
        for (const tipo of [TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.TESTER]) {
            await expect(service.criarSessao({ campanhaId: 9, titulo: "S" }, { ...usuario, tipo }))
                .rejects.toBeInstanceOf(ResourceNotFoundException);
        }
        expect(repositorio.criarSessao).not.toHaveBeenCalled();
    });
    it("nega não membro, Mestre alheio e campanha excluída", async () => {
        campanha.validarMembro.mockRejectedValue(new UnauthorizedAccessException());
        await expect(service.recuperarSessao({ id: 1 }, usuario))
            .rejects.toBeInstanceOf(ResourceNotFoundException);
        campanha.validarMembro.mockResolvedValue({ papel: "MESTRE" });
        campanhaRepositorio.recuperarPorId.mockResolvedValue(null);
        await expect(service.criarSessao({ campanhaId: 9, titulo: "S" }, usuario))
            .rejects.toBeInstanceOf(ResourceNotFoundException);
    });
    it("revalida papel depois de transferência em vez de confiar no JWT", async () => {
        await expect(service.recuperarSessao({ id: 1 }, usuario)).resolves.toMatchObject({ id: 1 });
        campanha.validarMembro.mockResolvedValue({ papel: "JOGADOR" });
        await expect(service.recuperarSessao({ id: 1 }, usuario))
            .rejects.toBeInstanceOf(ResourceNotFoundException);
    });
    it("arquivamento reversível é booleano explícito e não exclui dados", async () => {
        await expect(service.alterarArquivamento({ id: 1, arquivada: true }, usuario))
            .resolves.toMatchObject({ arquivada: true });
        expect(repositorio.excluirSessao).not.toHaveBeenCalled();
        await expect(service.alterarArquivamento({ id: 1, arquivada: "false" } as never, usuario))
            .rejects.toMatchObject({ status: 400 });
    });
    it.each([null, {}, { campanhaId: 9, titulo: "" }, { campanhaId: "9", titulo: "S" },
        { campanhaId: 9, titulo: "S", textoCorrigido: "injetado" },
        { campanhaId: 9, titulo: 10 }, { campanhaId: 0, titulo: "S" }, { campanhaId: 2147483648, titulo: "S" },
    ])("recusa corpo não confiável sem erro 500: %j", async (dto) => {
        await expect(service.criarSessao(dto as never, usuario)).rejects.toMatchObject({ status: 400 });
        expect(repositorio.criarSessao).not.toHaveBeenCalled();
    });
    it("listagem valida filtro e distingue arquivadas de sessões normais", async () => {
        await service.listarSessoes({ campanhaId: 9, arquivadas: true }, usuario);
        expect(repositorio.listarSessoes).toHaveBeenCalledWith({ campanhaId: 9, arquivadas: true });
        await expect(service.listarSessoes({ campanhaId: 9, arquivadas: "false" } as never, usuario))
            .rejects.toMatchObject({ status: 400 });
    });
    it("sessão excluída recusa leitura e criação de faixa", async () => {
        repositorio.recuperarSessao.mockResolvedValue(null);
        await expect(service.criarFaixa({ sessaoId: 1, nomeArquivo: "a.wav", participante: "Ana",
            deslocamentoMilissegundos: 0 }, usuario)).rejects.toMatchObject({ status: 404 });
        expect(repositorio.criarFaixa).not.toHaveBeenCalled();
    });
    it("não recebe path local, WAV binário ou offset inválido como metadados", async () => {
        for (const dto of [
            { nomeArquivo: "C:\\privado\\a.wav", deslocamentoMilissegundos: 0 },
            { nomeArquivo: "a.wav", deslocamentoMilissegundos: NaN },
            { nomeArquivo: "a.wav", deslocamentoMilissegundos: 0, wav: "bytes" },
        ]) {
            await expect(service.criarFaixa({ sessaoId: 1, participante: "Ana", ...dto },
                usuario)).rejects.toMatchObject({ status: 400 });
        }
        expect(repositorio.criarFaixa).not.toHaveBeenCalled();
    });
    it("exclusão usa a unidade transacional e propaga falha sem sucesso falso", async () => {
        repositorio.excluirSessao.mockRejectedValue(new Error("banco indisponível"));
        await expect(service.excluirSessao({ id: 1 }, usuario)).rejects.toThrow("banco indisponível");
        expect(transacao.executar).toHaveBeenCalledOnce();
    });
});
