import { Component, input, output } from "@angular/core";
import { RegrasAbertura as BlocoAbertura, RegrasDocumento } from "../regras.model";
import { RegrasInline } from "./regras-inline.component";

/** Registro oficial que abre o livro, no cartão centralizado do exemplão M10 (`.capa`). */
@Component({
    selector: "app-regras-abertura",
    imports: [RegrasInline],
    template: `
        <section class="regras-abertura" [attr.aria-label]="bloco().titulo">
            <p class="regras-abertura__titulo">{{ bloco().titulo }}</p>
            <p class="regras-abertura__texto">
                <app-regras-inline
                    [trechos]="bloco().trechos"
                    [documento]="documento()"
                    (navegarAncora)="navegarAncora.emit($event)"
                />
            </p>
        </section>
    `,
    styleUrl: "./regras-abertura.component.scss",
})
export class RegrasAbertura {
    readonly bloco = input.required<BlocoAbertura>();
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    readonly navegarAncora = output<string>();
}
