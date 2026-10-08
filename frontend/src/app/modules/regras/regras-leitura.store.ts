import { Injectable, signal } from "@angular/core";
import { RegrasDocumento } from "./regras.model";

/** Memória de consulta compartilhada entre página e painel, separada por livro. */
@Injectable({ providedIn: "root" })
export class RegrasLeituraStore {
    private readonly livroInterno = signal<RegrasDocumento["id"]>("sistema");
    readonly livro = this.livroInterno.asReadonly();
    private readonly termoPesquisaInterno = signal("");
    readonly termoPesquisa = this.termoPesquisaInterno.asReadonly();
    private readonly ocorrenciasPesquisaInternas = signal({ sistema: 0, guia: 0 });
    readonly ocorrenciasPesquisa = this.ocorrenciasPesquisaInternas.asReadonly();
    private readonly secoes = signal<Record<RegrasDocumento["id"], string | null>>({
        sistema: null, guia: null,
    });

    selecionarLivro(livro: RegrasDocumento["id"]): void {
        this.livroInterno.set(livro);
    }

    alterarTermoPesquisa(termo: string): void {
        if (termo !== this.termoPesquisaInterno()) {
            this.ocorrenciasPesquisaInternas.set({ sistema: 0, guia: 0 });
        }
        this.termoPesquisaInterno.set(termo);
    }

    selecionarOcorrenciaPesquisa(livro: RegrasDocumento["id"], indice: number): void {
        this.ocorrenciasPesquisaInternas.update(ocorrencias =>
            ({ ...ocorrencias, [livro]: indice }));
    }

    recuperarSecao(livro: RegrasDocumento["id"]): string | null {
        return this.secoes()[livro];
    }

    lembrarSecao(livro: RegrasDocumento["id"], ancora: string | null): void {
        this.secoes.update(secoes => ({ ...secoes, [livro]: ancora }));
    }
}
