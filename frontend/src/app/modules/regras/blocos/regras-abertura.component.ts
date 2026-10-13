import { Component, computed, inject, input, output } from "@angular/core";
import { RegrasAbertura as BlocoAbertura, RegrasDocumento, RegrasTrecho } from "../regras.model";
import { OficinaTexto } from "../oficina/oficina-texto.component";
import { OficinaStore } from "../oficina/oficina.store";
import { RegrasInline } from "./regras-inline.component";

/**
 * Registro oficial que abre o livro, no cartão centralizado do exemplão M10 (`.capa`). Na Oficina o
 * título, o corpo e o selo da capa são campos no lugar; o corpo edita os `trechos` originais de uma
 * vez (com o itálico externo, que é a marca da abertura na fonte), e não os parágrafos derivados.
 */
@Component({
    selector: "app-regras-abertura",
    imports: [RegrasInline, OficinaTexto],
    template: `
        <section class="regras-abertura" [attr.aria-label]="bloco().titulo">
            @if (editando()) {
                <p class="regras-abertura__titulo">
                    <app-oficina-texto
                        campo="titulo"
                        rotulo="Título da abertura"
                        vazio="Título"
                        [peca]="bloco().peca!"
                        [texto]="bloco().titulo"
                    />
                </p>
                <p class="regras-abertura__texto regras-abertura__texto--edicao">
                    <app-oficina-texto
                        campo="trechos"
                        rotulo="Texto da abertura"
                        vazio="Texto da abertura"
                        [quebras]="true"
                        [peca]="bloco().peca!"
                        [trechos]="bloco().trechos"
                    />
                </p>
                <p class="regras-abertura__selo">
                    <span class="regras-abertura__selo-rotulo">Selo da capa</span>
                    <app-oficina-texto
                        campo="selo"
                        rotulo="Selo da capa"
                        vazio="Sem selo"
                        [opcional]="true"
                        [peca]="bloco().peca!"
                        [texto]="selo()"
                    />
                </p>
            } @else {
                <p class="regras-abertura__titulo">{{ bloco().titulo }}</p>
                @for (paragrafo of paragrafos(); track $index; let fechamento = $last) {
                    <p class="regras-abertura__texto"
                        [class.regras-abertura__texto--fechamento]="fechamento">
                        <app-regras-inline
                            [trechos]="paragrafo"
                            [documento]="documento()"
                            (navegarAncora)="navegarAncora.emit($event)"
                        />
                    </p>
                }
            }
        </section>
    `,
    styleUrl: "./regras-abertura.component.scss",
})
export class RegrasAbertura {
    readonly bloco = input.required<BlocoAbertura>();
    readonly documento = input<RegrasDocumento["id"]>("sistema");
    readonly navegarAncora = output<string>();
    private readonly oficina = inject(OficinaStore, { optional: true });

    protected readonly editando = computed(() => !!this.bloco().peca && this.oficina?.estado() === "ok");

    /** O selo mora só no `dados` da peça (a projeção o leva à capa), por isso vem do store. */
    protected readonly selo = computed(() => {
        const dados = this.oficina?.item(this.bloco().peca as string)?.dados as { selo?: string } | undefined;
        return dados?.selo ?? "";
    });

    /** O itálico externo é a marca da abertura na fonte; a leitura usa parágrafos normais. */
    protected readonly paragrafos = computed(() => {
        const paragrafos: RegrasTrecho[][] = [[]];
        const trechos = this.bloco().trechos.flatMap((trecho) =>
            trecho.tipo === "italico" ? trecho.filhos : [trecho]);
        for (const trecho of trechos) {
            if (trecho.tipo !== "texto") {
                paragrafos[paragrafos.length - 1].push(trecho);
                continue;
            }
            trecho.texto.split(/\n\s*\n/).forEach((texto, indice) => {
                if (indice > 0) paragrafos.push([]);
                if (texto) paragrafos[paragrafos.length - 1].push({ tipo: "texto", texto });
            });
        }
        return paragrafos.filter((paragrafo) => paragrafo.some((trecho) =>
            trecho.tipo !== "texto" || trecho.texto.trim()));
    });
}
