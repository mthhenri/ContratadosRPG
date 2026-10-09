import { Component, DestroyRef, ElementRef, effect, inject, output, viewChild } from "@angular/core";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { Campo } from "../../shared/ui/campo/campo.component";
import { Botao } from "../../shared/ui/botao/botao.component";
import { BotaoIcone } from "../../shared/ui/botao-icone/botao-icone.component";
import { Tooltip } from "../../shared/tooltip/tooltip.directive";
import { EstadoVazio } from "../../shared/ui/estado-vazio/estado-vazio.component";
import { RegrasPesquisaController } from "./regras-pesquisa.controller";

@Component({
    selector: "app-regras-pesquisa",
    imports: [ReactiveFormsModule, Campo, Botao, BotaoIcone, Tooltip, EstadoVazio],
    templateUrl: "./regras-pesquisa.component.html",
    styleUrl: "./regras-pesquisa.component.scss",
    host: { "(keydown)": "tratarTecla($event)" },
})
export class RegrasPesquisa {
    protected readonly pesquisa = inject(RegrasPesquisaController);
    protected readonly termo = new FormControl(this.pesquisa.termo(), { nonNullable: true });
    private readonly campo = viewChild.required<ElementRef<HTMLInputElement>>("campoPesquisa");
    readonly abrirOutro = output<void>();
    readonly selecionar = output<number>();

    constructor() {
        const assinatura = this.termo.valueChanges.subscribe(termo =>
            this.pesquisa.alterarTermo(termo));
        inject(DestroyRef).onDestroy(() => assinatura.unsubscribe());
        effect(() => this.termo.setValue(this.pesquisa.termo(), { emitEvent: false }));
    }

    protected limpar(): void {
        this.termo.setValue("", { emitEvent: false });
        this.pesquisa.limpar();
        this.campo().nativeElement.focus();
    }

    protected tratarTecla(evento: KeyboardEvent): void {
        if (evento.key === "Escape" && this.termo.value) {
            evento.preventDefault(); evento.stopPropagation(); this.limpar();
        } else if (evento.key === "Enter" && evento.target instanceof HTMLInputElement
            && this.termo.value !== this.pesquisa.termo()) {
            evento.preventDefault(); evento.stopPropagation();
            this.pesquisa.confirmarTermo(this.termo.value);
        } else {
            this.pesquisa.tratarTecla(evento);
        }
    }
}
