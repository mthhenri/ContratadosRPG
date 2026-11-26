import { Component, input } from "@angular/core";
import { RegrasCapa as BlocoCapa } from "../regras.model";

/** Capa do livro logo após a abertura: selo de versão, título e subtítulo (se houver) centralizados. */
@Component({
    selector: "app-regras-capa",
    template: `
        <header class="regras-capa">
            @if (bloco().versao; as versao) {
                <p class="regras-capa__versao">{{ versao }}</p>
            }
            <p class="regras-capa__titulo">{{ bloco().titulo }}</p>
            @if (bloco().subtitulo; as subtitulo) {
                <p class="regras-capa__subtitulo">{{ subtitulo }}</p>
            }
        </header>
    `,
    styleUrl: "./regras-capa.component.scss",
})
export class RegrasCapa {
    readonly bloco = input.required<BlocoCapa>();
}
