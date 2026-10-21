import { beforeEach, describe, expect, it, vi } from 'vitest';

const enviarMock = vi.fn();
const construtoresComandoRecebidos: unknown[] = [];

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class {
    send = enviarMock;
  },
  PutObjectCommand: class {
    constructor(entrada: unknown) {
      construtoresComandoRecebidos.push(entrada);
      Object.assign(this as object, entrada as object);
    }
  },
  GetObjectCommand: class {
    constructor(entrada: unknown) {
      construtoresComandoRecebidos.push(entrada);
      Object.assign(this as object, entrada as object);
    }
  },
  ListObjectsV2Command: class {
    constructor(entrada: unknown) {
      construtoresComandoRecebidos.push(entrada);
      Object.assign(this as object, entrada as object);
    }
  },
  DeleteObjectCommand: class {
    constructor(entrada: unknown) {
      construtoresComandoRecebidos.push(entrada);
      Object.assign(this as object, entrada as object);
    }
  },
}));

import { ArmazenamentoPastaEnum } from './armazenamento-provedor.interface';
import { ArmazenamentoR2Provedor } from './armazenamento-r2.provedor';

describe('ArmazenamentoR2Provedor (m3-62)', () => {
  const configuracaoR2 = {
    provedor: 'r2' as const,
    r2AccountId: 'conta-1',
    r2AccessKeyId: 'chave-acesso',
    r2SecretAccessKey: 'chave-secreta',
    r2Bucket: 'bucket-fichas',
    r2UrlPublica: 'https://pub-hash.r2.dev',
  };

  beforeEach(() => {
    enviarMock.mockReset().mockResolvedValue(undefined);
    construtoresComandoRecebidos.length = 0;
  });

  it('salva via PutObjectCommand na chave agentes/<uuid>.<extensão> e devolve a URL pública', async () => {
    const provedor = new ArmazenamentoR2Provedor(configuracaoR2);
    const conteudo = new Uint8Array([1, 2, 3]);

    const salvo = await provedor.salvarImagem({
      pasta: ArmazenamentoPastaEnum.AGENTES,
      conteudo,
      mimetype: 'image/webp',
      extensao: 'webp',
    });

    expect(salvo.caminho).toMatch(
      /^https:\/\/pub-hash\.r2\.dev\/agentes\/[0-9a-f-]+\.webp$/,
    );
    expect(enviarMock).toHaveBeenCalledTimes(1);
    const comando = construtoresComandoRecebidos[0] as {
      Bucket: string;
      Key: string;
      Body: Uint8Array;
      ContentType: string;
    };
    expect(comando.Bucket).toBe('bucket-fichas');
    expect(comando.Key).toMatch(/^agentes\/[0-9a-f-]+\.webp$/);
    expect(comando.Body).toBe(conteudo);
    expect(comando.ContentType).toBe('image/webp');
  });

  it('salva a imagem de documento na chave documentos/<uuid>.<extensão> (m9-02)', async () => {
    const provedor = new ArmazenamentoR2Provedor(configuracaoR2);

    const salvo = await provedor.salvarImagem({
      pasta: ArmazenamentoPastaEnum.DOCUMENTOS,
      conteudo: new Uint8Array([7]),
      mimetype: 'image/png',
      extensao: 'png',
    });

    expect(salvo.caminho).toMatch(/^https:\/\/pub-hash\.r2\.dev\/documentos\/[0-9a-f-]+\.png$/);
    const comando = construtoresComandoRecebidos[0] as { Key: string };
    expect(comando.Key).toMatch(/^documentos\/[0-9a-f-]+\.png$/);
  });

  it('exclui via DeleteObjectCommand extraindo a chave da URL pública', async () => {
    const provedor = new ArmazenamentoR2Provedor(configuracaoR2);

    await provedor.excluirImagem({ caminho: 'https://pub-hash.r2.dev/agentes/abc-123.png' });

    expect(enviarMock).toHaveBeenCalledTimes(1);
    const comando = construtoresComandoRecebidos[0] as { Bucket: string; Key: string };
    expect(comando.Bucket).toBe('bucket-fichas');
    expect(comando.Key).toBe('agentes/abc-123.png');
  });

  describe('texto (pn-02)', () => {
    it('lê o arquivo via GetObjectCommand na chave <pasta>/<nome> e devolve o texto', async () => {
      enviarMock.mockResolvedValue({ Body: { transformToString: () => Promise.resolve('# Notas') } });
      const provedor = new ArmazenamentoR2Provedor(configuracaoR2);

      const texto = await provedor.lerTexto({
        pasta: ArmazenamentoPastaEnum.PATCHNOTES,
        nomeArquivo: '1.1.0.md',
      });

      expect(texto).toBe('# Notas');
      expect(construtoresComandoRecebidos[0]).toEqual({
        Bucket: 'bucket-fichas',
        Key: 'patchnotes/1.1.0.md',
      });
    });

    it('devolve null quando a chave não existe (NoSuchKey ou 404)', async () => {
      const provedor = new ArmazenamentoR2Provedor(configuracaoR2);
      const alvo = { pasta: ArmazenamentoPastaEnum.PATCHNOTES, nomeArquivo: 'indice.json' };

      enviarMock.mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'NoSuchKey' }));
      expect(await provedor.lerTexto(alvo)).toBeNull();

      enviarMock.mockRejectedValueOnce(
        Object.assign(new Error('x'), { name: 'Outro', $metadata: { httpStatusCode: 404 } }),
      );
      expect(await provedor.lerTexto(alvo)).toBeNull();
    });

    it('propaga qualquer outra falha de leitura (credencial, rede) em vez de fingir arquivo ausente', async () => {
      enviarMock.mockRejectedValueOnce(
        Object.assign(new Error('negado'), { name: 'AccessDenied', $metadata: { httpStatusCode: 403 } }),
      );
      const provedor = new ArmazenamentoR2Provedor(configuracaoR2);

      await expect(
        provedor.lerTexto({ pasta: ArmazenamentoPastaEnum.PATCHNOTES, nomeArquivo: 'indice.json' }),
      ).rejects.toThrow('negado');
    });

    it('grava via PutObjectCommand com o tipo de mídia em UTF-8', async () => {
      const provedor = new ArmazenamentoR2Provedor(configuracaoR2);

      await provedor.salvarTexto({
        pasta: ArmazenamentoPastaEnum.PATCHNOTES,
        nomeArquivo: 'indice.json',
        conteudo: '[]',
        mimetype: 'application/json',
      });

      expect(construtoresComandoRecebidos[0]).toEqual({
        Bucket: 'bucket-fichas',
        Key: 'patchnotes/indice.json',
        Body: '[]',
        ContentType: 'application/json; charset=utf-8',
      });
    });

    it('recusa nome de arquivo que escapa da pasta, sem tocar o bucket', async () => {
      const provedor = new ArmazenamentoR2Provedor(configuracaoR2);

      await expect(
        provedor.lerTexto({ pasta: ArmazenamentoPastaEnum.PATCHNOTES, nomeArquivo: '../agentes/x.png' }),
      ).rejects.toThrow('inválido');
      expect(enviarMock).not.toHaveBeenCalled();
    });
  });

  it('lista a pasta seguindo a paginação e devolve a URL pública de cada chave', async () => {
    const provedor = new ArmazenamentoR2Provedor(configuracaoR2);
    const antes = new Date('2026-01-01T00:00:00Z');
    enviarMock
      .mockResolvedValueOnce({
        Contents: [{ Key: 'agentes/a.png', LastModified: antes }],
        IsTruncated: true,
        NextContinuationToken: 'proxima',
      })
      .mockResolvedValueOnce({ Contents: [{ Key: 'agentes/b.webp', LastModified: antes }] });

    const imagens = await provedor.listarImagens({ pasta: ArmazenamentoPastaEnum.AGENTES });

    expect(imagens).toEqual([
      { caminho: 'https://pub-hash.r2.dev/agentes/a.png', modificadoEm: antes },
      { caminho: 'https://pub-hash.r2.dev/agentes/b.webp', modificadoEm: antes },
    ]);
    expect(construtoresComandoRecebidos).toEqual([
      expect.objectContaining({ Prefix: 'agentes/', ContinuationToken: undefined }),
      expect.objectContaining({ Prefix: 'agentes/', ContinuationToken: 'proxima' }),
    ]);
  });
});
