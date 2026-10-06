import {
    Component, ElementRef, computed, effect, inject, input, signal, viewChildren,
} from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import { AutoFocus } from "../../../../shared/auto-focus/auto-focus.directive";
import { Icone } from "../../../../shared/icone/icone.component";
import { Tooltip } from "../../../../shared/tooltip/tooltip.directive";
import { BotaoIcone } from "../../../../shared/ui/botao-icone/botao-icone.component";
import { Campo } from "../../../../shared/ui/campo/campo.component";
import { Chip } from "../../../../shared/ui/chip/chip.component";
import { EstadoVazio } from "../../../../shared/ui/estado-vazio/estado-vazio.component";
import { NpcEdicaoFormulario, criarSequelaFormulario, criarTraumaFormulario }
    from "../../npc-edicao-formulario.service";
import type { GrupoEdicaoNpc } from "../../npc-edicao-formulario.service";
import { NpcBlocoAcoes } from "./npc-bloco-acoes.component";

type ListaSanidadeNpc = "sequelas" | "traumas";

@Component({
    selector: "app-npc-sanidade-lista",
    imports: [ReactiveFormsModule, AutoFocus, Icone, Tooltip, BotaoIcone, Campo, Chip, EstadoVazio,
        NpcBlocoAcoes],
    templateUrl: "./npc-sanidade-lista.component.html", styleUrl: "./npc-visualizacao.scss",
})
export class NpcSanidadeLista {
    readonly formulario = inject(NpcEdicaoFormulario);
    readonly gerenciavel = input(false);
    /** Sequelas e Traumas são dois blocos independentes (m4-16) — cada lápis abre só a própria
     * lista; nenhum lápis abre campos da outra (decisão "Identidade × Cooperação sem grupo oculto",
     * generalizada aqui). */
    readonly listas: readonly { chave: ListaSanidadeNpc; nome: string }[] = [
        { chave: "sequelas", nome: "Sequelas" }, { chave: "traumas", nome: "Traumas" },
    ];
    readonly indiceEditando = signal<number | null>(null);
    readonly ficha = computed(() => this.formulario.edicao.rascunho()
        ?? this.formulario.edicao.ficha());
    private readonly secoesLista = viewChildren<ElementRef<HTMLElement>>("secaoLista");

    constructor() {
        /** Foco no bloco ao abrir pelo lápis sem selecionar item (item 3, m4-16) — ao adicionar/
         * editar um item específico, o campo dele já ganha foco pelo próprio `appAutoFocus`. */
        effect(() => {
            if (this.indiceEditando() !== null) return;
            const indice = this.listas.findIndex((lista) => this.modoEdicao(lista.chave));
            const elemento = indice >= 0 ? this.secoesLista()[indice]?.nativeElement : undefined;
            if (elemento) setTimeout(() => elemento.focus());
        });
    }

    modoEdicao(lista: ListaSanidadeNpc): boolean {
        return this.formulario.grupo() === lista;
    }

    emEdicao(lista: ListaSanidadeNpc, indice: number): boolean {
        return this.gerenciavel() && this.modoEdicao(lista) && this.indiceEditando() === indice;
    }

    iniciar(lista: ListaSanidadeNpc): void {
        if (!this.gerenciavel()) return;
        this.formulario.iniciar(lista as GrupoEdicaoNpc);
    }

    /** Sem "Concluir" por item (m4-16): o Salvar da lista é a única confirmação. Item inválido
     * reabre para o erro aparecer nele, em vez de só no topo da lista. */
    async salvar(): Promise<void> {
        const lista = this.formulario.grupo();
        if (await this.formulario.salvar()) { this.indiceEditando.set(null); return; }
        if (lista !== "sequelas" && lista !== "traumas") return;
        const controles: readonly { invalid: boolean }[] = this.formulario[lista].controls;
        const invalido = controles.findIndex((item) => item.invalid);
        if (invalido >= 0) this.indiceEditando.set(invalido);
    }

    cancelar(): void {
        this.formulario.cancelar();
        this.indiceEditando.set(null);
    }

    /** Esc cancela a lista em edição; Ctrl/Cmd+Enter salva (item 3, m4-16). */
    aoTecla(evento: KeyboardEvent): void {
        if (evento.key === "Escape") { evento.stopPropagation(); this.cancelar(); }
        else if (evento.key === "Enter" && (evento.ctrlKey || evento.metaKey)) {
            evento.preventDefault(); void this.salvar();
        }
    }

    editar(lista: ListaSanidadeNpc, indice: number): void {
        if (!this.gerenciavel() || this.formulario.edicao.salvando()) return;
        this.iniciar(lista); this.indiceEditando.set(indice);
    }

    adicionar(lista: ListaSanidadeNpc): void {
        if (!this.gerenciavel() || this.formulario.edicao.salvando()) return;
        this.iniciar(lista);
        if (lista === "sequelas") this.formulario.sequelas.push(criarSequelaFormulario());
        else this.formulario.traumas.push(criarTraumaFormulario());
        this.indiceEditando.set(this.formulario[lista].length - 1);
    }

    remover(lista: ListaSanidadeNpc, indice: number): void {
        if (!this.gerenciavel() || this.formulario.edicao.salvando()) return;
        this.iniciar(lista);
        this.formulario[lista].removeAt(indice); this.indiceEditando.set(null);
    }
}
