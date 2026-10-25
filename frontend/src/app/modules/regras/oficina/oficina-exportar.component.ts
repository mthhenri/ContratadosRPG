import { Component, computed, inject, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { DestroyRef } from "@angular/core";
import { TipoUsuarioEnum } from "@contratados-rpg/shared/enums";
import { finalize } from "rxjs";
import { SessaoService } from "../../../core/services/sessao.service";
import { Botao } from "../../../shared/ui/botao/botao.component";
import { NotificacaoService } from "../../../shared/ui/notificacao/notificacao.service";
import { OficinaExportacaoService } from "./oficina-exportacao.service";

/** Ação independente de publicar: exportar nunca salva nem fotografa trabalho pendente. */
@Component({
    selector: "app-oficina-exportar",
    imports: [Botao],
    templateUrl: "./oficina-exportar.component.html",
    styleUrl: "./oficina-exportar.component.scss",
})
export class OficinaExportar {
    private readonly sessao = inject(SessaoService);
    private readonly servico = inject(OficinaExportacaoService);
    private readonly notificacao = inject(NotificacaoService);
    private readonly destroyRef = inject(DestroyRef);
    protected readonly administrador = computed(() =>
        this.sessao.usuario()?.tipo === TipoUsuarioEnum.ADMIN);
    protected readonly exportando = signal(false);

    protected exportar(): void {
        if (!this.administrador() || this.exportando()) return;
        this.exportando.set(true);
        this.servico.recuperarPacote().pipe(
            takeUntilDestroyed(this.destroyRef),
            finalize(() => this.exportando.set(false)),
        ).subscribe({
            next: pacote => {
                try {
                    this.servico.baixarPacote(pacote);
                    this.notificacao.notificar({
                        severidade: "sucesso", resumo: "Livros exportados",
                        detalhe: "A publicação atual de Sistema e Guia foi baixada.",
                    });
                } catch {
                    this.informarFalha();
                }
            },
            error: () => this.informarFalha(),
        });
    }

    private informarFalha(): void {
        this.notificacao.notificar({
            severidade: "erro", resumo: "Não foi possível exportar os livros",
            detalhe: "Tente novamente. É necessário haver uma publicação de cada livro.",
        });
    }
}
