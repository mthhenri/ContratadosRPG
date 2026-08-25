import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const diretorioSaida = join(fileURLToPath(new URL('../', import.meta.url)), 'dist', 'frontend', 'browser');
const arquivosPublicados = [
  join(diretorioSaida, 'documentos', 'sistema-v4.1.0.pdf'),
  join(diretorioSaida, 'documentos', 'guia_de_mestre-v4.0.0.pdf'),
  join(diretorioSaida, 'pdf-worker', 'pdf.worker.min.mjs'),
];

const verificacoes = await Promise.all(
  arquivosPublicados.map(async (caminho) => {
    const documento = caminho.slice(diretorioSaida.length + 1);

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
