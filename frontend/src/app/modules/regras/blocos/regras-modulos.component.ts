import { Component, input, output } from "@angular/core";
import { Cartao } from "../../../shared/ui/cartao/cartao.component";
import { Chip } from "../../../shared/ui/chip/chip.component";
import { Tooltip } from "../../../shared/tooltip/tooltip.directive";
import { Icone } from "../../../shared/icone/icone.component";
import { RegrasDocumento, RegrasModulos } from "../regras.model";

@Component({
    selector: "app-regras-modulos",
    imports: [Cartao, Chip, Tooltip, Icone],
    templateUrl: "./regras-modulos.component.html",
    styleUrl: "./regras-modulos.component.scss",
})
export class RegrasModulosRender {
    readonly bloco = input.required<RegrasModulos>();
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    readonly navegarAncora = output<string>();
}
