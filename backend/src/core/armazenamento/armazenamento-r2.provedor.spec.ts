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
  DeleteObjectCommand: class {
    constructor(entrada: unknown) {
      construtoresComandoRecebidos.push(entrada);
      Object.assign(this as object, entrada as object);
    }
  },
}));

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

    const salvo = await provedor.salvarImagem({ conteudo, mimetype: 'image/webp', extensao: 'webp' });

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

  it('exclui via DeleteObjectCommand extraindo a chave da URL pública', async () => {
    const provedor = new ArmazenamentoR2Provedor(configuracaoR2);

    await provedor.excluirImagem({ caminho: 'https://pub-hash.r2.dev/agentes/abc-123.png' });

    expect(enviarMock).toHaveBeenCalledTimes(1);
    const comando = construtoresComandoRecebidos[0] as { Bucket: string; Key: string };
    expect(comando.Bucket).toBe('bucket-fichas');
    expect(comando.Key).toBe('agentes/abc-123.png');
  });
});
