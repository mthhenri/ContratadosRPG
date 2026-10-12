import { Component, type WritableSignal, computed, inject, signal } from "@angular/core";
import { LivroPendenciaGravidadeEnum, TipoLivroVersaoSituacaoEnum } from "@contratados-rpg/shared/enums";

import { Icone } from "../../../shared/icone/icone.component";
import { Botao } from "../../../shared/ui/botao/botao.component";
import { Campo } from "../../../shared/ui/campo/campo.component";
import { MenuAcoes, type MenuAcoesItem } from "../../../shared/ui/menu-acoes/menu-acoes.component";
import { Modal } from "../../../shared/ui/modal/modal.component";
import { OficinaMudancas } from "./oficina-mudancas.service";
import { OficinaStore } from "./oficina.store";

const ITENS: readonly MenuAcoesItem[] = [
    { id: TipoLivroVersaoSituacaoEnum.RASCUNHO, rotulo: "Publicar rascunho", descricao: "Os testers passam a ver esta edição." },
    { id: TipoLivroVersaoSituacaoEnum.PUBLICADA, rotulo: "Publicar versão", descricao: "Todo mundo passa a ver. Ganha número." },
];

/**
 * "Publicar ▾" da Oficina (m11-09): o menu de ações (`app-menu-acoes`) e o diálogo de confirmação com o resumo das
 * mudanças, o número sugerido (patch + 1 da última publicada), a nota "o que mudou" e as pendências. Versão com
 * pendência bloqueia; rascunho só avisa (pendência estrutural bloqueia qualquer publicação). A publicação em si é do
 * `OficinaMudancas`.
 */
@Component({
    selector: "app-oficina-publicar",
    imports: [MenuAcoes, Modal, Botao, Campo, Icone],
    templateUrl: "./oficina-publicar.component.html",
    styleUrl: "./oficina-publicar.component.scss",
})
export class OficinaPublicar {
    protected readonly store = inject(OficinaStore);
    protected readonly mudancas = inject(OficinaMudancas);
    protected readonly itens = ITENS;

    protected readonly situacao = signal<TipoLivroVersaoSituacaoEnum | null>(null);
    protected readonly numero = signal("");
    protected readonly nota = signal("");
    protected readonly recusa = signal<{ readonly mensagem: string; readonly erros: readonly string[] } | null>(null);

    protected readonly aberto = computed(() => this.situacao() !== null);
    protected readonly ehRascunho = computed(() => this.situacao() === TipoLivroVersaoSituacaoEnum.RASCUNHO);
    protected readonly titulo = computed(() => this.ehRascunho() ? "Publicar rascunho" : "Publicar versão");
    protected readonly resumo = computed(() => this.mudancas.comparacao() ? this.mudancas.contagem() : null);
    protected readonly pendencias = computed(() => this.store.pendencias());
    protected readonly estruturais = computed(() =>
        this.pendencias().filter((pendencia) => pendencia.gravidade === LivroPendenciaGravidadeEnum.ESTRUTURAL).length);
    /** Com versão publicada e nenhuma mudança, não há o que publicar. */
    protected readonly semMudancas = computed(() => this.mudancas.comparacao() !== null && this.mudancas.total() === 0);
    protected readonly bloqueada = computed(() =>
        this.estruturais() > 0 || (!this.ehRascunho() && this.pendencias().length > 0)
        || this.semMudancas() || !this.mudancas.carregou() || this.mudancas.falhou() || !this.numero().trim() || this.mudancas.publicando());

    protected abrir(situacao: string): void {
        this.situacao.set(situacao as TipoLivroVersaoSituacaoEnum);
        this.numero.set(this.mudancas.numeroSugerido());
        this.nota.set("");
        this.recusa.set(null);
    }

    protected fechar(): void {
        this.situacao.set(null);
    }

    protected digitar(sinal: WritableSignal<string>, evento: Event): void {
        sinal.set((evento.target as HTMLInputElement | HTMLTextAreaElement).value);
    }

    protected async confirmar(): Promise<void> {
        const situacao = this.situacao();
        if (!situacao || this.bloqueada()) return;
        const resultado = await this.mudancas.publicar(situacao, this.numero(), this.nota());
        if (resultado.ok) this.fechar();
        else this.recusa.set({ mensagem: resultado.mensagem, erros: resultado.erros });
    }
}
