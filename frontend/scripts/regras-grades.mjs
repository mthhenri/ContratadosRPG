// @ts-check
/** @typedef {import('../src/app/modules/regras/regras.model.js').RegrasBloco} RegrasBloco */

/**
 * Projeções dos três recortes conhecidos. A tabela original permanece inteira;
 * os campos só repartem o texto, sem calcular saúde ou inferir limites de faixas.
 * Uma assinatura incompleta volta ao fallback conservador.
 * @param {import('marked').Tokens.Table} tabela
 * @param {{secao:string,caminho:string[],linha:number,inline:(texto:string,linha:number)=>import('../src/app/modules/regras/regras.model.js').RegrasTrecho[]}} contexto
 * @returns {RegrasBloco | null}
 */
export function reconhecerGrades(tabela, contexto) {
    const fonte = {
        cabecalho: tabela.header.map(celula => contexto.inline(celula.text, contexto.linha)),
        linhas: tabela.rows.map((linha, indice) => linha.map(celula =>
            contexto.inline(celula.text, contexto.linha + indice + 2))),
    };
    /** @param {NonNullable<import('../src/app/modules/regras/regras.model.js').RegrasGrade['referencia']>} referencia
     * @returns {import('../src/app/modules/regras/regras.model.js').RegrasGrade} */
    const montar = (referencia) => ({ tipo: 'grade', colunas: tabela.header.length,
        ...fonte, referencia });
    /** @param {string} texto */
    const limpar = (texto) => texto.replace(/\*/g, '').trim();
    const titulos = tabela.header.map(celula => limpar(celula.text));
    if (contexto.secao === 'Saúde' && contexto.caminho.includes('Jogando como um Civil')
        && titulos.join('|') === 'VIDA|ENERGIA' && tabela.rows.length === 1) {
        const itens = tabela.rows[0].map((celula, indice) => {
            const partes = limpar(celula.text).match(/^(Inicial\s+\\?=\s+.+?)\s*·\s*(Progressão:\s*.+)$/u);
            return partes ? { rotulo: titulos[indice],
                conteudo: contexto.inline(partes[1], contexto.linha + 2),
                nota: partes[2], variante: /** @type {'vida' | 'energia'} */ (indice === 0 ? 'vida' : 'energia') } : null;
        });
        if (itens.every(Boolean)) return montar({ tipo: 'saude', itens });
    }
    if (contexto.caminho.includes('Afinidade com Fragmentos')
        && titulos[0] === 'Nível de Criatura' && titulos.slice(1).every(titulo => !titulo)
        && tabela.header.length === 6 && tabela.rows.length === 2) {
        const itens = tabela.rows.flatMap(linha => linha.filter(celula => celula.text.trim()))
            .map(celula => {
                const partes = celula.text.match(/^\*\*Afinidade\*\*\s+(.+?)\s+\*(AMEAÇA (?:BAIXA|MÉDIA|ALTA|EXTREMA|CATASTRÓFICA|APOCALÍPTICA))\*$/u);
                return partes ? { rotulo: `Afinidade ${partes[1]}`,
                    conteudo: contexto.inline(partes[2], contexto.linha) } : null;
            });
        if (itens.length === 6 && itens.every(Boolean)) {
            return montar({ tipo: 'cartoes', titulo: titulos[0], itens });
        }
    }
    if (contexto.secao === 'Tipos de Alcance' && tabela.header.length === 3
        && tabela.rows.length === 1) {
        const nomes = ['Corpo a Corpo', 'Curto Alcance', 'Médio Alcance', 'Longo Alcance', 'Longínquo'];
        const itens = [tabela.header, ...tabela.rows].flat().filter(celula => celula.text.trim())
            .map((celula, indice) => {
                const texto = limpar(celula.text);
                const nome = nomes[indice];
                return nome && texto.startsWith(nome + ' ') ? { rotulo: nome,
                    conteudo: contexto.inline(texto.slice(nome.length).trim(), contexto.linha) } : null;
            });
        if (itens.length === 5 && itens.every(Boolean)) return montar({ tipo: 'cartoes', itens });
    }
    return null;
}
