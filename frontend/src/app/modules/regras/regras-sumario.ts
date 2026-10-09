import type { RegrasConteudo } from "./regras.model";

export interface RegrasSumarioItem {
    readonly ancora: string;
    readonly titulo: string;
    readonly nivel: number;
    readonly filhos: readonly RegrasSumarioItem[];
}

/** Seções até ⬥ e dossiês de classe/subclasse, na ordem e hierarquia da fonte. */
export function construirSumarioRegras(
    filhos: readonly RegrasConteudo[],
): RegrasSumarioItem[] {
    return filhos.flatMap((conteudo) => {
        const descendentes = construirSumarioRegras(listarFilhosRegras(conteudo));
        if ((conteudo.tipo === "classe" || conteudo.tipo === "subclasse") && conteudo.ancora) {
            return [{ ancora: conteudo.ancora, titulo: conteudo.nome,
                nivel: 3, filhos: descendentes }];
        }
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
        ...((conteudo.tipo === "secao" || conteudo.tipo === "classe"
            || conteudo.tipo === "subclasse") && conteudo.ancora ? [conteudo.ancora] : []),
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
