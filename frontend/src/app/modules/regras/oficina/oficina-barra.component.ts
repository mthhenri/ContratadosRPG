import { Component, computed, inject, output, signal } from "@angular/core";
import { TipoLivroVersaoSituacaoEnum } from "@contratados-rpg/shared/enums";

import { Icone } from "../../../shared/icone/icone.component";
import { Tooltip } from "../../../shared/tooltip/tooltip.directive";
import { Botao } from "../../../shared/ui/botao/botao.component";
import { Chip } from "../../../shared/ui/chip/chip.component";
import { OficinaMudancas } from "./oficina-mudancas.service";
import { OficinaPublicar } from "./oficina-publicar.component";
import { OficinaExportar } from "./oficina-exportar.component";
import { OficinaStore } from "./oficina.store";

/**
 * Barra da Oficina (m11-06), acima do livro: estado do salvamento, contador de pendências (leva à
 * próxima), "Ir para peça" e Desfazer. Só apresenta o `OficinaStore`.
 */
@Component({
    selector: "app-oficina-barra",
    imports: [Botao, Chip, Icone, Tooltip, OficinaPublicar, OficinaExportar],
    templateUrl: "./oficina-barra.component.html",
    styleUrl: "./oficina-barra.component.scss",
})
export class OficinaBarra {
    protected readonly store = inject(OficinaStore);
    protected readonly mudancas = inject(OficinaMudancas);
    readonly irPara = output<void>();
    readonly alternarMudancas = output<void>();
    readonly irParaPeca = output<string>();
    private proxima = 0;

    protected readonly rotuloEstado = computed(() => {
        switch (this.store.indicador()) {
            case "salvando": return "Salvando…";
            case "pendente": return "Alterações a salvar";
            case "falha": return "Não salvo";
            default: return this.store.salvou() ? "Salvo" : "Sem alterações";
        }
    });
    protected readonly severidadeEstado = computed(() => {
        switch (this.store.indicador()) {
            case "salvando": case "pendente": return "aviso" as const;
            case "falha": return "perigo" as const;
            default: return "sucesso" as const;
        }
    });
    /** O que a edição é em relação ao que os leitores veem: "Em edição" enquanto há mudança, e a publicação mais recente. */
    protected readonly estadoEdicao = computed(() => this.mudancas.carregou() && this.mudancas.comparacao() !== null && this.mudancas.total() === 0
        ? "Igual à publicada" : "Em edição");
    protected readonly publicacao = computed(() => {
        const versao = this.mudancas.maisRecente();
        if (!versao) return null;
        return versao.situacao === TipoLivroVersaoSituacaoEnum.PUBLICADA
            ? { rotulo: `Versão ${versao.numero}`, dica: "A versão publicada: todos os leitores a veem." }
            : { rotulo: `Rascunho ${versao.numero}`, dica: "O rascunho mais recente: os testers o veem; os demais seguem na versão publicada." };
    });
    protected readonly totalPendencias = computed(() => this.store.pendencias().length);
    protected readonly pendenciasAbertas = signal(false);

    protected abrirPendencia(): void {
        const pendencias = this.store.pendencias();
        if (pendencias.length === 0) return;
        this.proxima = this.proxima % pendencias.length;
        this.irParaPeca.emit(pendencias[this.proxima].identificador);
        this.proxima += 1;
    }
}
