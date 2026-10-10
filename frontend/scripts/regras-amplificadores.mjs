// @ts-check

/** @typedef {import('../src/app/modules/regras/regras.model.js').RegrasBloco} RegrasBloco */
/** @typedef {import('../src/app/modules/regras/regras.model.js').RegrasAmplificador} RegrasAmplificador */
/** @typedef {{secao:string,caminho:string[],linha:number,inline:(texto:string,linha:number)=>import('../src/app/modules/regras/regras.model.js').RegrasTrecho[]}} Contexto */

/** @param {string} texto */
function limparRotulo(texto) {
    return texto.replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\]^_`{|}~\\])/g, '$1')
        .replace(/\*/g, '').trim();
}

/**
 * Reconhece somente a tabela de Amplificadores (`Nome | Efeitos | ` + `■□`), na seção
 * homônima. A tabela integral segue em `cabecalho`/`linhas` para a cobertura de texto.
 * @param {import('marked').Tokens.Table} tokenTabela
 * @param {Contexto} contexto
 * @returns {RegrasBloco | null}
 */
export function reconhecerAmplificadores(tokenTabela, contexto) {
    if (![...contexto.caminho, contexto.secao].includes('Amplificadores')) return null;
    const cabecalho = tokenTabela.header.map((celula) => limparRotulo(celula.text));
    if (cabecalho.length !== 3 || cabecalho[0] !== 'Nome' || cabecalho[1] !== 'Efeitos'
        || cabecalho[2] !== '') return null;
    if (!tokenTabela.rows.length || tokenTabela.rows.some((linha) => linha.length !== 3
        || !/^■+□*$/.test(limparRotulo(linha[1].text)) || !linha[2].text.trim())) return null;

    /** @type {RegrasAmplificador[]} */
    const itens = tokenTabela.rows.map((linha, indice) => ({
        nome: limparRotulo(linha[0].text).replace(/^◎\s*/, ''),
        empilhamento: limparRotulo(linha[1].text),
        efeito: contexto.inline(linha[2].text, contexto.linha + indice + 3),
    }));
    return {
        tipo: 'amplificadores', itens,
        cabecalho: tokenTabela.header.map((celula) => contexto.inline(celula.text, contexto.linha)),
        linhas: tokenTabela.rows.map((linha, indice) => linha.map((celula) =>
            contexto.inline(celula.text, contexto.linha + indice + 2))),
    };
}
