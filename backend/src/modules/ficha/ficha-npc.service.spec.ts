import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
    FichaNpcDadosDto, FichaNpcVitalidadeInternoAlterarDto, FichaRecuperadaDto,
} from "@contratados-rpg/shared/dtos/ficha";
import {
    CategoriaNpcEnum, HabilidadeTipoNpcEnum, ItemCategoriaEnum, PatenteEnum,
    TipoCampanhaMembroPapelEnum, TipoFichaEnum,
} from "@contratados-rpg/shared/enums";
import type { ArmazenamentoProvedor } from "../../core/armazenamento";
import { BusinessException, UnauthorizedAccessException } from "../../core/exceptions";
import type { CampanhaGateway } from "../../core/gateway/campanha.gateway";
import type { JwtPayload } from "../autenticacao/jwt-payload.interface";
import type { CampanhaRepository } from "../campanha/campanha.repository";
import { CampanhaService } from "../campanha/campanha.service";
import type { FichaRepository } from "./ficha.repository";
import { FichaService } from "./ficha.service";

const mestre = { sub: 10 } as JwtPayload;
const jogador = { sub: 20 } as JwtPayload;

function criarDados(): FichaNpcDadosDto {
    return {
        identidadeNarrativa: { nome: "Rafael", funcao: "Soldado de contenção" },
        categoria: CategoriaNpcEnum.OPERATIVO, nivel: 5, cooperacao: 5,
        competencias: ["luta", "pontaria"],
        atributos: {
            forca: 2, destreza: 2, luta: 3, pontaria: 2, vigor: 2,
            intelecto: 1, medicina: 1, sentidos: 1, social: 1, vontade: 1,
        },
        vidaMaxima: 85, vidaAtual: 85, defesaBase: 15, bloquear: 17, esquivar: 17,
        energia: { maxima: 12, atual: 12, recargaPorTurno: null },
        sanidade: { sequelas: [], traumas: [] },
        habilidades: [
            { nomeNeutro: "Treinamento", tipo: HabilidadeTipoNpcEnum.PASSIVA, descricao: "Texto" },
            {
                nomeNeutro: "Supressão", tipo: HabilidadeTipoNpcEnum.ATIVA,
                descricao: "Texto", custoEnergia: 4,
            },
        ],
        condutaCombate: {
            gatilhosFuga: "Ordem", prioridadesAlvo: "Ameaça", reacaoFerimentoSevero: "Recuar",
        },
        anotacoes: "Segredo do mestre",
    };
}

describe("FichaService — NPC (m4-07)", () => {
    const repositorio = {
        criarFicha: vi.fn(), recuperarPorId: vi.fn(), alterarFicha: vi.fn(),
        recuperarAcesso: vi.fn(), atribuirCampanha: vi.fn(), alterarVitalidadeNpc: vi.fn(),
        alterarImagem: vi.fn(),
        listarPorCampanha: vi.fn(),
    };
    const campanha = { recuperarMembro: vi.fn(), contarCampanhasComoMestre: vi.fn() };
    const gateway = {
        emitirFichaCriada: vi.fn(), emitirFichaAlterada: vi.fn(),
        emitirFichaRecortesAlterados: vi.fn(), emitirFichaVisibilidadeAlterada: vi.fn(),
    };
    let service: FichaService;
    let ficha: FichaRecuperadaDto;

    beforeEach(() => {
        vi.resetAllMocks();
        ficha = {
            id: 7, campanhaId: 3, usuarioId: 10, nome: "Rafael", tipo: TipoFichaEnum.NPC,
            cor: null, imagemUrl: null, imagemFoco: null, oculta: false,
            dados: criarDados() as unknown as FichaRecuperadaDto["dados"],
        };
        campanha.recuperarMembro.mockImplementation(({ usuarioId }) => ({
            papel: usuarioId === 10
                ? TipoCampanhaMembroPapelEnum.MESTRE : TipoCampanhaMembroPapelEnum.JOGADOR,
        }));
        campanha.contarCampanhasComoMestre.mockResolvedValue(1);
        repositorio.recuperarPorId.mockImplementation(() => Promise.resolve(ficha));
        repositorio.criarFicha.mockImplementation((dto) => Promise.resolve({ ...ficha, ...dto }));
        repositorio.alterarFicha.mockImplementation((dto) => Promise.resolve({ ...ficha, ...dto }));
        repositorio.alterarVitalidadeNpc.mockImplementation(
            (dto: FichaNpcVitalidadeInternoAlterarDto) => Promise.resolve({
            ...ficha,
            dados: {
                ...ficha.dados, vidaAtual: dto.vidaAtual ?? 85,
                energia: { maxima: 12, atual: dto.energiaAtual ?? 12, recargaPorTurno: null },
                condicoes: { morrendo: dto.morrendo },
            },
            }),
        );
        service = new FichaService(
            repositorio as unknown as FichaRepository,
            campanha as unknown as CampanhaRepository,
            { ehEspectador: (papel: TipoCampanhaMembroPapelEnum) =>
                CampanhaService.prototype.ehEspectador(papel) } as CampanhaService,
            gateway as unknown as CampanhaGateway,
            {} as ArmazenamentoProvedor,
        );
    });

    it("rejeita criação sem Competências e não apaga seleção já configurada na edição", async () => {
        const dados = { ...criarDados(), competencias: undefined };
        await expect(service.criarFichaNpc({ campanhaId: 3, nome: "Rafael", dados }, mestre)).rejects.toBeInstanceOf(BusinessException);
        await expect(service.alterarFichaNpc({ id: 7, nome: "Rafael", dados }, mestre)).rejects.toBeInstanceOf(BusinessException);
        expect(repositorio.criarFicha).not.toHaveBeenCalled();
        expect(repositorio.alterarFicha).not.toHaveBeenCalled();
    });

    it("cria para o mestre e invalida a campanha sem transmitir identidade", async () => {
        const resultado = await service.criarFichaNpc({
            campanhaId: 3, nome: "Rafael", dados: criarDados(),
        }, mestre);
        expect(resultado.tipo).toBe(TipoFichaEnum.NPC);
        expect(repositorio.criarFicha).toHaveBeenCalledWith(expect.objectContaining({
            usuarioId: 10, tipo: TipoFichaEnum.NPC,
        }));
        expect(gateway.emitirFichaCriada).not.toHaveBeenCalled();
        expect(gateway.emitirFichaRecortesAlterados).toHaveBeenCalledWith({
            campanhaId: 3, fichas: true, membros: false,
        });
    });

    it("recusa criação por jogador na campanha e solta", async () => {
        campanha.contarCampanhasComoMestre.mockResolvedValue(0);
        for (const campanhaId of [3, null]) {
            await expect(service.criarFichaNpc({
                campanhaId, nome: "Rafael", dados: criarDados(),
            }, jogador)).rejects.toBeInstanceOf(UnauthorizedAccessException);
        }
        expect(repositorio.criarFicha).not.toHaveBeenCalled();
    });

    it("permite NPC solto do mestre sem evento de campanha", async () => {
        const resultado = await service.criarFichaNpc({
            campanhaId: null, nome: "Rafael", dados: criarDados(),
        }, mestre);
        expect(resultado.campanhaId).toBeNull();
        expect(gateway.emitirFichaRecortesAlterados).not.toHaveBeenCalled();
    });

    it.each(["atributos", "habilidades", "estrutura"])("rejeita %s inválidos", async (campo) => {
        const dados = criarDados();
        const invalido = campo === "atributos"
            ? { ...dados, atributos: { ...dados.atributos, vigor: 4 } }
            : campo === "habilidades" ? { ...dados, habilidades: [] } : { ...dados, energia: null };
        await expect(service.criarFichaNpc({
            campanhaId: 3, nome: "Rafael", dados: invalido as FichaNpcDadosDto,
        }, mestre)).rejects.toBeInstanceOf(BusinessException);
        expect(repositorio.criarFicha).not.toHaveBeenCalled();
    });

    it("não emite evento quando a persistência falha", async () => {
        repositorio.criarFicha.mockRejectedValue(new Error("Banco indisponível"));
        await expect(service.criarFichaNpc({
            campanhaId: 3, nome: "Rafael", dados: criarDados(),
        }, mestre)).rejects.toThrow("Banco indisponível");
        expect(gateway.emitirFichaRecortesAlterados).not.toHaveBeenCalled();
    });

    it("exige concessão para leitura e omite anotações para o leitor", async () => {
        await expect(service.recuperarFichaNpc({ id: 7 }, jogador))
            .rejects.toBeInstanceOf(UnauthorizedAccessException);
        repositorio.recuperarAcesso.mockResolvedValue({ fichaId: 7, usuarioId: 20 });
        const resultado = await service.recuperarFichaNpc({ id: 7 }, jogador);
        expect(resultado.tipo).toBe(TipoFichaEnum.NPC);
        expect(resultado.dados.anotacoes).toBeUndefined();
        expect((await service.recuperarFichaNpc({ id: 7 }, mestre)).dados.anotacoes)
            .toBe("Segredo do mestre");
    });

    it("recusa edição por leitor, inclusive vitalidade", async () => {
        repositorio.recuperarAcesso.mockResolvedValue({ fichaId: 7, usuarioId: 20 });
        await expect(service.alterarFichaNpc({
            id: 7, nome: "Rafael", dados: criarDados(),
        }, jogador)).rejects.toBeInstanceOf(UnauthorizedAccessException);
        await expect(service.alterarVitalidadeNpc({ id: 7, vidaAtual: 0 }, jogador))
            .rejects.toBeInstanceOf(UnauthorizedAccessException);
        expect(repositorio.alterarFicha).not.toHaveBeenCalled();
    });

    it("preserva máximos editados, cor, enquadramento e anotações omitidas", async () => {
        const dados = { ...criarDados() };
        delete dados.anotacoes;
        const resultado = await service.alterarFichaNpc({
            id: 7, nome: "Rafael", cor: "#123456", imagemFoco: { x: 40, y: 60, escala: 1 },
            dados: { ...dados, vidaMaxima: 999, energia: { ...dados.energia, maxima: 99 } },
        }, mestre);
        expect(resultado).toMatchObject({
            tipo: TipoFichaEnum.NPC, cor: "#123456", imagemFoco: { x: 40, y: 60 },
            dados: { vidaMaxima: 999, energia: { maxima: 99 }, anotacoes: "Segredo do mestre" },
        });
    });

    it("listagem NPC soma bônus aos snapshots sem expor o inventário interno (m4-20)", async () => {
        repositorio.listarPorCampanha.mockResolvedValue([{
            id: 7, tipo: TipoFichaEnum.NPC, nome: "Rafael", defesa: 45, esquiva: 47,
            bloqueio: 48, vidaMaxima: 999, energiaMaxima: 99,
            inventarioMaximo: null, amplificadores: [], vontade: 1,
            itens: [{
                nome: "Colete de Kevlar", categoria: ItemCategoriaEnum.PROTECOES,
                custo: 1500, peso: 2, quantidade: 1, guardada: false, equipado: true,
                modificacoes: [{ nome: "Resistente", empilhamentos: 3 }],
            }],
        }]);
        const [resultado] = await service.listarFichas({ campanhaId: 3 }, mestre);
        expect(resultado).toMatchObject({
            defesa: 45, esquiva: 47, bloqueio: 50, vidaMaxima: 999, energiaMaxima: 99,
        });
        expect(resultado).not.toHaveProperty("itens");
        expect(resultado.sobrecarregado).toBeUndefined();
    });

    it("NPC legado sem inventário mantém snapshots na listagem", async () => {
        repositorio.listarPorCampanha.mockResolvedValue([{
            id: 7, tipo: TipoFichaEnum.NPC, nome: "Rafael", defesa: 45, esquiva: 47,
            bloqueio: 48, vidaMaxima: 999, energiaMaxima: 99,
        }]);
        const [resultado] = await service.listarFichas({ campanhaId: 3 }, mestre);
        expect(resultado).toMatchObject({
            defesa: 45, esquiva: 47, bloqueio: 48, vidaMaxima: 999, energiaMaxima: 99,
        });
    });

    it("equipar proteção invalida os números da listagem sem alterar snapshots (m4-20)", async () => {
        const dados = {
            ...criarDados(), patenteEquivalente: PatenteEnum.OPERADOR,
            inventario: [{
                nome: "Colete de Kevlar", categoria: ItemCategoriaEnum.PROTECOES,
                custo: 0, peso: 0, quantidade: 1, guardada: false, equipado: false,
                modificacoes: [{ nome: "Resistente", empilhamentos: 2 }],
            }],
        };
        ficha = { ...ficha, dados: dados as unknown as FichaRecuperadaDto["dados"] };
        const resultado = await service.alterarFichaNpc({
            id: 7, nome: "Rafael",
            dados: { ...dados, inventario: [{ ...dados.inventario[0], equipado: true }] },
        }, mestre);
        expect(gateway.emitirFichaRecortesAlterados).toHaveBeenCalledWith({
            campanhaId: 3, fichas: true, membros: false,
        });
        expect(resultado.dados).toMatchObject({ defesaBase: 15, esquivar: 17, bloquear: 17 });
    });

    it("ativa Morrendo a zero e mantém a condição após cura até remoção explícita", async () => {
        await service.alterarVitalidadeNpc({ id: 7, vidaAtual: 0 }, mestre);
        expect(repositorio.alterarVitalidadeNpc).toHaveBeenLastCalledWith({
            id: 7, vidaAtual: 0, morrendo: true,
        });
        ficha = { ...ficha, dados: { ...ficha.dados, condicoes: { morrendo: true } } as never };
        await service.alterarVitalidadeNpc({ id: 7, vidaAtual: 10 }, mestre);
        expect(repositorio.alterarVitalidadeNpc).toHaveBeenLastCalledWith({
            id: 7, vidaAtual: 10, morrendo: true,
        });
        await service.alterarVitalidadeNpc({ id: 7, vidaAtual: 10, morrendo: false }, mestre);
        expect(repositorio.alterarVitalidadeNpc).toHaveBeenLastCalledWith({
            id: 7, vidaAtual: 10, morrendo: false,
        });
    });

    it.each([{}, { vidaAtual: 0.5 }, { energiaAtual: "10" }, { morrendo: "false" }])(
        "recusa ajuste pontual inválido: %j", async (ajuste) => {
            await expect(service.alterarVitalidadeNpc({ id: 7, ...ajuste } as never, mestre))
                .rejects.toBeInstanceOf(BusinessException);
            expect(repositorio.alterarVitalidadeNpc).not.toHaveBeenCalled();
        },
    );

    it("permite recursos correntes acima dos máximos", async () => {
        await service.alterarVitalidadeNpc({ id: 7, vidaAtual: 1000, energiaAtual: 100 }, mestre);
        expect(repositorio.alterarVitalidadeNpc).toHaveBeenCalledWith({
            id: 7, vidaAtual: 1000, energiaAtual: 100, morrendo: false,
        });
    });

    it("edição que omite condições e identidade visual mantém os campos armazenados", async () => {
        ficha = {
            ...ficha, cor: "#123456", imagemFoco: { x: 40, y: 60, escala: 1.5 }, oculta: true,
            dados: { ...ficha.dados, condicoes: { morrendo: true } } as never,
        };
        const resultado = await service.alterarFichaNpc({
            id: 7, nome: "Rafael", dados: criarDados(),
        }, mestre);
        expect(resultado).toMatchObject({
            cor: "#123456", imagemFoco: { x: 40, y: 60, escala: 1.5 }, oculta: true,
            dados: { condicoes: { morrendo: true } },
        });
    });

    it("recusa registros malformados de Sanidade", async () => {
        await expect(service.criarFichaNpc({
            campanhaId: 3, nome: "Rafael",
            dados: { ...criarDados(), sanidade: { sequelas: [null], traumas: [] } } as never,
        }, mestre)).rejects.toBeInstanceOf(BusinessException);
    });

    it("impede trocar documento do NPC pelas rotas de jogador e criatura", async () => {
        await expect(service.alterarFicha({ id: 7, nome: "Outro", dados: {} as never }, mestre))
            .rejects.toBeInstanceOf(BusinessException);
        await expect(service.alterarFichaCriatura({
            id: 7, nome: "Outro", dados: {} as never,
        }, mestre)).rejects.toBeInstanceOf(BusinessException);
        await expect(service.alterarVitalidadeCriatura({ id: 7, vidaAtual: 0 }, mestre))
            .rejects.toBeInstanceOf(BusinessException);
        expect(repositorio.alterarFicha).not.toHaveBeenCalled();
    });

    it("rota tipada rejeita uma ficha de outro tipo", async () => {
        ficha = { ...ficha, tipo: TipoFichaEnum.CRIATURA };
        await expect(service.recuperarFichaNpc({ id: 7 }, mestre))
            .rejects.toBeInstanceOf(BusinessException);
        await expect(service.alterarFichaNpc({
            id: 7, nome: "Outro", dados: criarDados(),
        }, mestre)).rejects.toBeInstanceOf(BusinessException);
    });
});
