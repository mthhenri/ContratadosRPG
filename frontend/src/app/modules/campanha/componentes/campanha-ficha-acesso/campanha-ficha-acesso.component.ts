import { Component, DestroyRef, computed, effect, inject, input } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import type { CampanhaMembroResumoDto } from "@contratados-rpg/shared/dtos/campanha";
import type { FichaResumoDto } from "@contratados-rpg/shared/dtos/ficha";
import { TipoCampanhaMembroPapelEnum } from "@contratados-rpg/shared/enums";
import { TempoRealService } from "../../../../core/services/tempo-real.service";
import { Botao } from "../../../../shared/ui/botao/botao.component";
import { Campo } from "../../../../shared/ui/campo/campo.component";
import { Cartao } from "../../../../shared/ui/cartao/cartao.component";
import { EstadoVazio } from "../../../../shared/ui/estado-vazio/estado-vazio.component";
import { Esqueleto } from "../../../../shared/ui/esqueleto/esqueleto.component";
import { Modal } from "../../../../shared/ui/modal/modal.component";
import { FichaAcessoEstadoService } from "../../../ficha/ficha-acesso-estado.service";

/**
 * Diálogo "Acesso de visualização" de uma criatura/NPC da campanha (mestre) — extraído de
 * `CampanhaFichasEspeciais` (m4-15) para o menu ⋯ do cartão abri-lo. Consome a listagem autorizada
 * do hospedeiro; não busca fichas nem arbitra acesso (o backend decide). `abrir(fichaId)` é o
 * único gatilho; o estado vive em `FichaAcessoEstadoService`, fornecido aqui.
 */
@Component({
    selector: "app-campanha-ficha-acesso",
    imports: [ReactiveFormsModule, Botao, Campo, Cartao, EstadoVazio, Esqueleto, Modal],
    providers: [FichaAcessoEstadoService],
    templateUrl: "./campanha-ficha-acesso.component.html",
    styleUrl: "./campanha-ficha-acesso.component.scss",
})
export class CampanhaFichaAcesso {
    /** Criaturas e NPCs da campanha — a ficha com o diálogo aberto some daqui ⇒ o diálogo fecha. */
    readonly fichas = input.required<readonly FichaResumoDto[]>();
    readonly campanhaId = input.required<number>();
    readonly membros = input<readonly CampanhaMembroResumoDto[]>([]);

    protected readonly acesso = inject(FichaAcessoEstadoService);
    private readonly tempoReal = inject(TempoRealService);
    private readonly destroyRef = inject(DestroyRef);
    protected readonly jogador = new FormControl<number | null>(null);
    protected readonly fichaSelecionada = computed(() =>
        this.fichas().find((ficha) => ficha.id === this.acesso.fichaId()) ?? null);
    protected readonly elegiveis = computed(() => this.membros().filter((membro) =>
        membro.papel === TipoCampanhaMembroPapelEnum.JOGADOR
        && membro.usuarioId !== this.fichaSelecionada()?.usuarioId
        && !this.acesso.acessos().some((acesso) => acesso.usuarioId === membro.usuarioId)));

    constructor() {
        this.jogador.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((valor) => this.acesso.selecionarUsuario(valor));
        effect(() => {
            if (this.acesso.fichaId() !== null && !this.fichaSelecionada()) this.acesso.fechar();
        });
        effect(() => {
            const selecionado = this.acesso.usuarioSelecionado();
            if (selecionado !== null && this.acesso.pronto() && !this.acesso.ocupado()
                && !this.elegiveis().some((membro) => membro.usuarioId === selecionado)) {
                this.acesso.selecionarUsuario(null);
            }
            this.jogador.setValue(this.acesso.usuarioSelecionado(), { emitEvent: false });
            const desabilitado = this.acesso.ocupado() || this.acesso.carregando()
                || !this.acesso.pronto() || this.elegiveis().length === 0;
            if (desabilitado) this.jogador.disable({ emitEvent: false });
            else this.jogador.enable({ emitEvent: false });
        });
        this.tempoReal.fichaVisibilidadeAlterada$.pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((evento) => {
                if (evento.campanhaId === this.campanhaId()) this.recarregarAcessoAberto();
            });
        this.tempoReal.reconexao$.pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.recarregarAcessoAberto());
    }

    /** Abre o diálogo da ficha — só para uma criatura/NPC presente em `fichas`. */
    abrir(fichaId: number): void {
        void this.acesso.abrir(fichaId);
    }

    private recarregarAcessoAberto(): void {
        if (this.acesso.fichaId() !== null) void this.acesso.recarregar();
    }
}
