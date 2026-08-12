import { describe, expect, it } from 'vitest';
import { executarResetDev, montarEtapasResetDev, type EtapaResetDev } from './reset-dev';

const AMBIENTE_LOCAL: NodeJS.ProcessEnv = {
  APP_AMBIENTE: 'development',
  DB_HOST: 'localhost',
  DB_PORT: '5432',
  DB_NOME: 'contratados_rpg',
  DB_USUARIO: 'postgres',
  DB_SENHA: 'postgres',
  ARMAZENAMENTO_PROVEDOR: 'local',
};

describe('montarEtapasResetDev', () => {
  it('mantém o alvo destrutivo fixo no Compose deste repositório', () => {
    expect(montarEtapasResetDev('C:\\node\\npm-cli.js')).toEqual([
      {
        nome: 'remover banco local',
        executavel: 'docker',
        argumentos: ['compose', 'down', '--volumes', '--remove-orphans'],
      },
      {
        nome: 'subir PostgreSQL local',
        executavel: 'docker',
        argumentos: ['compose', 'up', '-d', '--wait', 'postgres'],
      },
      {
        nome: 'aplicar migrations',
        executavel: process.execPath,
        argumentos: ['C:\\node\\npm-cli.js', 'run', 'db:migrate'],
      },
      {
        nome: 'aplicar seed',
        executavel: process.execPath,
        argumentos: ['C:\\node\\npm-cli.js', 'run', 'db:seed:dev'],
      },
    ]);
  });
});

describe('executarResetDev', () => {
  it('não executa subprocesso quando o ambiente é recusado', () => {
    const executadas: EtapaResetDev[] = [];

    expect(() =>
      executarResetDev({
        ambiente: { ...AMBIENTE_LOCAL, APP_AMBIENTE: 'production' },
        npmCliPath: 'C:\\node\\npm-cli.js',
        raizRepositorio: 'C:\\repo',
        executar: (etapa) => executadas.push(etapa),
      }),
    ).toThrow(/Reset recusado/);
    expect(executadas).toEqual([]);
  });

  it('executa as quatro etapas em ordem no diretório fixo', () => {
    const executadas: { etapa: EtapaResetDev; raiz: string }[] = [];

    executarResetDev({
      ambiente: AMBIENTE_LOCAL,
      npmCliPath: 'C:\\node\\npm-cli.js',
      raizRepositorio: 'C:\\repo',
      executar: (etapa, raiz) => executadas.push({ etapa, raiz }),
    });

    expect(executadas.map(({ etapa }) => etapa.nome)).toEqual([
      'remover banco local',
      'subir PostgreSQL local',
      'aplicar migrations',
      'aplicar seed',
    ]);
    expect(new Set(executadas.map(({ raiz }) => raiz))).toEqual(new Set(['C:\\repo']));
  });

  it('interrompe antes do seed quando migrations falham', () => {
    const executadas: string[] = [];

    expect(() =>
      executarResetDev({
        ambiente: AMBIENTE_LOCAL,
        npmCliPath: 'C:\\node\\npm-cli.js',
        raizRepositorio: 'C:\\repo',
        executar: (etapa) => {
          executadas.push(etapa.nome);
          if (etapa.nome === 'aplicar migrations') throw new Error('migration falhou');
        },
      }),
    ).toThrow(/aplicar migrations.*migration falhou/);
    expect(executadas).toEqual([
      'remover banco local',
      'subir PostgreSQL local',
      'aplicar migrations',
    ]);
  });
});
