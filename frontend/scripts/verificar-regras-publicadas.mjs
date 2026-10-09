import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizarDocumento, selecionarFonte } from './normalizar-regras.mjs';

const diretorioFrontend = fileURLToPath(new URL('../', import.meta.url));
const diretorioOrigem = join(diretorioFrontend, '..', 'docs', 'core');
const diretorioSaida = join(diretorioFrontend, 'dist', 'frontend', 'browser');
const arquivos = await readdir(diretorioOrigem);

// Compara a publicação inteira com a fonte vigente: versão ou conteúdo antigo não passa.
for (const id of ['sistema', 'guia']) {
    const fonte = selecionarFonte(arquivos, id === 'sistema' ? 'sistema' : 'guia_de_mestre');
    const texto = await readFile(join(diretorioOrigem, fonte.arquivo), 'utf8');
    const esperado = normalizarDocumento(texto, id, fonte.versao).documento;
    const publicado = JSON.parse(await readFile(join(diretorioSaida, 'regras', `${id}.json`), 'utf8'));
    if (JSON.stringify(publicado) !== JSON.stringify(esperado)) {
        throw new Error(`Regras publicadas divergentes: ${id}.json / ${fonte.arquivo}.`);
    }
    console.log(`Regras publicadas: ${id}.json (v${fonte.versao}), fiel ao Markdown.`);
}

// Impede que resíduos de uma instalação anterior voltem a ser distribuídos.
async function conferirLegado(diretorio) {
    for (const arquivo of await readdir(diretorio, { withFileTypes: true })) {
        const caminho = join(diretorio, arquivo.name);
        if (arquivo.name.endsWith('.pdf') || arquivo.name.startsWith('pdf.worker')) {
            throw new Error(`Arquivo legado publicado: ${caminho}.`);
        }
        if (arquivo.isDirectory()) await conferirLegado(caminho);
    }
}
await conferirLegado(diretorioSaida);
