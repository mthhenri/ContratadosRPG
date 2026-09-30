import { Component, computed, inject, output } from "@angular/core";
import { DomSanitizer } from "@angular/platform-browser";
import { Botao } from "../../../../shared/ui/botao/botao.component";
import { Cartao } from "../../../../shared/ui/cartao/cartao.component";
import { Chip } from "../../../../shared/ui/chip/chip.component";
import { Stat } from "../../../../shared/ui/stat/stat.component";
import { EstadoVazio } from "../../../../shared/ui/estado-vazio/estado-vazio.component";
import { Icone } from "../../../../shared/icone/icone.component";
import { renderizarMarkdownSeguro } from "../../../../shared/markdown/markdown-seguro";
import { NpcCriacaoFormulario } from "./npc-criacao-formulario.service";
import { GRUPOS_ATRIBUTOS } from "../../npc-atributos-campos";

/** Prévia em duas colunas da ficha planejada, sem segunda entrada para o mesmo campo. */
@Component({
    selector: "app-npc-revisao",
    imports: [Botao, Cartao, Chip, Stat, EstadoVazio, Icone],
    templateUrl: "./npc-revisao.component.html", styleUrls: ["./npc-etapa.scss", "./npc-revisao.scss"],
})
export class NpcRevisao {
    readonly criacao = inject(NpcCriacaoFormulario);
    private readonly sanitizer = inject(DomSanitizer);
    readonly anotacoesHtml = computed(() =>
        renderizarMarkdownSeguro(this.criacao.dados().anotacoes ?? "", this.sanitizer));
    readonly corrigir = output<number>();
    readonly grupos = GRUPOS_ATRIBUTOS;
}
