import { Component, input, output } from "@angular/core";
import { Botao } from "../../../../shared/ui/botao/botao.component";

/**
 * Linha Salvar + Cancelar de um bloco da ficha de NPC em edição (m4-16) — mesma receita de
 * `criatura__atributos-acoes`/`ficha-atributos__acoes`. `cabecalho` encaixa a linha no cabeçalho
 * das listas (Habilidades/Sequelas/Traumas, no lugar do lápis); sem ele, a linha ocupa a largura
 * do bloco logo abaixo do cabeçalho, botões divididos igualmente.
 */
@Component({
    selector: "app-npc-bloco-acoes",
    imports: [Botao],
    host: { "[class.npc-bloco-acoes--cabecalho]": "cabecalho()" },
    template: `
        <button
            app-botao
            type="button"
            variante="primario"
            tamanho="pequeno"
            [carregando]="salvando()"
            [disabled]="salvando() || bloquearSalvar()"
            (click)="salvar.emit()"
        >
            Salvar
        </button>
        <button
            app-botao
            type="button"
            variante="secundario"
            tamanho="pequeno"
            [disabled]="salvando()"
            (click)="cancelar.emit()"
        >
            Cancelar
        </button>
    `,
    styleUrl: "./npc-bloco-acoes.component.scss",
})
export class NpcBlocoAcoes {
    readonly salvando = input(false);
    /** Violação conhecida no rascunho do bloco — o backend recusaria a ficha inteira. */
    readonly bloquearSalvar = input(false);
    readonly cabecalho = input(false);
    readonly salvar = output<void>();
    readonly cancelar = output<void>();
}
