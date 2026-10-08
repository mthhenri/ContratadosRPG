import { Injectable, signal } from "@angular/core";

/** Uma única consulta global; abrir de novo também restaura a janela minimizada. */
@Injectable({ providedIn: "root" })
export class RegrasConsultaService {
    private readonly abertoInterno = signal(false);
    private readonly solicitacaoInterna = signal(0);
    readonly aberto = this.abertoInterno.asReadonly();
    readonly solicitacao = this.solicitacaoInterna.asReadonly();

    abrir(): void {
        this.abertoInterno.set(true);
        this.solicitacaoInterna.update(valor => valor + 1);
    }

    fechar(): void {
        this.abertoInterno.set(false);
    }
}
