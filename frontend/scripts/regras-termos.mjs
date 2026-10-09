// @ts-check
/** @typedef {import('../src/app/modules/regras/regras.model.js').RegrasTrecho} RegrasTrecho */
/** @typedef {import('../src/app/modules/regras/regras.model.js').RegrasBloco} RegrasBloco */
/** @typedef {import('../src/app/modules/regras/regras.model.js').RegrasTermo} RegrasTermo */
/** @typedef {{secao:string, caminho:string[], linha:number,
 * inline:(texto:string, linha:number)=>RegrasTrecho[]}} Contexto */

const atributos = ['Destreza', 'Intelecto', 'Força', 'Medicina', 'Luta', 'Sentidos',
    'Pontaria', 'Social', 'Vigor', 'Vontade'];

/**
 * Tabelas de layout do Sistema que listam termos (Atributos, Maestrias e Penalidades de
 * Energia). Cada assinatura valida a tabela inteira; qualquer célula fora da forma devolve
 * `null` e a tabela segue o caminho genérico, sem perder conteúdo.
 * @param {import('marked').Tokens.Table} tabela @param {Contexto} contexto
 * @returns {RegrasBloco | null}
 */
export function reconhecerTermos(tabela, contexto) {
    const celulas = [tabela.header, ...tabela.rows].map((linha, indiceLinha) =>
        linha.map((celula) => ({ texto: celula.text.trim(),
            linha: contexto.linha + (indiceLinha ? indiceLinha + 1 : 0) })));
    const fonte = {
        cabecalho: tabela.header.map((celula) => contexto.inline(celula.text, contexto.linha)),
        linhas: tabela.rows.map((linha, indice) => linha.map((celula) =>
            contexto.inline(celula.text, contexto.linha + indice + 2))),
    };
    const todas = celulas.flat();
    /** @param {RegExp} padrao @param {(campos: RegExpMatchArray, linha: number) => RegrasTermo} montar */
    const ler = (padrao, montar) => {
        const termos = todas.map((celula) => {
            const campos = celula.texto.match(padrao);
            return campos ? montar(campos, celula.linha) : null;
        });
        return termos.every(Boolean) ? /** @type {RegrasTermo[]} */ (termos) : null;
    };

    if (contexto.secao === 'Atributos' && todas.length === 10) {
        const itens = ler(/^(?:\*\*)?▷\s*(.+?)\s*◁(?:\*\*)?\s+\*(Atributo (?:Físico|Mental))\*\s+(.+)$/u,
            (campos, linha) => ({ nome: campos[1], rotulo: campos[2],
                descricao: contexto.inline(campos[3], linha) }));
        if (itens && atributos.every((nome) => itens.some((item) => item.nome === nome))) {
            return { tipo: 'termos', variante: 'atributos', itens, ...fonte };
        }
    }

    if (contexto.secao === 'Maestrias' && todas.length === 10) {
        const itens = ler(new RegExp(`^(?:\\*\\*)?(${atributos.join('|')})(?:\\*\\*)?\\s+(.+)$`, 'u'),
            (campos, linha) => ({ nome: campos[1], descricao: contexto.inline(campos[2], linha) }));
        if (itens && new Set(itens.map((item) => item.nome)).size === 10) {
            return { tipo: 'termos', variante: 'maestrias', itens, ...fonte };
        }
    }

    if (contexto.secao === 'Limites de Energia' && todas.length === 12) {
        const itens = ler(/^(?:\*\*)?(\d+)\\?\.\s+(.+?)(?:\*\*)?\s+\*(.+)\*$/u,
            (campos, linha) => ({ numero: Number(campos[1]), nome: campos[2].trim(),
                descricao: contexto.inline(campos[3], linha) }));
        const numeros = itens?.map((item) => item.numero).sort((a, b) => Number(a) - Number(b));
        if (itens && numeros?.every((numero, indice) => numero === indice + 1)) {
            return { tipo: 'termos', variante: 'penalidades',
                itens: [...itens].sort((a, b) => Number(a.numero) - Number(b.numero)), ...fonte };
        }
    }
    return null;
}

/** @param {readonly RegrasTrecho[]} trechos @returns {string} */
function textoPlano(trechos) {
    return trechos.map((trecho) => 'filhos' in trecho ? textoPlano(trecho.filhos)
        : trecho.tipo === 'tarja' ? '█' : trecho.texto).join('');
}

/**
 * Divide um parágrafo de verbetes `▢ Nome` + quebra + descrição. O nome precisa ser texto
 * simples na própria linha; a descrição preserva a formatação da fonte.
 * @param {readonly RegrasTrecho[]} trechos @returns {RegrasTermo[] | null}
 */
function lerVerbetes(trechos) {
    /** @type {{ nome: string | null, descricao: RegrasTrecho[] }[]} */
    const itens = [];
    for (const trecho of trechos) {
        if (trecho.tipo !== 'texto') {
            if (!itens.length) return null;
            itens.at(-1)?.descricao.push(trecho);
            continue;
        }
        for (const parte of trecho.texto.split(/(?=▢)/u)) {
            if (parte.startsWith('▢')) {
                const quebra = parte.indexOf('\n');
                if (quebra < 0) return null;
                itens.push({ nome: parte.slice(1, quebra).trim(), descricao: [] });
                const resto = parte.slice(quebra + 1);
                if (resto) itens.at(-1)?.descricao.push({ tipo: 'texto', texto: resto });
            } else if (parte.trim() || itens.length) {
                if (!itens.length) return null;
                itens.at(-1)?.descricao.push({ tipo: 'texto', texto: parte });
            }
        }
    }
    const termos = itens.map((item) => {
        const descricao = [...item.descricao];
        const ultimo = descricao.at(-1);
        if (ultimo?.tipo === 'texto') {
            const texto = ultimo.texto.replace(/\s+$/u, '');
            if (texto) descricao[descricao.length - 1] = { tipo: 'texto', texto };
            else descricao.pop();
        }
        return item.nome && descricao.length ? { nome: item.nome, descricao } : null;
    });
    return termos.length && termos.every(Boolean) ? /** @type {RegrasTermo[]} */ (termos) : null;
}

/**
 * Agrupa as sequências de dois ou mais parágrafos de verbetes `▢` (Sequelas do Sistema) num
 * bloco `termos`. Sequências menores ou fora da forma ficam como estão.
 * @param {RegrasBloco[]} blocos @returns {RegrasBloco[]}
 */
export function agruparVerbetes(blocos) {
    /** @type {RegrasBloco[]} */
    const resultado = [];
    for (let indice = 0; indice < blocos.length; indice++) {
        /** @type {RegrasTermo[]} */
        const itens = [];
        let fim = indice;
        while (fim < blocos.length) {
            const bloco = blocos[fim];
            if (bloco.tipo !== 'paragrafo' || !textoPlano(bloco.trechos).startsWith('▢')) break;
            const lidos = lerVerbetes(bloco.trechos);
            if (!lidos) break;
            itens.push(...lidos);
            fim++;
        }
        if (fim - indice >= 2) {
            resultado.push({ tipo: 'termos', variante: 'verbetes', itens, cabecalho: [],
                linhas: itens.map((item) => [[{ tipo: 'texto', texto: item.nome }], item.descricao]) });
            indice = fim - 1;
        } else resultado.push(blocos[indice]);
    }
    return resultado;
}
