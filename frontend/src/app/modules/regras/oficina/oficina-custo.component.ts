import { Component, inject, input, signal } from "@angular/core";

import { AutoFocus } from "../../../shared/auto-focus/auto-focus.directive";
import { Icone } from "../../../shared/icone/icone.component";
import { Chip } from "../../../shared/ui/chip/chip.component";
import { NotificacaoService } from "../../../shared/ui/notificacao/notificacao.service";
import { ValorEditavel } from "../../../shared/ui/valor-editavel/valor-editavel.component";
import { OficinaStore } from "./oficina.store";
import { lerCustoDigitado } from "./oficina-custo";

/**
 * Selo de custo de Energia editável (m11-06): o próprio selo vira campo ao clicar. Aceita um número
 * inteiro de 0 a 99 ou `X`; Enter confirma, Esc cancela e valor inválido fica no campo, com aviso.
 */
@Component({
    selector: "app-oficina-custo",
    imports: [Chip, Icone, ValorEditavel, AutoFocus],
    template: `
        <app-chip severidade="energia" tom="sutil" class="oficina-custo">
            <app-icone nome="energia" />
            <app-valor-editavel
                variante="herdado"
                rotuloAria="custo de Energia"
                tooltip="Custo de Energia: número ou X"
                [valor]="custo()"
                [editando]="editando()"
                (editarSolicitado)="editando.set(true)"
            >
                <input
                    #entrada
                    appAutoFocus
                    class="oficina-custo__entrada"
                    type="text"
                    inputmode="numeric"
                    maxlength="2"
                    aria-label="Custo de Energia"
                    [class.oficina-custo__entrada--invalida]="invalido()"
                    [attr.aria-invalid]="invalido()"
                    [value]="custo()"
                    (input)="invalido.set(false)"
                    (keydown.enter)="confirmar(entrada.value); $event.preventDefault()"
                    (keydown.escape)="cancelar()"
                    (blur)="confirmar(entrada.value)"
                />
            </app-valor-editavel>
        </app-chip>
    `,
    styleUrl: "./oficina-custo.component.scss",
})
export class OficinaCusto {
    readonly peca = input.required<string>();
    readonly custo = input.required<number | "X">();

    private readonly store = inject(OficinaStore);
    private readonly notificacao = inject(NotificacaoService);
    protected readonly editando = signal(false);
    protected readonly invalido = signal(false);

    protected confirmar(digitado: string): void {
        if (!this.editando()) return;
        const novo = lerCustoDigitado(digitado);
        if (novo === null) {
            this.invalido.set(true);
            this.notificacao.notificar({ severidade: "aviso", resumo: "Custo inválido",
                detalhe: "Use um número inteiro de 0 a 99 ou X." });
            return;
        }
        this.editando.set(false);
        const item = this.store.item(this.peca());
        if (!item || novo === this.custo()) return;
        this.store.alterarDados(this.peca(), { ...item.dados, custo: novo } as typeof item.dados, {
            rotulo: "Custo de Energia", chave: `${this.peca()}:custo`,
        });
        void this.store.salvarAgora(item.id);
    }

    protected cancelar(): void {
        this.invalido.set(false);
        this.editando.set(false);
    }
}
