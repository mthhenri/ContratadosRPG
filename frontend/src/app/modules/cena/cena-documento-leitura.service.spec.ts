import { TestBed } from "@angular/core/testing";
import { Subject } from "rxjs";
import { DocumentoAlteracaoEnum } from "@contratados-rpg/shared/enums";
import type { DocumentoBibliotecaAlteradaDto, DocumentoRecuperadoDto }
    from "@contratados-rpg/shared/dtos/documento";
import { TempoRealService } from "../../core/services/tempo-real.service";
import { DocumentoService } from "../documento/documento.service";
import { CenaDocumentoLeituraService } from "./cena-documento-leitura.service";

describe("Leitura dos documentos da Investigação", () => {
    const documento = (id: number) => ({ id, titulo: `Documento ${id}` }) as DocumentoRecuperadoDto;
    const montar = (mestre = false) => {
        const cargas: Subject<DocumentoRecuperadoDto>[] = [];
        const documentoAlterado$ = new Subject<DocumentoBibliotecaAlteradaDto>();
        const reconexao$ = new Subject<void>();
        const recuperar = vi.fn(() => {
            const carga = new Subject<DocumentoRecuperadoDto>();
            cargas.push(carga);
            return carga;
        });
        TestBed.configureTestingModule({ providers: [
            CenaDocumentoLeituraService,
            { provide: DocumentoService, useValue: { recuperar } },
            { provide: TempoRealService, useValue: { documentoAlterado$, reconexao$ } },
        ] });
        const leitura = TestBed.inject(CenaDocumentoLeituraService);
        leitura.iniciar(1, mestre);
        return { leitura, cargas, documentoAlterado$, reconexao$ };
    };

    it("A→B→A aceita somente a última carga e limpa o conteúdo entre seleções", () => {
        const { leitura, cargas } = montar();
        leitura.abrir(10);
        cargas[0].next(documento(10));
        leitura.abrir(20);
        expect(leitura.documento()).toBeNull();
        leitura.abrir(10);
        cargas[2].next(documento(10));
        cargas[1].next(documento(20));
        expect(leitura.documento()?.id).toBe(10);
    });

    it("fechar durante carga impede reabertura e encerra carregamento", () => {
        const { leitura, cargas } = montar();
        leitura.abrir(10);
        leitura.fechar();
        cargas[0].next(documento(10));
        expect(leitura.documento()).toBeNull();
        expect(leitura.carregando()).toBe(false);
        expect(leitura.documentoId()).toBeNull();
    });

    it("erro remove o esqueleto e permite tentar novamente", () => {
        const { leitura, cargas } = montar();
        leitura.abrir(10);
        cargas[0].error({ status: 500 });
        expect(leitura.erro()).toBe(true);
        expect(leitura.carregando()).toBe(false);
        leitura.tentarNovamente();
        cargas[1].next(documento(10));
        expect(leitura.erro()).toBe(false);
        expect(leitura.documento()?.id).toBe(10);
    });

    it("conteúdo e reconexão recarregam só o leitor voluntariamente aberto", () => {
        const { leitura, cargas, documentoAlterado$, reconexao$ } = montar();
        reconexao$.next();
        expect(cargas).toHaveLength(0);
        leitura.abrir(10);
        cargas[0].next(documento(10));
        documentoAlterado$.next({ campanhaId: 1, documentoId: 10,
            alteracao: DocumentoAlteracaoEnum.ALTERADO });
        cargas[1].next({ ...documento(10), titulo: "Novo título" });
        expect(leitura.documento()?.titulo).toBe("Novo título");
        reconexao$.next();
        expect(cargas).toHaveLength(3);
    });

    it("ocultação fecha o jogador, mestre continua lendo; remoção fecha ambos", () => {
        const { leitura, cargas, documentoAlterado$ } = montar();
        leitura.abrir(10);
        documentoAlterado$.next({ campanhaId: 1, documentoId: 10,
            alteracao: DocumentoAlteracaoEnum.OCULTADO });
        cargas[0].next(documento(10));
        expect(leitura.documentoId()).toBeNull();
    });

    it("mestre mantém oculto mas fecha removido", () => {
        const { leitura, documentoAlterado$ } = montar(true);
        leitura.abrir(10);
        documentoAlterado$.next({ campanhaId: 1, documentoId: 10,
            alteracao: DocumentoAlteracaoEnum.OCULTADO });
        expect(leitura.documentoId()).toBe(10);
        documentoAlterado$.next({ campanhaId: 1, documentoId: 10,
            alteracao: DocumentoAlteracaoEnum.REMOVIDO });
        expect(leitura.documentoId()).toBeNull();
    });
});
