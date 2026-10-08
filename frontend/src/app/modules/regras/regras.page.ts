import { Location } from "@angular/common";
import { ChangeDetectionStrategy, Component, effect, inject, input, signal,
    untracked } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { ActivatedRoute, Router } from "@angular/router";

import { RegrasDocumento } from "./regras.model";
import { RegrasLeitor } from "./regras-leitor.component";
import { RegrasLeituraStore } from "./regras-leitura.store";

/** Hospedeiro de rota: o leitor compartilhado cuida do conteúdo, esta página da URL. */
@Component({
    selector: "app-regras-page",
    imports: [RegrasLeitor],
    templateUrl: "./regras.page.html",
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegrasPage {
    readonly livro = input.required<RegrasDocumento["id"]>();
    private readonly router = inject(Router);
    private readonly location = inject(Location);
    private readonly memoria = inject(RegrasLeituraStore);
    private readonly fragmento = toSignal(inject(ActivatedRoute).fragment);
    protected readonly ancoraInicial = signal<string | null>(null);

    constructor() {
        effect(() => {
            const livro = this.livro();
            const fragmento = this.fragmento();
            untracked(() => {
                this.memoria.selecionarLivro(livro);
                this.ancoraInicial.set(fragmento ?? this.memoria.recuperarSecao(livro));
            });
        });
    }

    protected trocarDocumento(livro: RegrasDocumento["id"]): void {
        void this.router.navigate(["/regras", livro], {
            fragment: this.memoria.recuperarSecao(livro) ?? undefined,
        });
    }

    protected alterarUrl(ancora: string | null): void {
        const url = this.router.serializeUrl(this.router.createUrlTree(
            ["/regras", this.livro()], { fragment: ancora ?? undefined }));
        if (this.location.path(true) !== url) {
            this.location.replaceState(url, "", this.location.getState());
        }
    }
}
