import { Component, DestroyRef, effect, inject, input, signal, untracked } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { filter, merge, Subscription } from "rxjs";
import type { CenaDocumentoResumoDto } from "@contratados-rpg/shared/dtos/cena";
import type { DocumentoRecuperadoDto } from "@contratados-rpg/shared/dtos/documento";
import { CampanhaProjecaoService } from "../../../campanha/campanha-projecao.service";
import { TempoRealService } from "../../../../core/services/tempo-real.service";
import { Cartao } from "../../../../shared/ui/cartao/cartao.component";
import { Botao } from "../../../../shared/ui/botao/botao.component";
import { Modal } from "../../../../shared/ui/modal/modal.component";
import { Esqueleto } from "../../../../shared/ui/esqueleto/esqueleto.component";
import { EstadoVazio } from "../../../../shared/ui/estado-vazio/estado-vazio.component";
import { DocumentoCartao } from "../../../documento/componentes/documento-cartao/documento-cartao.component";
import { LeitorDocumento } from "../../../documento/componentes/leitor-documento/leitor-documento.component";
import { Icone } from "../../../../shared/icone/icone.component";

/** Lista e leitura voluntária da Investigação; seleção independente do foco do mestre. */
@Component({
    selector: "app-documentos-cena-espectador",
    imports: [Cartao, Botao, Modal, Esqueleto, EstadoVazio, DocumentoCartao, LeitorDocumento, Icone],
    templateUrl: "./documentos-cena-espectador.component.html",
    styleUrl: "./documentos-cena-espectador.component.scss",
})
export class DocumentosCenaEspectador {
    readonly campanhaId = input.required<number>();
    readonly cenaId = input.required<number>();
    private readonly projecao = inject(CampanhaProjecaoService);
    private readonly tempoReal = inject(TempoRealService);
    private readonly destroyRef = inject(DestroyRef);
    readonly documentos = signal<readonly CenaDocumentoResumoDto[]>([]);
    readonly carregando = signal(true);
    readonly falha = signal(false);
    readonly selecionado = signal<number | null>(null);
    readonly documento = signal<DocumentoRecuperadoDto | null>(null);
    readonly lendo = signal(false);
    readonly falhaLeitura = signal(false);
    private cargaLista?: Subscription;
    private cargaLeitura?: Subscription;
    private geracaoLista = 0;
    private geracaoLeitura = 0;

    constructor() {
        effect(() => {
            this.campanhaId();
            this.cenaId();
            untracked(() => {
                this.fechar();
                this.recarregar();
            });
        });
        merge(
            this.tempoReal.cenaDocumentoAlterado$.pipe(filter((evento) =>
                evento.campanhaId === this.campanhaId() && evento.cenaId === this.cenaId())),
            this.tempoReal.documentoAlterado$.pipe(filter((evento) =>
                evento.campanhaId === this.campanhaId())),
            this.tempoReal.reconexao$,
        ).pipe(takeUntilDestroyed()).subscribe(() => this.recarregar());
    }

    /** Invalida também a leitura em voo antes de reconfirmar o vínculo autorizado. */
    recarregar(): void {
        const geracao = ++this.geracaoLista;
        this.cargaLista?.unsubscribe();
        this.invalidarLeitura();
        this.documentos.set([]);
        this.carregando.set(true);
        this.falha.set(false);
        this.cargaLista = this.projecao.listarDocumentosCenaEspectador(
            this.campanhaId(), this.cenaId(),
        ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (documentos) => {
                if (geracao !== this.geracaoLista) { return; }
                this.documentos.set(documentos);
                this.carregando.set(false);
                const selecionado = this.selecionado();
                if (selecionado !== null) {
                    if (documentos.some((item) => item.documentoId === selecionado)) {
                        this.abrir(selecionado);
                    } else {
                        this.fechar();
                    }
                }
            },
            error: () => {
                if (geracao !== this.geracaoLista) { return; }
                this.carregando.set(false);
                this.falha.set(true);
                this.fechar();
            },
        });
    }

    /** Abre apenas um item da lista autorizada; trocar cancela e invalida a carga anterior. */
    abrir(documentoId: number): void {
        if (!this.documentos().some((item) => item.documentoId === documentoId)) { return; }
        this.invalidarLeitura();
        this.selecionado.set(documentoId);
        this.lendo.set(true);
        this.falhaLeitura.set(false);
        const geracao = this.geracaoLeitura;
        this.cargaLeitura = this.projecao.recuperarDocumentoCenaEspectador(
            this.campanhaId(), this.cenaId(), documentoId,
        ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (documento) => {
                if (geracao !== this.geracaoLeitura || this.selecionado() !== documentoId) {
                    return;
                }
                this.documento.set(documento);
                this.lendo.set(false);
            },
            error: (erro: { status?: number }) => {
                if (geracao !== this.geracaoLeitura) { return; }
                if (erro.status === 403 || erro.status === 404) {
                    this.fechar();
                    this.recarregar();
                } else {
                    this.lendo.set(false);
                    this.falhaLeitura.set(true);
                }
            },
        });
    }

    /** Fecha mesmo durante a carga; nenhuma resposta antiga pode reabrir o modal. */
    fechar(): void {
        this.selecionado.set(null);
        this.invalidarLeitura();
        this.falhaLeitura.set(false);
    }

    private invalidarLeitura(): void {
        ++this.geracaoLeitura;
        this.cargaLeitura?.unsubscribe();
        this.documento.set(null);
        this.lendo.set(false);
    }
}
