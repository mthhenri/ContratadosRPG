import { ItemCategoriaEnum } from "@contratados-rpg/shared/enums";
import {
    CUSTO_MODIFICACAO, CUSTO_MODIFICACAO_PADRAO, MODIFICACOES, PESO_MODIFICACAO_PADRAO,
} from "@contratados-rpg/shared/regras/compras";

/** Título da categoria em Equipamentos (documento) → categoria do motor de compras. */
export const CATEGORIAS_MODIFICACAO: Readonly<Record<string, ItemCategoriaEnum>> = {
    "Corpo a Corpo": ItemCategoriaEnum.CORPO_A_CORPO,
    "Explosivos": ItemCategoriaEnum.EXPLOSIVOS,
    "Armas de Fogo": ItemCategoriaEnum.ARMAS_DE_FOGO,
    "Munições": ItemCategoriaEnum.MUNICOES,
    "Proteções e Escudos": ItemCategoriaEnum.PROTECOES,
    "Exóticos": ItemCategoriaEnum.EXOTICOS,
    "Armazenamento": ItemCategoriaEnum.ARMAZENAMENTO,
};

export interface ModificacaoCategoriaMotor {
    readonly custo: number;
    readonly pesoPadrao: number;
    /** Peso próprio por modificação, só quando difere do padrão da categoria. */
    readonly pesoProprio: ReadonlyMap<string, number>;
}

/**
 * Custo e pesos de uma categoria, lidos do catálogo do motor (`shared/regras/compras`). O peso
 * padrão da categoria é o mais frequente entre as suas modificações (Armazenamento: sem peso).
 */
export function lerModificacoesCategoria(titulo: string): ModificacaoCategoriaMotor | null {
    const categoria = CATEGORIAS_MODIFICACAO[titulo];
    const catalogo = categoria ? MODIFICACOES[categoria] : undefined;
    if (!categoria || !catalogo) return null;
    const pesos = catalogo.map((modificacao) => modificacao.peso ?? PESO_MODIFICACAO_PADRAO);
    const frequencia = new Map<number, number>();
    for (const peso of pesos) frequencia.set(peso, (frequencia.get(peso) ?? 0) + 1);
    let pesoPadrao = PESO_MODIFICACAO_PADRAO;
    let maior = frequencia.get(pesoPadrao) ?? 0;
    for (const [peso, quantidade] of frequencia) {
        if (quantidade > maior) { pesoPadrao = peso; maior = quantidade; }
    }
    const pesoProprio = new Map<string, number>();
    catalogo.forEach((modificacao, indice) => {
        if (pesos[indice] !== pesoPadrao) pesoProprio.set(modificacao.nome, pesos[indice]);
    });
    return { custo: CUSTO_MODIFICACAO[categoria] ?? CUSTO_MODIFICACAO_PADRAO, pesoPadrao, pesoProprio };
}

/** Empilhamentos iniciais (■) e máximo (■ + □) a partir do texto da tabela do documento. */
export function lerEmpilhamento(texto: string): { iniciais: number; maximo: number } {
    return { iniciais: (texto.match(/■/g) ?? []).length, maximo: (texto.match(/[■□]/g) ?? []).length };
}

const formatadorPeso = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

export function formatarPesoModificacao(peso: number): string {
    return peso === 0 ? "sem peso" : `+${formatadorPeso.format(peso)} peso`;
}
