import {
    Component, ElementRef, computed, effect, inject, input, signal, viewChild,
} from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import type { FichaNpcHabilidadeDto } from "@contratados-rpg/shared/dtos/ficha";
import { CategoriaNpcEnum, HabilidadeTipoNpcEnum } from "@contratados-rpg/shared/enums";
import {
    listarBibliotecaHabilidadesNpc, obterReferenciaCategoria, obterVolumeHabilidadesPorCategoria,
} from "@contratados-rpg/shared/regras/npc";
import { AutoFocus } from "../../../../shared/auto-focus/auto-focus.directive";
import { Icone } from "../../../../shared/icone/icone.component";
import { OverflowFade } from "../../../../shared/overflow-fade/overflow-fade.directive";
import { Tooltip } from "../../../../shared/tooltip/tooltip.directive";
import { Botao } from "../../../../shared/ui/botao/botao.component";
import { BotaoIcone } from "../../../../shared/ui/botao-icone/botao-icone.component";
import { Campo } from "../../../../shared/ui/campo/campo.component";
import { Cartao } from "../../../../shared/ui/cartao/cartao.component";
import { Modal } from "../../../../shared/ui/modal/modal.component";
import { Segmentado } from "../../../../shared/ui/segmentado/segmentado.component";
import { SegmentadoItem } from "../../../../shared/ui/segmentado/segmentado-item.component";
import { Chip } from "../../../../shared/ui/chip/chip.component";
import { EstadoVazio } from "../../../../shared/ui/estado-vazio/estado-vazio.component";
import { NpcEdicaoFormulario, criarHabilidadeFormulario } from "../../npc-edicao-formulario.service";
import { NpcBlocoAcoes } from "./npc-bloco-acoes.component";

@Component({
    selector: "app-npc-habilidades-lista",
    imports: [ReactiveFormsModule, AutoFocus, Icone, OverflowFade, Tooltip, Botao, BotaoIcone, Campo, Cartao,
        Chip, EstadoVazio, Modal, Segmentado, SegmentadoItem, NpcBlocoAcoes],
    templateUrl: "./npc-habilidades-lista.component.html",
    styleUrls: ["./npc-visualizacao.scss", "./npc-habilidades-lista.component.scss"],
})
export class NpcHabilidadesLista {
    readonly formulario = inject(NpcEdicaoFormulario);
    readonly gerenciavel = input(false);
    readonly indiceEditando = signal<number | null>(null);
    readonly tipos = HabilidadeTipoNpcEnum;
    readonly ficha = computed(() => this.formulario.edicao.rascunho()
        ?? this.formulario.edicao.ficha());
    readonly volume = computed(() => obterVolumeHabilidadesPorCategoria({
        categoria: this.ficha()!.dados.categoria,
    }));

    /** Itens só ganham editar/remover depois que o bloco entra em edição (lápis do cabeçalho). */
    readonly modoEdicao = computed(() => this.formulario.grupo() === "habilidades");
    readonly violacoes = computed(() => this.formulario.edicao.violacoes()
        .filter((violacao) => violacao.startsWith("habilidades:")));
    private readonly secaoLista = viewChild<ElementRef<HTMLElement>>("secaoLista");

    /** Biblioteca de Referência do Guia (m4-21) — modelos por Categoria, abre na do NPC. */
    readonly bibliotecaAberta = signal(false);
    readonly categoriasBiblioteca = [CategoriaNpcEnum.OPERATIVO, CategoriaNpcEnum.VETERANO,
        CategoriaNpcEnum.ELITE, CategoriaNpcEnum.LENDARIO].map((categoria) =>
        obterReferenciaCategoria({ categoria }));
    readonly categoriaBiblioteca = signal(CategoriaNpcEnum.OPERATIVO);
    readonly modelosBiblioteca = computed(() =>
        listarBibliotecaHabilidadesNpc({ categoria: this.categoriaBiblioteca() }));
    readonly resumoVolume = computed(() => {
        const volume = this.volume();
        const habilidades = this.ficha()!.dados.habilidades;
        const ativas = habilidades.filter((habilidade) => habilidade.tipo === this.tipos.ATIVA);
        return `${habilidades.length} na lista (${volume.totalMinimo}–${volume.totalMaximo}) · `
            + `${habilidades.length - ativas.length} Passivas · ${ativas.length} Ativas`;
    });

    constructor() {
        /** Foco no bloco ao abrir pelo lápis sem selecionar item (item 3, m4-16) — ao adicionar/
         * editar um item específico, o campo dele já ganha foco pelo próprio `appAutoFocus`. */
        effect(() => {
            if (this.modoEdicao() && this.indiceEditando() === null) {
                const elemento = this.secaoLista()?.nativeElement;
                if (elemento) setTimeout(() => elemento.focus());
            }
        });
    }

    emEdicao(indice: number): boolean {
        return this.gerenciavel() && this.modoEdicao() && this.indiceEditando() === indice;
    }

    /** Lápis do cabeçalho — liga o modo de edição da lista (bloco, m4-16). */
    iniciar(): void {
        if (!this.gerenciavel()) return;
        this.formulario.iniciar("habilidades");
    }

    /** Sem "Concluir" por item (m4-16): o Salvar da lista é a única confirmação. Item inválido
     * reabre para o erro aparecer nele, em vez de só no topo da lista. */
    async salvar(): Promise<void> {
        if (await this.formulario.salvar()) { this.indiceEditando.set(null); return; }
        const invalido = this.formulario.habilidades.controls.findIndex((item) => item.invalid);
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

    editar(indice: number): void {
        if (!this.gerenciavel() || this.formulario.edicao.salvando()) return;
        this.iniciar(); this.indiceEditando.set(indice);
    }

    adicionar(): void {
        if (!this.gerenciavel() || this.formulario.edicao.salvando()) return;
        this.iniciar();
        this.formulario.habilidades.push(criarHabilidadeFormulario());
        this.indiceEditando.set(this.formulario.habilidades.length - 1);
    }

    abrirBiblioteca(): void {
        if (!this.gerenciavel() || this.formulario.edicao.salvando()) return;
        const categoria = this.ficha()!.dados.categoria;
        this.categoriaBiblioteca.set(categoria === CategoriaNpcEnum.CIVIL
            ? CategoriaNpcEnum.OPERATIVO : categoria);
        this.bibliotecaAberta.set(true);
    }

    naLista(nomeNeutro: string): boolean {
        return this.ficha()!.dados.habilidades.some((habilidade) =>
            habilidade.nomeNeutro === nomeNeutro);
    }

    /** Entra no rascunho do bloco, não num PUT por item: o volume da Categoria é validado no
     * conjunto e um NPC abaixo do mínimo rejeitaria cada adição isolada (m4-21). */
    adicionarDaBiblioteca(habilidade: FichaNpcHabilidadeDto): void {
        if (!this.gerenciavel() || this.formulario.edicao.salvando()) return;
        if (this.naLista(habilidade.nomeNeutro)) return;
        this.iniciar();
        if (!this.modoEdicao()) return;
        this.formulario.habilidades.push(criarHabilidadeFormulario(habilidade));
    }

    remover(indice: number): void {
        if (!this.gerenciavel() || this.formulario.edicao.salvando()) return;
        this.iniciar();
        this.formulario.habilidades.removeAt(indice); this.indiceEditando.set(null);
    }
}
