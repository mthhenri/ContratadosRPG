import { describe, expect, it } from 'vitest';
import { validarConfiguracaoResetDev } from './reset-dev.guard';

const AMBIENTE_LOCAL: NodeJS.ProcessEnv = {
  APP_AMBIENTE: 'development',
  DB_HOST: 'localhost',
  DB_PORT: '5432',
  DB_NOME: 'contratados_rpg',
  DB_USUARIO: 'postgres',
  DB_SENHA: 'postgres',
  ARMAZENAMENTO_PROVEDOR: 'local',
};

describe('validarConfiguracaoResetDev', () => {
  it('aceita o alvo PostgreSQL local canônico', () => {
    expect(validarConfiguracaoResetDev(AMBIENTE_LOCAL)).toEqual({
      ambiente: 'development',
      host: 'localhost',
      porta: 5432,
      nome: 'contratados_rpg',
      usuario: 'postgres',
      senha: 'postgres',
      armazenamentoProvedor: 'local',
    });
  });

  it('aceita o endereço IPv4 de loopback', () => {
    expect(validarConfiguracaoResetDev({ ...AMBIENTE_LOCAL, DB_HOST: '127.0.0.1' }).host).toBe(
      '127.0.0.1',
    );
  });

  it.each([
    ['APP_AMBIENTE', 'production'],
    ['DB_HOST', 'db.supabase.co'],
    ['DB_HOST', '192.168.1.20'],
    ['DB_NOME', 'postgres'],
    ['DB_USUARIO', 'app_producao'],
    ['ARMAZENAMENTO_PROVEDOR', 'r2'],
    ['DB_PORT', 'porta'],
    ['DB_PORT', '70000'],
  ] as const)('recusa %s=%s', (chave, valor) => {
    expect(() => validarConfiguracaoResetDev({ ...AMBIENTE_LOCAL, [chave]: valor })).toThrow(
      /Reset recusado/,
    );
  });

  it.each([
    'APP_AMBIENTE',
    'DB_HOST',
    'DB_PORT',
    'DB_NOME',
    'DB_USUARIO',
    'DB_SENHA',
    'ARMAZENAMENTO_PROVEDOR',
  ])('recusa quando %s está ausente', (chave) => {
    const ambiente = { ...AMBIENTE_LOCAL };
    delete ambiente[chave];

    expect(() => validarConfiguracaoResetDev(ambiente)).toThrow(
      new RegExp(`Reset recusado: variável ${chave} ausente`),
    );
  });
});
