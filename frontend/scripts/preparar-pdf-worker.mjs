import { copyFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const diretorioFrontend = fileURLToPath(new URL('../', import.meta.url));
const diretorioDestino = join(diretorioFrontend, 'public', 'pdf-worker');
const origem = fileURLToPath(import.meta.resolve('pdfjs-dist/build/pdf.worker.min.mjs'));

await mkdir(diretorioDestino, { recursive: true });
await copyFile(origem, join(diretorioDestino, 'pdf.worker.min.mjs'));
