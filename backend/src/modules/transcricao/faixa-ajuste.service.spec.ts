import { beforeEach, describe, expect, it, vi } from "vitest";
import { TipoCampanhaMembroPapelEnum, TipoUsuarioEnum } from "@contratados-rpg/shared/enums";
import {
    BusinessException, ResourceConflictException, ResourceNotFoundException,
    UnauthorizedAccessException,
} from "../../core/exceptions";
import type { CampanhaRepository } from "../campanha/campanha.repository";
import type { CampanhaService } from "../campanha/campanha.service";
import { FaixaAjusteService } from "./faixa-ajuste.service";
import type { IdentidadeRepository } from "./identidade.repository";
import type { TranscricaoRepository } from "./transcricao.repository";

const usuario = { sub: 7, login: "mestre", tipo: TipoUsuarioEnum.NORMAL, tokenVersao: 1 };
const faixa = { id: 3, identificador: "uuid", sessaoId: 11, nomeArquivo: "1-joao.wav", participante: "Joao",
    identidadeConfirmada: false, silencioInicialMilissegundos: null, deslocamentoMilissegundos: 0,
    execucaoSelecionadaId: null, createdDate: "d", updatedDate: "d" };
const sessao = { id: 11, identificador: "uuid", campanhaId: 9, titulo: "S", arquivada: false, createdDate: "d", updatedDate: "d" };
const valido = { id: 3, participante: "João", identidadeConfirmada: true, deslocamentoMilissegundos: -250,
    silencioInicialMilissegundos: 1200 };

describe("FaixaAjusteService — confirmação de identidade e offset manual", () => {
    const transcricao = { recuperarFaixa: vi.fn(), recuperarSessao: vi.fn(), alterarFaixa: vi.fn() };
    const identidades = { listarParticipantes: vi.fn() };
    const campanha = { validarMembro: vi.fn(), ehMestre: (papel: string) => papel === "MESTRE" };
    const campanhaRepositorio = { recuperarPorId: vi.fn() };
    let service: FaixaAjusteService;
    beforeEach(() => {
        vi.clearAllMocks();
        transcricao.recuperarFaixa.mockResolvedValue(faixa);
        transcricao.recuperarSessao.mockResolvedValue(sessao);
        transcricao.alterarFaixa.mockImplementation((dto: object) => Promise.resolve({ ...faixa, ...dto }));
        identidades.listarParticipantes.mockResolvedValue([]);
        campanha.validarMembro.mockResolvedValue({ papel: TipoCampanhaMembroPapelEnum.MESTRE });
        campanhaRepositorio.recuperarPorId.mockResolvedValue({ id: 9 });
        service = new FaixaAjusteService(transcricao as unknown as TranscricaoRepository,
            identidades as unknown as IdentidadeRepository, campanha as unknown as CampanhaService,
            campanhaRepositorio as unknown as CampanhaRepository);
    });

    it("confirma identidade e ajusta offset; a campanha vem do servidor (faixa → sessão)", async () => {
        const alterada = await service.alterarFaixa(valido, usuario);
        expect(alterada).toMatchObject({ participante: "João", identidadeConfirmada: true,
            deslocamentoMilissegundos: -250, silencioInicialMilissegundos: 1200, parecidoCom: null });
        expect(campanha.validarMembro).toHaveBeenCalledWith({ campanhaId: 9, usuarioId: 7 });
        expect(transcricao.alterarFaixa).toHaveBeenCalledWith(valido);
    });
    it("nunca altera o nome do arquivo nem os tempos brutos: o repositório só recebe os campos do ajuste", async () => {
        await service.alterarFaixa(valido, usuario);
        expect(Object.keys(transcricao.alterarFaixa.mock.calls[0][0] as object).sort()).toEqual(
            ["deslocamentoMilissegundos", "id", "identidadeConfirmada", "participante", "silencioInicialMilissegundos"]);
    });
    it("silêncio inicial é só informativo: não muda o offset informado", async () => {
        await service.alterarFaixa({ ...valido, deslocamentoMilissegundos: 0, silencioInicialMilissegundos: 5000 }, usuario);
        expect(transcricao.alterarFaixa).toHaveBeenCalledWith(expect.objectContaining({
            deslocamentoMilissegundos: 0, silencioInicialMilissegundos: 5000 }));
    });
    it("aceita offset negativo e silêncio nulo", async () => {
        await expect(service.alterarFaixa({ ...valido, deslocamentoMilissegundos: -1, silencioInicialMilissegundos: null },
            usuario)).resolves.toBeDefined();
    });
    it("participante parecido de outro exige confirmação; confirmado, devolve a dica", async () => {
        identidades.listarParticipantes.mockResolvedValue(["Joao"]);
        await expect(service.alterarFaixa(valido, usuario)).rejects.toBeInstanceOf(ResourceConflictException);
        expect(transcricao.alterarFaixa).not.toHaveBeenCalled();
        await expect(service.alterarFaixa({ ...valido, confirmarParecido: true }, usuario))
            .resolves.toMatchObject({ parecidoCom: "Joao" });
    });
    it("o mesmo rótulo já conhecido não é conflito", async () => {
        identidades.listarParticipantes.mockResolvedValue(["João"]);
        await expect(service.alterarFaixa(valido, usuario)).resolves.toMatchObject({ parecidoCom: null });
    });
    it.each([
        [{ ...valido, participante: "  " }],
        [{ ...valido, participante: "a\nb" }],
        [{ ...valido, identidadeConfirmada: "sim" }],
        [{ ...valido, deslocamentoMilissegundos: 1.5 }],
        [{ ...valido, deslocamentoMilissegundos: Number.MAX_SAFE_INTEGER + 1 }],
        [{ ...valido, silencioInicialMilissegundos: -1 }],
        [{ ...valido, silencioInicialMilissegundos: 2.5 }],
        [{ ...valido, confirmarParecido: "x" }],
        [{ ...valido, nomeArquivo: "outro.wav" }],
        [{ ...valido, id: 0 }],
    ])("recusa %j sem tocar no banco", async (dto) => {
        await expect(service.alterarFaixa(dto as never, usuario)).rejects.toBeInstanceOf(BusinessException);
        expect(transcricao.alterarFaixa).not.toHaveBeenCalled();
        expect(transcricao.recuperarFaixa).not.toHaveBeenCalled();
    });
    it("faixa ou sessão ausente é 404", async () => {
        transcricao.recuperarFaixa.mockResolvedValue(null);
        await expect(service.alterarFaixa(valido, usuario)).rejects.toBeInstanceOf(ResourceNotFoundException);
        transcricao.recuperarFaixa.mockResolvedValue(faixa);
        transcricao.recuperarSessao.mockResolvedValue(null);
        await expect(service.alterarFaixa(valido, usuario)).rejects.toBeInstanceOf(ResourceNotFoundException);
        expect(transcricao.alterarFaixa).not.toHaveBeenCalled();
    });
    it.each(["JOGADOR", "ESPECTADOR"])("nega %s com 404 e sem gravar", async (papel) => {
        campanha.validarMembro.mockResolvedValue({ papel });
        await expect(service.alterarFaixa(valido, usuario)).rejects.toBeInstanceOf(ResourceNotFoundException);
        expect(transcricao.alterarFaixa).not.toHaveBeenCalled();
    });
    it("ex-Mestre / não-membro recebe 404; ADMIN e TESTER não têm bypass", async () => {
        campanha.validarMembro.mockRejectedValue(new UnauthorizedAccessException("Sem acesso"));
        await expect(service.alterarFaixa(valido, usuario)).rejects.toBeInstanceOf(ResourceNotFoundException);
        campanha.validarMembro.mockResolvedValue({ papel: "JOGADOR" });
        for (const tipo of [TipoUsuarioEnum.ADMIN, TipoUsuarioEnum.TESTER]) {
            await expect(service.alterarFaixa(valido, { ...usuario, tipo })).rejects.toBeInstanceOf(ResourceNotFoundException);
        }
    });
    it("alteração concorrente que removeu a faixa vira 404", async () => {
        transcricao.alterarFaixa.mockResolvedValue(null);
        await expect(service.alterarFaixa(valido, usuario)).rejects.toBeInstanceOf(ResourceNotFoundException);
    });
});
