import { beforeEach, describe, expect, it, vi } from "vitest";
import { TipoCampanhaMembroPapelEnum, TipoUsuarioEnum } from "@contratados-rpg/shared/enums";
import {
    BusinessException, ResourceConflictException, ResourceNotFoundException,
    UnauthorizedAccessException,
} from "../../core/exceptions";
import type { CampanhaRepository } from "../campanha/campanha.repository";
import type { CampanhaService } from "../campanha/campanha.service";
import type { IdentidadeRepository } from "./identidade.repository";
import { IdentidadeService } from "./identidade.service";

const usuario = { sub: 7, login: "mestre", tipo: TipoUsuarioEnum.NORMAL, tokenVersao: 1 };
const identidade = (id: number, nomeOrigem: string, participante: string, campanhaId = 9) => ({ id, campanhaId,
    nomeOrigem, participante, createdDate: "2026-10-15T00:00:00.000Z", updatedDate: "2026-10-15T00:00:00.000Z" });

describe("IdentidadeService — associações de identidade por campanha", () => {
    const repositorio = {
        criarIdentidade: vi.fn(), listarIdentidades: vi.fn(), recuperarIdentidade: vi.fn(),
        alterarIdentidade: vi.fn(), excluirIdentidade: vi.fn(), listarParticipantes: vi.fn(),
    };
    const campanha = { validarMembro: vi.fn(), ehMestre: (papel: string) => papel === "MESTRE" };
    const campanhaRepositorio = { recuperarPorId: vi.fn() };
    let service: IdentidadeService;
    beforeEach(() => {
        vi.clearAllMocks();
        campanha.validarMembro.mockResolvedValue({ papel: TipoCampanhaMembroPapelEnum.MESTRE });
        campanhaRepositorio.recuperarPorId.mockResolvedValue({ id: 9 });
        repositorio.listarIdentidades.mockResolvedValue([]);
        repositorio.listarParticipantes.mockResolvedValue([]);
        repositorio.criarIdentidade.mockImplementation((dto: { campanhaId: number; nomeOrigem: string; participante: string }) =>
            Promise.resolve(identidade(1, dto.nomeOrigem, dto.participante, dto.campanhaId)));
        repositorio.alterarIdentidade.mockImplementation((dto: { id: number; participante: string }) =>
            Promise.resolve(identidade(dto.id, "joao", dto.participante)));
        repositorio.recuperarIdentidade.mockResolvedValue(identidade(5, "joao", "João"));
        service = new IdentidadeService(repositorio as unknown as IdentidadeRepository,
            campanha as unknown as CampanhaService, campanhaRepositorio as unknown as CampanhaRepository);
    });

    describe("criar", () => {
        it("normaliza, calcula a chave de origem e confere o Mestre atual", async () => {
            const criada = await service.criarIdentidade({ campanhaId: 9, nomeOrigem: " 1-joao ", participante: "  João   Silva " }, usuario);
            expect(criada).toMatchObject({ nomeOrigem: "1-joao", participante: "João Silva", parecidoCom: null });
            expect(repositorio.criarIdentidade).toHaveBeenCalledWith({ campanhaId: 9, nomeOrigem: "1-joao",
                chaveOrigem: "1-joao", participante: "João Silva" });
            expect(campanha.validarMembro).toHaveBeenCalledWith({ campanhaId: 9, usuarioId: 7 });
        });
        it("nome de origem repetido (caixa diferente) é 409 e não grava", async () => {
            repositorio.listarIdentidades.mockResolvedValue([identidade(2, "Joao", "João")]);
            await expect(service.criarIdentidade({ campanhaId: 9, nomeOrigem: "JOAO", participante: "João" }, usuario))
                .rejects.toBeInstanceOf(ResourceConflictException);
            expect(repositorio.criarIdentidade).not.toHaveBeenCalled();
        });
        it("a mesma pessoa pode ter várias origens", async () => {
            repositorio.listarIdentidades.mockResolvedValue([identidade(2, "joao", "João")]);
            repositorio.listarParticipantes.mockResolvedValue(["João"]);
            await expect(service.criarIdentidade({ campanhaId: 9, nomeOrigem: "joao_2", participante: "João" }, usuario))
                .resolves.toMatchObject({ participante: "João", parecidoCom: null });
        });
        it("participante parecido (só acento) exige confirmação explícita e não funde sozinho", async () => {
            repositorio.listarParticipantes.mockResolvedValue(["João"]);
            await expect(service.criarIdentidade({ campanhaId: 9, nomeOrigem: "joao_x", participante: "Joao" }, usuario))
                .rejects.toBeInstanceOf(ResourceConflictException);
            expect(repositorio.criarIdentidade).not.toHaveBeenCalled();
            const criada = await service.criarIdentidade(
                { campanhaId: 9, nomeOrigem: "joao_x", participante: "Joao", confirmarParecido: true }, usuario);
            expect(criada).toMatchObject({ participante: "Joao", parecidoCom: "João" });
        });
        it("corrida: violação de unicidade do banco vira 409; outro erro não é mascarado", async () => {
            repositorio.criarIdentidade.mockRejectedValueOnce(Object.assign(new Error("duplicate"), { code: "23505" }));
            await expect(service.criarIdentidade({ campanhaId: 9, nomeOrigem: "a", participante: "A" }, usuario))
                .rejects.toBeInstanceOf(ResourceConflictException);
            repositorio.criarIdentidade.mockRejectedValueOnce(new Error("queda"));
            await expect(service.criarIdentidade({ campanhaId: 9, nomeOrigem: "a", participante: "A" }, usuario))
                .rejects.toThrow("queda");
        });
        it.each([
            [{ campanhaId: 9, nomeOrigem: "", participante: "A" }],
            [{ campanhaId: 9, nomeOrigem: "a", participante: "   " }],
            [{ campanhaId: 9, nomeOrigem: "a".repeat(256), participante: "A" }],
            [{ campanhaId: 9, nomeOrigem: "a\nb", participante: "A" }],
            [{ campanhaId: 9, nomeOrigem: "a", participante: "x​y" }],
            [{ campanhaId: 9, nomeOrigem: "a", participante: "A", confirmarParecido: "sim" }],
            [{ campanhaId: 9, nomeOrigem: "a", participante: "A", extra: 1 }],
            [{ campanhaId: 0, nomeOrigem: "a", participante: "A" }],
        ])("recusa entrada inválida %j antes de qualquer acesso", async (dto) => {
            await expect(service.criarIdentidade(dto as never, usuario)).rejects.toBeInstanceOf(BusinessException);
            expect(campanha.validarMembro).not.toHaveBeenCalled();
            expect(repositorio.criarIdentidade).not.toHaveBeenCalled();
        });
    });

    describe("alterar e excluir", () => {
        it("autoriza pela campanha da IDENTIDADE guardada, não por dado do cliente", async () => {
            await service.alterarIdentidade({ id: 5, participante: "João Pedro" }, usuario);
            expect(campanha.validarMembro).toHaveBeenCalledWith({ campanhaId: 9, usuarioId: 7 });
            expect(repositorio.alterarIdentidade).toHaveBeenCalledWith({ id: 5, participante: "João Pedro" });
        });
        it("alterar para um participante parecido exige confirmação", async () => {
            repositorio.listarParticipantes.mockResolvedValue(["João", "Maria"]);
            await expect(service.alterarIdentidade({ id: 5, participante: "joao" }, usuario))
                .rejects.toBeInstanceOf(ResourceConflictException);
            await expect(service.alterarIdentidade({ id: 5, participante: "joao", confirmarParecido: true }, usuario))
                .resolves.toMatchObject({ parecidoCom: "João" });
        });
        it("inexistente é 404 nas duas operações", async () => {
            repositorio.recuperarIdentidade.mockResolvedValue(null);
            await expect(service.alterarIdentidade({ id: 5, participante: "X" }, usuario))
                .rejects.toBeInstanceOf(ResourceNotFoundException);
            await expect(service.excluirIdentidade({ id: 5 }, usuario)).rejects.toBeInstanceOf(ResourceNotFoundException);
            expect(repositorio.excluirIdentidade).not.toHaveBeenCalled();
        });
        it("exclui após conferir o Mestre", async () => {
            await service.excluirIdentidade({ id: 5 }, usuario);
            expect(repositorio.excluirIdentidade).toHaveBeenCalledWith({ id: 5 });
        });
    });

    describe("matriz de acesso (resposta de recurso ausente)", () => {
        const operacoes: [string, () => Promise<unknown>][] = [
            ["criar", () => service.criarIdentidade({ campanhaId: 9, nomeOrigem: "a", participante: "A" }, usuario)],
            ["listar", () => service.listarIdentidades({ campanhaId: 9 }, usuario)],
            ["alterar", () => service.alterarIdentidade({ id: 5, participante: "A" }, usuario)],
            ["excluir", () => service.excluirIdentidade({ id: 5 }, usuario)],
        ];
        it.each(["JOGADOR", "ESPECTADOR"])("nega %s em todas as operações", async (papel) => {
            campanha.validarMembro.mockResolvedValue({ papel });
            for (const [, operacao] of operacoes) await expect(operacao()).rejects.toBeInstanceOf(ResourceNotFoundException);
            expect(repositorio.criarIdentidade).not.toHaveBeenCalled();
            expect(repositorio.alterarIdentidade).not.toHaveBeenCalled();
            expect(repositorio.excluirIdentidade).not.toHaveBeenCalled();
        });
        it("não-membro / ex-Mestre recebe 404", async () => {
            campanha.validarMembro.mockRejectedValue(new UnauthorizedAccessException("Sem acesso"));
            for (const [, operacao] of operacoes) await expect(operacao()).rejects.toBeInstanceOf(ResourceNotFoundException);
        });
        it("ADMIN e TESTER sem MESTRE não têm bypass", async () => {
            campanha.validarMembro.mockResolvedValue({ papel: "JOGADOR" });
            for (const tipo of [TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.TESTER]) {
                await expect(service.listarIdentidades({ campanhaId: 9 }, { ...usuario, tipo }))
                    .rejects.toBeInstanceOf(ResourceNotFoundException);
            }
        });
        it("campanha excluída nega até o Mestre", async () => {
            campanhaRepositorio.recuperarPorId.mockResolvedValue(null);
            for (const [, operacao] of operacoes) await expect(operacao()).rejects.toBeInstanceOf(ResourceNotFoundException);
        });
    });
});
