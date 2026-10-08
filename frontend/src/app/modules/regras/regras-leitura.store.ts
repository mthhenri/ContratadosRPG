import { Injectable, signal } from "@angular/core";
import { RegrasDocumento } from "./regras.model";

/** Memória de consulta compartilhada entre página e painel, separada por livro. */
@Injectable({ providedIn: "root" })
export class RegrasLeituraStore {
    private readonly livroInterno = signal<RegrasDocumento["id"]>("sistema");
    readonly livro = this.livroInterno.asReadonly();
    private readonly secoes = signal<Record<RegrasDocumento["id"], string | null>>({
        sistema: null, guia: null,
    });

    selecionarLivro(livro: RegrasDocumento["id"]): void {
        this.livroInterno.set(livro);
    }

    recuperarSecao(livro: RegrasDocumento["id"]): string | null {
        return this.secoes()[livro];
    }

    lembrarSecao(livro: RegrasDocumento["id"], ancora: string | null): void {
        this.secoes.update(secoes => ({ ...secoes, [livro]: ancora }));
    }
}
