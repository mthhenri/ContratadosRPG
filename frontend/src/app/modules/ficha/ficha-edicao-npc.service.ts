import { DestroyRef, Injectable, computed, inject, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { firstValueFrom } from "rxjs";
import type {
    FichaNpcRecuperadaDto, FichaNpcVitalidadeAlterarDto,
} from "@contratados-rpg/shared/dtos/ficha";
import { validarFichaNpc } from "@contratados-rpg/shared/regras/npc";
import { FichaService } from "./ficha.service";
import { mesclarDocumento } from "./mesclar-ficha";

/**
 * Orquestra edição de NPC por página, sem recalcular snapshots nem decidir permissões.
 * Grupos e listas permanecem em rascunho até Salvar; erro não transforma edição em dado salvo.
 * A página consome eventos/refetch e chama absorverRemoto com o recorte REST autorizado.
 */
@Injectable()
export class FichaEdicaoNpcService {
    private readonly api = inject(FichaService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly fichaSignal = signal<FichaNpcRecuperadaDto | null>(null);
    private readonly rascunhoSignal = signal<FichaNpcRecuperadaDto | null>(null);
    private readonly salvandoSignal = signal(false);
    private readonly erroSignal = signal<string | null>(null);
    private readonly persistenciaSignal = signal<"ocioso" | "salvando" | "salvo" | "erro">(
        "ocioso",
    );
    // Invalida respostas que estavam em voo quando houve revogação, troca de ficha ou destruição.
    private geracao = 0;

    readonly ficha = this.fichaSignal.asReadonly();
    readonly rascunho = this.rascunhoSignal.asReadonly();
    readonly salvando = this.salvandoSignal.asReadonly();
    readonly erro = this.erroSignal.asReadonly();
    readonly estadoPersistencia = this.persistenciaSignal.asReadonly();
    readonly edicaoPendente = computed(() => this.rascunho() !== null);
    readonly violacoes = computed<readonly string[]>(() => {
        const rascunho = this.rascunho();
        return rascunho ? validarFichaNpc(rascunho.dados).violacoes : [];
    });

    constructor() {
        this.destroyRef.onDestroy(() => this.limpar());
    }

    /** Carga inicial/troca de documento. Eventos da mesma ficha usam absorverRemoto. */
    definirFicha(ficha: FichaNpcRecuperadaDto): void {
        this.limpar();
        this.fichaSignal.set(ficha);
    }

    iniciarEdicao(): void {
        if (!this.ficha() || this.salvando() || this.edicaoPendente()) return;
        this.rascunhoSignal.set(this.ficha());
        this.erroSignal.set(null);
        this.persistenciaSignal.set("ocioso");
    }

    alterarRascunho(
        alterar: (ficha: FichaNpcRecuperadaDto) => FichaNpcRecuperadaDto,
    ): void {
        const rascunho = this.rascunho();
        if (!rascunho || this.salvando()) return;
        this.rascunhoSignal.set(alterar(rascunho));
        this.erroSignal.set(null);
    }

    cancelarEdicao(): void {
        if (this.salvando()) return;
        this.rascunhoSignal.set(null);
        this.erroSignal.set(null);
        this.persistenciaSignal.set("ocioso");
    }

    /** Só campos sem edição local recebem valores remotos; arrays são grupos atômicos. */
    absorverRemoto(remoto: FichaNpcRecuperadaDto): void {
        const base = this.ficha();
        if (!base || base.id !== remoto.id) return;
        const rascunho = this.rascunho();
        if (rascunho) {
            this.rascunhoSignal.set(mesclarDocumento(base, rascunho, remoto));
        }
        this.fichaSignal.set(remoto);
    }

    async salvar(): Promise<boolean> {
        const rascunho = this.rascunho();
        if (!rascunho || this.salvando()) return false;
        if (this.violacoes().length > 0) {
            this.registrarErro("Corrija as pendências antes de salvar. Rascunho mantido.");
            return false;
        }
        const geracao = this.iniciarPersistencia();
        try {
            const alterada = await firstValueFrom(this.api.alterarFichaNpc(rascunho.id, {
                nome: rascunho.nome, cor: rascunho.cor, imagemFoco: rascunho.imagemFoco,
                oculta: rascunho.oculta, dados: rascunho.dados,
            }).pipe(takeUntilDestroyed(this.destroyRef)));
            if (geracao !== this.geracao) return false;
            this.fichaSignal.set(alterada);
            this.rascunhoSignal.set(null);
            this.persistenciaSignal.set("salvo");
            return true;
        } catch {
            if (geracao === this.geracao) {
                this.registrarErro(
                    "Não foi possível salvar. Rascunho mantido para tentar novamente.",
                );
            }
            return false;
        } finally {
            if (geracao === this.geracao) this.salvandoSignal.set(false);
        }
    }

    /** Sem ajuste otimista: só exibe Vida/Energia/Morrendo confirmados pelo servidor. */
    async ajustarVitalidade(ajuste: FichaNpcVitalidadeAlterarDto): Promise<boolean> {
        const ficha = this.ficha();
        if (!ficha || this.salvando()) return false;
        const geracao = this.iniciarPersistencia();
        try {
            const alterada = await firstValueFrom(
                this.api.alterarVitalidadeNpc(ficha.id, ajuste)
                    .pipe(takeUntilDestroyed(this.destroyRef)),
            );
            if (geracao !== this.geracao) return false;
            this.absorverRemoto(alterada);
            this.persistenciaSignal.set("salvo");
            return true;
        } catch {
            if (geracao === this.geracao) {
                this.registrarErro(
                    "Não foi possível alterar o recurso. O valor salvo foi mantido.",
                );
            }
            return false;
        } finally {
            if (geracao === this.geracao) this.salvandoSignal.set(false);
        }
    }

    /** Chamar antes do redirecionamento por perda de acesso; elimina também notas privadas. */
    limpar(): void {
        this.geracao++;
        this.fichaSignal.set(null);
        this.rascunhoSignal.set(null);
        this.salvandoSignal.set(false);
        this.erroSignal.set(null);
        this.persistenciaSignal.set("ocioso");
    }

    private iniciarPersistencia(): number {
        this.salvandoSignal.set(true);
        this.erroSignal.set(null);
        this.persistenciaSignal.set("salvando");
        return this.geracao;
    }

    private registrarErro(mensagem: string): void {
        this.erroSignal.set(mensagem);
        this.persistenciaSignal.set("erro");
    }
}
