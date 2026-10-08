import { Component, input } from "@angular/core";
import { RegrasConteudoRender } from "./blocos/regras-conteudo.component";
import { RegrasLeitorContexto } from "./regras-leitor-contexto";
import { RegrasDocumento } from "./regras.model";

/** Projeção inerte para contar o outro livro, com IDs próprios e sem observador de leitura. */
@Component({
    selector: "app-regras-pesquisa-projecao",
    providers: [RegrasLeitorContexto],
    imports: [RegrasConteudoRender],
    template: `<app-regras-conteudo [filhos]="documento().filhos"
        [documento]="documento().id" />`,
})
export class RegrasPesquisaProjecao {
    readonly documento = input.required<RegrasDocumento>();
}
