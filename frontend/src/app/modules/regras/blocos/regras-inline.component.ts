import { Component, forwardRef, input, output } from "@angular/core";
import { RegrasDocumento, RegrasTrecho } from "../regras.model";
import { RegrasAmeaca } from "./regras-ameaca.component";

/** Parte de um texto corrido; `recurso` pinta Vida/Energia na cor do recurso. */
interface RegrasParteTexto {
    readonly texto: string;
    readonly recurso?: "vida" | "energia";
}

@Component({
    selector: "app-regras-inline",
    imports: [forwardRef(() => RegrasInline), RegrasAmeaca],
    templateUrl: "./regras-inline.component.html",
    styleUrl: "./regras-inline.component.scss",
})
export class RegrasInline {
    readonly trechos = input.required<readonly RegrasTrecho[]>();
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    readonly navegarAncora = output<string>();

    /**
     * Vida e Energia, palavra inteira com maiúscula (termo de regra), na cor do recurso. A
     * marcação é só de apresentação: o JSON e o texto pesquisável continuam iguais.
     */
    protected partes(texto: string): readonly RegrasParteTexto[] {
        return texto.split(/\b(Vida|Energia)\b/).filter(Boolean).map((parte) =>
            parte === "Vida" ? { texto: parte, recurso: "vida" }
                : parte === "Energia" ? { texto: parte, recurso: "energia" } : { texto: parte });
    }

    protected navegar(evento: MouseEvent, ancora: string): void {
        if (evento.button !== 0 || evento.ctrlKey || evento.metaKey
            || evento.shiftKey || evento.altKey) return;
        evento.preventDefault();
        this.navegarAncora.emit(ancora);
    }

    protected larguraTarja(comprimento: number): number {
        return Math.max(1, Math.min(120, comprimento));
    }
}
