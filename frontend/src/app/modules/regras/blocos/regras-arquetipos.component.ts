import { Component, computed, forwardRef, inject, input, output, signal } from "@angular/core";
import { RegrasLeitorContexto } from "../regras-leitor-contexto";
import { RegrasArquetipos as BlocoArquetipos, RegrasClasse, RegrasDocumento, RegrasTrecho } from "../regras.model";
import { Abas } from "../../../shared/ui/abas/abas.component";
import { Aba } from "../../../shared/ui/abas/aba.component";
import { AbaPainel } from "../../../shared/ui/abas/aba-painel.directive";
import { Icone } from "../../../shared/icone/icone.component";
import { Chip } from "../../../shared/ui/chip/chip.component";
import { RegrasInline } from "./regras-inline.component";
import { RegrasConteudoRender } from "./regras-conteudo.component";
import { recuperarIconeIdentidade } from "./regras-identidade-icone";
import { lerTextoRegras } from "./regras-texto";
import { RegrasDestaque } from "./regras-destaque.component";

@Component({
    selector: "app-regras-arquetipos",
    imports: [
        Abas, Aba, AbaPainel, Icone, Chip, RegrasInline, RegrasDestaque,
        forwardRef(() => RegrasConteudoRender),
    ],
    templateUrl: "./regras-arquetipos.component.html",
    styleUrl: "./regras-arquetipos.component.scss",
})
export class RegrasArquetipos {
    readonly bloco = input.required<BlocoArquetipos>();
    readonly iniciais = input<RegrasClasse["arquetipos"]>([]);
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    readonly navegarAncora = output<string>();
    protected readonly selecionado = signal<string | null>(null);
    protected readonly ativo = computed(() => {
        const escolhido = this.selecionado();
        const lista = this.bloco().arquetipos;
        return lista.some(arquetipo => this.chave(arquetipo) === escolhido)
            ? escolhido : (lista[0] ? this.chave(lista[0]) : undefined);
    });
    protected readonly icone = recuperarIconeIdentidade;
    private readonly contexto = inject(RegrasLeitorContexto, { optional: true });
    protected selecionar(chave: string): void { this.selecionado.set(chave); }
    /** Na Oficina o arquétipo ainda sem nome é identificado pela peça, não pelo nome (que pode repetir vazio). */
    protected chave(arquetipo: { readonly peca?: string; readonly nome: string }): string {
        return arquetipo.peca ?? arquetipo.nome;
    }
    /** Um selo por bônus ("+1 em Luta"), sem reescrever o texto da fonte. */
    protected bonus(trechos: readonly RegrasTrecho[]): readonly string[] | null {
        const itens = lerTextoRegras(trechos).trim().split(/\s+(?=\+\d)/).filter(Boolean);
        return itens.length ? itens : null;
    }
    protected habilidadeInicial(nome: string, indice: number) {
        return (nome ? this.iniciais().find(arquetipo => arquetipo.nome === nome) : this.iniciais()[indice])
            ?.habilidadeInicial;
    }
    protected identificador(nome: string): string {
        const identificador = "arquetipo-" + this.documento() + "-" + this.bloco().classe.toLowerCase()
            + "-" + nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, "-");
        return this.contexto?.identificar(identificador) ?? identificador;
    }
}
