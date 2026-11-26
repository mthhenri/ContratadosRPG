import { DOCUMENT } from "@angular/common";
import { HttpClient, HttpContext } from "@angular/common/http";
import {
    EnvironmentInjector, ErrorHandler, Injectable, InjectionToken, createComponent, inject, signal,
} from "@angular/core";
import type { LivroLeituraDto } from "@contratados-rpg/shared/dtos/livro";
import type { StandardResponse } from "@contratados-rpg/shared/interfaces";
import { projetarPecasEmRegras } from "@contratados-rpg/shared/livro";
import { firstValueFrom, map } from "rxjs";
import { environment } from "../../../environments/environment";
import { ERROS_TRATADOS_NA_TELA } from "../../core/interceptors/error-handler.interceptor";
import { TemaService } from "../../core/services/tema.service";
import { Icone } from "../../shared/icone/icone.component";
import { NotificacaoService } from "../../shared/ui/notificacao/notificacao.service";
import type { FONTES_DO_PDF, gerarLivroPdf } from "./pdf/gerar-livro";
import { type DesenhoDeIcone, ICONES_DO_PDF, desenhoDeIcone } from "./pdf/icones";
import { LOGO_DO_PDF } from "./pdf/paleta";
import type { RegrasDocumento } from "./regras.model";

interface Gerador {
    readonly FONTES_DO_PDF: typeof FONTES_DO_PDF;
    readonly gerarLivroPdf: typeof gerarLivroPdf;
}

/** Carrega o gerador sob demanda; é um token para o teste trocar o jsPDF por um registro. */
export const GERADOR_DE_LIVRO = new InjectionToken<() => Promise<Gerador>>("gerador do PDF das Regras", {
    providedIn: "root",
    factory: () => () => import("./pdf/gerar-livro"),
});

function emBase64(bytes: ArrayBuffer): string {
    const vetor = new Uint8Array(bytes);
    let binario = "";
    // Em blocos: passar o arquivo inteiro de uma vez estoura a pilha.
    for (let inicio = 0; inicio < vetor.length; inicio += 0x8000) {
        binario += String.fromCharCode(...vetor.subarray(inicio, inicio + 0x8000));
    }
    return btoa(binario);
}

/**
 * PDF do livro de Regras, gerado no navegador de quem clica e baixado direto. Lê **sempre** a
 * publicação atual (`/publicada`), nunca o rascunho da Oficina, e sai no tema (base e destaque) de
 * quem exporta.
 */
@Injectable({ providedIn: "root" })
export class RegrasExportacaoPdfService {
    private readonly httpClient = inject(HttpClient);
    private readonly documento = inject(DOCUMENT);
    private readonly ambiente = inject(EnvironmentInjector);
    private readonly tema = inject(TemaService);
    private readonly notificacao = inject(NotificacaoService);
    private readonly erros = inject(ErrorHandler);
    private readonly carregarGerador = inject(GERADOR_DE_LIVRO);
    private readonly exportandoInterno = signal(false);
    readonly exportando = this.exportandoInterno.asReadonly();

    async exportar(codigo: RegrasDocumento["id"]): Promise<void> {
        if (this.exportando()) return;
        this.exportandoInterno.set(true);
        const andamento = this.notificacao.notificar({ severidade: "informacao", resumo: "Gerando o PDF…" });
        const base = this.tema.base();
        const destaque = this.tema.accentAplicado();
        try {
            const [gerador, documento, logo] = await Promise.all([
                this.carregarGerador(), this.recuperarPublicada(codigo),
                this.recuperarArquivo(LOGO_DO_PDF[base]),
            ]);
            const fontes = Object.fromEntries(await Promise.all(gerador.FONTES_DO_PDF.map(
                async (arquivo) => [arquivo, await this.recuperarArquivo(`fonts/pdf/${arquivo}`)] as const)));
            const icones = this.lerIcones();
            // A geração ocupa a linha principal: antes dela a tela precisa pintar o aviso.
            await new Promise((resolver) => setTimeout(resolver, 50));
            const arquivo = gerador.gerarLivroPdf({
                documento, fontes, logo: `data:image/png;base64,${logo}`, icones, base, destaque,
            });
            const nome = `Contratados RPG - ${documento.titulo} - v${documento.versao}.pdf`;
            this.baixar(arquivo, nome);
            this.notificacao.notificar({
                severidade: "sucesso", resumo: "PDF exportado", detalhe: `${nome} (publicação atual do livro).`,
            });
        } catch (erro) {
            this.erros.handleError(erro);
            this.notificacao.notificar({
                severidade: "erro", resumo: "Não foi possível exportar",
                detalhe: "Tente exportar o documento novamente.",
            });
        } finally {
            this.notificacao.fechar(andamento);
            this.exportandoInterno.set(false);
        }
    }

    private recuperarPublicada(codigo: string) {
        const context = new HttpContext()
            .set(ERROS_TRATADOS_NA_TELA, [0, 400, 401, 403, 404, 500, 502, 503, 504]);
        return firstValueFrom(this.httpClient.get<StandardResponse<LivroLeituraDto>>(
            `${environment.apiBase}/livros/${encodeURIComponent(codigo)}/publicada`, { context },
        ).pipe(map((resposta) =>
            projetarPecasEmRegras((resposta.dados as LivroLeituraDto).conteudo))));
    }

    /** Arquivo de `public/` em base64. */
    private async recuperarArquivo(caminho: string): Promise<string> {
        const context = new HttpContext().set(ERROS_TRATADOS_NA_TELA, [0, 404, 500, 502, 503, 504]);
        return emBase64(await firstValueFrom(
            this.httpClient.get(caminho, { context, responseType: "arraybuffer" })));
    }

    /** Renderiza cada ícone fora da tela e lê o `<svg>`: a geometria continua só no componente. */
    private lerIcones(): Record<string, DesenhoDeIcone> {
        return Object.fromEntries(ICONES_DO_PDF.map((nome) => {
            const componente = createComponent(Icone, { environmentInjector: this.ambiente });
            try {
                componente.setInput("nome", nome);
                componente.changeDetectorRef.detectChanges();
                const svg = (componente.location.nativeElement as HTMLElement).querySelector("svg")!;
                return [nome, desenhoDeIcone(svg, svg.getAttribute("fill") === "currentColor")];
            } finally {
                componente.destroy();
            }
        }));
    }

    private baixar(arquivo: Blob, nome: string): void {
        const url = URL.createObjectURL(arquivo);
        const link = this.documento.createElement("a");
        link.href = url;
        link.download = nome;
        try {
            this.documento.body.append(link);
            link.click();
        } finally {
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
    }
}
