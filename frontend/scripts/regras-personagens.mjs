// @ts-check

const classes = {
    Combatente: ['Lutador', 'Mercenário', 'Vanguarda'],
    Especialista: ['Engenheiro', 'Assassino', 'Acadêmico'],
    Suporte: ['Paramédico', 'Diplomata', 'Comandante'],
};

/** Retira só o negrito dos rótulos de layout; preserva a formatação dos valores. */
function retirarRotulos(texto) {
    return texto.replace(/\*\*(⬦ [^*]+|◻ [^*]+)\*\*/g, '$1');
}

function lerHabilidades(texto, contexto, linha) {
    const partes = texto.trim().split(/\s*(?=◈\s)/u);
    if (!partes.length || partes.some((parte) =>
        !/^◈\s+.+?\s+\\?\[(?:\d+|X) E\\?\]\s+\S/u.test(parte))) return null;
    const habilidades = partes.map((parte) => contexto.paragrafo(parte, linha));
    return habilidades.every((habilidade) => habilidade.tipo === 'habilidade')
        ? habilidades : null;
}

/**
 * Lista fechada de assinaturas de tabelas de personagens da exportação do Sistema.
 * As células completas também são conservadas para o oráculo independente de texto.
 * Não há estado entre tabelas: o trio completo de arquétipos identifica sua classe.
 * @param {import('marked').Tokens.Table} token
 * @param {{secao: string, caminho: string[], linha: number,
 * inline: (texto: string, linha: number) => import('../src/app/modules/regras/regras.model.js').RegrasTrecho[],
 * paragrafo: (texto: string, linha: number) => import('../src/app/modules/regras/regras.model.js').RegrasBloco}} contexto
 * @returns {import('../src/app/modules/regras/regras.model.js').RegrasBloco | null}
 */
export function reconhecerPersonagens(token, contexto) {
    const cabecalho = token.header.map((celula) => celula.text.trim());
    const linhas = token.rows.map((linha) => linha.map((celula) => celula.text.trim()));
    const fonte = () => ({
        cabecalho: cabecalho.map((texto) => contexto.inline(texto, contexto.linha)),
        linhas: linhas.map((celulas, indice) => celulas.map((texto) =>
            contexto.inline(texto, contexto.linha + indice + 2))),
    });
    const trechos = (texto, indice = 0) => contexto.inline(texto.trim(),
        contexto.linha + (indice ? indice + 1 : 0));
    const vazias = (celulas) => celulas.every((celula) => !celula);

    // Origem: a fonte contém estes dois exemplos, ambos no cabeçalho da mesma tabela.
    if (cabecalho.length === 2 && linhas.length === 0) {
        const origens = cabecalho.map((texto, indice) => {
            const campos = texto.match(/^◻ (Bombeiro|Alpinista Profissional)\s+(\*“.+?”\*)\s+Formação:\s+(.+?)\s+Especialidade:\s+(.+?)\s+Saber de Campo:\s+(.+)$/u);
            return campos && campos[1] === ['Bombeiro', 'Alpinista Profissional'][indice]
                ? { nome: campos[1], citacao: trechos(campos[2]), formacao: trechos(campos[3]),
                    especialidade: trechos(campos[4]), saberCampo: trechos(campos[5]) } : null;
        });
        if (origens.every(Boolean)) return { tipo: 'origens', origens, ...fonte() };
    }

    // Módulos: as posições vazias fazem parte da assinatura, não viram valores.
    if (cabecalho.length === 6 && linhas.length === 1 && linhas[0].length === 6) {
        const grade = [cabecalho, linhas[0]];
        const posicoes = [[0, 0, 'V'], [0, 2, 'IV'], [0, 4, 'III'], [1, 1, 'II'], [1, 3, 'I']];
        const ocupadas = new Set(posicoes.map(([linha, coluna]) => `${linha}:${coluna}`));
        const vaziosCorretos = grade.every((celulas, indiceLinha) => celulas.every((texto, coluna) =>
            ocupadas.has(`${indiceLinha}:${coluna}`) || !texto));
        const modulos = posicoes.map(([linha, coluna, nivel]) => {
            const campos = grade[Number(linha)][Number(coluna)].match(
                /^(?:\*\*)?Módulo (V|IV|III|II|I)(?:\*\*)? gasta (\d+) de Energia Máxima$/u);
            return campos && campos[1] === nivel
                ? { nivel: campos[1], energiaMaxima: Number(campos[2]) } : null;
        });
        if (vaziosCorretos && modulos.every(Boolean)) return { tipo: 'modulos', modulos, ...fonte() };
    }

    // Subclasse: identidade e custo no cabeçalho, habilidades ao lado; saúde e inicial abaixo.
    if (cabecalho.length === 2 && linhas.length === 2 && linhas.every((linha) =>
        linha.length === 2 && !linha[1])) {
        const identidade = cabecalho[0].match(
            /^⬥ (Experimento (?:Bestial|Artificial|Híbrido))\s+\*⬡ CLASSE \\?- (COMBATENTE|ESPECIALISTA|SUPORTE)\s+(“.+?”)\s+(AGENTES DESTA CLASSE .+)\*$/u);
        // O Docs junta as três penalidades numa frase só; os inícios fixos as separam.
        const custos = identidade?.[4].split(/\s+(?=SEU LIMITE |EM NÍVEL )/u) ?? [];
        const lista = cabecalho[1].match(/^⬦ Habilidades de Subclasse\s+(◈.+)$/u);
        const habilidades = lista && lerHabilidades(lista[1], contexto, contexto.linha);
        const saude = retirarRotulos(linhas[0][0]).match(
            /^⬦ Saúde\s+Vida \\?=\s+(.+?)\s+Energia \\?=\s+(.+?)\s+⬦ Progressão por Nível\s+\\?\[Vida\\?\] a cada Nível recebe:\s+(.+?)\s+\\?\[Energia\\?\] a cada Nível recebe:\s+(.+?)\s+⬦ Atributos Bônus\s+(.+)$/u);
        const inicial = retirarRotulos(linhas[1][0]).match(/^⬦ Habilidade Inicial\s+(.+)$/u);
        const habilidadeInicial = inicial && contexto.paragrafo('◈ ' + inicial[1], contexto.linha + 3);
        if (identidade && custos.length === 3 && habilidades && saude
            && habilidadeInicial?.tipo === 'habilidade') {
            const classe = identidade[2][0] + identidade[2].slice(1).toLowerCase();
            return { tipo: 'subclasse', nome: identidade[1], classe,
                citacao: trechos(identidade[3]),
                custos: custos.map((custo) => trechos(custo)),
                saude: { vida: trechos(saude[1], 1), energia: trechos(saude[2], 1) },
                progressao: { vida: trechos(saude[3], 1), energia: trechos(saude[4], 1) },
                atributosBonus: trechos(saude[5], 1), habilidadeInicial, habilidades, ...fonte() };
        }
    }

    if (cabecalho.length !== 3 || linhas.some((linha) => linha.length !== 3)) return null;

    // Dossiê: título/citação, duas colunas de habilidades, Saúde, Progressão e trio inicial.
    const identidade = cabecalho[0].match(/^⬥ (Combatente|Especialista|Suporte)\s+(\*“.+?”\*)$/u);
    if (identidade && linhas.length === 4 && linhas.slice(0, 3).every((linha) =>
        vazias(linha.slice(1))) && vazias(linhas[3])) {
        const saude = retirarRotulos(linhas[0][0]).match(/^⬦ Saúde\s+Vida \\?=\s+(.+?)\s+Energia \\?=\s+(.+)$/u);
        const progressao = retirarRotulos(linhas[1][0]).match(
            /^⬦ Progressão por Nível\s+\\?\[Vida\\?\] a cada Nível recebe:\s+(.+?)\s+\\?\[Energia\\?\] a cada Nível recebe:\s+(.+)$/u);
        const primeiraColuna = cabecalho[1].match(/^⬦ Habilidades de Classe\s+(◈.+)$/u);
        const habilidades = primeiraColuna && lerHabilidades(
            primeiraColuna[1] + ' ' + cabecalho[2], contexto, contexto.linha);
        const textoIniciais = retirarRotulos(linhas[2][0]);
        const partes = textoIniciais.replace(/^⬦ Arquétipos\s+/, '').split(/\s*(?=◻\s)/u);
        const nomes = classes[identidade[1]];
        const arquetipos = partes.map((texto, indice) => {
            if (!nomes[indice] || !texto.startsWith(`◻ ${nomes[indice]} `)) return null;
            const habilidadeInicial = contexto.paragrafo('◈ ' + texto.slice(nomes[indice].length + 3).trim(),
                contexto.linha + 4);
            return habilidadeInicial.tipo === 'habilidade' && habilidadeInicial.trechos.length
                ? { nome: nomes[indice], habilidadeInicial } : null;
        });
        if (saude && progressao && habilidades && textoIniciais.startsWith('⬦ Arquétipos ')
            && arquetipos.length === 3 && arquetipos.every(Boolean)) {
            return { tipo: 'classe', nome: identidade[1], citacao: trechos(identidade[2]),
                saude: { vida: trechos(saude[1], 1), energia: trechos(saude[2], 1) },
                progressao: { vida: trechos(progressao[1], 2), energia: trechos(progressao[2], 2) },
                habilidades, arquetipos, ...fonte() };
        }
    }

    // Segunda tabela de cada classe: só é aceita com o trio inteiro e as duas linhas canônicas.
    if (linhas.length === 2) {
        for (const [classe, nomes] of Object.entries(classes)) {
            const arquetipos = cabecalho.map((texto, indice) => {
                const campos = texto.match(/^◻ (.+?)\s+(\*“.+?[”“]\*)\s+⬦ Atributos Bônus\s+(.+)$/u);
                const especificas = retirarRotulos(linhas[0][indice]).match(/^⬦ Habilidades de Arquétipo\s+(◈.+)$/u);
                const melhoradas = retirarRotulos(linhas[1][indice]).match(/^⬦ Habilidades Gerais Melhoradas\s+(◈.+)$/u);
                const habilidades = especificas && lerHabilidades(especificas[1], contexto, contexto.linha + 2);
                const habilidadesGeraisMelhoradas = melhoradas && lerHabilidades(melhoradas[1], contexto, contexto.linha + 3);
                return campos && campos[1] === nomes[indice] && habilidades && habilidadesGeraisMelhoradas
                    ? { nome: campos[1], citacao: trechos(campos[2]), atributosBonus: trechos(campos[3]),
                        habilidades, habilidadesGeraisMelhoradas } : null;
            });
            if (arquetipos.every(Boolean)) return { tipo: 'arquetipos', classe, arquetipos, ...fonte() };
        }
    }
    return null;
}
