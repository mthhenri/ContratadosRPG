import { Component, computed, forwardRef, inject, input, output, signal } from "@angular/core";
import { RegrasLeitorContexto } from "../regras-leitor-contexto";
import { RegrasArquetipos as BlocoArquetipos, RegrasClasse, RegrasDocumento } from "../regras.model";
import { Abas } from "../../../shared/ui/abas/abas.component";
import { Aba } from "../../../shared/ui/abas/aba.component";
import { AbaPainel } from "../../../shared/ui/abas/aba-painel.directive";
import { Icone } from "../../../shared/icone/icone.component";
import { RegrasInline } from "./regras-inline.component";
import { RegrasConteudoRender } from "./regras-conteudo.component";
import { recuperarIconeIdentidade } from "./regras-identidade-icone";

@Component({
    selector: "app-regras-arquetipos",
    imports: [
        Abas, Aba, AbaPainel, Icone, RegrasInline,
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
        const nome = this.selecionado();
        return this.bloco().arquetipos.some(arquetipo => arquetipo.nome === nome)
            ? nome : this.bloco().arquetipos[0]?.nome;
    });
    protected readonly icone = recuperarIconeIdentidade;
    private readonly contexto = inject(RegrasLeitorContexto, { optional: true });
    protected selecionar(nome: string): void { this.selecionado.set(nome); }
    protected habilidadeInicial(nome: string) {
        return this.iniciais().find(arquetipo => arquetipo.nome === nome)?.habilidadeInicial;
    }
    protected identificador(nome: string): string {
        const identificador = "arquetipo-" + this.documento() + "-" + this.bloco().classe.toLowerCase()
            + "-" + nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, "-");
        return this.contexto?.identificar(identificador) ?? identificador;
    }
}
