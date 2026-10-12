import { Component, computed, forwardRef, inject, input, output } from "@angular/core";
import { RegrasLeitorContexto } from "../regras-leitor-contexto";
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
import { TipoRegraPecaEnum } from "@contratados-rpg/shared/enums";
import { Botao } from "../../../shared/ui/botao/botao.component";
import { BotaoIcone } from "../../../shared/ui/botao-icone/botao-icone.component";
import { OficinaInsercao } from "../oficina/oficina-insercao.component";
import { OficinaTexto } from "../oficina/oficina-texto.component";
import { OficinaStore } from "../oficina/oficina.store";

@Component({
    selector: "app-regras-ficha-criatura",
    imports: [Stat, StatValor, Chip, Cartao, Icone, Tooltip, RegrasInline,
        RegrasIdentidade, RegrasAtributos, RegrasAmeaca, RegrasHabilidadeCriatura,
        Botao, BotaoIcone, OficinaInsercao, OficinaTexto, forwardRef(() => RegrasConteudoRender)],
    templateUrl: "./regras-ficha-criatura.component.html",
    styleUrl: "./regras-ficha-criatura.component.scss",
})
export class RegrasFichaCriatura {
    readonly bloco = input.required<Ficha>();
    readonly documento = input<RegrasDocumento["id"]>("guia");
    readonly navegarAncora = output<string>();
    private readonly contexto = inject(RegrasLeitorContexto, { optional: true });
    private readonly oficina = inject(OficinaStore, { optional: true });
    protected readonly tiposHabilidade = [TipoRegraPecaEnum.HABILIDADE_CRIATURA];
    protected readonly editando = computed(() => !!this.bloco().peca && this.oficina?.estado() === "ok");
    /** Adicionar e remover ataque só aparecem com a ficha selecionada. */
    protected readonly selecionada = computed(() => this.editando() && this.oficina?.selecionada() === this.bloco().peca);
    protected readonly indiceConceito = computed(() =>
        this.bloco().identidade.campos.findIndex((campo) => campo.rotulo === "Conceito"));
    protected identificador(titulo: string): string | undefined {
        const ancora = this.ancora(titulo);
        return ancora ? this.contexto?.identificar(ancora) ?? ancora : undefined;
    }
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
        { rotulo: "Regeneração", campo: "regeneracao", trechos: this.bloco().regeneracao },
        { rotulo: "Porte", campo: "porte", trechos: this.bloco().porte },
        { rotulo: "Deslocamento", campo: "deslocamento", trechos: this.bloco().deslocamento },
    ]);

    /** Os ataques vêm do store, não do template: uma digitação recém-entregue não pode ser sobrescrita. */
    private ataquesDe(): Ficha["ataques"] {
        const dados = this.oficina?.item(this.bloco().peca as string)?.dados as { ataques?: Ficha["ataques"] } | undefined;
        return dados?.ataques ?? this.bloco().ataques;
    }

    protected adicionarAtaque(): void {
        this.oficina?.alterarCampo(this.bloco().peca as string, ["ataques"],
            [...this.ataquesDe(), { nome: "", acao: "", teste: "", dano: "", efeito: [] }], "Adicionar ataque", false);
    }

    protected removerAtaque(indice: number): void {
        this.oficina?.alterarCampo(this.bloco().peca as string, ["ataques"],
            this.ataquesDe().filter((_, posicao) => posicao !== indice), "Remover ataque", false);
    }
}
