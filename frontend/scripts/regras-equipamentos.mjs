// @ts-check

/** @typedef {import('../src/app/modules/regras/regras.model.js').RegrasBloco} RegrasBloco */
/** @typedef {import('../src/app/modules/regras/regras.model.js').RegrasTrecho} RegrasTrecho */
/** @typedef {import('../src/app/modules/regras/regras.model.js').RegrasEquipamento} RegrasEquipamento */
/** @typedef {import('../src/app/modules/regras/regras.model.js').RegrasModificacao} RegrasModificacao */
/** @typedef {{secao:string,caminho:string[],linha:number,inline:(texto:string,linha:number)=>RegrasTrecho[]}} Contexto */

// Esquemas da exportação do Sistema; um esquema parecido fora de Equipamentos não basta.
const esquemas = new Map([
    ['Corpo a Corpo', ['Item', 'Dano', 'Descrição', 'Porte', 'Peso', 'Custo']],
    ['Explosivos', ['Item', 'Dano', 'Descrição', 'Porte', 'Peso', 'Custo']],
    ['Armas de Fogo', ['Item', 'Dano', 'Especificações', 'Descrição', 'Porte', 'Peso', 'Custo']],
    ['Munições', ['Item', 'Descrição', 'Duração', 'Peso', 'Custo']],
    ['Proteções e Escudos', ['Item', 'Descrição', 'Porte', 'Peso', 'Custo']],
    ['Exóticos', ['Item', 'Dano', 'Especificações', 'Descrição', 'Porte', 'Peso', 'Custo']],
    ['Armazenamento', ['Item', 'Descrição', 'Porte', 'Peso', 'Custo']],
    ['Itens Operacionais', ['Item', 'Descrição', 'Porte', 'Peso', 'Custo']],
    ['Itens Medicinais', ['Item', 'Descrição', 'Porte', 'Peso', 'Custo']],
]);
const notasModificacoes = new Set([
    'Modificações de Explosivos custam 250 $ ao invés do valor padrão',
    'Modificações de Munições custam 250 $ ao invés do valor padrão',
    'Estas modificações não agregam nenhum peso ao item Modificações de Armazenamento custam 300 $ ao invés do valor padrão',
]);

/** @param {string} texto */
function limparRotulo(texto) {
    return texto.replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\]^_`{|}~\\])/g, '$1')
        .replace(/\*/g, '').trim();
}

/**
 * Reconhece somente os nove esquemas e as tabelas de modificações explícitas.
 * A tabela integral preserva rótulos, notas editoriais e células para a cobertura de texto.
 * @param {import('marked').Tokens.Table} tokenTabela
 * @param {Contexto} contexto
 * @returns {RegrasBloco | null}
 */
export function reconhecerEquipamentos(tokenTabela, contexto) {
    if (![...contexto.caminho, contexto.secao].includes('Equipamentos')) return null;
    const titulo = limparRotulo(tokenTabela.header[0]?.text ?? '');
    if (tokenTabela.header.slice(1).some((celula) => celula.text.trim())) return null;
    const categoria = titulo.match(/^⬡ (.+)$/)?.[1];
    const esquema = categoria ? esquemas.get(categoria) : undefined;
    const modificacoes = titulo === '⬥ Modificações';
    if (!esquema && !modificacoes) return null;

    const rotulos = modificacoes ? ['Modificação', '', 'Efeito', 'Bloqueia'] : esquema;
    if (!rotulos || tokenTabela.header.length !== rotulos.length) return null;
    let indiceRotulos = 0;
    if (modificacoes && notasModificacoes.has(limparRotulo(tokenTabela.rows[0]?.[0]?.text ?? ''))) {
        if (tokenTabela.rows[0].slice(1).some((celula) => celula.text.trim())) return null;
        indiceRotulos = 1;
    }
    const linhaRotulos = tokenTabela.rows[indiceRotulos];
    if (!linhaRotulos || linhaRotulos.some((celula, indice) =>
        limparRotulo(celula.text) !== rotulos[indice])) return null;
    const linhasItens = tokenTabela.rows.slice(indiceRotulos + 1);
    if (!linhasItens.length || linhasItens.some((linha) =>
        linha.length !== rotulos.length || linha.some((celula) => !celula.text.trim()))) return null;

    const fonte = {
        cabecalho: tokenTabela.header.map((celula) => contexto.inline(celula.text, contexto.linha)),
        linhas: tokenTabela.rows.map((linha, indice) => linha.map((celula) =>
            contexto.inline(celula.text, contexto.linha + indice + 2))),
    };
    if (modificacoes) {
        if (linhasItens.some((linha) => !/^■+[□]*$/.test(limparRotulo(linha[1].text)))) return null;
        /** @type {RegrasModificacao[]} */
        const itens = linhasItens.map((linha, indice) => ({
            nome: limparRotulo(linha[0].text), empilhamento: limparRotulo(linha[1].text),
            efeito: contexto.inline(linha[2].text, contexto.linha + indiceRotulos + indice + 3),
            bloqueia: contexto.inline(linha[3].text, contexto.linha + indiceRotulos + indice + 3),
        }));
        return { tipo: 'modificacoes', itens, ...fonte,
            ...(indiceRotulos === 1 ? { nota: fonte.linhas[0][0] } : {}) };
    }

    /** @type {RegrasEquipamento[]} */
    const itens = [];
    for (const [indice, linha] of linhasItens.entries()) {
        const linhaOrigem = contexto.linha + indiceRotulos + indice + 3;
        const celula = (rotulo) => linha[rotulos.indexOf(rotulo)]?.text;
        const campo = (rotulo) => contexto.inline(celula(rotulo) ?? '', linhaOrigem);
        /** @type {RegrasEquipamento} */
        const item = { nome: limparRotulo(linha[0].text), custo: campo('Custo'),
            peso: campo('Peso'), descricao: campo('Descrição'), danos: [],
            ...(celula('Porte') !== undefined ? { porte: campo('Porte') } : {}),
            ...(celula('Duração') !== undefined ? { duracao: campo('Duração') } : {}),
            ...(celula('Especificações') !== undefined ? { especificacoes: campo('Especificações') } : {}),
        };
        const dano = celula('Dano');
        if (dano !== undefined) {
            if (limparRotulo(celula('Porte') ?? '') === 'Uma Mão ou Duas Mãos') {
                // Só separa dois valores escritos; jamais duplica um valor nem calcula o outro.
                const dupla = dano.match(/^(\d+D\d+\s+\\?\+\s+\*\*Corpo\*\*\s+\\?\[Físico\\?\])\s+(\d+D\d+\s+\\?\+\s+\*\*Corpo\*\*\s+\\?\[Físico\\?\])$/);
                if (categoria !== 'Corpo a Corpo' || item.nome !== 'Acessório de Combate' || !dupla) return null;
                itens.push({ ...item, danos: [
                    { rotulo: 'UMA MÃO', trechos: contexto.inline(dupla[1], linhaOrigem) },
                    { rotulo: 'DUAS MÃOS', trechos: contexto.inline(dupla[2], linhaOrigem) },
                ] });
                continue;
            }
            itens.push({ ...item, danos: [{ rotulo: 'DANO', trechos: campo('Dano') }] });
        } else itens.push(item);
    }
    return { tipo: 'equipamentos', categoria: categoria ?? '', itens, ...fonte };
}

/** Recupera os títulos dentro das tabelas, mantendo a ordem e a hierarquia dos glifos.
 * @param {import('../src/app/modules/regras/regras.model.js').RegrasConteudo[]} conteudo
 * @param {(titulo:string)=>string} criarAncora */
export function integrarSecoesEquipamentos(conteudo, criarAncora) {
    /** @type {import('../src/app/modules/regras/regras.model.js').RegrasConteudo[]} */
    const linear = [];
    let categoria = '';
    function percorrer(filhos) {
        for (const item of filhos) {
            if (item.tipo === 'secao') {
                linear.push({ ...item, filhos: [] });
                percorrer(item.filhos);
                continue;
            }
            if (item.tipo === 'equipamentos' || item.tipo === 'modificacoes') {
                const equipamentos = item.tipo === 'equipamentos';
                if (equipamentos) categoria = item.categoria;
                const titulo = equipamentos ? categoria : 'Modificações';
                linear.push({ tipo: 'secao', nivel: equipamentos ? 2 : 3,
                    glifo: equipamentos ? '⬡' : '⬥', titulo, origemTabela: true,
                    ancora: criarAncora(equipamentos ? titulo : `${categoria} Modificações`),
                    filhos: [] });
            }
            linear.push(item);
        }
    }
    percorrer(conteudo);
    conteudo.splice(0);
    const pilha = [{ nivel: 0, filhos: conteudo }];
    for (const item of linear) {
        if (item.tipo === 'secao') {
            while (pilha.at(-1).nivel >= item.nivel) pilha.pop();
            pilha.at(-1).filhos.push(item);
            pilha.push({ nivel: item.nivel, filhos: /** @type {typeof conteudo} */ (item.filhos) });
        } else pilha.at(-1).filhos.push(item);
    }
}
