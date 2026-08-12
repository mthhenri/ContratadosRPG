import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('dotenv', () => ({ config: vi.fn() }));
import { ConfigService, resolverCaminhoVariaveisDeAmbiente } from './config.service';

describe('resolução do .env', () => {
  it('resolve o .env pela raiz do monorepo ou pelo workspace backend', () => {
    const raiz = resolve('C:\\projeto');
    const backend = resolve(raiz, 'backend');
    const caminhoEnv = resolve(raiz, '.env');
    const arquivoExiste = (caminho: string): boolean => caminho === caminhoEnv;

    expect(resolverCaminhoVariaveisDeAmbiente(raiz, arquivoExiste)).toBe(caminhoEnv);
    expect(resolverCaminhoVariaveisDeAmbiente(backend, arquivoExiste)).toBe(caminhoEnv);
  });
});

const CHAVES_ARMAZENAMENTO = [
  'ARMAZENAMENTO_PROVEDOR',
  'ARMAZENAMENTO_R2_ACCOUNT_ID',
  'ARMAZENAMENTO_R2_ACCESS_KEY_ID',
  'ARMAZENAMENTO_R2_SECRET_ACCESS_KEY',
  'ARMAZENAMENTO_R2_BUCKET',
  'ARMAZENAMENTO_R2_URL_PUBLICA',
] as const;

describe('ConfigService.obterConfiguracaoArmazenamento (m3-62)', () => {
  const ambienteOriginal: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const chave of CHAVES_ARMAZENAMENTO) {
      ambienteOriginal[chave] = process.env[chave];
      delete process.env[chave];
    }
  });

  afterEach(() => {
    for (const chave of CHAVES_ARMAZENAMENTO) {
      if (ambienteOriginal[chave] === undefined) {
        delete process.env[chave];
      } else {
        process.env[chave] = ambienteOriginal[chave];
      }
    }
  });

  it('retorna só { provedor: "local" } sem exigir nenhuma variável R2', () => {
    process.env.ARMAZENAMENTO_PROVEDOR = 'local';

    const configuracao = new ConfigService().obterConfiguracaoArmazenamento();

    expect(configuracao).toEqual({ provedor: 'local' });
  });

  it('retorna as cinco variáveis R2 quando o provedor é "r2"', () => {
    process.env.ARMAZENAMENTO_PROVEDOR = 'r2';
    process.env.ARMAZENAMENTO_R2_ACCOUNT_ID = 'conta-1';
    process.env.ARMAZENAMENTO_R2_ACCESS_KEY_ID = 'chave-acesso';
    process.env.ARMAZENAMENTO_R2_SECRET_ACCESS_KEY = 'chave-secreta';
    process.env.ARMAZENAMENTO_R2_BUCKET = 'bucket-fichas';
    process.env.ARMAZENAMENTO_R2_URL_PUBLICA = 'https://pub-hash.r2.dev';

    const configuracao = new ConfigService().obterConfiguracaoArmazenamento();

    expect(configuracao).toEqual({
      provedor: 'r2',
      r2AccountId: 'conta-1',
      r2AccessKeyId: 'chave-acesso',
      r2SecretAccessKey: 'chave-secreta',
      r2Bucket: 'bucket-fichas',
      r2UrlPublica: 'https://pub-hash.r2.dev',
    });
  });

  it('lança quando o provedor é "r2" e falta uma variável R2', () => {
    process.env.ARMAZENAMENTO_PROVEDOR = 'r2';
    process.env.ARMAZENAMENTO_R2_ACCOUNT_ID = 'conta-1';
    // As demais ARMAZENAMENTO_R2_* ficam ausentes de propósito.

    expect(() => new ConfigService().obterConfiguracaoArmazenamento()).toThrow(
      /ARMAZENAMENTO_R2_ACCESS_KEY_ID/,
    );
  });

  it('lança quando ARMAZENAMENTO_PROVEDOR está ausente', () => {
    expect(() => new ConfigService().obterConfiguracaoArmazenamento()).toThrow(
      /ARMAZENAMENTO_PROVEDOR/,
    );
  });

  it('lança quando ARMAZENAMENTO_PROVEDOR não é "local" nem "r2"', () => {
    process.env.ARMAZENAMENTO_PROVEDOR = 'aws';

    expect(() => new ConfigService().obterConfiguracaoArmazenamento()).toThrow(
      /ARMAZENAMENTO_PROVEDOR inválida/,
    );
  });
});
