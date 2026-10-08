import { Component, computed, forwardRef, input, output } from "@angular/core";
import { RegrasArquetipos as BlocoArquetipos, RegrasClasse as BlocoClasse, RegrasDocumento, RegrasTrecho } from "../regras.model";
import { Cartao } from "../../../shared/ui/cartao/cartao.component";
import { Stat, StatValor } from "../../../shared/ui/stat/stat.component";
import { Icone } from "../../../shared/icone/icone.component";
import { Tooltip } from "../../../shared/tooltip/tooltip.directive";
import { RegrasInline } from "./regras-inline.component";
import { RegrasArquetipos } from "./regras-arquetipos.component";
import { RegrasConteudoRender } from "./regras-conteudo.component";
import { recuperarIconeIdentidade } from "./regras-identidade-icone";

@Component({
    selector: "app-regras-classe",
    imports: [
        Cartao, Stat, StatValor, Icone, Tooltip, RegrasInline, RegrasArquetipos,
        forwardRef(() => RegrasConteudoRender),
    ],
    templateUrl: "./regras-classe.component.html",
    styleUrl: "./regras-classe.component.scss",
})
export class RegrasClasse {
    readonly bloco = input.required<BlocoClasse>();
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    readonly navegarAncora = output<string>();
    protected readonly icone = computed(() => recuperarIconeIdentidade(this.bloco().nome));
    protected readonly arquetipos = computed<readonly BlocoArquetipos[]>(() => {
        const bloco = this.bloco();
        if (bloco.filhos?.length) return bloco.filhos;
        if (!bloco.arquetipos.length) return [];
        return [{ tipo: "arquetipos", classe: bloco.nome, cabecalho: [], linhas: [],
            arquetipos: bloco.arquetipos.map(arquetipo => ({ nome: arquetipo.nome, citacao: [],
                atributosBonus: [], habilidades: [], habilidadesGeraisMelhoradas: [] })) }];
    });
    protected texto(trechos: readonly RegrasTrecho[]): string {
        return trechos.map(trecho => "filhos" in trecho ? this.texto(trecho.filhos)
            : "texto" in trecho ? trecho.texto : "Trecho censurado").join("");
    }
}
