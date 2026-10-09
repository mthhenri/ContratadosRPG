// @ts-check

/** @typedef {import('../src/app/modules/regras/regras.model.js').RegrasDocumento} RegrasDocumento */

/** Extrai apenas o capítulo de condições, sem reinterpretar a regra nem resumir seus efeitos.
 * @param {RegrasDocumento} documento
 * @returns {{ nome: string, descricao: string }[]}
 */
export function extrairDescricoesCondicoes(documento) {
    const procurar = (filhos) => {
        for (const bloco of filhos) {
            if (bloco.tipo !== 'secao') continue;
            if (bloco.titulo === 'Condições') return bloco;
            const encontrada = procurar(bloco.filhos);
            if (encontrada) return encontrada;
        }
        return null;
    };
    const secao = procurar(documento.filhos);
    if (!secao) throw new Error('Capítulo Condições ausente da fonte.');
    const textoPlano = (trechos) => trechos.map((trecho) =>
        'filhos' in trecho ? textoPlano(trecho.filhos)
            : trecho.tipo === 'tarja' ? '█'.repeat(trecho.comprimento) : trecho.texto).join('');
    const condicoes = secao.filhos.filter((bloco) => bloco.tipo === 'secao')
        .map((bloco) => ({ nome: bloco.titulo,
            descricao: bloco.filhos.filter((filho) => filho.tipo === 'paragrafo')
                .map((filho) => textoPlano(filho.trechos)).join('\n\n').trim() }));
    if (!condicoes.length || condicoes.some((condicao) => !condicao.descricao)) {
        throw new Error('Condições sem descrição na fonte.');
    }
    return condicoes;
}
