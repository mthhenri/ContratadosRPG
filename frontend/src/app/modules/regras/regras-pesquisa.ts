/** Texto apresentado pela projeção canônica, com caminho e âncora do livro. */
export interface RegrasTextoPesquisa {
    readonly texto: string;
    readonly caminho: readonly string[];
    readonly ancora: string | null;
}

export interface RegrasOcorrenciaPesquisa {
    readonly textoIndice: number;
    readonly inicio: number;
    readonly fim: number;
    readonly caminho: readonly string[];
    readonly ancora: string | null;
    readonly antes: string;
    readonly destaque: string;
    readonly depois: string;
}

/** Mapeia offsets normalizados para UTF-16 original, inclusive acentos decompostos. */
function normalizarComMapa(texto: string) {
    let normalizado = "";
    const inicios: number[] = [], finais: number[] = [];
    let indice = 0;
    for (const caractere of texto) {
        const convertido = caractere.normalize("NFD").replace(/\p{M}/gu, "")
            .toLocaleLowerCase("pt-BR");
        for (let posicao = 0; posicao < convertido.length; posicao++) {
            inicios.push(indice);
            finais.push(indice + caractere.length);
        }
        if (!convertido && finais.length) finais[finais.length - 1] = indice + caractere.length;
        normalizado += convertido;
        indice += caractere.length;
    }
    return { normalizado, inicios, finais };
}

/** Mesma comparação para livro aberto, livro alternativo e destaque. Sem regex do usuário. */
export function normalizarPesquisaRegras(texto: string): string {
    return normalizarComMapa(texto).normalizado;
}

/** Pesquisa literal; a barreira U+FFFC representa uma tarja, sem revelar seu conteúdo. */
export function pesquisarRegras(
    textos: readonly RegrasTextoPesquisa[], termo: string,
): readonly RegrasOcorrenciaPesquisa[] {
    const consulta = normalizarPesquisaRegras(termo.trim());
    if (consulta.length < 2 || consulta.includes("\uFFFC")) return [];
    const resultados: RegrasOcorrenciaPesquisa[] = [];
    textos.forEach((trecho, textoIndice) => {
        const { normalizado, inicios, finais } = normalizarComMapa(trecho.texto);
        let posicao = normalizado.indexOf(consulta);
        while (posicao !== -1) {
            const inicio = inicios[posicao], fim = finais[posicao + consulta.length - 1];
            const inicioTrecho = Math.max(0, inicio - 45);
            const fimTrecho = Math.min(trecho.texto.length, fim + 65);
            resultados.push({ textoIndice, inicio, fim, caminho: trecho.caminho,
                ancora: trecho.ancora,
                antes: (inicioTrecho ? "…" : "") + trecho.texto.slice(inicioTrecho, inicio),
                destaque: trecho.texto.slice(inicio, fim),
                depois: trecho.texto.slice(fim, fimTrecho)
                    + (fimTrecho < trecho.texto.length ? "…" : ""),
            });
            posicao = normalizado.indexOf(consulta, posicao + consulta.length);
        }
    });
    return resultados;
}
