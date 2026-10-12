import { HttpErrorResponse } from "@angular/common/http";
import { DestroyRef, Injectable, computed, effect, inject, signal, untracked } from "@angular/core";
import type {
    LivroComparacaoDto, LivroMudancaDto, LivroPublicadoDto, LivroVersaoRecuperadaDto, LivroVersaoResumoDto,
} from "@contratados-rpg/shared/dtos/livro";
import { LivroMudancaSituacaoEnum, TipoLivroVersaoSituacaoEnum } from "@contratados-rpg/shared/enums";
import { compararLivros, sugerirNumeroVersao } from "@contratados-rpg/shared/livro";
import { firstValueFrom } from "rxjs";

import { NotificacaoService } from "../../../shared/ui/notificacao/notificacao.service";
import { contarPorSituacao, semFilhasDeNovasOuRemovidas } from "./oficina-mudancas-texto";
import { OficinaApi } from "./oficina-api.service";
import { OficinaStore } from "./oficina.store";

/** Espera do texto parado antes de recalcular o que mudou (nunca a cada tecla). */
export const ESPERA_COMPARAR_MS = 600;

/** Como uma peça aparece marcada na Oficina: ponto verde (nova) ou amarelo (alterada ou movida). */
export type OficinaMarca = "nova" | "alterada";

export type ResultadoDaPublicacao =
    | { readonly ok: true; readonly resultado: LivroPublicadoDto }
    | { readonly ok: false; readonly mensagem: string; readonly erros: readonly string[] };

/**
 * Mudanças e publicação da Oficina (m11-09): as versões do livro, a última publicada, o que mudou da cópia de
 * trabalho em relação a ela (marcas nas peças e gaveta "O que mudou"), a comparação entre duas versões quaisquer
 * (Histórico) e a publicação de rascunho ou versão. Uma instância por leitor, ao lado do `OficinaStore`.
 */
@Injectable()
export class OficinaMudancas {
    private readonly api = inject(OficinaApi);
    private readonly store = inject(OficinaStore);
    private readonly notificacao = inject(NotificacaoService);
    private readonly destroyRef = inject(DestroyRef);

    /** As versões do livro, da mais recente à mais antiga. */
    readonly versoes = signal<readonly LivroVersaoResumoDto[]>([]);
    /** A última versão **publicada** (a que todos veem), com o conteúdo para comparar. */
    readonly publicada = signal<LivroVersaoRecuperadaDto | null>(null);
    readonly carregou = signal(false);
    /** A lista de versões não veio: não dá para dizer se o livro já foi publicado. */
    readonly falhou = signal(false);
    readonly publicando = signal(false);
    /** A cópia de trabalho contra a última publicada; `null` enquanto não há o que comparar. */
    readonly comparacao = signal<LivroComparacaoDto | null>(null);

    /** As mudanças que a lista mostra: as filhas de uma peça nova (ou removida) não aparecem separadas. */
    readonly visiveis = computed<readonly LivroMudancaDto[]>(() => {
        const todas = this.comparacao()?.mudancas ?? [];
        const novas = new Set(todas.filter((m) => m.situacao === LivroMudancaSituacaoEnum.NOVA).map((m) => m.identificador));
        const temAncestralNovo = (identificador: string): boolean => {
            const item = this.store.item(identificador);
            for (let pai = item ? this.store.pai(item) : undefined; pai; pai = this.store.pai(pai)) {
                if (novas.has(pai.identificador)) return true;
            }
            return false;
        };
        // A removida só existe na versão publicada, então não há pai na cópia: vale o caminho (ver o texto).
        const removidas = new Set(semFilhasDeNovasOuRemovidas(todas.filter((m) => m.situacao === LivroMudancaSituacaoEnum.REMOVIDA)));
        return todas.filter((m) => m.situacao === LivroMudancaSituacaoEnum.REMOVIDA ? removidas.has(m)
            : m.situacao !== LivroMudancaSituacaoEnum.NOVA || !temAncestralNovo(m.identificador));
    });
    readonly contagem = computed(() => contarPorSituacao(this.visiveis()));
    readonly total = computed(() => this.comparacao()?.resumo.total ?? 0);
    /** Ponto de cada peça nova ou alterada (movida conta como alterada); as removidas não existem na cópia. */
    readonly marcas = computed<ReadonlyMap<string, OficinaMarca>>(() => {
        const marcas = new Map<string, OficinaMarca>();
        for (const mudanca of this.comparacao()?.mudancas ?? []) {
            if (mudanca.situacao === LivroMudancaSituacaoEnum.REMOVIDA) continue;
            const atual = marcas.get(mudanca.identificador);
            marcas.set(mudanca.identificador, mudanca.situacao === LivroMudancaSituacaoEnum.NOVA || atual === "nova" ? "nova" : "alterada");
        }
        return marcas;
    });
    /** A versão mais recente de todas (rascunho ou publicada): o que os testers veem. */
    readonly maisRecente = computed(() => this.versoes()[0] ?? null);
    readonly numeroSugerido = computed(() => sugerirNumeroVersao(this.versoes()));

    private timer: ReturnType<typeof setTimeout> | undefined;
    private geracao = 0;

    constructor() {
        effect(() => {
            const ok = this.store.estado() === "ok";
            untracked(() => {
                if (ok) void this.carregar();
                else this.limpar();
            });
        });
        this.destroyRef.onDestroy(() => clearTimeout(this.timer));
        effect(() => {
            const pecas = this.store.estado() === "ok" ? this.store.conteudo().pecas : null;
            const publicada = this.publicada();
            untracked(() => this.agendar(pecas, publicada));
        });
    }

    private limpar(): void {
        this.geracao += 1;
        clearTimeout(this.timer);
        this.versoes.set([]);
        this.publicada.set(null);
        this.comparacao.set(null);
        this.carregou.set(false);
        this.falhou.set(false);
    }

    /** Lê as versões e o conteúdo da última publicada (de novo, depois de publicar). */
    async carregar(): Promise<void> {
        const codigo = this.store.codigo();
        if (!codigo) return;
        const geracao = ++this.geracao;
        try {
            const lista = [...await firstValueFrom(this.api.listarVersoes(codigo))]
                .sort((a, b) => b.publicacaoData.localeCompare(a.publicacaoData) || b.id - a.id);
            const ultima = lista.find((versao) => versao.situacao === TipoLivroVersaoSituacaoEnum.PUBLICADA);
            const conteudo = ultima ? await firstValueFrom(this.api.recuperarVersao(codigo, ultima.id)) : null;
            if (geracao !== this.geracao) return;
            this.versoes.set(lista);
            this.publicada.set(conteudo);
            this.falhou.set(false);
            this.carregou.set(true);
        } catch {
            if (geracao !== this.geracao) return;
            this.falhou.set(true);
            this.carregou.set(true);
        }
    }

    private agendar(pecas: ReturnType<OficinaStore["conteudo"]>["pecas"] | null, publicada: LivroVersaoRecuperadaDto | null): void {
        clearTimeout(this.timer);
        if (!pecas || !publicada) {
            this.comparacao.set(null);
            return;
        }
        this.timer = setTimeout(() => this.comparacao.set(compararLivros(publicada.conteudo.pecas, pecas)), ESPERA_COMPARAR_MS);
    }

    /** Compara duas versões do livro (Histórico): `antesId` contra `depoisId`. */
    async comparar(antesId: number, depoisId: number): Promise<LivroComparacaoDto> {
        const codigo = this.store.codigo() as string;
        const [antes, depois] = await Promise.all([
            firstValueFrom(this.api.recuperarVersao(codigo, antesId)),
            firstValueFrom(this.api.recuperarVersao(codigo, depoisId)),
        ]);
        return compararLivros(antes.conteudo.pecas, depois.conteudo.pecas);
    }

    /** Publica a cópia de trabalho. Grava antes tudo o que estiver por salvar; a recusa devolve as pendências. */
    async publicar(
        situacao: TipoLivroVersaoSituacaoEnum, numero: string, nota: string,
    ): Promise<ResultadoDaPublicacao> {
        const codigo = this.store.codigo();
        if (!codigo) return { ok: false, mensagem: "O livro não está aberto na Oficina.", erros: [] };
        this.publicando.set(true);
        try {
            await this.store.salvarTudo();
            // `salvarTudo` não lança: se algo ficou sem gravar, publicar levaria uma edição a menos do que a tela mostra.
            if (this.store.temPendenteDeSalvar) {
                return { ok: false, mensagem: "Há alterações que ainda não foram salvas. Tente de novo em instantes.", erros: [] };
            }
            const resultado = await firstValueFrom(this.api.publicar(codigo, {
                situacao, numero: numero.trim(), nota: nota.trim() || null,
            }));
            await this.carregar();
            this.notificacao.notificar({
                severidade: "sucesso",
                resumo: situacao === TipoLivroVersaoSituacaoEnum.PUBLICADA ? "Versão publicada" : "Rascunho publicado",
                detalhe: `Número ${resultado.versao.numero}.`,
            });
            return { ok: true, resultado };
        } catch (erro) {
            const corpo = erro instanceof HttpErrorResponse ? (erro.error as { mensagem?: string; erros?: string[] } | null) : null;
            return {
                ok: false,
                mensagem: corpo?.mensagem ?? "Não foi possível publicar agora. Tente novamente.",
                erros: corpo?.erros ?? [],
            };
        } finally {
            this.publicando.set(false);
        }
    }
}
