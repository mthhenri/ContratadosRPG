import { Component, input, output } from "@angular/core";
import { Chip } from "../../../shared/ui/chip/chip.component";
import { RegrasDocumento, RegrasHabilidadeCriatura as Habilidade } from "../regras.model";
import { RegrasInline } from "./regras-inline.component";

@Component({
    selector: "app-regras-habilidade-criatura",
    imports: [Chip, RegrasInline],
    templateUrl: "./regras-habilidade-criatura.component.html",
    styleUrl: "./regras-guia.scss",
})
export class RegrasHabilidadeCriatura {
    readonly bloco = input.required<Habilidade>();
    readonly documento = input<RegrasDocumento["id"]>("guia");
    readonly navegarAncora = output<string>();
}
