import { Component, input } from "@angular/core";
import { Stat } from "../../../shared/ui/stat/stat.component";
import { RegrasAtributos as Atributos } from "../regras.model";

@Component({
    selector: "app-regras-atributos",
    imports: [Stat],
    templateUrl: "./regras-atributos.component.html",
    styleUrl: "./regras-guia.scss",
})
export class RegrasAtributos {
    readonly bloco = input.required<Atributos>();

    protected corModificador(modificador: string): string {
        const cores: Record<string, string> = {
            Forte: "forte", Médio: "medio", Fraco: "fraco", Frágil: "fragil",
        };
        return cores[modificador] ?? "fraco";
    }
}
