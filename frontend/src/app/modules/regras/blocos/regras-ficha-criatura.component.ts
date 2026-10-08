import { Component, computed, forwardRef, input, output } from "@angular/core";
import { Stat, StatValor } from "../../../shared/ui/stat/stat.component";
import { Chip } from "../../../shared/ui/chip/chip.component";
import { Cartao } from "../../../shared/ui/cartao/cartao.component";
import { Icone } from "../../../shared/icone/icone.component";
import { Tooltip } from "../../../shared/tooltip/tooltip.directive";
import { RegrasDocumento, RegrasFichaCriatura as Ficha } from "../regras.model";
import { RegrasInline } from "./regras-inline.component";
import { RegrasIdentidade } from "./regras-identidade.component";
import { RegrasAtributos } from "./regras-atributos.component";
import { RegrasAmeaca } from "./regras-ameaca.component";
import { RegrasHabilidadeCriatura } from "./regras-habilidade-criatura.component";
import { RegrasConteudoRender } from "./regras-conteudo.component";
import { lerTextoRegras } from "./regras-texto";

@Component({
    selector: "app-regras-ficha-criatura",
    imports: [Stat, StatValor, Chip, Cartao, Icone, Tooltip, RegrasInline,
        RegrasIdentidade, RegrasAtributos, RegrasAmeaca, RegrasHabilidadeCriatura,
        forwardRef(() => RegrasConteudoRender)],
    templateUrl: "./regras-ficha-criatura.component.html",
    styleUrl: "./regras-ficha-criatura.component.scss",
})
export class RegrasFichaCriatura {
    readonly bloco = input.required<Ficha>();
    readonly documento = input<RegrasDocumento["id"]>("guia");
    readonly navegarAncora = output<string>();
    protected readonly nivel = computed(() =>
        this.bloco().identidade.campos.find((campo) => campo.nivel !== undefined)?.nivel ?? 0);
    protected readonly conceito = computed(() =>
        this.bloco().identidade.campos.find((campo) => campo.rotulo === "Conceito")?.valor ?? []);
    protected readonly introducao = computed(() =>
        this.bloco().filhos.filter((filho) => filho.tipo !== "secao"));
    protected readonly resistencias = computed(() => lerTextoRegras(this.bloco().resistencias)
        .replace(/^Resistências escolhidas:\s*/, "").split(" e ").filter(Boolean));
    protected ancora(titulo: string): string | undefined {
        const secao = this.bloco().filhos.find((filho) =>
            filho.tipo === "secao" && filho.titulo === titulo);
        return secao?.tipo === "secao" ? secao.ancora : undefined;
    }
    protected apoio(titulo: string) {
        const secao = this.bloco().filhos.find((filho) =>
            filho.tipo === "secao" && filho.titulo === titulo);
        return secao?.tipo === "secao" ? secao.filhos.filter((filho) => {
            if (["identidade", "atributos", "habilidade-criatura"].includes(filho.tipo)) {
                return false;
            }
            if (titulo === "Ações, Ataques e Habilidades" && filho.tipo === "paragrafo") {
                const texto = lerTextoRegras(filho.trechos);
                return texto.trim() !== "Habilidades Especiais"
                    && !this.bloco().ataques.some(ataque => texto.includes(ataque.nome + " |"));
            }
            return true;
        }) : [];
    }
    protected readonly deslocamentos = computed(() => [
        { rotulo: "Regeneração", trechos: this.bloco().regeneracao },
        { rotulo: "Porte", trechos: this.bloco().porte },
        { rotulo: "Deslocamento", trechos: this.bloco().deslocamento },
    ]);
}
