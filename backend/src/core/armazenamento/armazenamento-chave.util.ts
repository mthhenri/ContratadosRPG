import { randomUUID } from 'node:crypto';
import { ArmazenamentoPastaEnum } from './armazenamento-provedor.interface';

/**
 * Nome da pasta de cada `ArmazenamentoPastaEnum`, dentro de `backend/uploads/` (local) ou do
 * bucket R2. `agentes/` é a pasta que o autor criou no bucket para os avatares das fichas (m3-62);
 * `documentos/` guarda as imagens dos documentos de campanha (m9-02); `patchnotes/` guarda as notas
 * de versão em Markdown e o `indice.json` delas (pn-02). Mudar um nome aqui não move
 * os arquivos já gravados — os caminhos persistidos continuam apontando para a pasta antiga.
 */
const NOME_PASTA: Readonly<Record<ArmazenamentoPastaEnum, string>> = {
  [ArmazenamentoPastaEnum.AGENTES]: 'agentes',
  [ArmazenamentoPastaEnum.DOCUMENTOS]: 'documentos',
  [ArmazenamentoPastaEnum.PATCHNOTES]: 'patchnotes',
};

/** Nome da pasta no armazenamento (`agentes`, `documentos`...) — o prefixo das chaves dela. */
export function obterNomePasta(pasta: ArmazenamentoPastaEnum): string {
  return NOME_PASTA[pasta];
}

/**
 * Chave relativa de uma imagem, comum às duas implementações de armazenamento
 * (`<pasta>/<uuid>.<extensão>`) — a única diferença entre elas é a raiz (disco local vs bucket
 * R2). Centralizado aqui para não duplicar a convenção de nomeação entre os dois provedores.
 */
export function construirChaveImagem(pasta: ArmazenamentoPastaEnum, extensao: string): string {
  return `${NOME_PASTA[pasta]}/${randomUUID()}.${extensao}`;
}

const PADRAO_NOME_ARQUIVO = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/**
 * Chave relativa de um arquivo de texto de nome conhecido (`<pasta>/<nomeArquivo>`), comum às duas
 * implementações. Diferente da imagem, o nome é escolhido por quem chama (ex.: `1.1.0.md`,
 * `indice.json`) — por isso é validado aqui: só letras, dígitos, `.`, `_` e `-`, sem separador de
 * caminho e sem `..`, para que um nome vindo de fora nunca escape da pasta.
 */
export function construirChaveTexto(pasta: ArmazenamentoPastaEnum, nomeArquivo: string): string {
  if (!PADRAO_NOME_ARQUIVO.test(nomeArquivo) || nomeArquivo.includes('..')) {
    throw new Error(`Nome de arquivo de armazenamento inválido: "${nomeArquivo}"`);
  }
  return `${NOME_PASTA[pasta]}/${nomeArquivo}`;
}
