import { Component, computed, input, output } from "@angular/core";
import { RegrasAbertura as BlocoAbertura, RegrasDocumento, RegrasTrecho } from "../regras.model";
import { RegrasInline } from "./regras-inline.component";

/** Registro oficial que abre o livro, no cartão centralizado do exemplão M10 (`.capa`). */
@Component({
    selector: "app-regras-abertura",
    imports: [RegrasInline],
    template: `
        <section class="regras-abertura" [attr.aria-label]="bloco().titulo">
            <p class="regras-abertura__titulo">{{ bloco().titulo }}</p>
            @for (paragrafo of paragrafos(); track $index; let fechamento = $last) {
                <p class="regras-abertura__texto"
                    [class.regras-abertura__texto--fechamento]="fechamento">
                    <app-regras-inline
                        [trechos]="paragrafo"
                        [documento]="documento()"
                        (navegarAncora)="navegarAncora.emit($event)"
                    />
                </p>
            }
        </section>
    `,
    styleUrl: "./regras-abertura.component.scss",
})
export class RegrasAbertura {
    readonly bloco = input.required<BlocoAbertura>();
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    readonly navegarAncora = output<string>();

    /** O itálico externo é a marca da abertura na fonte; a leitura usa parágrafos normais. */
    protected readonly paragrafos = computed(() => {
        const paragrafos: RegrasTrecho[][] = [[]];
        const trechos = this.bloco().trechos.flatMap((trecho) =>
            trecho.tipo === "italico" ? trecho.filhos : [trecho]);
        for (const trecho of trechos) {
            if (trecho.tipo !== "texto") {
                paragrafos[paragrafos.length - 1].push(trecho);
                continue;
            }
            trecho.texto.split(/\n\s*\n/).forEach((texto, indice) => {
                if (indice > 0) paragrafos.push([]);
                if (texto) paragrafos[paragrafos.length - 1].push({ tipo: "texto", texto });
            });
        }
        return paragrafos.filter((paragrafo) => paragrafo.some((trecho) =>
            trecho.tipo !== "texto" || trecho.texto.trim()));
    });
}
