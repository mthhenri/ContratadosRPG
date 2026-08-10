import { readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ArmazenamentoLocalProvedor } from './armazenamento-local.provedor';

const diretorioFichaUploads = resolve(__dirname, '..', '..', '..', 'uploads', 'agentes');

describe('ArmazenamentoLocalProvedor (m3-62)', () => {
  const provedor = new ArmazenamentoLocalProvedor();

  afterEach(async () => {
    await rm(diretorioFichaUploads, { recursive: true, force: true });
  });

  it('grava o conteúdo em backend/uploads/agentes/<uuid>.<extensão> e devolve o caminho público', async () => {
    const conteudo = new Uint8Array([1, 2, 3, 4]);

    const salvo = await provedor.salvarImagem({ conteudo, mimetype: 'image/png', extensao: 'png' });

    expect(salvo.caminho).toMatch(/^\/uploads\/agentes\/[0-9a-f-]+\.png$/);
    const chave = salvo.caminho.replace('/uploads/', '');
    const gravado = await readFile(resolve(__dirname, '..', '..', '..', 'uploads', chave));
    expect(Uint8Array.from(gravado)).toEqual(conteudo);
  });

  it('exclui o arquivo gravado a partir do caminho público', async () => {
    const salvo = await provedor.salvarImagem({
      conteudo: new Uint8Array([9]),
      mimetype: 'image/jpeg',
      extensao: 'jpg',
    });
    const chave = salvo.caminho.replace('/uploads/', '');
    const caminhoAbsoluto = resolve(__dirname, '..', '..', '..', 'uploads', chave);
    await expect(readFile(caminhoAbsoluto)).resolves.toBeDefined();

    await provedor.excluirImagem({ caminho: salvo.caminho });

    await expect(readFile(caminhoAbsoluto)).rejects.toThrow();
  });

  it('excluirImagem não lança quando o arquivo já não existe (idempotente)', async () => {
    await expect(
      provedor.excluirImagem({ caminho: '/uploads/agentes/inexistente.png' }),
    ).resolves.toBeUndefined();
  });
});
