import {
    ApplicationRef, ComponentRef, EnvironmentInjector, Injectable, createComponent, inject, signal,
} from "@angular/core";
import { RegrasDocumento } from "./regras.model";
import { NotificacaoService } from "../../shared/ui/notificacao/notificacao.service";
import type { RegrasImpressao } from "./regras-impressao.component";

/** Projeção sob demanda, independente de pesquisa/abas/painéis da aplicação. */
@Injectable({ providedIn: "root" })
export class RegrasImpressaoService {
    private readonly aplicacao = inject(ApplicationRef);
    private readonly ambiente = inject(EnvironmentInjector);
    private readonly notificacao = inject(NotificacaoService);
    private readonly preparandoInterno = signal(false);
    readonly preparando = this.preparandoInterno.asReadonly();

    /** Imprime o livro inteiro e remove a projeção ao concluir ou cancelar o diálogo. */
    async exportarDocumento(documento: RegrasDocumento): Promise<void> {
        // Suspensão temporária decidida pelo autor; ver P-108 e a spec de revisão do PDF.
        if (documento.id === "sistema" || this.preparando()) return;
        this.preparandoInterno.set(true);
        let componente: ComponentRef<RegrasImpressao> | undefined;
        const hospedeiro = document.createElement("app-regras-impressao");
        const tituloAnterior = document.title;
        const raiz = document.documentElement;
        const cabecalhoAnterior = raiz.style.getPropertyValue("--regras-impressao-titulo");
        const prioridadeAnterior = raiz.style.getPropertyPriority("--regras-impressao-titulo");
        const limpar = (): void => {
            window.removeEventListener("afterprint", limpar);
            if (componente) {
                this.aplicacao.detachView(componente.hostView); componente.destroy();
                componente = undefined;
            }
            hospedeiro.remove(); document.body.classList.remove("regras-imprimindo");
            document.title = tituloAnterior;
            if (cabecalhoAnterior) {
                raiz.style.setProperty("--regras-impressao-titulo",
                    cabecalhoAnterior, prioridadeAnterior);
            } else raiz.style.removeProperty("--regras-impressao-titulo");
            this.preparandoInterno.set(false);
        };
        try {
            const { RegrasImpressao } = await import("./regras-impressao.component");
            componente = createComponent(RegrasImpressao, {
                environmentInjector: this.ambiente, hostElement: hospedeiro,
            });
            componente.setInput("documento", documento);
            document.body.append(hospedeiro); this.aplicacao.attachView(componente.hostView);
            componente.changeDetectorRef.detectChanges();
            await document.fonts?.ready;
            document.title = `Contratados RPG - ${documento.titulo} - v${documento.versao}`;
            raiz.style.setProperty("--regras-impressao-titulo",
                JSON.stringify(`Contratados RPG · ${documento.titulo} · v${documento.versao}`));
            document.body.classList.add("regras-imprimindo");
            window.addEventListener("afterprint", limpar, { once: true });
            window.print();
        } catch {
            limpar();
            this.notificacao.notificar({ severidade: "erro", resumo: "Não foi possível exportar",
                detalhe: "Tente exportar o documento novamente." });
        }
    }
}
