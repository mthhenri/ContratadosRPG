import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const diretorioFrontend = fileURLToPath(new URL('../', import.meta.url));
const diretorioDocumentos = join(
  diretorioFrontend,
  'dist',
  'frontend',
  'browser',
  'documentos',
);
const documentos = [
  'sistema-v4.1.0.pdf',
  'guia_de_mestre-v4.0.0.pdf',
];

const verificacoes = await Promise.all(
  documentos.map(async (documento) => {
    const caminho = join(diretorioDocumentos, documento);

    try {
      const informacoes = await stat(caminho);

      if (!informacoes.isFile()) {
        throw new Error('não é um arquivo');
      }

      if (informacoes.size <= 0) {
        throw new Error('é vazio');
      }

      return { documento, tamanho: informacoes.size };
    } catch (erro) {
      const motivo = erro instanceof Error ? erro.message : String(erro);
      throw new Error(`Documento publicado inválido: ${documento} (${motivo}).`);
    }
  }),
);

for (const { documento, tamanho } of verificacoes) {
  console.log(`Documento publicado: ${documento} (${tamanho} bytes).`);
}
