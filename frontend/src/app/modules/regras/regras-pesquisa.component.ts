import { Component, DestroyRef, effect, inject, output } from "@angular/core";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { Campo } from "../../shared/ui/campo/campo.component";
import { Botao } from "../../shared/ui/botao/botao.component";
import { EstadoVazio } from "../../shared/ui/estado-vazio/estado-vazio.component";
import { RegrasPesquisaController } from "./regras-pesquisa.controller";

@Component({
    selector: "app-regras-pesquisa",
    imports: [ReactiveFormsModule, Campo, Botao, EstadoVazio],
    templateUrl: "./regras-pesquisa.component.html",
    styleUrl: "./regras-pesquisa.component.scss",
    host: { "(keydown)": "pesquisa.tratarTecla($event)" },
})
export class RegrasPesquisa {
    protected readonly pesquisa = inject(RegrasPesquisaController);
    protected readonly termo = new FormControl(this.pesquisa.termo(), { nonNullable: true });
    readonly abrirOutro = output<void>();
    readonly selecionar = output<number>();

    constructor() {
        const assinatura = this.termo.valueChanges.subscribe(termo =>
            this.pesquisa.alterarTermo(termo));
        inject(DestroyRef).onDestroy(() => assinatura.unsubscribe());
        effect(() => this.termo.setValue(this.pesquisa.termo(), { emitEvent: false }));
    }
}
