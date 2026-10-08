import { Component, input, output } from "@angular/core";
import { Chip } from "../../../shared/ui/chip/chip.component";
import { RegrasDocumento, RegrasEquipamentos } from "../regras.model";
import { RegrasInline } from "./regras-inline.component";

@Component({
    selector: "app-regras-equipamentos",
    imports: [Chip, RegrasInline],
    templateUrl: "./regras-equipamentos.component.html",
    styleUrl: "./regras-equipamentos.component.scss",
})
export class RegrasEquipamentosRender {
    readonly bloco = input.required<RegrasEquipamentos>();
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    readonly navegarAncora = output<string>();
}
