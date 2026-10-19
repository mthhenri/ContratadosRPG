import { type EditorState, TextSelection, type Transaction } from "@milkdown/kit/prose/state";
import type { EditorView } from "@milkdown/kit/prose/view";
import { compareRelativePositions } from "yjs";
import {
    absolutePositionToRelativePosition,
    relativePositionToAbsolutePosition,
    ySyncPluginKey,
} from "y-prosemirror";

/** Referência temporária à seleção; não contém informação do destino do link. */
export interface EditorMarkdownSelecao {
    readonly texto: string;
    aplicarLink(href: string): boolean;
    cancelar(): void;
}

export function selecaoAdmiteLink(estado: EditorState): boolean {
    const { selection } = estado;
    if (!(selection instanceof TextSelection) || selection.empty ||
        !selection.$from.sameParent(selection.$to) ||
        !selection.$from.parent.isTextblock || selection.$from.parent.type.spec.code) return false;
    let admite = true;
    estado.doc.nodesBetween(selection.from, selection.to, (no) => {
        const codigo = no.marks.some((marca) =>
            marca.type.name === "inlineCode" || marca.type.spec.code);
        if (no.isInline && (!no.isText || codigo)) admite = false;
    });
    return admite && !!estado.doc.textBetween(selection.from, selection.to).trim();
}

/** O modo Yjs resolve posições relativas: seu sync pode substituir o documento PM inteiro. */
export class EditorMarkdownSelecoes {
    private atual: {
        inicio: number;
        fim: number;
        texto: string;
        resolver?: () => [number, number] | null;
    } | null = null;

    cancelar(): void { this.atual = null; }

    remapear(transacao: Transaction): void {
        const atual = this.atual;
        if (!atual || atual.resolver || !transacao.docChanged) return;
        let inicio = atual.inicio;
        let fim = atual.fim;
        for (const mapa of transacao.mapping.maps) {
            let alterouTrecho = false;
            mapa.forEach((de, ate) => {
                if ((de < fim && ate > inicio) || (de === ate && de > inicio && de < fim)) {
                    alterouTrecho = true;
                }
            });
            if (alterouTrecho) { this.cancelar(); return; }
            inicio = mapa.map(inicio, 1);
            fim = mapa.map(fim, -1);
        }
        atual.inicio = inicio;
        atual.fim = fim;
    }

    capturar(
        view: EditorView,
        antesAplicar: () => void,
        depoisAplicar: () => void,
    ): EditorMarkdownSelecao | null {
        this.cancelar();
        if (!view.editable || !selecaoAdmiteLink(view.state)) return null;
        const { from: inicio, to: fim } = view.state.selection;
        const atual = {
            inicio,
            fim,
            texto: view.state.doc.textBetween(inicio, fim),
            resolver: undefined as (() => [number, number] | null) | undefined,
        };
        const sincronizacao = ySyncPluginKey.getState(view.state);
        if (sincronizacao?.binding) {
            const { binding } = sincronizacao;
            const inicioRelativo = absolutePositionToRelativePosition(
                inicio, binding.type, binding.mapping);
            const fimRelativo = absolutePositionToRelativePosition(
                fim, binding.type, binding.mapping);
            // Identidades dos caracteres impedem aceitar substituição pelo mesmo texto.
            const caracteres = Array.from({ length: fim - inicio }, (_, indice) =>
                absolutePositionToRelativePosition(inicio + indice, binding.type, binding.mapping));
            atual.resolver = () => {
                const de = relativePositionToAbsolutePosition(
                    binding.doc, binding.type, inicioRelativo, binding.mapping);
                const ate = relativePositionToAbsolutePosition(
                    binding.doc, binding.type, fimRelativo, binding.mapping);
                if (de === null || ate === null || ate - de !== caracteres.length) return null;
                const preservados = caracteres.every((relativa, indice) => compareRelativePositions(
                    relativa,
                    absolutePositionToRelativePosition(de + indice, binding.type, binding.mapping),
                ));
                return preservados ? [de, ate] : null;
            };
        }
        this.atual = atual;
        return {
            texto: atual.texto,
            cancelar: () => { if (this.atual === atual) this.cancelar(); },
            aplicarLink: (href) => {
                if (this.atual !== atual || !view.editable || !href.trim()) return false;
                const intervalo = atual.resolver
                    ? atual.resolver() : [atual.inicio, atual.fim];
                this.cancelar();
                if (!intervalo) return false;
                const [de, ate] = intervalo;
                if (de >= ate || ate > view.state.doc.content.size ||
                    view.state.doc.textBetween(de, ate) !== atual.texto) return false;
                const selection = TextSelection.create(view.state.doc, de, ate);
                if (!selecaoAdmiteLink(view.state.apply(view.state.tr.setSelection(selection)))) return false;
                const marca = view.state.schema.marks["link"];
                if (!marca) return false;
                antesAplicar();
                view.dispatch(view.state.tr.addMark(de, ate, marca.create({ href, title: null })));
                depoisAplicar();
                return true;
            },
        };
    }
}
