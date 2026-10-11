import { Component, ElementRef, effect, inject, input, untracked } from "@angular/core";
import type { LivroTrechoDto } from "@contratados-rpg/shared/dtos/livro";

import { OficinaStore } from "./oficina.store";
import {
    criarSeloNivel, detectarNivelAmeaca, dividirTrechos, lerTrechos, montarTrechos, trechosIguais,
} from "./oficina-trechos";

/** Espera do texto parado antes de entregá-lo ao store (perder o foco entrega na hora). */
const ESPERA_ENTREGA_MS = 300;

/**
 * Campo de texto editável no próprio lugar (m11-06). É o elemento `contenteditable` da Oficina:
 * mostra um texto rico (`trechos`, campo `trechos`/`citacao`) ou um texto simples (`texto`, campo
 * `nome`/`titulo`) e devolve cada alteração ao `OficinaStore`, que salva e guarda o Desfazer.
 *
 * Atalhos: Enter pula ao próximo campo (campo curto, ou nota/exemplo/efeito) ou cria outro parágrafo;
 * Backspace em parágrafo vazio o remove; Ctrl+B / Ctrl+I; `NA0`…`NA7` + espaço vira o selo de Nível
 * de Ameaça. O DOM só é refeito quando o valor muda por fora (Desfazer, conflito): digitar nunca
 * recoloca o cursor.
 */
@Component({
    selector: "app-oficina-texto",
    template: "",
    styleUrl: "./oficina-texto.component.scss",
    host: {
        class: "oficina-texto",
        role: "textbox",
        "aria-multiline": "false",
        contenteditable: "true",
        spellcheck: "true",
        "[class.oficina-texto--simples]": "simples()",
        "[attr.aria-label]": "rotulo()",
        "[attr.data-peca]": "peca()",
        "[attr.data-campo]": "campo()",
        "[attr.data-vazio]": "vazio()",
        "(keydown)": "aoTeclar($event)",
        "(beforeinput)": "aoAntesDeEntrar($event)",
        "(input)": "aoEntrar($event)",
        "(blur)": "aoPerderFoco()",
        "(focus)": "aoFocar()",
        "(paste)": "aoColar($event)",
        "(drop)": "$event.preventDefault()",
    },
})
export class OficinaTexto {
    /** `identificador` da peça dona do campo. */
    readonly peca = input.required<string>();
    /** Nome do campo dentro do `dados` da peça (`trechos`, `citacao`, `nome`, `titulo`). */
    readonly campo = input.required<string>();
    readonly rotulo = input.required<string>();
    readonly trechos = input<readonly LivroTrechoDto[] | null>(null);
    readonly texto = input<string | null>(null);
    readonly vazio = input("Escreva aqui");

    private readonly store = inject(OficinaStore);
    private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    private entregue = "";
    private timer: ReturnType<typeof setTimeout> | undefined;

    protected simples(): boolean {
        return this.texto() !== null;
    }

    constructor() {
        effect(() => {
            const texto = this.texto();
            const trechos = this.trechos();
            untracked(() => this.sincronizar(texto, trechos));
        });
        effect(() => {
            const pedido = this.store.pedidoFoco();
            if (!pedido || pedido.identificador !== this.peca() || pedido.campo !== this.campo()) return;
            untracked(() => {
                this.store.pedirFoco(null);
                setTimeout(() => this.focar(pedido.posicao), 0);
            });
        });
    }

    /** Refaz o DOM só quando o valor veio de fora; o que o próprio campo entregou é ignorado. */
    private sincronizar(texto: string | null, trechos: readonly LivroTrechoDto[] | null): void {
        const chegou = texto !== null ? texto : JSON.stringify(trechos ?? []);
        if (chegou === this.entregue && this.elemento.childNodes.length > 0) return;
        if (texto !== null) {
            if (this.elemento.textContent !== texto) this.elemento.textContent = texto;
        } else if (!this.elemento.hasChildNodes() || !trechosIguais(lerTrechos(this.elemento), trechos ?? [])) {
            montarTrechos(this.elemento, trechos ?? []);
        }
        this.entregue = chegou;
        if (document.activeElement === this.elemento) this.posicionarCursor("fim");
    }

    // ------------------------------------------------------------- entrega

    private valorAtual(): string | LivroTrechoDto[] {
        return this.simples() ? (this.elemento.textContent ?? "").replace(/\u00a0/g, " ") : lerTrechos(this.elemento);
    }

    private entregar(): void {
        clearTimeout(this.timer);
        this.timer = undefined;
        const valor = this.valorAtual();
        const serial = typeof valor === "string" ? valor : JSON.stringify(valor);
        if (serial === this.entregue) return;
        const item = this.store.item(this.peca());
        if (!item) return;
        this.entregue = serial;
        this.store.alterarDados(this.peca(), { ...item.dados, [this.campo()]: valor } as typeof item.dados, {
            rotulo: "Edição de texto", chave: `${this.peca()}:${this.campo()}`,
        });
    }

    protected aoEntrar(evento: Event): void {
        if (!this.simples() && (evento as InputEvent).inputType === "insertText" && (evento as InputEvent).data === " ") {
            this.converterNivelAmeaca();
        }
        clearTimeout(this.timer);
        this.timer = setTimeout(() => this.entregar(), ESPERA_ENTREGA_MS);
    }

    protected aoAntesDeEntrar(evento: InputEvent): void {
        // Qualquer quebra de linha vira Enter tratado em `aoTeclar`; o navegador não insere <br>/<div>.
        if (evento.inputType === "insertParagraph" || evento.inputType === "insertLineBreak") evento.preventDefault();
    }

    protected aoPerderFoco(): void {
        this.entregar();
        const item = this.store.item(this.peca());
        if (item) void this.store.salvarAgora(item.id);
    }

    protected aoFocar(): void {
        this.store.selecionar(this.peca());
    }

    protected aoColar(evento: ClipboardEvent): void {
        evento.preventDefault();
        const texto = (evento.clipboardData?.getData("text/plain") ?? "").replace(/\s*\n\s*/g, " ");
        if (texto) document.execCommand("insertText", false, texto);
    }

    // ------------------------------------------------------------- teclado

    protected aoTeclar(evento: KeyboardEvent): void {
        const comando = evento.ctrlKey || evento.metaKey;
        const tecla = evento.key.toLowerCase();
        if (comando && (tecla === "b" || tecla === "i" || tecla === "u") && this.simples()) {
            evento.preventDefault();
            return;
        }
        if (comando && tecla === "u") {
            evento.preventDefault();
            return;
        }
        if (comando && !this.simples() && (tecla === "b" || tecla === "i") && !evento.altKey) {
            evento.preventDefault();
            document.execCommand(tecla === "b" ? "bold" : "italic");
            this.aoEntrar(new Event("input"));
            return;
        }
        if (comando && (tecla === "y" || (tecla === "z" && evento.shiftKey))) {
            // Sem refazer nesta versão: o refazer nativo do navegador desfiguraria o DOM do campo.
            evento.preventDefault();
            return;
        }
        if (evento.key === "Escape") {
            this.elemento.blur();
            return;
        }
        if (evento.key === "Enter") {
            evento.preventDefault();
            if (evento.shiftKey || evento.isComposing) return;
            this.aoTeclarEnter();
            return;
        }
        if (evento.key === "Backspace" && !comando && !evento.altKey && this.estaVazio() && this.store.ehParagrafo(this.peca())) {
            const anterior = this.vizinho(-1);
            if (anterior) {
                evento.preventDefault();
                clearTimeout(this.timer);
                const foco = { identificador: anterior.dataset["peca"] as string, campo: anterior.dataset["campo"] as string,
                    posicao: "fim" as const };
                void this.store.remover(this.peca(), foco);
            }
        }
    }

    private estaVazio(): boolean {
        return (this.elemento.textContent ?? "").replace(/\u200b/g, "").length === 0
            && !this.elemento.querySelector("[data-trecho]");
    }

    private aoTeclarEnter(): void {
        const emParagrafo = !this.simples() && this.campo() === "trechos" && this.store.ehParagrafo(this.peca());
        if (!emParagrafo) {
            this.entregar();
            const proximo = this.vizinho(1);
            if (proximo) proximo.focus(); else this.elemento.blur();
            return;
        }
        this.entregar();
        const item = this.store.item(this.peca());
        if (!item) return;
        const trechos = lerTrechos(this.elemento);
        const deslocamento = this.deslocamentoDoCursor();
        const total = this.deslocamentoTotal();
        if (deslocamento >= total) {
            void this.store.criarDepois(this.peca(), "trechos", { ...item.dados, trechos: [] } as typeof item.dados);
        } else {
            const [antes, depois] = dividirTrechos(trechos, deslocamento);
            void this.store.criarDepois(this.peca(), "trechos", { ...item.dados, trechos: depois } as typeof item.dados,
                { ...item.dados, trechos: antes } as typeof item.dados);
        }
    }

    /** O campo editável vizinho no documento (`-1` anterior, `1` próximo). */
    private vizinho(direcao: -1 | 1): HTMLElement | null {
        const raiz = this.elemento.closest("app-regras-leitor") ?? document;
        const campos = [...raiz.querySelectorAll<HTMLElement>(".oficina-texto")];
        const indice = campos.indexOf(this.elemento);
        return campos[indice + direcao] ?? null;
    }

    // -------------------------------------------------------------- cursor

    private focar(posicao: "inicio" | "fim"): void {
        this.elemento.focus();
        this.posicionarCursor(posicao);
    }

    private posicionarCursor(posicao: "inicio" | "fim"): void {
        const selecao = window.getSelection();
        if (!selecao) return;
        const intervalo = document.createRange();
        intervalo.selectNodeContents(this.elemento);
        intervalo.collapse(posicao === "inicio");
        selecao.removeAllRanges();
        selecao.addRange(intervalo);
    }

    private deslocamentoTotal(): number {
        return contarAte(this.elemento, null, 0);
    }

    private deslocamentoDoCursor(): number {
        const selecao = window.getSelection();
        if (!selecao || selecao.rangeCount === 0) return this.deslocamentoTotal();
        const intervalo = selecao.getRangeAt(0);
        return contarAte(this.elemento, { no: intervalo.startContainer, posicao: intervalo.startOffset }, 0);
    }

    /** `NA3 ` → selo de Nível de Ameaça (o espaço fica depois do selo). */
    private converterNivelAmeaca(): void {
        const selecao = window.getSelection();
        if (!selecao || selecao.rangeCount === 0 || !selecao.isCollapsed) return;
        const no = selecao.anchorNode;
        if (!no || no.nodeType !== Node.TEXT_NODE || !this.elemento.contains(no)) return;
        const texto = no.textContent ?? "";
        const posicao = selecao.anchorOffset;
        const achado = detectarNivelAmeaca(texto.slice(0, posicao).replace(/\u00a0/g, " "));
        if (!achado) return;
        const resto = texto.slice(posicao);
        no.textContent = achado.antes;
        const selo = criarSeloNivel(document, achado.nivel);
        const depois = document.createTextNode(` ${resto}`);
        no.parentNode?.insertBefore(selo, no.nextSibling);
        selo.after(depois);
        const intervalo = document.createRange();
        intervalo.setStart(depois, 1);
        intervalo.collapse(true);
        selecao.removeAllRanges();
        selecao.addRange(intervalo);
    }
}

/**
 * Conta a posição do cursor na mesma unidade de `dividirTrechos`: um por caractere de texto e um por
 * átomo. Sem `limite`, conta o campo todo.
 */
function contarAte(raiz: Node, limite: { no: Node; posicao: number } | null, inicial: number): number {
    let total = inicial;
    const percorrer = (no: Node): boolean => {
        if (limite && no === limite.no) {
            if (no.nodeType === Node.TEXT_NODE) total += limite.posicao;
            else for (let i = 0; i < limite.posicao; i++) total += medir(no.childNodes[i]);
            return true;
        }
        if (no.nodeType === Node.TEXT_NODE) {
            total += (no.textContent ?? "").replace(/\u200b/g, "").length;
            return false;
        }
        if (no instanceof HTMLElement && no.dataset["trecho"]) {
            total += 1;
            return false;
        }
        for (const filho of Array.from(no.childNodes)) if (percorrer(filho)) return true;
        return false;
    };
    percorrer(raiz);
    return total;
}

function medir(no: Node | undefined): number {
    if (!no) return 0;
    if (no.nodeType === Node.TEXT_NODE) return (no.textContent ?? "").length;
    if (no instanceof HTMLElement && no.dataset["trecho"]) return 1;
    return Array.from(no.childNodes).reduce((soma, filho) => soma + medir(filho), 0);
}
