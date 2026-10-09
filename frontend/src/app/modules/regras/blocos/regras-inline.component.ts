import { Component, forwardRef, input, output } from "@angular/core";
import { RegrasDocumento, RegrasTrecho } from "../regras.model";
import { NIVEIS_AMEACA, RegrasAmeaca } from "./regras-ameaca.component";
import { Tooltip } from "../../../shared/tooltip/tooltip.directive";
import { descreverCondicao, separarCondicoesTexto } from "../../../shared/condicoes/condicoes";

/** Parte de um texto corrido; `recurso` pinta Vida/Energia na cor do recurso. */
interface RegrasParteTexto {
    readonly texto: string;
    readonly recurso?: "vida" | "energia";
    readonly condicao?: string;
}

@Component({
    selector: "app-regras-inline",
    imports: [forwardRef(() => RegrasInline), RegrasAmeaca, Tooltip],
    templateUrl: "./regras-inline.component.html",
    styleUrl: "./regras-inline.component.scss",
})
export class RegrasInline {
    readonly trechos = input.required<readonly RegrasTrecho[]>();
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    /** Nome de item (ex.: amplificador "Vida"): palavra de recurso fica sem a cor do recurso. */
    readonly semCorRecurso = input(false);
    readonly navegarAncora = output<string>();
    protected readonly descreverCondicao = descreverCondicao;

    /**
     * Condições recebem o tooltip canônico; Vida e Energia usam a cor do recurso.
     * A marcação é só de apresentação: o JSON e o texto pesquisável continuam iguais.
     */
    protected partes(texto: string): readonly RegrasParteTexto[] {
        return separarCondicoesTexto(texto).flatMap((parte) => {
            const descricao = descreverCondicao(parte);
            if (descricao) return [{ texto: parte, condicao: descricao }];
            if (this.semCorRecurso()) return [{ texto: parte }];
            return parte.split(/\b(Vida|Energia)\b/).filter(Boolean).map((recurso) =>
                recurso === "Vida" ? { texto: recurso, recurso: "vida" as const }
                    : recurso === "Energia" ? { texto: recurso, recurso: "energia" as const }
                        : { texto: recurso });
        });
    }

    protected corAmeaca(nivel: number): string {
        return NIVEIS_AMEACA[nivel] ?? "desconhecida";
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
