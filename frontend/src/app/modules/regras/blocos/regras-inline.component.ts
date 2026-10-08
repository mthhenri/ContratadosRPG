import { Component, forwardRef, input, output } from "@angular/core";
import { RegrasDocumento, RegrasTrecho } from "../regras.model";
import { RegrasAmeaca } from "./regras-ameaca.component";
import { Icone } from "../../../shared/icone/icone.component";
import { recuperarIconeIdentidade } from "./regras-identidade-icone";

@Component({
    selector: "app-regras-inline",
    imports: [forwardRef(() => RegrasInline), RegrasAmeaca, Icone],
    templateUrl: "./regras-inline.component.html",
    styleUrl: "./regras-inline.component.scss",
})
export class RegrasInline {
    readonly trechos = input.required<readonly RegrasTrecho[]>();
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    readonly navegarAncora = output<string>();
    protected iconeSubclasse(texto: string) {
        return texto.startsWith("⬥ Experimento ")
            ? recuperarIconeIdentidade(texto.replace(/^⬥\s*/, "").trim()) : undefined;
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
