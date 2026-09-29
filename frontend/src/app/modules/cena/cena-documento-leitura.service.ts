import { DestroyRef, Injectable, inject, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Subscription } from "rxjs";
import type { DocumentoRecuperadoDto } from "@contratados-rpg/shared/dtos/documento";
import { DocumentoAlteracaoEnum } from "@contratados-rpg/shared/enums";
import { TempoRealService } from "../../core/services/tempo-real.service";
import { DocumentoService } from "../documento/documento.service";

/** Leitura por painel: cancelar/trocar invalida a carga, sem compartilhar seleção com a Biblioteca. */
@Injectable()
export class CenaDocumentoLeituraService {
    private readonly documentoService = inject(DocumentoService);
    private readonly tempoReal = inject(TempoRealService);
    private readonly destroyRef = inject(DestroyRef);
    private carga: Subscription | undefined;
    readonly documentoId = signal<number | null>(null);
    readonly documento = signal<DocumentoRecuperadoDto | null>(null);
    readonly carregando = signal(false);
    readonly erro = signal(false);

    /** Escuta apenas a campanha do painel; foco nunca abre leitores alheios. */
    iniciar(campanhaId: number, mestre: boolean): void {
        this.tempoReal.documentoAlterado$.pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((evento) => {
                if (evento.campanhaId !== campanhaId
                    || evento.documentoId !== this.documentoId()) {
                    return;
                }
                if (evento.alteracao === DocumentoAlteracaoEnum.REMOVIDO
                    || (!mestre && evento.alteracao === DocumentoAlteracaoEnum.OCULTADO)) {
                    this.fechar();
                } else {
                    this.tentarNovamente();
                }
            });
        this.tempoReal.reconexao$.pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.tentarNovamente());
    }

    /** Troca o documento imediatamente e cancela qualquer recuperação anterior. */
    abrir(documentoId: number): void {
        this.carga?.unsubscribe();
        this.documentoId.set(documentoId);
        this.documento.set(null);
        this.erro.set(false);
        this.carregando.set(true);
        this.carga = this.documentoService.recuperar(documentoId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (documento) => {
                    this.documento.set(documento);
                    this.carregando.set(false);
                },
                error: (erro: { status?: number }) => {
                    if (erro.status === 403 || erro.status === 404) {
                        this.fechar();
                        return;
                    }
                    this.erro.set(true);
                    this.carregando.set(false);
                },
            });
    }

    /** Fecha inclusive durante a carga: uma resposta pendente não pode reabrir a leitura. */
    fechar(): void {
        this.carga?.unsubscribe();
        this.documentoId.set(null);
        this.documento.set(null);
        this.carregando.set(false);
        this.erro.set(false);
    }

    /** Recupera de erro ou evento/reconexão usando só a seleção que continua aberta. */
    tentarNovamente(): void {
        const documentoId = this.documentoId();
        if (documentoId !== null) {
            this.abrir(documentoId);
        }
    }
}
