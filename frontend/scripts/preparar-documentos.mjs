import { copyFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const diretorioFrontend = fileURLToPath(new URL('../', import.meta.url));
const diretorioOrigem = join(diretorioFrontend, '..', 'docs', 'core');
const diretorioDestino = join(diretorioFrontend, 'public', 'documentos');
const documentos = [
  'sistema-v4.1.0.pdf',
  'guia_de_mestre-v4.0.0.pdf',
];

await mkdir(diretorioDestino, { recursive: true });

await Promise.all(
  documentos.map((documento) =>
    copyFile(join(diretorioOrigem, documento), join(diretorioDestino, documento)),
  ),
);
