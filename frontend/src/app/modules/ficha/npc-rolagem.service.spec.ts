import { TestBed } from "@angular/core/testing";
import { CategoriaNpcEnum, ItemCategoriaEnum, RolagemVisibilidadeEnum } from "@contratados-rpg/shared/enums";
import { BandejaDadosService } from "../../shared/bandeja-dados/bandeja-dados.service";
import { FichaEdicaoNpcService } from "./ficha-edicao-npc.service";
import { FichaRolagemRegistroService } from "./ficha-rolagem-registro.service";
import { NpcRolagemService } from "./npc-rolagem.service";
import { criarFichaNpcTeste } from "./testing/ficha-npc.fixture";

describe("NpcRolagemService", () => {
    function montar(gerenciavel = true, pendente = false) {
        const ficha = criarFichaNpcTeste();
        const atual = { ...ficha, dados: { ...ficha.dados, categoria: CategoriaNpcEnum.VETERANO,
            nivel: 6, atributos: { ...ficha.dados.atributos, luta: 3 },
            inventario: [{ nome: "Mediana", categoria: ItemCategoriaEnum.CORPO_A_CORPO,
                custo: 100, peso: 1, quantidade: 1, guardada: false, modificacoes: [] }],
            competencias: ["luta", "medicina", "sentidos"] as const } };
        const bandeja = { mostrar: vi.fn() }, registro = { registrar: vi.fn() };
        TestBed.configureTestingModule({ providers: [NpcRolagemService,
            { provide: BandejaDadosService, useValue: bandeja },
            { provide: FichaRolagemRegistroService, useValue: registro },
            { provide: FichaEdicaoNpcService, useValue: { ficha: () => atual,
                edicaoPendente: () => pendente, salvando: () => false } },
        ] });
        const service = TestBed.inject(NpcRolagemService);
        service.inicializar(() => gerenciavel);
        return { service, bandeja, registro };
    }
    it("apresenta e registra o mesmo resultado completo, com bandeja privada", () => {
        const { service, bandeja, registro } = montar();
        const valores = [0.975, 0.525, 0.375, 0.6];
        const aleatorio = vi.spyOn(Math, "random").mockImplementation(() => valores.shift()!);
        service.rolar("luta", "Luta");
        aleatorio.mockRestore();
        expect(registro.registrar).toHaveBeenCalledWith(expect.objectContaining({
            rotulo: "Teste de Luta", resultado: expect.objectContaining({ total: 32 }),
        }));
        expect(bandeja.mostrar).toHaveBeenCalledWith(expect.objectContaining({
            ...registro.registrar.mock.calls[0][0], visibilidade: RolagemVisibilidadeEnum.PRIVADA,
        }));
    });
    it.each([[false, false], [true, true]])("não rola sem gestão ou com rascunho (%s/%s)", (gestao, pendente) => {
        const { service, bandeja, registro } = montar(gestao, pendente);
        service.rolar("luta", "Luta");
        expect(bandeja.mostrar).not.toHaveBeenCalled();
        expect(registro.registrar).not.toHaveBeenCalled();
    });
    it("dano resolve a arma pelo catálogo e usa atributos do NPC, sem Competência", () => {
        const { service, bandeja, registro } = montar();
        vi.spyOn(Math, "random").mockReturnValue(0);
        service.rolarDano(0);
        vi.restoreAllMocks();
        expect(registro.registrar).toHaveBeenCalledWith(expect.objectContaining({
            rotulo: "Mediana", formula: "3D4+FOR [Físico]",
            resultado: expect.objectContaining({ total: 4 }),
        }));
        expect(bandeja.mostrar).toHaveBeenCalledWith(expect.objectContaining({
            ...registro.registrar.mock.calls[0][0], visibilidade: RolagemVisibilidadeEnum.PRIVADA,
        }));
    });
    it.each([[false, false], [true, true]])("leitura e rascunho bloqueiam dano (%s/%s)", (gestao, pendente) => {
        const { service, registro } = montar(gestao, pendente);
        service.rolarDano(0);
        expect(registro.registrar).not.toHaveBeenCalled();
    });
});
