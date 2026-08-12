import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { config as carregarVariaveisDeAmbiente } from 'dotenv';
import { validarConfiguracaoResetDev } from './reset-dev.guard';

export interface EtapaResetDev {
  readonly nome: string;
  readonly executavel: string;
  readonly argumentos: readonly string[];
}

export interface DependenciasResetDev {
  readonly ambiente: NodeJS.ProcessEnv;
  readonly npmCliPath: string;
  readonly raizRepositorio: string;
  readonly executar: (etapa: EtapaResetDev, raizRepositorio: string) => void;
}

export function montarEtapasResetDev(npmCliPath: string): readonly EtapaResetDev[] {
  return [
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
      argumentos: [npmCliPath, 'run', 'db:migrate'],
    },
    {
      nome: 'aplicar seed',
      executavel: process.execPath,
      argumentos: [npmCliPath, 'run', 'db:seed:dev'],
    },
  ];
}

export function executarResetDev(dependencias: DependenciasResetDev): void {
  validarConfiguracaoResetDev(dependencias.ambiente);

  for (const etapa of montarEtapasResetDev(dependencias.npmCliPath)) {
    try {
      dependencias.executar(etapa, dependencias.raizRepositorio);
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : String(erro);
      throw new Error(`Falha na etapa ${etapa.nome}: ${mensagem}`, { cause: erro });
    }
  }
}

function executarEtapa(etapa: EtapaResetDev, raizRepositorio: string): void {
  console.log(`[db:reset:dev] ${etapa.nome}...`);
  execFileSync(etapa.executavel, [...etapa.argumentos], {
    cwd: raizRepositorio,
    env: process.env,
    stdio: 'inherit',
  });
  console.log(`[db:reset:dev] ${etapa.nome}: concluído.`);
}

export function main(): void {
  const raizRepositorio = resolve(__dirname, '..', '..', '..');
  carregarVariaveisDeAmbiente({ path: resolve(raizRepositorio, '.env') });
  const npmCliPath = process.env.npm_execpath;
  if (!npmCliPath) {
    throw new Error('Reset recusado: execute o comando pelo npm para localizar o npm-cli.js.');
  }
  console.warn(
    '[db:reset:dev] ATENÇÃO: todo o volume PostgreSQL local deste projeto será apagado sem backup.',
  );
  executarResetDev({
    ambiente: process.env,
    npmCliPath,
    raizRepositorio,
    executar: executarEtapa,
  });
  console.log('[db:reset:dev] Banco local recriado e populado com sucesso.');
}

if (typeof require !== 'undefined' && require.main === module) {
  try {
    main();
  } catch (erro) {
    console.error('[db:reset:dev] Reset interrompido.', erro);
    process.exitCode = 1;
  }
}
