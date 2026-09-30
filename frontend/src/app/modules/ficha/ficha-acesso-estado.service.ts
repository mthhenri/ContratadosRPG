import { DestroyRef, Injectable, inject, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { firstValueFrom, type Observable } from "rxjs";
import type { FichaAcessoResumoDto } from "@contratados-rpg/shared/dtos/ficha";
import { FichaService } from "./ficha.service";

/**
 * Estado local do diálogo de acesso por ficha, fornecido pelo componente hospedeiro.
 * A API existente decide permissões; o estado apresenta somente o recorte confirmado.
 * Trocar/fechar invalida respostas pendentes; falha de envio conserva seleção e lista.
 */
@Injectable()
export class FichaAcessoEstadoService {
    private readonly api = inject(FichaService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly fichaIdSignal = signal<number | null>(null);
    private readonly acessosSignal = signal<readonly FichaAcessoResumoDto[]>([]);
    private readonly usuarioSelecionadoSignal = signal<number | null>(null);
    private readonly carregandoSignal = signal(false);
    private readonly ocupadoSignal = signal(false);
    private readonly prontoSignal = signal(false);
    private readonly erroSignal = signal<string | null>(null);
    private geracao = 0;
    private consulta = 0;

    readonly fichaId = this.fichaIdSignal.asReadonly();
    readonly acessos = this.acessosSignal.asReadonly();
    readonly usuarioSelecionado = this.usuarioSelecionadoSignal.asReadonly();
    readonly carregando = this.carregandoSignal.asReadonly();
    readonly ocupado = this.ocupadoSignal.asReadonly();
    readonly pronto = this.prontoSignal.asReadonly();
    readonly erro = this.erroSignal.asReadonly();

    constructor() {
        this.destroyRef.onDestroy(() => this.fechar());
    }

    async abrir(fichaId: number): Promise<boolean> {
        this.fechar();
        this.fichaIdSignal.set(fichaId);
        return this.carregarAcessos(this.geracao);
    }

    fechar(): void {
        this.geracao++;
        this.consulta++;
        this.fichaIdSignal.set(null);
        this.acessosSignal.set([]);
        this.usuarioSelecionadoSignal.set(null);
        this.carregandoSignal.set(false);
        this.ocupadoSignal.set(false);
        this.prontoSignal.set(false);
        this.erroSignal.set(null);
    }

    selecionarUsuario(usuarioId: number | null): void {
        if (!this.fichaId() || this.ocupado()) return;
        this.usuarioSelecionadoSignal.set(usuarioId);
    }

    async recarregar(): Promise<boolean> {
        if (this.ocupado()) return false;
        return this.carregarAcessos(this.geracao);
    }

    async conceder(): Promise<boolean> {
        const usuarioId = this.usuarioSelecionado();
        if (usuarioId === null) return false;
        return this.executarAlteracao(
            (fichaId) => this.api.concederAcesso(fichaId, usuarioId),
            "Não foi possível conceder. Sua seleção foi mantida.",
            true,
        );
    }

    async revogar(usuarioId: number): Promise<boolean> {
        return this.executarAlteracao(
            (fichaId) => this.api.revogarAcesso(fichaId, usuarioId),
            "Não foi possível revogar. Tente novamente.",
            false,
        );
    }

    private async executarAlteracao(
        operacao: (fichaId: number) => Observable<unknown>,
        mensagemErro: string,
        limparSelecao: boolean,
    ): Promise<boolean> {
        const fichaId = this.fichaId();
        if (fichaId === null || !this.pronto() || this.carregando() || this.ocupado()) {
            return false;
        }
        const geracao = this.geracao;
        this.ocupadoSignal.set(true);
        this.erroSignal.set(null);
        try {
            await firstValueFrom(operacao(fichaId).pipe(takeUntilDestroyed(this.destroyRef)));
            if (geracao !== this.geracao) return false;
            if (limparSelecao) this.usuarioSelecionadoSignal.set(null);
            return await this.carregarAcessos(geracao, true);
        } catch {
            if (geracao === this.geracao) this.erroSignal.set(mensagemErro);
            return false;
        } finally {
            if (geracao === this.geracao) this.ocupadoSignal.set(false);
        }
    }

    private async carregarAcessos(geracao: number, aposAlteracao = false): Promise<boolean> {
        const fichaId = this.fichaId();
        if (fichaId === null || geracao !== this.geracao) return false;
        const consulta = ++this.consulta;
        this.carregandoSignal.set(true);
        this.prontoSignal.set(false);
        this.erroSignal.set(null);
        try {
            const acessos = await firstValueFrom(
                this.api.listarAcessos(fichaId).pipe(takeUntilDestroyed(this.destroyRef)),
            );
            if (geracao !== this.geracao || consulta !== this.consulta) return false;
            this.acessosSignal.set(acessos);
            this.prontoSignal.set(true);
            return true;
        } catch {
            if (geracao === this.geracao && consulta === this.consulta) {
                this.erroSignal.set(aposAlteracao
                    ? "Alteração confirmada, mas não foi possível carregar os acessos. Tente novamente."
                    : "Não foi possível carregar os acessos. Tente novamente.");
            }
            return false;
        } finally {
            if (geracao === this.geracao && consulta === this.consulta) {
                this.carregandoSignal.set(false);
            }
        }
    }
}
