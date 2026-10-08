import { Component, computed, forwardRef, input, output } from "@angular/core";
import { RegrasBloco, RegrasDocumento, RegrasFonteTabela, RegrasTrecho } from "../regras.model";
import { RegrasConteudoRender } from "./regras-conteudo.component";
import { RegrasTabela } from "./regras-tabela.component";
import { RegrasInline } from "./regras-inline.component";

/** Leitura da fonte preservada enquanto os desenhos especializados da M10-07 não existem. */
@Component({
    selector: "app-regras-rico-fonte",
    imports: [forwardRef(() => RegrasConteudoRender), RegrasTabela, RegrasInline],
    templateUrl: "./regras-rico-fonte.component.html",
    styleUrl: "./regras-rico-fonte.component.scss",
})
export class RegrasRicoFonte {
    readonly bloco = input.required<RegrasBloco>();
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    readonly navegarAncora = output<string>();
    protected readonly tabela = computed(() => {
        const bloco = this.bloco();
        return "cabecalho" in bloco ? bloco : null;
    });

    protected readonly saude = computed<RegrasFonteTabela | null>(() => {
        const bloco = this.bloco();
        if (bloco.tipo !== "ficha-criatura") return null;
        const texto = (valor: string): readonly RegrasTrecho[] => [{ tipo: "texto", texto: valor }];
        return {
            cabecalho: [texto("Característica"), texto("Valor")],
            linhas: [
                [texto("Vida Máxima"), texto(bloco.vidaMaxima)],
                [texto("Defesa Base"), texto(bloco.defesaBase)],
                [texto("Resistências"), bloco.resistencias],
                [texto("Fraquezas"), bloco.fraquezas],
                [texto("Regeneração"), bloco.regeneracao],
                [texto("Porte"), bloco.porte],
                [texto("Deslocamento"), bloco.deslocamento],
                [texto("Cadência"), texto(bloco.cadencia)],
            ],
        };
    });
}
