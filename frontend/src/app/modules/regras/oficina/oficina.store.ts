import { HttpErrorResponse } from "@angular/common/http";
import { Injectable, computed, inject, signal } from "@angular/core";
import type {
    LivroPecaDto, LivroPendenciaDto, LivroTrechoDto, LivroVersaoConteudoDto, RegraPecaArvoreItemDto,
} from "@contratados-rpg/shared/dtos/livro";
import { LIVRO_FORMATO_ATUAL } from "@contratados-rpg/shared/dtos/livro";
import { TipoRegraPecaEnum } from "@contratados-rpg/shared/enums";
import { criarEsqueletoPeca, projetarPecasEmRegras, validarArvoreLivro } from "@contratados-rpg/shared/livro";
import { firstValueFrom } from "rxjs";

import { NotificacaoService } from "../../../shared/ui/notificacao/notificacao.service";
import type { RegrasDocumento } from "../regras.model";
import { OficinaApi } from "./oficina-api.service";
import { definirNoCaminho, nomeDoCaminho, type CaminhoDeDados } from "./oficina-dados";
import {
    campoInicialDe, construirLinhasSumario, destinoPorTeclado, NOME_DO_TIPO, opcoesDeInsercao, resolverDestino,
    type LinhaSumario, type ResultadoDoDestino, type TeclaDeEstrutura,
} from "./oficina-estrutura";
import { textoDe } from "./oficina-trechos";

type Item = RegraPecaArvoreItemDto;
type Dados = Item["dados"];

/** Quanto o texto parado espera antes de ser salvo (o campo salva na hora ao perder o foco). */
export const ESPERA_SALVAR_MS = 800;
/** Edições seguidas do mesmo campo, nesta janela, formam um único passo do Desfazer. */
export const JANELA_DESFAZER_MS = 2000;
/** Quantos passos a pilha do Desfazer guarda; a pilha vale só para a sessão aberta. */
export const LIMITE_DESFAZER = 100;
const ESPERA_REPETIR_MS = 5000;

/** Um passo do Desfazer. `chave` agrupa edições seguidas do mesmo campo de uma peça. */
export interface PassoDesfazer {
    readonly rotulo: string;
    readonly identificador: string | null;
    readonly chave: string | null;
    quando: number;
    readonly desfazer: () => Promise<void>;
}

interface EstadoDaPeca {
    timer?: ReturnType<typeof setTimeout>;
    emVoo: boolean;
    reenviar: boolean;
    promessa: Promise<void> | null;
}

export type OficinaIndicador = "salvo" | "salvando" | "pendente" | "falha";

/** Onde o cursor deve pousar quando uma peça nasce, muda de lugar ou perde a vizinha. */
export interface OficinaPedidoFoco {
    readonly identificador: string;
    readonly campo: string;
    readonly posicao: "inicio" | "fim";
}

/** O que uma peça mostra no "Ir para peça": o nome do que é e onde está. */
export interface OficinaRotulo {
    readonly identificador: string;
    readonly rotulo: string;
    readonly contexto: string;
}

/** Tipos que a tela da Oficina desenha com campo editável (o resto é lido na m11-08). */
const TIPOS_COM_TELA: readonly TipoRegraPecaEnum[] = [
    TipoRegraPecaEnum.SECAO, TipoRegraPecaEnum.PARAGRAFO, TipoRegraPecaEnum.EXEMPLO, TipoRegraPecaEnum.NOTA,
    TipoRegraPecaEnum.FORMULA, TipoRegraPecaEnum.HABILIDADE, TipoRegraPecaEnum.CLASSE, TipoRegraPecaEnum.SUBCLASSE,
    TipoRegraPecaEnum.EQUIPAMENTOS, TipoRegraPecaEnum.MODIFICACOES, TipoRegraPecaEnum.EQUIPAMENTO, TipoRegraPecaEnum.MODIFICACAO, TipoRegraPecaEnum.AMPLIFICADOR,
];

/** Irmãs que aparecem lado a lado na tela: a inicial e as melhoradas de um arquétipo são grupos à parte. */
function grupoDe(item: Item): string {
    const dados = item.dados as unknown as { inicial?: boolean; melhorada?: boolean } | null;
    return `${item.tipo}${dados?.inicial === true ? ":inicial" : dados?.melhorada === true ? ":melhorada" : ""}`;
}

function ordenar(itens: readonly Item[]): Item[] {
    return [...itens].sort((a, b) => a.ordem - b.ordem || a.id - b.id);
}

function rotuloDe(item: Item): string {
    const dados = item.dados as unknown as Record<string, unknown> | null;
    const texto = typeof dados?.["titulo"] === "string" ? dados["titulo"]
        : typeof dados?.["nome"] === "string" ? dados["nome"]
            : Array.isArray(dados?.["trechos"]) ? textoDe(dados["trechos"] as LivroTrechoDto[]) : "";
    const limpo = texto.replace(/\s+/g, " ").trim();
    return limpo.length > 70 ? `${limpo.slice(0, 70)}…` : limpo;
}

function mensagemDe(erro: unknown): string | null {
    if (!(erro instanceof HttpErrorResponse)) return null;
    const corpo = erro.error as { mensagem?: string; detalhes?: string[] } | null;
    return corpo?.mensagem ?? null;
}

/**
 * Estado da Oficina das Regras (m11-06): a cópia de trabalho do livro em memória, o salvamento
 * automático por peça, o Desfazer da sessão, as pendências e a peça selecionada. Uma instância por
 * leitor (provida no componente), então a página e o painel flutuante não se misturam.
 *
 * Salvamento: cada peça tem no máximo uma requisição em voo; uma edição feita durante o voo marca a
 * peça para reenviar com a `revisao` devolvida, e a resposta tardia nunca sobrescreve o texto local.
 * Conflito (409): a peça é recarregada do servidor e a edição local é descartada, com aviso.
 */
@Injectable()
export class OficinaStore {
    private readonly api = inject(OficinaApi);
    private readonly notificacao = inject(NotificacaoService);

    readonly codigo = signal<string | null>(null);
    private readonly cabecalho = signal({ titulo: "", subtitulo: "", numero: "" });
    readonly itens = signal<readonly Item[]>([]);
    readonly estado = signal<"inativo" | "carregando" | "ok" | "falha">("inativo");
    readonly ativa = computed(() => this.estado() !== "inativo");
    readonly selecionada = signal<string | null>(null);
    readonly pedidoFoco = signal<OficinaPedidoFoco | null>(null);
    /** Menu do "/": o parágrafo vazio onde ele foi digitado e o elemento onde o menu se ancora. */
    readonly menuBarra = signal<{ readonly peca: string; readonly ancora: HTMLElement } | null>(null);
    readonly opcoesBarra = computed(() => {
        const aberto = this.menuBarra();
        const item = aberto ? this.item(aberto.peca) : undefined;
        if (!item) return [];
        const pai = this.itens().find((candidato) => candidato.id === item.pecaPaiId);
        return opcoesDeInsercao(pai?.tipo ?? null).filter((opcao) => opcao.id !== TipoRegraPecaEnum.PARAGRAFO);
    });

    private readonly emVoo = signal(0);
    private readonly sujas = signal<ReadonlySet<number>>(new Set());
    private readonly falhou = signal(false);
    private readonly salvouAlgumaVez = signal(false);
    private readonly pilha = signal<readonly PassoDesfazer[]>([]);
    private readonly estados = new Map<number, EstadoDaPeca>();
    private geracao = 0;

    readonly podeDesfazer = computed(() => this.pilha().length > 0);
    readonly rotuloDesfazer = computed(() => this.pilha().at(-1)?.rotulo ?? null);
    readonly indicador = computed<OficinaIndicador>(() => {
        if (this.falhou()) return "falha";
        if (this.emVoo() > 0) return "salvando";
        if (this.sujas().size > 0) return "pendente";
        return "salvo";
    });
    readonly salvou = this.salvouAlgumaVez.asReadonly();

    /** Seções, classes e arquétipos na ordem de leitura: o que o sumário da Oficina mostra e arrasta. */
    readonly linhasSumario = computed<readonly LinhaSumario[]>(() => construirLinhasSumario(this.itens()));

    private readonly porIdentificador = computed(() => new Map(this.itens().map((item) => [item.identificador, item])));

    /** O livro como a fotografia o guarda (árvore aninhada), montado da lista plana. */
    readonly conteudo = computed<LivroVersaoConteudoDto>(() => {
        const filhosPorPai = new Map<number | null, Item[]>();
        for (const item of this.itens()) {
            filhosPorPai.set(item.pecaPaiId, [...(filhosPorPai.get(item.pecaPaiId) ?? []), item]);
        }
        const montar = (paiId: number | null): LivroPecaDto[] =>
            ordenar(filhosPorPai.get(paiId) ?? []).map((item) => ({
                identificador: item.identificador,
                ancora: item.ancora,
                tipo: item.tipo,
                ordem: item.ordem,
                dados: item.dados,
                filhos: montar(item.id),
            }));
        const { titulo, subtitulo, numero } = this.cabecalho();
        return { formato: LIVRO_FORMATO_ATUAL, codigo: this.codigo() ?? "", titulo, subtitulo, numero, pecas: montar(null) };
    });

    /** O livro no formato do leitor, com o `identificador` de cada peça em `peca`. */
    readonly documento = computed<RegrasDocumento | null>(() =>
        this.estado() === "ok"
            ? projetarPecasEmRegras(this.conteudo(), { incluirPecas: true }) as unknown as RegrasDocumento : null);

    readonly pendencias = computed<readonly LivroPendenciaDto[]>(() =>
        this.estado() === "ok" ? validarArvoreLivro({ pecas: this.conteudo().pecas, modo: "trabalho" }) : []);
    readonly pendenciasPorPeca = computed(() => {
        const mapa = new Map<string, LivroPendenciaDto[]>();
        for (const pendencia of this.pendencias()) {
            mapa.set(pendencia.identificador, [...(mapa.get(pendencia.identificador) ?? []), pendencia]);
        }
        return mapa;
    });

    /** Para o "Ir para peça": toda peça com nome ou texto, com o caminho dos títulos até ela. */
    readonly rotulos = computed<readonly OficinaRotulo[]>(() => {
        const itens = this.itens();
        const porId = new Map(itens.map((item) => [item.id, item]));
        const caminhoDe = (item: Item): string => {
            const partes: string[] = [];
            for (let pai = item.pecaPaiId === null ? undefined : porId.get(item.pecaPaiId); pai;
                pai = pai.pecaPaiId === null ? undefined : porId.get(pai.pecaPaiId)) {
                const rotulo = rotuloDe(pai);
                if (rotulo) partes.unshift(rotulo);
            }
            return partes.join(" › ");
        };
        // Ordem de leitura: pai antes dos filhos, irmãs por `ordem`.
        const filhosPorPai = new Map<number | null, Item[]>();
        for (const item of itens) filhosPorPai.set(item.pecaPaiId, [...(filhosPorPai.get(item.pecaPaiId) ?? []), item]);
        const resultado: OficinaRotulo[] = [];
        const percorrer = (paiId: number | null): void => {
            for (const item of ordenar(filhosPorPai.get(paiId) ?? [])) {
                const rotulo = rotuloDe(item);
                if (rotulo && TIPOS_COM_TELA.includes(item.tipo)) resultado.push({ identificador: item.identificador, rotulo, contexto: caminhoDe(item) });
                percorrer(item.id);
            }
        };
        percorrer(null);
        return resultado;
    });

    // ---------------------------------------------------------------- carga

    async carregar(codigo: string, cabecalho: { titulo: string; subtitulo?: string; numero: string }): Promise<void> {
        const geracao = ++this.geracao;
        this.descartarTimers();
        this.codigo.set(codigo);
        this.cabecalho.set({ titulo: cabecalho.titulo, subtitulo: cabecalho.subtitulo ?? "", numero: cabecalho.numero });
        this.estado.set("carregando");
        this.selecionada.set(null);
        this.pilha.set([]);
        this.sujas.set(new Set());
        this.falhou.set(false);
        try {
            const itens = await firstValueFrom(this.api.listar(codigo));
            if (geracao !== this.geracao) return;
            this.itens.set(itens);
            this.estado.set("ok");
        } catch {
            if (geracao !== this.geracao) return;
            this.estado.set("falha");
        }
    }

    /** Sai da Oficina depois de gravar o que estiver pendente (trocar de modo ou de livro não perde texto). */
    async encerrar(): Promise<void> {
        if (this.estado() === "inativo") return;
        const geracao = this.geracao;
        await this.salvarTudo();
        // Voltar à Oficina enquanto isto gravava já recarregou o livro: não apaga o estado novo.
        if (geracao === this.geracao) this.desativar();
    }

    desativar(): void {
        this.geracao++;
        this.descartarTimers();
        this.estado.set("inativo");
        this.itens.set([]);
        this.pilha.set([]);
        this.sujas.set(new Set());
        this.selecionada.set(null);
        this.pedidoFoco.set(null);
        this.menuBarra.set(null);
        this.falhou.set(false);
        this.codigo.set(null);
    }

    private descartarTimers(): void {
        for (const estado of this.estados.values()) clearTimeout(estado.timer);
        this.estados.clear();
    }

    // ------------------------------------------------------------ seleção

    selecionar(identificador: string | null): void {
        this.selecionada.set(identificador);
    }

    item(identificador: string): Item | undefined {
        return this.porIdentificador().get(identificador);
    }

    pedirFoco(pedido: OficinaPedidoFoco | null): void {
        this.pedidoFoco.set(pedido);
    }

    // ------------------------------------------------------ edição de dados

    /** `true` quando há alteração ainda não gravada (o navegador avisa antes de sair da página). */
    get temPendenteDeSalvar(): boolean {
        return this.sujas().size > 0 || this.emVoo() > 0 || this.falhou();
    }

    /**
     * Grava o `dados` novo na cópia local e agenda o salvamento. `passo` descreve o Desfazer; edições
     * seguidas do mesmo campo (mesma `chave`) dentro de `JANELA_DESFAZER_MS` viram um passo só.
     */
    alterarDados(identificador: string, dados: Dados, passo?: { rotulo: string; chave: string } | null): void {
        const atual = this.item(identificador);
        if (!atual || JSON.stringify(atual.dados) === JSON.stringify(dados)) return;
        const antes = atual.dados;
        this.aplicarDados(atual.id, dados);
        if (passo !== null) {
            const topo = this.pilha().at(-1);
            const agora = Date.now();
            if (passo && topo?.chave === passo.chave && topo.identificador === identificador
                && agora - topo.quando < JANELA_DESFAZER_MS) {
                topo.quando = agora;
            } else {
                this.empilhar({
                    rotulo: passo?.rotulo ?? "Edição", identificador, chave: passo?.chave ?? null, quando: agora,
                    desfazer: async () => {
                        this.aplicarDados(atual.id, antes);
                        this.agendar(atual.id);
                        await this.salvarAgora(atual.id);
                    },
                });
            }
        }
        this.agendar(atual.id);
    }

    /**
     * Edição discreta de um campo (botão, contador, lista): grava o valor no caminho do `dados` e salva na hora,
     * com o próprio passo de Desfazer (`fundir = false`: nunca se junta ao passo anterior). `valor === undefined` retira o campo.
     */
    alterarCampo(identificador: string, caminho: CaminhoDeDados, valor: unknown, rotulo: string, fundir = true): void {
        const item = this.item(identificador);
        if (!item) return;
        this.alterarDados(identificador, definirNoCaminho(item.dados, caminho, valor), {
            rotulo, chave: `${identificador}:${nomeDoCaminho(caminho)}${fundir ? "" : ":" + Date.now()}`,
        });
        void this.salvarAgora(item.id);
    }

    private aplicarDados(id: number, dados: Dados): void {
        this.itens.update((lista) => lista.map((item) => (item.id === id ? { ...item, dados } : item)));
    }

    private estadoDe(id: number): EstadoDaPeca {
        let estado = this.estados.get(id);
        if (!estado) {
            estado = { emVoo: false, reenviar: false, promessa: null };
            this.estados.set(id, estado);
        }
        return estado;
    }

    private marcarSuja(id: number, suja: boolean): void {
        this.sujas.update((atuais) => {
            if (atuais.has(id) === suja) return atuais;
            const novas = new Set(atuais);
            if (suja) novas.add(id); else novas.delete(id);
            return novas;
        });
    }

    private agendar(id: number): void {
        const estado = this.estadoDe(id);
        clearTimeout(estado.timer);
        this.marcarSuja(id, true);
        estado.timer = setTimeout(() => { estado.timer = undefined; void this.salvar(id); }, ESPERA_SALVAR_MS);
    }

    /** Grava na hora a peça editada (o campo chama ao perder o foco). */
    async salvarAgora(id: number): Promise<void> {
        const estado = this.estados.get(id);
        if (!estado) return;
        clearTimeout(estado.timer);
        estado.timer = undefined;
        await this.salvar(id);
    }

    /** Espera tudo o que estiver pendente ou em voo (antes de sair, mover, remover, publicar). */
    async salvarTudo(): Promise<void> {
        await Promise.all([...this.estados.keys()].map((id) => this.salvarAgora(id)));
    }

    private salvar(id: number): Promise<void> {
        const estado = this.estadoDe(id);
        if (estado.emVoo) {
            estado.reenviar = true;
            return estado.promessa ?? Promise.resolve();
        }
        estado.emVoo = true;
        estado.promessa = this.laco(id, estado).finally(() => { estado.emVoo = false; estado.promessa = null; });
        return estado.promessa;
    }

    private async laco(id: number, estado: EstadoDaPeca): Promise<void> {
        const codigo = this.codigo();
        if (!codigo) return;
        const geracao = this.geracao;
        do {
            estado.reenviar = false;
            const item = this.itens().find((candidato) => candidato.id === id);
            if (!item) break;
            const enviado = item.dados;
            this.emVoo.update((total) => total + 1);
            try {
                const peca = await firstValueFrom(this.api.alterarDados(codigo, id, enviado, item.revisao));
                if (geracao !== this.geracao) return;
                // A resposta só traz a revisão nova: o texto local pode já ter avançado.
                // A âncora vem junto: a primeira vez que seção/classe ganha nome, o servidor deriva a âncora.
                this.itens.update((lista) => lista.map((candidato) =>
                    candidato.id === id ? { ...candidato, revisao: peca.revisao, ancora: peca.ancora } : candidato));
                this.falhou.set(false);
                this.salvouAlgumaVez.set(true);
                if (this.itens().find((candidato) => candidato.id === id)?.dados !== enviado) estado.reenviar = true;
            } catch (erro) {
                if (geracao !== this.geracao) return;
                estado.reenviar = false;
                await this.tratarFalha(id, erro);
            } finally {
                this.emVoo.update((total) => total - 1);
            }
        } while (estado.reenviar);
        if (!estado.timer && geracao === this.geracao && !this.falhou()) this.marcarSuja(id, false);
    }

    private async tratarFalha(id: number, erro: unknown): Promise<void> {
        const codigo = this.codigo();
        const status = erro instanceof HttpErrorResponse ? erro.status : 0;
        const estado = this.estadoDe(id);
        if (status === 409 || status === 400 || status === 404) {
            // O servidor tem outra verdade (ou recusou a forma): recarrega a peça e descarta a edição local.
            clearTimeout(estado.timer);
            estado.timer = undefined;
            const identificador = this.itens().find((item) => item.id === id)?.identificador ?? null;
            this.pilha.update((passos) => passos.filter((passo) => passo.identificador !== identificador));
            try {
                if (!codigo) return;
                const peca = await firstValueFrom(this.api.recuperar(codigo, id));
                this.itens.update((lista) => lista.map((item) => (item.id === id ? { ...item, ...peca } : item)));
            } catch {
                // Peça sumiu do servidor: segue sem ela na cópia local.
                this.itens.update((lista) => lista.filter((item) => item.id !== id));
            }
            this.marcarSuja(id, false);
            this.notificacao.notificar({
                severidade: "aviso",
                resumo: status === 409 ? "Esta peça mudou em outro lugar" : "Alteração recusada",
                detalhe: status === 409
                    ? "Recarregamos a versão salva; a sua edição não foi gravada."
                    : (mensagemDe(erro) ?? "O servidor não aceitou a alteração; recarregamos a versão salva."),
            });
            return;
        }
        if (!this.falhou()) {
            this.notificacao.notificar({
                severidade: "erro", resumo: "Não foi possível salvar",
                detalhe: "Vamos tentar de novo em instantes; o texto continua aqui.",
            });
        }
        this.falhou.set(true);
        clearTimeout(estado.timer);
        estado.timer = setTimeout(() => { estado.timer = undefined; void this.salvar(id); }, ESPERA_REPETIR_MS);
    }

    // ------------------------------------------------------------ desfazer

    private empilhar(passo: PassoDesfazer): void {
        this.pilha.update((passos) => [...passos, passo].slice(-LIMITE_DESFAZER));
    }

    private desfazendo = false;

    async desfazer(): Promise<void> {
        const passo = this.pilha().at(-1);
        if (passo) await this.desfazerPasso(passo);
    }

    /** Desfaz um passo específico (o aviso de "Peça removida" desfaz aquela remoção, não o topo da pilha). */
    async desfazerPasso(passo: PassoDesfazer): Promise<void> {
        if (this.desfazendo || !this.pilha().includes(passo)) return;
        this.desfazendo = true;
        this.pilha.update((passos) => passos.filter((candidato) => candidato !== passo));
        try {
            await passo.desfazer();
        } catch (erro) {
            this.notificacao.notificar({
                severidade: "aviso", resumo: "Não foi possível desfazer",
                detalhe: mensagemDe(erro) ?? "A peça mudou desde então.",
            });
        } finally {
            this.desfazendo = false;
        }
    }

    // --------------------------------------------------------- estrutura

    /** Irmãs da peça (ela incluída) na ordem do livro. */
    irmas(item: Item): Item[] {
        return ordenar(this.itens().filter((candidato) => candidato.pecaPaiId === item.pecaPaiId));
    }

    private pai(item: Item): Item | undefined {
        return item.pecaPaiId === null ? undefined : this.itens().find((candidato) => candidato.id === item.pecaPaiId);
    }

    /** Posição entre as irmãs que aparecem juntas na tela (`null` quando a peça não se move: filha de roteiro). */
    posicaoEntreIrmas(identificador: string): { indice: number; total: number } | null {
        const item = this.item(identificador);
        if (!item || this.pai(item)?.tipo === TipoRegraPecaEnum.ROTEIRO) return null;
        const grupo = this.irmas(item).filter((irma) => grupoDe(irma) === grupoDe(item));
        return { indice: grupo.findIndex((irma) => irma.id === item.id), total: grupo.length };
    }

    /** Duplicar e remover: a habilidade inicial e as filhas de roteiro têm lugar fixo no livro. */
    podeDuplicarOuRemover(identificador: string): boolean {
        const item = this.item(identificador);
        if (!item || this.pai(item)?.tipo === TipoRegraPecaEnum.ROTEIRO) return false;
        return !((item.dados as unknown as { inicial?: boolean } | null)?.inicial === true);
    }

    /** A peça mais próxima (ela ou um ancestral) que a tela desenha com campo editável. */
    alvoVisivel(identificador: string): string | null {
        for (let item = this.item(identificador); item; item = this.pai(item)) {
            if (TIPOS_COM_TELA.includes(item.tipo)) return item.identificador;
        }
        return null;
    }

    /** Põe as peças devolvidas pela API na cópia local (nova ou com posição/revisão atualizada). */
    private mesclar(pecas: readonly Item[]): void {
        this.itens.update((lista) => {
            const porId = new Map(lista.map((item) => [item.id, item]));
            for (const peca of pecas) {
                const local = porId.get(peca.id);
                // Edição ainda não gravada vale mais que o texto que o servidor devolveu.
                const preservar = local !== undefined && (this.sujas().has(peca.id) || this.estados.get(peca.id)?.emVoo);
                const revisao = local ? Math.max(local.revisao, peca.revisao) : peca.revisao;
                porId.set(peca.id, preservar ? { ...peca, dados: local.dados, revisao } : { ...peca, revisao });
            }
            return [...porId.values()];
        });
    }

    private removerLocal(id: number): void {
        const filhasPorPai = new Map<number, number[]>();
        for (const item of this.itens()) {
            if (item.pecaPaiId !== null) filhasPorPai.set(item.pecaPaiId, [...(filhasPorPai.get(item.pecaPaiId) ?? []), item.id]);
        }
        const saem = new Set<number>();
        for (const pendentes = [id]; pendentes.length;) {
            const atual = pendentes.pop() as number;
            saem.add(atual);
            pendentes.push(...(filhasPorPai.get(atual) ?? []));
        }
        const identificadores = new Set(this.itens().filter((item) => saem.has(item.id)).map((item) => item.identificador));
        this.pilha.update((passos) => passos.filter((passo) => !passo.identificador || !identificadores.has(passo.identificador)));
        for (const saida of saem) {
            clearTimeout(this.estados.get(saida)?.timer);
            this.estados.delete(saida);
            this.marcarSuja(saida, false);
        }
        this.itens.update((lista) => lista.filter((item) => !saem.has(item.id)));
    }

    /** Sobe (-1) ou desce (+1) a peça entre as irmãs. */
    async mover(identificador: string, direcao: -1 | 1): Promise<void> {
        const codigo = this.codigo();
        const inicial = this.item(identificador);
        if (!codigo || !inicial) return;
        const posicao = this.posicaoEntreIrmas(identificador);
        if (!posicao) return;
        const irmas = this.irmas(inicial);
        const indice = irmas.findIndex((irma) => irma.id === inicial.id);
        const grupo = irmas.filter((irma) => grupoDe(irma) === grupoDe(inicial));
        const vizinha = grupo[posicao.indice + direcao];
        if (!vizinha) return;
        // O destino é a posição da vizinha entre todas as irmãs: a peça ocupa o lugar dela.
        const destino = irmas.findIndex((irma) => irma.id === vizinha.id);
        await this.salvarAgora(inicial.id);
        const item = this.item(identificador);
        if (!item) return;
        try {
            const resposta = await firstValueFrom(this.api.alterarPosicao(codigo, item.id, item.pecaPaiId, destino, item.revisao));
            this.mesclar(resposta.pecas);
            this.empilhar({
                rotulo: direcao < 0 ? "Subir peça" : "Descer peça", identificador, chave: null, quando: Date.now(),
                desfazer: async () => {
                    const atual = this.item(identificador);
                    if (!atual) return;
                    await this.salvarAgora(atual.id);
                    const voltou = await firstValueFrom(this.api.alterarPosicao(codigo, atual.id, atual.pecaPaiId, indice,
                        this.item(identificador)?.revisao ?? atual.revisao));
                    this.mesclar(voltou.pecas);
                },
            });
        } catch (erro) {
            await this.falhaEstrutural(erro, "mover a peça");
        }
    }

    /** Cria uma cópia logo depois da peça e a seleciona. */
    async duplicar(identificador: string): Promise<void> {
        const codigo = this.codigo();
        const item = this.item(identificador);
        if (!codigo || !item || !this.podeDuplicarOuRemover(identificador)) return;
        await this.salvarAgora(item.id);
        try {
            const resposta = await firstValueFrom(this.api.duplicar(codigo, item.id));
            this.mesclar(resposta.pecas);
            const copia = resposta.pecas.find((peca) => peca.id === resposta.copiaId);
            if (copia) this.selecionada.set(copia.identificador);
            this.empilhar({
                rotulo: "Duplicar peça", identificador: copia?.identificador ?? null, chave: null, quando: Date.now(),
                desfazer: async () => {
                    const atual = this.itens().find((candidato) => candidato.id === resposta.copiaId);
                    if (!atual) return;
                    await firstValueFrom(this.api.excluir(codigo, atual.id, atual.revisao));
                    this.removerLocal(atual.id);
                    if (this.selecionada() === atual.identificador) this.selecionada.set(identificador);
                },
            });
            this.notificacao.notificar({ severidade: "sucesso", resumo: "Peça duplicada",
                detalhe: "Os links para ela continuam apontando para a original." });
        } catch (erro) {
            await this.falhaEstrutural(erro, "duplicar a peça");
        }
    }

    /** Remove (soft) a peça e o que ela contém; o aviso oferece Desfazer. */
    async remover(identificador: string, foco?: OficinaPedidoFoco | null): Promise<void> {
        const codigo = this.codigo();
        const item = this.item(identificador);
        if (!codigo || !item || !this.podeDuplicarOuRemover(identificador)) return;
        await this.salvarAgora(item.id);
        const atual = this.item(identificador);
        if (!atual) return;
        try {
            await firstValueFrom(this.api.excluir(codigo, atual.id, atual.revisao));
            this.removerLocal(atual.id);
            if (this.selecionada() === identificador) this.selecionada.set(null);
            if (foco) this.pedirFoco(foco);
            const restaurar = async (): Promise<void> => {
                const resposta = await firstValueFrom(this.api.restaurar(codigo, atual.id));
                this.mesclar(resposta.pecas);
                this.selecionada.set(identificador);
            };
            const passoRemocao: PassoDesfazer = { rotulo: "Remover peça", identificador, chave: null, quando: Date.now(), desfazer: restaurar };
            this.empilhar(passoRemocao);
            this.notificacao.notificar({
                severidade: "aviso", resumo: "Peça removida",
                detalhe: "Os links para ela viram pendência. Desfazer traz a peça de volta.",
                acao: { rotulo: "Desfazer", executar: () => { void this.desfazerPasso(passoRemocao); } },
            });
        } catch (erro) {
            await this.falhaEstrutural(erro, "remover a peça");
        }
    }

    /**
     * Cria uma peça do mesmo tipo logo depois de `referencia` (o Enter no fim de um parágrafo). Com
     * Com `antes`, a peça de referência fica só com `antes` e a nova recebe o resto (Enter no meio).
     */
    async criarDepois(referencia: string, campo: string, dados: Dados, antes?: Dados): Promise<void> {
        const codigo = this.codigo();
        const base = this.item(referencia);
        if (!codigo || !base) return;
        await this.salvarAgora(base.id);
        const posicao = this.posicaoEntreIrmas(referencia);
        if (!posicao) return;
        const dadosAntes = this.item(referencia)?.dados;
        // O começo fica na peça já: o que for digitado durante a requisição vai por cima dele, sem se perder.
        if (antes !== undefined) {
            this.aplicarDados(base.id, antes);
            this.agendar(base.id);
        }
        try {
            const resposta = await firstValueFrom(this.api.criar(codigo, {
                tipo: base.tipo, pecaPaiId: base.pecaPaiId, indice: posicao.indice + 1, dados,
            }));
            this.mesclar([resposta.peca, ...resposta.pecas]);
            this.selecionada.set(resposta.peca.identificador);
            this.pedirFoco({ identificador: resposta.peca.identificador, campo, posicao: "inicio" });
            this.empilhar({
                rotulo: "Nova peça", identificador: resposta.peca.identificador, chave: null, quando: Date.now(),
                desfazer: async () => {
                    const criada = this.itens().find((candidato) => candidato.id === resposta.peca.id);
                    if (!criada) return;
                    await firstValueFrom(this.api.excluir(codigo, criada.id, criada.revisao));
                    this.removerLocal(criada.id);
                    if (dadosAntes !== undefined && antes !== undefined) {
                        this.aplicarDados(base.id, dadosAntes);
                        await this.salvarAgora(base.id);
                    }
                    this.selecionada.set(referencia);
                    this.pedirFoco({ identificador: referencia, campo, posicao: "fim" });
                },
            });
        } catch (erro) {
            if (dadosAntes !== undefined && antes !== undefined) this.aplicarDados(base.id, dadosAntes);
            await this.falhaEstrutural(erro, "criar a peça");
        }
    }

    // ------------------------------------------- inserir, mover para outro pai, renomear (m11-07)

    /**
     * Cria uma peça nova com o esqueleto do tipo dentro de `paiIdentificador` (`null` = raiz do livro),
     * logo depois de `depoisDe` (`null` = no começo). O cursor vai ao primeiro campo. Com `substituir`, a
     * peça indicada (o parágrafo vazio do "/") sai e a nova fica no lugar dela, num passo só do Desfazer.
     * Com `aoFinal` (e sem referência), a peça vai para o fim da lista do pai, não para o começo.
     */
    async inserir(
        tipo: TipoRegraPecaEnum, paiIdentificador: string | null, depoisDe: string | null,
        substituir?: string, aoFinal = false,
    ): Promise<void> {
        const codigo = this.codigo();
        const pai = paiIdentificador === null ? null : this.item(paiIdentificador);
        if (!codigo || pai === undefined) return;
        const referencia = depoisDe === null ? undefined : this.item(depoisDe);
        const vazia = substituir === undefined ? undefined : this.item(substituir);
        if (referencia) await this.salvarAgora(referencia.id);
        const irmas = ordenar(this.itens().filter((irma) => irma.pecaPaiId === (pai?.id ?? null)));
        const posicaoRef = referencia ? irmas.findIndex((irma) => irma.id === referencia.id) : -1;
        // No lugar de uma peça vazia, a nova ocupa a posição dela; senão vem logo depois da referência.
        const indice = vazia ? Math.max(0, irmas.findIndex((irma) => irma.id === vazia.id))
            : aoFinal && !referencia ? irmas.length : posicaoRef + 1;
        const esqueleto = criarEsqueletoPeca(tipo);
        try {
            const resposta = await firstValueFrom(this.api.criar(codigo, {
                tipo, pecaPaiId: pai?.id ?? null, indice, dados: esqueleto.dados, filhos: esqueleto.filhos,
            }));
            this.mesclar([resposta.peca, ...resposta.pecas, ...resposta.filhas]);
            const criadas = [resposta.peca.id, ...resposta.filhas.map((filha) => filha.id)];
            let revisaoVazia = vazia?.revisao;
            if (vazia) {
                await this.salvarAgora(vazia.id);
                revisaoVazia = this.item(vazia.identificador)?.revisao ?? vazia.revisao;
                try {
                    await firstValueFrom(this.api.excluir(codigo, vazia.id, revisaoVazia));
                    this.removerLocal(vazia.id);
                } catch (erro) {
                    await this.falhaEstrutural(erro, "tirar o parágrafo vazio");
                }
            }
            this.selecionada.set(resposta.peca.identificador);
            const campo = campoInicialDe(tipo);
            if (campo) this.pedirFoco({ identificador: resposta.peca.identificador, campo, posicao: "inicio" });
            this.empilhar({
                rotulo: `Inserir ${(NOME_DO_TIPO[tipo] ?? "peça").toLowerCase()}`, identificador: resposta.peca.identificador,
                chave: null, quando: Date.now(),
                desfazer: async () => {
                    const criada = this.itens().find((candidato) => candidato.id === resposta.peca.id);
                    if (criada) {
                        await firstValueFrom(this.api.excluir(codigo, criada.id, criada.revisao));
                        this.removerLocal(criada.id);
                    }
                    for (const id of criadas) this.estados.delete(id);
                    if (vazia) {
                        const volta = await firstValueFrom(this.api.restaurar(codigo, vazia.id));
                        this.mesclar(volta.pecas);
                        this.selecionada.set(vazia.identificador);
                    }
                },
            });
        } catch (erro) {
            await this.falhaEstrutural(erro, "inserir a peça");
        }
    }

    /**
     * Move a peça para outro pai e posição (o arrastar do sumário e os atalhos de teclado). Devolve se
     * o movimento valeu; a API tem a palavra final sobre o aninhamento.
     */
    async moverPara(identificador: string, pecaPaiId: number | null, indice: number): Promise<boolean> {
        const codigo = this.codigo();
        const inicial = this.item(identificador);
        // Auto-repeat de tecla ou dois arrastos seguidos usariam a mesma revisão: o segundo dá conflito falso.
        if (!codigo || !inicial || this.movendo) return false;
        this.movendo = true;
        try {
            return await this.moverParaSemTrava(codigo, inicial, identificador, pecaPaiId, indice);
        } finally {
            this.movendo = false;
        }
    }

    private movendo = false;

    private async moverParaSemTrava(
        codigo: string, inicial: Item, identificador: string, pecaPaiId: number | null, indice: number,
    ): Promise<boolean> {
        const irmasAntes = this.irmas(inicial).filter((irma) => irma.id !== inicial.id);
        const indiceAntes = irmasAntes.filter((irma) => irma.ordem < inicial.ordem
            || (irma.ordem === inicial.ordem && irma.id < inicial.id)).length;
        const paiAntes = inicial.pecaPaiId;
        await this.salvarAgora(inicial.id);
        const item = this.item(identificador);
        if (!item) return false;
        try {
            const resposta = await firstValueFrom(this.api.alterarPosicao(codigo, item.id, pecaPaiId, indice, item.revisao));
            this.mesclar(resposta.pecas);
            this.empilhar({
                rotulo: "Mover peça", identificador, chave: null, quando: Date.now(),
                desfazer: async () => {
                    const atual = this.item(identificador);
                    if (!atual) return;
                    await this.salvarAgora(atual.id);
                    const voltou = await firstValueFrom(this.api.alterarPosicao(codigo, atual.id, paiAntes, indiceAntes,
                        this.item(identificador)?.revisao ?? atual.revisao));
                    this.mesclar(voltou.pecas);
                },
            });
            return true;
        } catch (erro) {
            await this.falhaEstrutural(erro, "mover a peça");
            return false;
        }
    }

    /** O "/" só abre o menu num parágrafo cujo pai aceita outros tipos (numa ficha de criatura, não). */
    podeAbrirMenuBarra(peca: string): boolean {
        const item = this.item(peca);
        if (!item || !this.ehParagrafo(peca)) return false;
        const pai = this.itens().find((candidato) => candidato.id === item.pecaPaiId);
        return opcoesDeInsercao(pai?.tipo ?? null).some((opcao) => opcao.id !== TipoRegraPecaEnum.PARAGRAFO);
    }

    abrirMenuBarra(peca: string, ancora: HTMLElement): void {
        if (this.podeAbrirMenuBarra(peca)) this.menuBarra.set({ peca, ancora });
    }

    /** Fecha o menu do "/"; sem escolha, o cursor volta ao parágrafo. */
    fecharMenuBarra(devolverFoco = true): void {
        const aberto = this.menuBarra();
        this.menuBarra.set(null);
        if (aberto && devolverFoco) this.pedirFoco({ identificador: aberto.peca, campo: "trechos", posicao: "fim" });
    }

    /** O tipo escolhido no "/" toma o lugar do parágrafo vazio. */
    async escolherNoMenuBarra(tipo: string): Promise<void> {
        const aberto = this.menuBarra();
        if (!aberto) return;
        this.menuBarra.set(null);
        const vazia = this.item(aberto.peca);
        if (!vazia) return;
        const pai = this.itens().find((candidato) => candidato.id === vazia.pecaPaiId);
        await this.inserir(tipo as TipoRegraPecaEnum, pai?.identificador ?? null, null, vazia.identificador);
    }

    /** Resolve onde a peça cai quando solta no sumário (posição entre as linhas e profundidade do arrasto). */
    destinoDoArraste(identificador: string, posicao: number, profundidade: number): ResultadoDoDestino {
        const item = this.item(identificador);
        if (!item) return { ok: false, motivo: "A peça não existe mais." };
        return resolverDestino(this.itens(), this.linhasSumario(), item.id, posicao, profundidade);
    }

    destinoDeTeclado(identificador: string, tecla: TeclaDeEstrutura): ResultadoDoDestino {
        const item = this.item(identificador);
        if (!item) return { ok: false, motivo: "A peça não existe mais." };
        return destinoPorTeclado(this.itens(), this.linhasSumario(), item.id, tecla);
    }

    /**
     * Renomeia a peça: o nome novo gera a âncora nova, e a antiga continua levando à peça. Diferente de
     * digitar no título da tela, que só troca o texto e deixa os links como estão.
     */
    async renomear(identificador: string, nome: string): Promise<boolean> {
        const codigo = this.codigo();
        const inicial = this.item(identificador);
        const limpo = nome.trim();
        if (!codigo || !inicial || !limpo) return false;
        await this.salvarAgora(inicial.id);
        const item = this.item(identificador);
        if (!item) return false;
        const dadosAntes = item.dados;
        const dadosNome = item.dados as unknown as Record<string, unknown>;
        const nomeAntes = String(dadosNome["titulo"] ?? dadosNome["nome"] ?? "").trim();
        try {
            const resposta = await firstValueFrom(this.api.alterarNome(codigo, item.id, limpo, item.revisao));
            this.itens.update((lista) => lista.map((candidato) => (candidato.id === item.id
                ? { ...candidato, ...resposta.peca } : candidato)));
            this.empilhar({
                rotulo: "Renomear peça", identificador, chave: null, quando: Date.now(),
                desfazer: async () => {
                    const atual = this.item(identificador);
                    if (!atual) return;
                    await this.salvarAgora(atual.id);
                    if (nomeAntes) {
                        const volta = await firstValueFrom(this.api.alterarNome(codigo, atual.id, nomeAntes, atual.revisao));
                        this.itens.update((lista) => lista.map((candidato) => (candidato.id === atual.id
                            ? { ...candidato, ...volta.peca } : candidato)));
                    } else {
                        this.aplicarDados(atual.id, dadosAntes);
                        this.agendar(atual.id);
                        await this.salvarAgora(atual.id);
                    }
                },
            });
            this.notificacao.notificar({
                severidade: "sucesso", resumo: "Peça renomeada",
                detalhe: resposta.ancoraAntiga
                    ? "O link novo já vale; o antigo continua abrindo esta peça."
                    : "A peça ganhou um link a partir do nome.",
            });
            return true;
        } catch (erro) {
            await this.falhaEstrutural(erro, "renomear a peça");
            return false;
        }
    }

    private async falhaEstrutural(erro: unknown, acao: string): Promise<void> {
        const status = erro instanceof HttpErrorResponse ? erro.status : 0;
        const codigo = this.codigo();
        this.notificacao.notificar({
            severidade: status === 409 ? "aviso" : "erro",
            resumo: `Não foi possível ${acao}`,
            detalhe: status === 409
                ? "A peça mudou em outro lugar. Recarregamos o livro; tente de novo."
                : (mensagemDe(erro) ?? "Tente novamente."),
        });
        if (status === 409 && codigo) {
            // O servidor tem outra árvore: recarrega a lista (sem perder o que está pendente).
            try {
                this.mesclar(await firstValueFrom(this.api.listar(codigo)));
            } catch {
                // Sem rede: a próxima ação mostra o erro.
            }
        }
    }

    /** O Enter no fim de um parágrafo cria outro parágrafo ao lado. */
    ehParagrafo(identificador: string): boolean {
        const item = this.item(identificador);
        return item?.tipo === TipoRegraPecaEnum.PARAGRAFO && this.pai(item)?.tipo !== TipoRegraPecaEnum.ROTEIRO;
    }
}
