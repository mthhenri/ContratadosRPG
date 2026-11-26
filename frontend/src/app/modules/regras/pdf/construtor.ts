import type { Trechos } from "@contratados-rpg/shared/livro";
import { GEOMETRIA } from "./estilos";
import type { DesenhoDeIcone } from "./icones";
import { type Colunas, type Grupo, type Peca, larguraDaColuna } from "./paginacao";
import type { ContextoDeDesenho, EstiloTexto, Pincel } from "./pincel";
import { type OpcoesDeBloco, pecasDeTexto, trechosEmCorridas } from "./texto-rico";

export type PecaPdf = Peca<ContextoDeDesenho>;
export type GrupoPdf = Grupo<ContextoDeDesenho>;

/**
 * Junta as peças de uma coluna num grupo só (para título e texto andarem juntos) e fecha o grupo
 * quando aparece algo em colunas ou uma quebra de página.
 */
export class Construtor {
    private readonly grupos: GrupoPdf[] = [];
    private pendentes: PecaPdf[] = [];
    private pedirPagina = false;
    private capitulo: string | undefined;

    constructor(
        readonly pincel: Pincel,
        private readonly icones: Readonly<Partial<Record<string, DesenhoDeIcone>>> = {},
    ) {}

    /** O desenho do ícone, quando quem gera o livro o entregou. */
    icone(nome: string | undefined): DesenhoDeIcone | undefined {
        return nome === undefined ? undefined : this.icones[nome];
    }

    largura(colunas: Colunas = 1): number {
        return larguraDaColuna(GEOMETRIA, colunas);
    }

    adicionar(...pecas: readonly PecaPdf[]): void {
        this.pendentes.push(...pecas);
    }

    paragrafo(
        trechos: Trechos, estilo: EstiloTexto, opcoes: OpcoesDeBloco = {}, largura = this.largura(),
    ): PecaPdf[] {
        return pecasDeTexto(this.pincel, trechosEmCorridas(trechos, estilo), largura,
            { justificar: true, ...opcoes });
    }

    emColunas(colunas: Colunas, pecas: readonly PecaPdf[]): void {
        if (colunas === 1) {
            this.adicionar(...pecas);
            return;
        }
        this.fechar();
        this.empurrar({ tipo: "fluxo", colunas, pecas });
    }

    emParalelo(colunas: readonly (readonly PecaPdf[])[]): void {
        this.fechar();
        this.empurrar({ tipo: "paralelo", colunas });
    }

    novaPagina(capitulo?: string): void {
        // Sem capítulo novo, o título que anunciava este bloco atravessa a quebra junto com ele.
        const levar: PecaPdf[] = [];
        if (capitulo === undefined) {
            while (this.pendentes[this.pendentes.length - 1]?.prenderProxima) {
                levar.unshift(this.pendentes.pop()!);
            }
        }
        this.fechar();
        this.pedirPagina = true;
        this.capitulo = capitulo ?? this.capitulo;
        this.pendentes.push(...levar);
    }

    /** Altura do que ainda vai na página antes do próximo grupo (título levado pela quebra). */
    alturaPendente(): number {
        return this.pendentes.reduce(
            (soma, peca) => soma + peca.altura + (peca.espacoAntes ?? 0), 0);
    }

    concluir(): readonly GrupoPdf[] {
        this.fechar();
        return this.grupos;
    }

    private fechar(): void {
        if (!this.pendentes.length) return;
        const pecas = this.pendentes;
        this.pendentes = [];
        this.empurrar({ tipo: "fluxo", colunas: 1, pecas });
    }

    private empurrar(grupo: GrupoPdf): void {
        this.grupos.push({ ...grupo, novaPagina: this.pedirPagina, capitulo: this.capitulo });
        this.pedirPagina = false;
    }
}

/** Peça única com várias linhas já medidas (cartão, termo, caixa). */
export function pecaComposta(
    pecas: readonly PecaPdf[], desenhoDeFundo: (contexto: ContextoDeDesenho, x: number, y: number,
        altura: number) => void = () => undefined,
    margem: { readonly cima?: number; readonly baixo?: number; readonly lado?: number } = {},
    extras: Partial<PecaPdf> = {},
): PecaPdf {
    const cima = margem.cima ?? 0;
    const baixo = margem.baixo ?? 0;
    const lado = margem.lado ?? 0;
    const interna = pecas.reduce((soma, peca, indice) =>
        soma + peca.altura + (indice ? peca.espacoAntes ?? 0 : 0), 0);
    const altura = cima + interna + baixo;
    return {
        ...extras,
        altura,
        // Mais alta que a coluna: vira linhas soltas, sem o fundo.
        partir: () => pecas.map(
            (peca, indice) => indice ? peca : { ...peca, ancoras: extras.ancoras }),
        desenhar: (contexto, x, y) => {
            desenhoDeFundo(contexto, x, y, altura);
            let posicao = y + cima;
            pecas.forEach((peca, indice) => {
                if (indice) posicao += peca.espacoAntes ?? 0;
                peca.desenhar(contexto, x + lado, posicao);
                posicao += peca.altura;
            });
        },
    };
}
