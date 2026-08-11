import { readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ArmazenamentoLocalProvedor } from './armazenamento-local.provedor';

const diretorioUploads = resolve(__dirname, '..', '..', '..', 'uploads');

/**
 * `ArmazenamentoLocalProvedor` grava em `backend/uploads` de verdade (sem diretório injetável —
 * é a mesma pasta que o servidor de dev usa). O `afterEach` **não pode** limpar a pasta inteira
 * (`rm(..., { recursive: true })`): isso apagaria avatares reais que alguém tenha subido rodando
 * o app localmente enquanto os testes passam. Cada teste registra só o próprio arquivo criado e
 * o `afterEach` remove exatamente esses — nunca a pasta inteira.
 */
describe('ArmazenamentoLocalProvedor (m3-62)', () => {
  const provedor = new ArmazenamentoLocalProvedor();
  const arquivosCriados: string[] = [];

  afterEach(async () => {
    await Promise.all(
      arquivosCriados.splice(0).map((caminhoPublico) =>
        rm(resolve(diretorioUploads, caminhoPublico.replace('/uploads/', '')), { force: true }),
      ),
    );
  });

  it('grava o conteúdo em backend/uploads/agentes/<uuid>.<extensão> e devolve o caminho público', async () => {
    const conteudo = new Uint8Array([1, 2, 3, 4]);

    const salvo = await provedor.salvarImagem({ conteudo, mimetype: 'image/png', extensao: 'png' });
    arquivosCriados.push(salvo.caminho);

    expect(salvo.caminho).toMatch(/^\/uploads\/agentes\/[0-9a-f-]+\.png$/);
    const chave = salvo.caminho.replace('/uploads/', '');
    const gravado = await readFile(resolve(diretorioUploads, chave));
    expect(Uint8Array.from(gravado)).toEqual(conteudo);
  });

  it('exclui o arquivo gravado a partir do caminho público', async () => {
    const salvo = await provedor.salvarImagem({
      conteudo: new Uint8Array([9]),
      mimetype: 'image/jpeg',
      extensao: 'jpg',
    });
    arquivosCriados.push(salvo.caminho);
    const chave = salvo.caminho.replace('/uploads/', '');
    const caminhoAbsoluto = resolve(diretorioUploads, chave);
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
