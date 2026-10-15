import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { UnauthorizedException } from "@nestjs/common";
import { TipoUsuarioEnum } from "@contratados-rpg/shared/enums";
import { DispositivoService } from "./dispositivo.service";
import type { DispositivoRepository } from "./dispositivo.repository";
import type { CampanhaRepository } from "../campanha/campanha.repository";
import type { TranscricaoService } from "./transcricao.service";
import type { TransacaoService } from "../../database/transacao.service";
const id = "e809de1e-005c-4943-9c68-5ce3b445065e";
const segredo = "a".repeat(43);
const usuario = { sub: 7, tokenVersao: 1, login: "m", tipo: TipoUsuarioEnum.NORMAL };
describe("DispositivoService — credencial limitada", () => {
    const repo = { iniciar: vi.fn(), consultarPedido: vi.fn(), confirmar: vi.fn(),
        autenticar: vi.fn(), consultarEstado: vi.fn(), listar: vi.fn(), revogar: vi.fn(),
        criarIntencao: vi.fn(), consumirIntencao: vi.fn(), consultarIntencao: vi.fn() };
    const campanha = { contarCampanhasComoMestre: vi.fn() };
    const transcricao = { recuperarSessao: vi.fn() };
    const tx = { executar: async <T>(fn: () => Promise<T>) => fn() };
    let service: DispositivoService;
    beforeEach(() => {
        vi.resetAllMocks();
        campanha.contarCampanhasComoMestre.mockResolvedValue(1);
        repo.autenticar.mockResolvedValue({ ...usuario, dispositivoId: 3, dispositivoIdentificador: id });
        repo.consultarPedido.mockResolvedValue({ identificador: id, nome: "PC", codigo: "AB123456", expiraEm: "x" });
        repo.confirmar.mockResolvedValue({ identificador: id, nome: "PC", ultimoUso: "x" });
        transcricao.recuperarSessao.mockResolvedValue({ id: 1, campanhaId: 2, titulo: "S" });
        repo.consumirIntencao.mockResolvedValue({ sessaoId: 1 });
        service = new DispositivoService(repo as unknown as DispositivoRepository,
            campanha as unknown as CampanhaRepository, transcricao as unknown as TranscricaoService,
            tx as unknown as TransacaoService);
    });
    it("autentica hash, nunca passa segredo ao repositório", async () => {
        await service.autenticar(segredo);
        expect(repo.autenticar).toHaveBeenCalledWith({ segredoHash: createHash("sha256").update(segredo).digest("hex") });
    });
    it.each(["", "jwt.token", "a".repeat(42), "a".repeat(44)])("nega formato %s antes do banco", async (s) => {
        await expect(service.autenticar(s)).rejects.toBeInstanceOf(UnauthorizedException);
        expect(repo.autenticar).not.toHaveBeenCalled();
    });
    it("nega expirado/revogado/conta excluída/tokenVersao antigo", async () => {
        repo.autenticar.mockResolvedValue(null);
        await expect(service.autenticar(segredo)).rejects.toBeInstanceOf(UnauthorizedException);
    });
    it("ADMIN sem campanha como Mestre não confirma", async () => {
        campanha.contarCampanhasComoMestre.mockResolvedValue(0);
        await expect(service.confirmar({ identificador: id, codigo: "AB123456" }, { ...usuario, tipo: TipoUsuarioEnum.ADMIN })).rejects.toThrow();
        expect(repo.confirmar).not.toHaveBeenCalled();
    });
    it("código diferente não confirma nem transfere conta", async () => {
        await expect(service.confirmar({ identificador: id, codigo: "ERRADO00" }, usuario)).rejects.toThrow();
        expect(repo.confirmar).not.toHaveBeenCalled();
    });
    it("confirma com identidade e versão do JWT", async () => {
        await service.confirmar({ identificador: id, codigo: "AB123456" }, usuario);
        expect(repo.confirmar).toHaveBeenCalledWith({ identificador: id, codigo: "AB123456", usuarioId: 7, tokenVersao: 1 });
    });
    it("replay/expiração/conta errada não devolve contexto", async () => {
        repo.consumirIntencao.mockResolvedValue(null);
        await expect(service.resolverIntencao(id, { ...usuario, dispositivoId: 3, dispositivoIdentificador: id })).rejects.toThrow();
        expect(transcricao.recuperarSessao).not.toHaveBeenCalled();
    });
    it("revalida Mestre atual antes do commit; falha propaga para rollback", async () => {
        transcricao.recuperarSessao.mockRejectedValue(new Error("papel transferido"));
        await expect(service.resolverIntencao(id, { ...usuario, dispositivoId: 3, dispositivoIdentificador: id })).rejects.toThrow("papel transferido");
    });
    it("consulta intenção sempre com proprietário", async () => {
        repo.consultarIntencao.mockResolvedValue({ confirmada: false, expirada: true });
        await service.consultarIntencao(id, usuario);
        expect(repo.consultarIntencao).toHaveBeenCalledWith({ identificador: id, usuarioId: 7 });
    });
    it("entrada malformada não chega ao banco", async () => {
        await expect(service.iniciar({ segredoHash: "z".repeat(64), nome: "PC" })).rejects.toThrow();
        await expect(service.iniciar({ segredoHash: "a".repeat(64), nome: "PC", segredo } as never)).rejects.toThrow();
        await expect(service.consultarPedido("../etc", usuario)).rejects.toThrow();
        expect(repo.iniciar).not.toHaveBeenCalled();
    });
});
