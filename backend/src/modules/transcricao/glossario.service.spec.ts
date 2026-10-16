import { beforeEach, describe, expect, it, vi } from "vitest";
import { TipoCampanhaMembroPapelEnum, TipoUsuarioEnum } from "@contratados-rpg/shared/enums";
import {
    BusinessException, ResourceConflictException, ResourceNotFoundException,
    UnauthorizedAccessException,
} from "../../core/exceptions";
import type { CampanhaRepository } from "../campanha/campanha.repository";
import type { CampanhaService } from "../campanha/campanha.service";
import type { GlossarioRepository } from "./glossario.repository";
import { GlossarioService } from "./glossario.service";

const usuario = { sub: 7, login: "mestre", tipo: TipoUsuarioEnum.NORMAL, tokenVersao: 1 };
const termo = (id: number, texto: string, campanhaId = 9) => ({ id, campanhaId, termo: texto,
    createdDate: "2026-10-15T00:00:00.000Z", updatedDate: "2026-10-15T00:00:00.000Z" });

describe("GlossarioService — glossário privado por campanha", () => {
    const repositorio = {
        criarTermo: vi.fn(), listarTermos: vi.fn(), recuperarTermo: vi.fn(),
        alterarTermo: vi.fn(), excluirTermo: vi.fn(),
    };
    const campanha = { validarMembro: vi.fn(), ehMestre: (papel: string) => papel === "MESTRE" };
    const campanhaRepositorio = { recuperarPorId: vi.fn() };
    let service: GlossarioService;
    beforeEach(() => {
        vi.clearAllMocks();
        campanha.validarMembro.mockResolvedValue({ papel: TipoCampanhaMembroPapelEnum.MESTRE });
        campanhaRepositorio.recuperarPorId.mockResolvedValue({ id: 9 });
        repositorio.listarTermos.mockResolvedValue([]);
        repositorio.criarTermo.mockImplementation((dto: { campanhaId: number; termo: string }) =>
            Promise.resolve(termo(1, dto.termo, dto.campanhaId)));
        repositorio.alterarTermo.mockImplementation((dto: { id: number; termo: string }) =>
            Promise.resolve(termo(dto.id, dto.termo)));
        repositorio.recuperarTermo.mockResolvedValue(termo(5, "Zé"));
        service = new GlossarioService(repositorio as unknown as GlossarioRepository,
            campanha as unknown as CampanhaService, campanhaRepositorio as unknown as CampanhaRepository);
    });

    describe("criar", () => {
        it("normaliza o termo, calcula a chave e confere o Mestre atual da campanha", async () => {
            const criado = await service.criarTermo({ campanhaId: 9, termo: "  José   Silva " }, usuario);
            expect(criado.termo).toBe("José Silva");
            expect(criado.parecidoCom).toBeNull();
            expect(repositorio.criarTermo).toHaveBeenCalledWith({ campanhaId: 9, termo: "José Silva",
                chaveTermo: "josé silva" });
            expect(campanha.validarMembro).toHaveBeenCalledWith({ campanhaId: 9, usuarioId: 7 });
        });
        it("caixa diferente é duplicata: 409 apontando o termo existente, sem gravar", async () => {
            repositorio.listarTermos.mockResolvedValue([termo(2, "Zé")]);
            const erro: unknown = await service.criarTermo({ campanhaId: 9, termo: "zé" }, usuario)
                .catch((falha: unknown) => falha);
            expect(erro).toBeInstanceOf(ResourceConflictException);
            expect(JSON.stringify((erro as ResourceConflictException).getResponse())).toContain("Zé");
            expect(repositorio.criarTermo).not.toHaveBeenCalled();
        });
        it("acento diferente é termo novo, com dica de parecido", async () => {
            repositorio.listarTermos.mockResolvedValue([termo(2, "Zé")]);
            const criado = await service.criarTermo({ campanhaId: 9, termo: "Ze" }, usuario);
            expect(criado.parecidoCom).toBe("Zé");
            expect(repositorio.criarTermo).toHaveBeenCalledOnce();
        });
        it("corrida: violação de unicidade do banco vira 409", async () => {
            repositorio.criarTermo.mockRejectedValue(Object.assign(new Error("duplicate"), { code: "23505" }));
            await expect(service.criarTermo({ campanhaId: 9, termo: "Novo" }, usuario))
                .rejects.toBeInstanceOf(ResourceConflictException);
        });
        it("outro erro do banco não é mascarado", async () => {
            repositorio.criarTermo.mockRejectedValue(new Error("queda"));
            await expect(service.criarTermo({ campanhaId: 9, termo: "Novo" }, usuario)).rejects.toThrow("queda");
        });
        it.each(["", "   ", "a".repeat(81), "linha\noutra", "zero​width", 42, null])(
            "recusa termo inválido %j antes de qualquer acesso", async (invalido) => {
                await expect(service.criarTermo({ campanhaId: 9, termo: invalido as string }, usuario))
                    .rejects.toBeInstanceOf(BusinessException);
                expect(campanha.validarMembro).not.toHaveBeenCalled();
                expect(repositorio.criarTermo).not.toHaveBeenCalled();
            });
        it("recusa campo extra e id inválido", async () => {
            await expect(service.criarTermo({ campanhaId: 9, termo: "A", extra: 1 } as never, usuario))
                .rejects.toBeInstanceOf(BusinessException);
            await expect(service.criarTermo({ campanhaId: 0, termo: "A" }, usuario))
                .rejects.toBeInstanceOf(BusinessException);
        });
    });

    describe("listar", () => {
        it("devolve os termos da campanha para o Mestre", async () => {
            repositorio.listarTermos.mockResolvedValue([termo(2, "Zé"), termo(3, "Aragorn")]);
            expect(await service.listarTermos({ campanhaId: 9 }, usuario)).toHaveLength(2);
            expect(repositorio.listarTermos).toHaveBeenCalledWith({ campanhaId: 9 });
        });
    });

    describe("alterar", () => {
        it("autoriza pela campanha do TERMO, não por dado do cliente", async () => {
            await service.alterarTermo({ id: 5, termo: "Zeca" }, usuario);
            expect(campanha.validarMembro).toHaveBeenCalledWith({ campanhaId: 9, usuarioId: 7 });
            expect(repositorio.alterarTermo).toHaveBeenCalledWith({ id: 5, termo: "Zeca", chaveTermo: "zeca" });
        });
        it("renomear só a caixa do próprio termo não é duplicata", async () => {
            repositorio.listarTermos.mockResolvedValue([termo(5, "Zé")]);
            await expect(service.alterarTermo({ id: 5, termo: "ZÉ" }, usuario)).resolves.toMatchObject({ termo: "ZÉ" });
        });
        it("alterar para o texto de OUTRO termo é 409", async () => {
            repositorio.listarTermos.mockResolvedValue([termo(5, "Zé"), termo(6, "Aragorn")]);
            await expect(service.alterarTermo({ id: 5, termo: "aragorn" }, usuario))
                .rejects.toBeInstanceOf(ResourceConflictException);
            expect(repositorio.alterarTermo).not.toHaveBeenCalled();
        });
        it("termo inexistente é 404", async () => {
            repositorio.recuperarTermo.mockResolvedValue(null);
            await expect(service.alterarTermo({ id: 5, termo: "X" }, usuario))
                .rejects.toBeInstanceOf(ResourceNotFoundException);
        });
    });

    describe("excluir", () => {
        it("exclui após conferir o Mestre da campanha do termo", async () => {
            await service.excluirTermo({ id: 5 }, usuario);
            expect(repositorio.excluirTermo).toHaveBeenCalledWith({ id: 5 });
        });
        it("termo inexistente é 404 e nada é excluído", async () => {
            repositorio.recuperarTermo.mockResolvedValue(null);
            await expect(service.excluirTermo({ id: 5 }, usuario)).rejects.toBeInstanceOf(ResourceNotFoundException);
            expect(repositorio.excluirTermo).not.toHaveBeenCalled();
        });
    });

    describe("matriz de acesso (mesma resposta de recurso ausente)", () => {
        const operacoes: [string, () => Promise<unknown>][] = [
            ["criar", () => service.criarTermo({ campanhaId: 9, termo: "A" }, usuario)],
            ["listar", () => service.listarTermos({ campanhaId: 9 }, usuario)],
            ["alterar", () => service.alterarTermo({ id: 5, termo: "A" }, usuario)],
            ["excluir", () => service.excluirTermo({ id: 5 }, usuario)],
        ];
        it.each(["JOGADOR", "ESPECTADOR"])("nega %s em todas as operações, sem tocar no banco de escrita", async (papel) => {
            campanha.validarMembro.mockResolvedValue({ papel });
            for (const [, operacao] of operacoes) await expect(operacao()).rejects.toBeInstanceOf(ResourceNotFoundException);
            expect(repositorio.criarTermo).not.toHaveBeenCalled();
            expect(repositorio.alterarTermo).not.toHaveBeenCalled();
            expect(repositorio.excluirTermo).not.toHaveBeenCalled();
        });
        it("não-membro ou ex-Mestre (validarMembro recusa) recebe 404", async () => {
            campanha.validarMembro.mockRejectedValue(new UnauthorizedAccessException("Sem acesso"));
            for (const [, operacao] of operacoes) await expect(operacao()).rejects.toBeInstanceOf(ResourceNotFoundException);
        });
        it("ADMIN e TESTER sem MESTRE não recebem bypass", async () => {
            campanha.validarMembro.mockResolvedValue({ papel: "JOGADOR" });
            for (const tipo of [TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.TESTER]) {
                await expect(service.listarTermos({ campanhaId: 9 }, { ...usuario, tipo }))
                    .rejects.toBeInstanceOf(ResourceNotFoundException);
            }
        });
        it("campanha excluída nega mesmo para o Mestre", async () => {
            campanhaRepositorio.recuperarPorId.mockResolvedValue(null);
            for (const [, operacao] of operacoes) await expect(operacao()).rejects.toBeInstanceOf(ResourceNotFoundException);
        });
    });
});
