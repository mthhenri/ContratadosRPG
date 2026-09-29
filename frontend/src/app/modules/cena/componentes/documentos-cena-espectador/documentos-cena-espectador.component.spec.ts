import { TestBed } from "@angular/core/testing";
import { Subject, of, throwError } from "rxjs";
import { TipoDocumentoEnum } from "@contratados-rpg/shared/enums";
import type { DocumentoRecuperadoDto } from "@contratados-rpg/shared/dtos/documento";
import { CampanhaProjecaoService } from "../../../campanha/campanha-projecao.service";
import { TempoRealService } from "../../../../core/services/tempo-real.service";
import { DocumentosCenaEspectador } from "./documentos-cena-espectador.component";

describe("DocumentosCenaEspectador", () => {
    const itens = [1, 2].map((documentoId) => ({
        documentoId, titulo: `Documento ${documentoId}`, tipo: TipoDocumentoEnum.TEXTO,
        revelado: true, ordem: documentoId, emFoco: false,
    }));
    function montar() {
        const eventoCena = new Subject<{ campanhaId: number; cenaId: number }>();
        const eventoDocumento = new Subject<{ campanhaId: number }>();
        const reconexao = new Subject<void>();
        const cargaA = new Subject<DocumentoRecuperadoDto>();
        const cargaB = new Subject<DocumentoRecuperadoDto>();
        const projecao = {
            listarDocumentosCenaEspectador: vi.fn(() => of(itens)),
            recuperarDocumentoCenaEspectador: vi.fn((_campanha, _cena, documentoId) =>
                documentoId === 1 ? cargaA : cargaB),
        };
        TestBed.configureTestingModule({
            imports: [DocumentosCenaEspectador],
            providers: [
                { provide: CampanhaProjecaoService, useValue: projecao },
                { provide: TempoRealService, useValue: {
                    cenaDocumentoAlterado$: eventoCena, documentoAlterado$: eventoDocumento,
                    reconexao$: reconexao,
                } },
            ],
        });
        const fixture = TestBed.createComponent(DocumentosCenaEspectador);
        fixture.componentRef.setInput("campanhaId", 8);
        fixture.componentRef.setInput("cenaId", 901);
        fixture.detectChanges();
        return { fixture, leitor: fixture.componentInstance, projecao,
            cargaA, cargaB, eventoCena, eventoDocumento, reconexao };
    }
    function documento(id: number): DocumentoRecuperadoDto {
        return { id, campanhaId: 8, titulo: `Documento ${id}`, tipo: TipoDocumentoEnum.TEXTO,
            revelado: true, ordem: id, conteudoMarkdown: "Conteúdo", imagemUrl: null,
            createdDate: "2026-09-29", updatedDate: "2026-09-29" };
    }
    it("apresentação e foco não abrem leitor; mantém a ordem do servidor", () => {
        const { leitor, projecao, eventoCena } = montar();
        eventoCena.next({ campanhaId: 8, cenaId: 901 });
        expect(leitor.documentos()).toEqual(itens);
        expect(leitor.selecionado()).toBeNull();
        expect(projecao.recuperarDocumentoCenaEspectador).not.toHaveBeenCalled();
    });
    it("fechar durante carga invalida a resposta antiga", () => {
        const { leitor, cargaA } = montar();
        leitor.abrir(1);
        leitor.fechar();
        cargaA.next(documento(1));
        expect(leitor.selecionado()).toBeNull();
        expect(leitor.documento()).toBeNull();
        expect(leitor.lendo()).toBe(false);
    });
    it("A→B não recebe A depois de B", () => {
        const { leitor, cargaA, cargaB } = montar();
        leitor.abrir(1);
        leitor.abrir(2);
        cargaB.next(documento(2));
        cargaA.next(documento(1));
        expect(leitor.documento()?.id).toBe(2);
    });
    it("trocar de cena encerra leitura e cancela carga anterior", () => {
        const { fixture, leitor, cargaA, projecao } = montar();
        leitor.abrir(1);
        fixture.componentRef.setInput("cenaId", 902);
        fixture.detectChanges();
        cargaA.next(documento(1));
        expect(leitor.selecionado()).toBeNull();
        expect(projecao.listarDocumentosCenaEspectador).toHaveBeenLastCalledWith(8, 902);
    });
    it("ignora eventos de outra campanha/cena", () => {
        const { projecao, eventoCena, eventoDocumento } = montar();
        eventoCena.next({ campanhaId: 8, cenaId: 902 });
        eventoDocumento.next({ campanhaId: 9 });
        expect(projecao.listarDocumentosCenaEspectador).toHaveBeenCalledTimes(1);
    });
    it("alteração refaz conteúdo e ocultação na reconexão fecha o modal", () => {
        const { leitor, cargaA, eventoDocumento, reconexao, projecao } = montar();
        leitor.abrir(1);
        cargaA.next(documento(1));
        eventoDocumento.next({ campanhaId: 8 });
        expect(projecao.recuperarDocumentoCenaEspectador).toHaveBeenCalledTimes(2);
        cargaA.next({ ...documento(1), titulo: "Alterado" });
        expect(leitor.documento()?.titulo).toBe("Alterado");
        projecao.listarDocumentosCenaEspectador.mockReturnValue(of([]));
        reconexao.next();
        expect(leitor.documentos()).toEqual([]);
        expect(leitor.selecionado()).toBeNull();
        expect(leitor.documento()).toBeNull();
    });
    it("falha na lista limpa dados; tentar novamente recupera", () => {
        const { leitor, projecao } = montar();
        projecao.listarDocumentosCenaEspectador.mockReturnValue(throwError(() => new Error()));
        leitor.recarregar();
        expect(leitor.falha()).toBe(true);
        expect(leitor.carregando()).toBe(false);
        expect(leitor.documentos()).toEqual([]);
        projecao.listarDocumentosCenaEspectador.mockReturnValue(of(itens));
        leitor.recarregar();
        expect(leitor.falha()).toBe(false);
        expect(leitor.documentos()).toEqual(itens);
    });
    it("erro de leitura tem recuperação; 404 encerra leitura indisponível", () => {
        const { leitor, cargaA, cargaB } = montar();
        leitor.abrir(1);
        cargaA.error({ status: 500 });
        expect(leitor.falhaLeitura()).toBe(true);
        expect(leitor.lendo()).toBe(false);
        leitor.abrir(2);
        cargaB.error({ status: 404 });
        expect(leitor.selecionado()).toBeNull();
    });
});
