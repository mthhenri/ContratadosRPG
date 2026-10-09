import { Component, input, output } from "@angular/core";
import { RegrasDocumento, RegrasTrecho } from "../regras.model";
import { Stat, StatValor } from "../../../shared/ui/stat/stat.component";
import { Icone } from "../../../shared/icone/icone.component";
import { Tooltip } from "../../../shared/tooltip/tooltip.directive";
import { RegrasInline } from "./regras-inline.component";
import { lerTextoRegras } from "./regras-texto";

interface RegrasRecursos {
    readonly vida: readonly RegrasTrecho[];
    readonly energia: readonly RegrasTrecho[];
}

/** Vida e Energia iniciais com a progressão por nível, comuns a classe e subclasse. */
@Component({
    selector: "app-regras-saude",
    imports: [Stat, StatValor, Icone, Tooltip, RegrasInline],
    templateUrl: "./regras-saude.component.html",
    styleUrl: "./regras-saude.component.scss",
})
export class RegrasSaude {
    readonly saude = input.required<RegrasRecursos>();
    readonly progressao = input.required<RegrasRecursos>();
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    readonly navegarAncora = output<string>();
    protected readonly texto = lerTextoRegras;
}
