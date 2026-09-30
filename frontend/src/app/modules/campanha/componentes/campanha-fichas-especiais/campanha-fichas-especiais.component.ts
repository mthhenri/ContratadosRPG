import { Component, DestroyRef, computed, effect, inject, input, output, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import type { CampanhaMembroResumoDto } from "@contratados-rpg/shared/dtos/campanha";
import type { FichaResumoDto } from "@contratados-rpg/shared/dtos/ficha";
import type { RolagemResumoDto } from "@contratados-rpg/shared/dtos/rolagem";
import { TipoCampanhaMembroPapelEnum, TipoFichaEnum } from "@contratados-rpg/shared/enums";
import { TempoRealService } from "../../../../core/services/tempo-real.service";
import { Botao } from "../../../../shared/ui/botao/botao.component";
import { Campo } from "../../../../shared/ui/campo/campo.component";
import { Cartao } from "../../../../shared/ui/cartao/cartao.component";
import { EstadoVazio } from "../../../../shared/ui/estado-vazio/estado-vazio.component";
import { Esqueleto } from "../../../../shared/ui/esqueleto/esqueleto.component";
import { Modal } from "../../../../shared/ui/modal/modal.component";
import { Icone } from "../../../../shared/icone/icone.component";
import { CartaoFichaAcervo } from "../../../ficha/componentes/cartao-ficha-acervo/cartao-ficha-acervo.component";
import { FichaAcessoEstadoService } from "../../../ficha/ficha-acesso-estado.service";
import { montarItemCriatura } from "../../../ficha/criatura-acervo";
import { montarItemNpc } from "../../../ficha/npc-acervo";

/** Consome a listagem autorizada do hospedeiro; não busca nem arbitra acesso às fichas. */
@Component({
    selector: "app-campanha-fichas-especiais",
    imports: [RouterLink, ReactiveFormsModule, Botao, Campo, Cartao, EstadoVazio,
        Esqueleto, Modal, Icone, CartaoFichaAcervo],
    providers: [FichaAcessoEstadoService],
    templateUrl: "./campanha-fichas-especiais.component.html",
    styleUrl: "./campanha-fichas-especiais.component.scss",
})
export class CampanhaFichasEspeciais {
    readonly fichas = input.required<readonly FichaResumoDto[]>();
    readonly campanhaId = input.required<number>();
    readonly membros = input<readonly CampanhaMembroResumoDto[]>([]);
    readonly gerenciavel = input(false);
    readonly rolagens = input<readonly RolagemResumoDto[]>([]);
    readonly menuFichaId = input<number | null>(null);
    readonly abrirCriatura = output<FichaResumoDto>();
    readonly menuCriatura = output<{
        readonly ficha: FichaResumoDto; readonly evento: MouseEvent;
    }>();

    protected readonly acesso = inject(FichaAcessoEstadoService);
    private readonly tempoReal = inject(TempoRealService);
    private readonly destroyRef = inject(DestroyRef);
    protected readonly TipoFichaEnum = TipoFichaEnum;
    protected readonly filtro = new FormControl("TODOS", { nonNullable: true });
    private readonly filtroSignal = signal("TODOS");
    protected readonly jogador = new FormControl<number | null>(null);
    private readonly especiais = computed(() => this.fichas().filter((ficha) =>
        ficha.tipo === TipoFichaEnum.CRIATURA || ficha.tipo === TipoFichaEnum.NPC));
    protected readonly itens = computed(() => this.especiais()
        .filter((ficha) => this.filtroSignal() === "TODOS" || ficha.tipo === this.filtroSignal())
        .map((ficha) => ({ ficha, item: ficha.tipo === TipoFichaEnum.NPC
            ? montarItemNpc(ficha) : montarItemCriatura(ficha) })));
    protected readonly fichaSelecionada = computed(() =>
        this.especiais().find((ficha) => ficha.id === this.acesso.fichaId()) ?? null);
    protected readonly elegiveis = computed(() => this.membros().filter((membro) =>
        membro.papel === TipoCampanhaMembroPapelEnum.JOGADOR
        && membro.usuarioId !== this.fichaSelecionada()?.usuarioId
        && !this.acesso.acessos().some((acesso) => acesso.usuarioId === membro.usuarioId)));

    constructor() {
        this.filtro.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((valor) => this.filtroSignal.set(valor));
        this.jogador.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((valor) => this.acesso.selecionarUsuario(valor));
        effect(() => {
            if (!this.gerenciavel()
                || (this.acesso.fichaId() !== null && !this.fichaSelecionada())) {
                this.acesso.fechar();
            }
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

    protected abrirAcesso(fichaId: number): void {
        if (this.gerenciavel()) void this.acesso.abrir(fichaId);
    }

    private recarregarAcessoAberto(): void {
        if (this.gerenciavel() && this.acesso.fichaId() !== null) void this.acesso.recarregar();
    }

    protected ultimaRolagem(fichaId: number): RolagemResumoDto | null {
        return this.rolagens().find((rolagem) => rolagem.fichaId === fichaId) ?? null;
    }
}
