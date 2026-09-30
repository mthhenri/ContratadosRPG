import { Component, HostListener, inject, signal, viewChild, ElementRef } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { DestroyRef } from "@angular/core";
import { finalize } from "rxjs";
import { Botao } from "../../../../shared/ui/botao/botao.component";
import { Cartao } from "../../../../shared/ui/cartao/cartao.component";
import { Chip } from "../../../../shared/ui/chip/chip.component";
import { Stat } from "../../../../shared/ui/stat/stat.component";
import { ConfirmacaoService } from "../../../../shared/ui/confirmacao/confirmacao.service";
import { NotificacaoService } from "../../../../shared/ui/notificacao/notificacao.service";
import { FichaService } from "../../ficha.service";
import { lerParamRota } from "../../ler-param-rota";
import { NpcCriacaoFormulario } from "./npc-criacao-formulario.service";
import { NpcIdentidade } from "./npc-identidade.component";
import { NpcAtributos } from "./npc-atributos.component";
import { NpcHabilidades } from "./npc-habilidades.component";
import { NpcConduta } from "./npc-conduta.component";
import { NpcRevisao } from "./npc-revisao.component";
import { Icone } from "../../../../shared/icone/icone.component";

/** Shell do guia; composição e estado dedicados, sem branches no assistente de jogador. */
@Component({
    selector: "app-npc-criar", providers: [NpcCriacaoFormulario],
    imports: [Botao, Cartao, Chip, Stat, Icone, NpcIdentidade, NpcAtributos,
        NpcHabilidades, NpcConduta, NpcRevisao],
    templateUrl: "./criar-npc.page.html", styleUrl: "./criar-npc.page.scss",
})
export class NpcCriar {
    readonly criacao = inject(NpcCriacaoFormulario);
    private readonly api = inject(FichaService);
    private readonly router = inject(Router);
    private readonly confirmacao = inject(ConfirmacaoService);
    private readonly notificacao = inject(NotificacaoService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly tituloEtapa = viewChild<ElementRef<HTMLElement>>("tituloEtapa");
    private readonly campanhaRota = lerParamRota(inject(ActivatedRoute), "campanhaId");
    readonly campanhaId = this.campanhaRota === null ? null : Number(this.campanhaRota);
    readonly etapas = ["Identidade", "Atributos e recursos", "Habilidades",
        "Conduta e sanidade", "Revisão"] as const;
    readonly etapa = signal(0);
    readonly mostrarResumo = signal(false);
    readonly mostrarErros = signal(false);
    readonly enviando = signal(false);
    readonly registrado = signal(false);
    readonly erroEnvio = signal("");

    /** Navegação conserva o mesmo FormGroup, inclusive listas e valores inválidos. */
    irEtapa(indice: number): void {
        if (this.enviando() || indice < 0 || indice >= this.etapas.length) return;
        this.etapa.set(indice);
        this.mostrarErros.set(false);
        this.tituloEtapa()?.nativeElement.focus();
    }

    /** A validação é apresentada na etapa atual antes de avançar. */
    avancar(): void {
        if (this.enviando()) return;
        if (this.criacao.violacoesEtapa(this.etapa()).length) {
            this.mostrarErros.set(true);
            this.criacao.formulario.markAllAsTouched();
            return;
        }
        this.irEtapa(this.etapa() + 1);
    }

    /** Snapshot inicial enviado uma única vez; falha preserva integralmente o preenchimento. */
    registrar(): void {
        if (this.enviando() || this.registrado()) return;
        if (this.criacao.pendencias().length) { this.mostrarErros.set(true); return; }
        this.enviando.set(true);
        this.erroEnvio.set("");
        const dados = this.criacao.dados();
        this.api.criarFichaNpc({ campanhaId: this.campanhaId,
            nome: dados.identidadeNarrativa.nome, dados }).pipe(
            takeUntilDestroyed(this.destroyRef), finalize(() => this.enviando.set(false)),
        ).subscribe({
            next: () => {
                this.registrado.set(true);
                this.criacao.formulario.markAsPristine();
                this.notificacao.notificar({ severidade: "sucesso", resumo: "NPC registrado",
                    detalhe: dados.identidadeNarrativa.nome });
            },
            error: () => this.erroEnvio.set(
                "Não foi possível registrar o NPC. Seu preenchimento foi mantido. Tente novamente."),
        });
    }

    /** Confirma saída com conteúdo não registrado; envio em andamento bloqueia a navegação. */
    podeSair(): boolean | Promise<boolean> {
        if (this.enviando()) return false;
        if (this.registrado() || !this.criacao.formulario.dirty) return true;
        return this.confirmacao.confirmar({ titulo: "Sair da criação?",
            mensagem: "O preenchimento deste NPC será descartado.", severidade: "padrao",
            rotuloConfirmar: "Sair sem registrar", rotuloCancelar: "Continuar criando" });
    }

    /** O destino não depende da ficha de consulta futura nem abre a ficha de jogador. */
    voltarAoDestino(): void {
        void this.router.navigate(this.campanhaId === null
            ? ["/fichas"] : ["/campanhas", this.campanhaId]);
    }

    /** A proteção da aba usa o diálogo nativo exigido pelo navegador. */
    @HostListener("window:beforeunload", ["$event"])
    protegerFechamento(evento: BeforeUnloadEvent): void {
        if (this.enviando() || (!this.registrado() && this.criacao.formulario.dirty)) {
            evento.preventDefault(); evento.returnValue = "";
        }
    }
}
