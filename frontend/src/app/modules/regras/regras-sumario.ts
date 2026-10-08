import type { RegrasConteudo } from "./regras.model";

export interface RegrasSumarioItem {
    readonly ancora: string;
    readonly titulo: string;
    readonly nivel: number;
    readonly filhos: readonly RegrasSumarioItem[];
}

/** Mantém a ordem e a hierarquia da fonte, exibindo capítulos, títulos e subtítulos até ⬥. */
export function construirSumarioRegras(
    filhos: readonly RegrasConteudo[],
): RegrasSumarioItem[] {
    return filhos.flatMap((conteudo) => {
        const descendentes = construirSumarioRegras(listarFilhosRegras(conteudo));
        if (conteudo.tipo !== "secao" || conteudo.nivel > 3) {
            return descendentes;
        }
        return [{
            ancora: conteudo.ancora,
            titulo: conteudo.titulo,
            nivel: conteudo.nivel,
            filhos: descendentes,
        }];
    });
}

/** Inclui também os verbetes ⬦, que participam da navegação e da leitura ativa. */
export function listarAncorasRegras(filhos: readonly RegrasConteudo[]): string[] {
    return filhos.flatMap((conteudo) => [
        ...(conteudo.tipo === "secao" ? [conteudo.ancora] : []),
        ...listarAncorasRegras(listarFilhosRegras(conteudo)),
    ]);
}

function listarFilhosRegras(conteudo: RegrasConteudo): readonly RegrasConteudo[] {
    if ("filhos" in conteudo) {
        return conteudo.filhos ?? [];
    }
    if (conteudo.tipo === "lista") {
        return conteudo.itens.flat();
    }
    return [];
}
