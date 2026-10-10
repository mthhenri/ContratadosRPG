// @ts-check

/** @typedef {import('../src/app/modules/regras/regras.model.js').RegrasBloco} RegrasBloco */

/** @param {string} texto */
function limparTexto(texto) {
    return texto.replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\]^_`{|}~\\])/g, '$1')
        .replace(/\*/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Reconhece a tabela de uma linha do Deslocamento ("Destreza 0 ou menos 8 Metros" ...): cada
 * célula vira uma faixa com o rótulo da condição e o valor em destaque. O texto da fonte segue
 * íntegro em `cabecalho` para a cobertura; `itens` só o repartem em rótulo e valor.
 * @param {import('marked').Tokens.Table} tokenTabela
 * @param {{secao:string,caminho:string[],linha:number,inline:(texto:string,linha:number)=>import('../src/app/modules/regras/regras.model.js').RegrasTrecho[]}} contexto
 * @returns {RegrasBloco | null}
 */
export function reconhecerFaixas(tokenTabela, contexto) {
    if (![...contexto.caminho, contexto.secao].includes('Deslocamento')) return null;
    if (tokenTabela.header.length < 2 || tokenTabela.rows.length) return null;
    const itens = [];
    for (const celula of tokenTabela.header) {
        const partes = limparTexto(celula.text).match(/^(\S.*?)\s+(\d+(?:,\d+)?\s+Metros)$/i);
        if (!partes) return null;
        itens.push({ rotulo: partes[1], valor: partes[2] });
    }
    return {
        tipo: 'faixas', itens,
        cabecalho: tokenTabela.header.map((celula) => contexto.inline(celula.text, contexto.linha)),
        linhas: [],
    };
}
