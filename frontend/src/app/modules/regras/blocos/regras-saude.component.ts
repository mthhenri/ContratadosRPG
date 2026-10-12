import { Component, computed, inject, input, output } from "@angular/core";
import { RegrasDocumento, RegrasTrecho } from "../regras.model";
import { Stat, StatValor } from "../../../shared/ui/stat/stat.component";
import { Icone } from "../../../shared/icone/icone.component";
import { Tooltip } from "../../../shared/tooltip/tooltip.directive";
import { RegrasInline } from "./regras-inline.component";
import { lerTextoRegras } from "./regras-texto";
import { OficinaStore } from "../oficina/oficina.store";

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
    /** Peça (classe ou subclasse) dona da saúde e da progressão; com ela, a Oficina edita os quatro textos. */
    readonly peca = input<string | undefined>(undefined);
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    readonly navegarAncora = output<string>();
    protected readonly texto = lerTextoRegras;
    protected readonly recursos = [
        { chave: "vida", nome: "Vida" }, { chave: "energia", nome: "Energia" },
    ] as const;
    private readonly oficina = inject(OficinaStore, { optional: true });
    protected readonly editando = computed(() => !!this.peca() && this.oficina?.estado() === "ok");
}
