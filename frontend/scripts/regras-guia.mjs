// @ts-check
/** @typedef {import('../src/app/modules/regras/regras.model.js').RegrasTrecho} RegrasTrecho */
/** @typedef {import('../src/app/modules/regras/regras.model.js').RegrasBloco} RegrasBloco */
/** @typedef {import('../src/app/modules/regras/regras.model.js').RegrasConteudo} RegrasConteudo */
/** @typedef {import('../src/app/modules/regras/regras.model.js').RegrasSecao} RegrasSecao */
/** @typedef {import('../src/app/modules/regras/regras.model.js').RegrasIdentidade} RegrasIdentidade */
/** @typedef {import('../src/app/modules/regras/regras.model.js').RegrasAtributos} RegrasAtributos */
/** @typedef {import('../src/app/modules/regras/regras.model.js').RegrasHabilidadeCriatura} RegrasHabilidadeCriatura */
/** @typedef {{secao:string, caminho:string[], linha:number,
 * inline:(texto:string, linha:number)=>RegrasTrecho[]}} Contexto */

const niveis = new Map([
    ['Desconhecida', 0], ['Desconhecidas', 0], ['Nula', 1], ['Nulas', 1],
    ['Baixa', 2], ['Baixo', 2], ['Baixas', 2], ['Média', 3], ['Médio', 3], ['Médias', 3],
    ['Alta', 4], ['Alto', 4], ['Altas', 4], ['Extrema', 5], ['Extremo', 5], ['Extremas', 5],
    ['Catastrófica', 6], ['Catastrófico', 6], ['Catastróficas', 6],
    ['Apocalíptica', 7], ['Apocalíptico', 7], ['Apocalípticas', 7],
]);

/** Vocabulário fechado de NA; não determina o nível a partir de VD, cor ou dificuldade. */
export function lerNivel(texto) {
    return niveis.get(texto.trim());
}

/** @param {string} texto @param {string} [textoCompleto] @returns {RegrasTrecho[]} */
export function marcarNiveis(texto, textoCompleto = texto) {
    const padrao = /(?:Ameaças?\s+|NA\s+)(Desconhecidas?|Nulas?|Baix[ao]s?|Médi[ao]s?|Alt[ao]s?|Extrem[ao]s?|Catastrófic[ao]s?|Apocalíptic[ao]s?)\b(?:\s+\[(\d+)\])?/gi;
    const contraditorias = new Set([...textoCompleto.matchAll(padrao)].flatMap((referencia) => {
        const nome = referencia[1][0].toUpperCase() + referencia[1].slice(1).toLowerCase();
        return referencia[2] !== undefined && Number(referencia[2]) !== lerNivel(nome)
            ? [referencia[0].replace(/\s+\[\d+\]$/, '').toLowerCase()] : [];
    }));
    /** @type {RegrasTrecho[]} */
    const trechos = [];
    let inicio = 0;
    for (const resultado of texto.matchAll(padrao)) {
        const nome = resultado[1][0].toUpperCase() + resultado[1].slice(1).toLowerCase();
        const nivel = lerNivel(nome);
        const numero = resultado[2];
        // A sigla é sempre maiúscula; "na média" é preposição, não Nível de Ameaça.
        if (/^na\s/i.test(resultado[0]) && !resultado[0].startsWith('NA')) continue;
        // Uma referência contraditória não é corrigida silenciosamente.
        if (nivel === undefined || (numero !== undefined && Number(numero) !== nivel)
            || contraditorias.has(resultado[0].replace(/\s+\[\d+\]$/, '').toLowerCase())) continue;
        if (resultado.index > inicio) trechos.push({ tipo: 'texto', texto: texto.slice(inicio, resultado.index) });
        // Só a sigla `NA` vira selo; "ameaças Nulas" em prosa é menção genérica, apenas colorida.
        trechos.push(resultado[0].startsWith('NA')
            ? { tipo: 'nivel-ameaca', nivel, texto: resultado[0] }
            : { tipo: 'nivel-ameaca', nivel, texto: resultado[0], compacto: true });
        inicio = resultado.index + resultado[0].length;
    }
    if (inicio < texto.length) trechos.push({ tipo: 'texto', texto: texto.slice(inicio) });
    return trechos;
}

/** Só uma célula na coluna NA, com um único nível explícito, recebe esta marca. */
export function marcarNivelNome(trechos) {
    return trechos.map((trecho) => {
        if ('filhos' in trecho) return { ...trecho, filhos: marcarNivelNome(trecho.filhos) };
        const nivel = trecho.tipo === 'texto' ? lerNivel(trecho.texto) : undefined;
        return nivel === undefined ? trecho : { tipo: 'nivel-ameaca', nivel, texto: trecho.texto };
    });
}

/** Extração literal de rótulos fixos; não calcula nem corrige valores. */
function literal(texto) {
    return texto.replace(/\\([\p{P}\p{S}])/gu, '$1').replace(/\*/g, '').trim();
}

/** @param {import('marked').Tokens.Table} tabela @param {Contexto} contexto
 * @returns {RegrasBloco | null} */
export function reconhecerTabelaGuia(tabela, contexto) {
    if (!contexto.caminho.includes('Guia de Criação de Ameaças')) return null;
    const celulas = [tabela.header, ...tabela.rows];
    const textos = celulas.map((linha) => linha.map((celula) => literal(celula.text)));
    const fonte = {
        cabecalho: tabela.header.map((celula) => contexto.inline(celula.text, contexto.linha)),
        linhas: tabela.rows.map((linha, indice) => linha.map((celula) =>
            contexto.inline(celula.text, contexto.linha + indice + 2))),
    };
    if (textos[0][0] === 'Designação' && textos.every((linha) => linha.length === 2)) {
        const rotulos = ['Designação', 'Origem', 'Conceito', 'Natureza Física', 'Comportamento',
            'Motivação', 'Gancho Único', 'Tema de Horror', 'NA', 'VD Alvo'];
        if (textos.length !== rotulos.length || textos.some((linha, indice) =>
            linha[0] !== rotulos[indice] || !linha[1])) return null;
        return { tipo: 'identidade', ...fonte, campos: textos.map((linha, indice) => {
            const nivel = linha[0] === 'NA' ? lerNivel(linha[1]) : undefined;
            return { rotulo: linha[0], valor: indice === 0 ? fonte.cabecalho[1]
                : fonte.linhas[indice - 1][1], ...(nivel === undefined ? {} : { nivel }) };
        }) };
    }
    const nomes = ['Força', 'Destreza', 'Luta', 'Pontaria', 'Vigor', 'Intelecto', 'Medicina',
        'Sentido', 'Social', 'Vontade'];
    const ocupadas = textos.flat().filter(Boolean);
    const atributos = ocupadas.map((texto) => texto.match(
        /^(Força|Destreza|Luta|Pontaria|Vigor|Intelecto|Medicina|Sentido|Social|Vontade) (\d+) \[(Forte|Médio|Fraco|Frágil) ([+-]\d+)\]$/,
    ));
    if (ocupadas.length === 10 && atributos.every(Boolean)
        && new Set(atributos.map((atributo) => atributo[1])).size === 10
        && nomes.every((nome) => atributos.some((atributo) => atributo[1] === nome))) {
        return { tipo: 'atributos', ...fonte, atributos: atributos.map((atributo) => ({
            nome: atributo[1], valor: Number(atributo[2]), modificador: atributo[3], bonus: atributo[4],
        })) };
    }
    return null;
}

/** @param {import('marked').Tokens.Table} tabela @param {Contexto} contexto
 * @returns {RegrasBloco | null} */
export function reconhecerNiveisAmeaca(tabela, contexto) {
    if (contexto.secao !== 'Classificação') return null;
    const celulas = [tabela.header, ...tabela.rows];
    if (celulas.length !== 8 || celulas.some((linha) => linha.length !== 2)) return null;
    const niveisTabela = celulas.map((linha, indice) => {
        const imagem = linha[0].text.match(/^!\[\]\[(image\d+)\]$/);
        const nivel = literal(linha[1].text).match(/Ameaças? (Desconhecidas|Nulas|Baixas|Médias|Altas|Extrema|Catastróficas|Apocalípticas) \[([0-7])\]/);
        if (!imagem || !nivel || Number(nivel[2]) !== indice || lerNivel(nivel[1]) !== indice) return null;
        return { nivel: indice, referenciaImagem: imagem[1],
            descricao: contexto.inline(linha[1].text, contexto.linha + indice + (indice ? 1 : 0)) };
    });
    if (niveisTabela.some((nivel) => !nivel)) return null;
    return { tipo: 'niveis-ameaca', niveis: niveisTabela,
        cabecalho: tabela.header.map((celula) => contexto.inline(celula.text, contexto.linha)),
        linhas: tabela.rows.map((linha, indice) => linha.map((celula) =>
            contexto.inline(celula.text, contexto.linha + indice + 2))),
    };
}

/** @param {string} texto @param {Contexto} contexto
 * @returns {RegrasHabilidadeCriatura | null} */
export function reconhecerHabilidadeCriatura(texto, contexto) {
    if (!contexto.caminho.includes('Guia de Criação de Ameaças')) return null;
    const primeiraLinha = texto.split('\n')[0];
    const resultado = literal(primeiraLinha).match(/^(.+?) \[(Passiva|Ativa|De Gatilho)\]$/);
    if (!resultado || !texto.includes('\n') || !texto.slice(primeiraLinha.length).trim()) return null;
    return { tipo: 'habilidade-criatura', nome: resultado[1],
        categoria: /** @type {RegrasHabilidadeCriatura['categoria']} */ (resultado[2].toUpperCase()),
        rotulo: literal(primeiraLinha),
        trechos: contexto.inline(texto.slice(primeiraLinha.length).trim(), contexto.linha + 1) };
}

/** @param {readonly RegrasConteudo[]} filhos @returns {RegrasConteudo[]} */
function percorrer(filhos) {
    return filhos.flatMap((filho) => [filho,
        ...('filhos' in filho && filho.filhos ? percorrer(filho.filhos) : [])]);
}

const roteiroAmeacas = ['Ficha de Identidade', 'Nível de Ameaça (NA)', 'Valor de Desafio (VD)',
    'Atributos', 'Modificadores', 'DTs de Atributo', 'Saúde', 'Defesa', 'Resistências e Fraquezas',
    'Regeneração Natural', 'Porte e Deslocamento', 'Ataques', 'Habilidades Especiais'];
const roteiroNpcs = ['Identidade Narrativa', 'Categoria e Nível', 'Nível de Cooperação',
    'Atributos', 'Competências', 'Vida', 'Energia', 'Defesa', 'Dificuldade de Teste (DT)',
    'Ataques e Equipamentos', 'Habilidades', 'Assinatura Mecânica', 'Calibração de Custo',
    'Impacto Tático', 'Conduta de Combate'];

/** @param {RegrasSecao} secao @param {string} origemMarkdown @param {Contexto} contexto
 * @returns {{bloco:RegrasBloco, motivo?:string} | null} */
export function reconhecerSecaoGuia(secao, origemMarkdown, contexto) {
    if (secao.titulo === 'Roteiro de Criação') {
        const rotulos = contexto.caminho.includes('Guia de Criação de Ameaças')
            ? roteiroAmeacas : contexto.caminho.includes('Guia de Criação de NPCs') ? roteiroNpcs : null;
        if (!rotulos) return null;
        const linhas = origemMarkdown.split('\n');
        const etapas = linhas.flatMap((linha, indice) => {
            const rotulo = linha.trim().match(/^\*{2,3}([^*]+)\*{2,3}\s*$/);
            // A última etapa do roteiro NPC veio em uma linha no Docs, com ***: literal.
            const conduta = linha.trim().match(/^\*\*Conduta de Combate\*\*\*: (.+)\*$/);
            const titulo = rotulo?.[1] ?? (conduta ? 'Conduta de Combate' : null);
            if (!titulo) return [];
            const descricao = conduta?.[1] ?? linhas[indice + 1]?.trim();
            if (!descricao || (!conduta && !/^\*.+\*$/.test(descricao))) return [];
            return [{ ordem: 0, titulo: contexto.inline(titulo, contexto.linha + indice),
                descricao: contexto.inline(descricao, contexto.linha + indice + 1) }];
        });
        if (etapas.some((etapa, indice) => lerTexto(etapa.titulo) !== rotulos[indice])) return null;
        if (etapas.length !== rotulos.length) return null;
        const inicio = secao.filhos.findIndex((filho) => filho.tipo === 'paragrafo'
            && lerTexto(filho.trechos).startsWith(rotulos[0]));
        const fim = secao.filhos.reduce((ultimo, filho, indice) => filho.tipo === 'paragrafo'
            && lerTexto(filho.trechos).includes(rotulos.at(-1)) ? indice : ultimo, -1);
        if (inicio < 0 || fim < inicio) return null;
        return { bloco: { tipo: 'roteiro', etapas: etapas.map((etapa, indice) =>
            ({ ...etapa, ordem: indice + 1 })), filhos: secao.filhos,
            introducao: secao.filhos.slice(0, inicio), conclusao: secao.filhos.slice(fim + 1) } };
    }
    if (secao.titulo !== 'Exemplo de Ficha Completa'
        || !contexto.caminho.includes('Guia de Criação de Ameaças')) return null;
    const descendentes = percorrer(secao.filhos);
    const identidade = /** @type {RegrasIdentidade | undefined} */ (
        descendentes.find((filho) => filho.tipo === 'identidade'));
    const atributos = /** @type {RegrasAtributos | undefined} */ (
        descendentes.find((filho) => filho.tipo === 'atributos'));
    const vidaMaxima = origemMarkdown.split('\n').map(literal)
        .find((linha) => /^Vida Máxima: .+/.test(linha))?.slice('Vida Máxima: '.length);
    const linhasOriginais = origemMarkdown.split('\n');
    const buscarLinha = (padrao) => linhasOriginais.find((linha) => padrao.test(literal(linha)));
    const valorAposRotulo = (rotulo) => {
        const indice = linhasOriginais.findIndex((linha) => literal(linha) === rotulo);
        if (indice < 0) return undefined;
        const valor = linhasOriginais.slice(indice + 1).find((linha) => linha.trim());
        // O padrão é rótulo seguido por um valor em itálico; outro rótulo não é valor.
        return valor && /^\*(?!\*)[^\n]+\*\s*$/.test(valor.trim()) ? valor : undefined;
    };
    const defesaBase = buscarLinha(/^Defesa Base = .+/);
    const resistencias = buscarLinha(/^Resistências escolhidas: .+/);
    const fraquezas = buscarLinha(/^Fraquezas: .+/);
    const regeneracao = valorAposRotulo('Regeneração Natural');
    const porte = valorAposRotulo('Porte');
    const deslocamento = valorAposRotulo('Deslocamento');
    const cadencia = buscarLinha(/^Cadência: .+/);
    const ataques = linhasOriginais.map(literal).flatMap((linha, indice) => {
        const campos = linha.split(' | ');
        if (campos.length !== 4 || !/^Ação (de Movimento|Padrão|Completa|de Turno)$/.test(campos[1])
            || !/^[\p{L}]+ \d+D\d+(?:[+-]\d+)?$/u.test(campos[2])
            || !/^\d+D\d+(?:[+-]\d+)? \[.+\]$/.test(campos[3])) return [];
        const seguinte = linhasOriginais[indice + 1]?.trim();
        const efeito = seguinte && !seguinte.includes(' | ') && /^\*.+\*$/.test(seguinte)
            ? contexto.inline(seguinte, contexto.linha + indice + 1) : [];
        return [{ nome: campos[0], acao: campos[1], teste: campos[2], dano: campos[3], efeito }];
    });
    const habilidades = /** @type {RegrasHabilidadeCriatura[]} */ (
        descendentes.filter((filho) => filho.tipo === 'habilidade-criatura'));
    const nome = identidade?.campos.find((campo) => campo.rotulo === 'Designação');
    const linhasAtaque = origemMarkdown.split('\n').filter((linha) =>
        !linha.trim().startsWith('|') && linha.includes(' | '));
    if (!nome || !atributos || !vidaMaxima || !ataques.length
        || !defesaBase || !resistencias || !fraquezas || !regeneracao || !porte
        || !deslocamento || !cadencia
        || ataques.length !== linhasAtaque.length) {
        const motivo = 'Ficha completa sem todos os padrões fixos de identidade, atributos, Vida Máxima e ataques; preservada integralmente.';
        return { motivo, bloco: { tipo: 'generico', motivo, origemMarkdown,
            trechos: [], filhos: secao.filhos } };
    }
    return { bloco: { tipo: 'ficha-criatura', nome: lerTexto(nome.valor), identidade, atributos,
        vidaMaxima, defesaBase: literal(defesaBase).slice('Defesa Base = '.length),
        resistencias: contexto.inline(resistencias, contexto.linha + linhasOriginais.indexOf(resistencias)),
        fraquezas: contexto.inline(fraquezas, contexto.linha + linhasOriginais.indexOf(fraquezas)),
        regeneracao: contexto.inline(regeneracao, contexto.linha + linhasOriginais.indexOf(regeneracao)),
        porte: contexto.inline(porte, contexto.linha + linhasOriginais.indexOf(porte)),
        deslocamento: contexto.inline(deslocamento, contexto.linha + linhasOriginais.indexOf(deslocamento)),
        cadencia: literal(cadencia).slice('Cadência: '.length),
        ataques, habilidades, filhos: secao.filhos } };
}

/** @param {readonly RegrasTrecho[]} trechos */
function lerTexto(trechos) {
    return trechos.map((trecho) => 'filhos' in trecho ? lerTexto(trecho.filhos)
        : trecho.tipo === 'tarja' ? '█'.repeat(trecho.comprimento) : trecho.texto).join('');
}
