import { resolve } from 'node:path';
import { config as carregarVariaveisDeAmbiente } from 'dotenv';
import knex from 'knex';
import { ConfigService } from '../../src/config/config.service';
import {
  ArmazenamentoPastaEnum,
  criarArmazenamentoProvedor,
  type ArmazenamentoImagemListada,
  type ArmazenamentoProvedor,
} from '../../src/core/armazenamento';

/**
 * Faxina de imagens órfãs (I-038): apaga do armazenamento (R2 em `ARMAZENAMENTO_PROVEDOR=r2`, disco
 * local em `local`) as imagens de `AGENTES`/`DOCUMENTOS` que nenhuma linha viva referencia. O soft
 * delete mantém `imagem_url` e o arquivo — a carência (padrão 30 dias, pela data de gravação) deixa
 * a remoção recuperável antes de o arquivo sumir. Simula por padrão; `PATCHNOTES` nunca é tocada.
 * Uso: `npm run armazenamento:faxinar --workspace=backend -- [--apagar] [--carencia-dias=30]`.
 */

const PASTAS_VARRIDAS = [ArmazenamentoPastaEnum.AGENTES, ArmazenamentoPastaEnum.DOCUMENTOS];
const CARENCIA_DIAS_PADRAO = 30;
const MILISSEGUNDOS_POR_DIA = 24 * 60 * 60 * 1000;

export interface FaxinaDecisao {
  readonly orfas: readonly string[];
  readonly emCarencia: readonly string[];
  readonly referenciadas: number;
}

/**
 * Decide o destino de cada imagem listada: referenciada por linha viva fica; órfã dentro da carência
 * fica (recuperável); órfã fora dela é apagável. Sem nenhuma referência viva mas com arquivos, aborta:
 * é o sinal de banco errado ou vazio, e apagar tudo seria o pior desfecho.
 */
export function decidirFaxina(dto: {
  readonly imagens: readonly ArmazenamentoImagemListada[];
  readonly referenciados: ReadonlySet<string>;
  readonly carenciaDias: number;
  readonly agora: Date;
}): FaxinaDecisao {
  if (dto.referenciados.size === 0 && dto.imagens.length > 0) {
    throw new Error(
      'Nenhuma imagem referenciada no banco, mas há arquivos no armazenamento: confira o banco apontado antes de apagar.',
    );
  }
  const limite = dto.agora.getTime() - dto.carenciaDias * MILISSEGUNDOS_POR_DIA;
  const orfas: string[] = [];
  const emCarencia: string[] = [];
  let referenciadas = 0;
  for (const imagem of dto.imagens) {
    if (dto.referenciados.has(imagem.caminho)) {
      referenciadas += 1;
    } else if (imagem.modificadoEm.getTime() > limite) {
      emCarencia.push(imagem.caminho);
    } else {
      orfas.push(imagem.caminho);
    }
  }
  return { orfas, emCarencia, referenciadas };
}

export async function faxinarImagens(dto: {
  readonly armazenamento: ArmazenamentoProvedor;
  readonly referenciados: ReadonlySet<string>;
  readonly carenciaDias: number;
  readonly agora: Date;
  readonly apagar: boolean;
}): Promise<FaxinaDecisao> {
  const listas = await Promise.all(
    PASTAS_VARRIDAS.map((pasta) => dto.armazenamento.listarImagens({ pasta })),
  );
  const decisao = decidirFaxina({
    imagens: listas.flat(),
    referenciados: dto.referenciados,
    carenciaDias: dto.carenciaDias,
    agora: dto.agora,
  });
  if (dto.apagar) {
    for (const caminho of decisao.orfas) {
      await dto.armazenamento.excluirImagem({ caminho });
    }
  }
  return decisao;
}

export function interpretarCarenciaDias(argumentos: readonly string[]): number {
  const argumento = argumentos.find((item) => item.startsWith('--carencia-dias='));
  if (!argumento) {
    return CARENCIA_DIAS_PADRAO;
  }
  const dias = Number(argumento.slice('--carencia-dias='.length));
  if (!Number.isInteger(dias) || dias < 0) {
    throw new Error('--carencia-dias deve ser um inteiro maior ou igual a zero.');
  }
  return dias;
}

export async function main(argumentos: readonly string[]): Promise<void> {
  const apagar = argumentos.includes('--apagar');
  const carenciaDias = interpretarCarenciaDias(argumentos);

  carregarVariaveisDeAmbiente({ path: resolve(__dirname, '..', '..', '..', '.env') });
  const configuracao = new ConfigService().obterConfiguracaoArmazenamento();
  const destino = configuracao.provedor === 'r2' ? `R2 (bucket ${configuracao.r2Bucket})` : 'disco local (backend/uploads)';
  console.log(`${apagar ? '' : '[simulação] '}Destino: ${destino}; carência: ${carenciaDias} dia(s)`);

  const conexao = knex({
    client: 'pg',
    connection: {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      database: process.env.DB_NOME,
      user: process.env.DB_USUARIO,
      password: process.env.DB_SENHA,
    },
  });
  try {
    const linhas = await conexao.raw<{ rows: { caminho: string }[] }>(
      `SELECT imagem_url AS caminho FROM ficha WHERE is_deleted = false AND imagem_url IS NOT NULL
       UNION
       SELECT imagem_url_avulso FROM encontro_combatente WHERE is_deleted = false AND imagem_url_avulso IS NOT NULL
       UNION
       SELECT imagem_url FROM documento WHERE is_deleted = false AND imagem_url IS NOT NULL`,
    );
    const decisao = await faxinarImagens({
      armazenamento: criarArmazenamentoProvedor(configuracao),
      referenciados: new Set(linhas.rows.map((linha) => linha.caminho)),
      carenciaDias,
      agora: new Date(),
      apagar,
    });
    console.log(`Referenciadas: ${decisao.referenciadas}; em carência: ${decisao.emCarencia.length}`);
    console.log(`${apagar ? 'Apagadas' : 'Apagaria'} (${decisao.orfas.length}):`);
    decisao.orfas.forEach((caminho) => console.log(`  ${caminho}`));
  } finally {
    await conexao.destroy();
  }
}

if (typeof require !== 'undefined' && require.main === module) {
  void main(process.argv.slice(2)).catch((erro: unknown) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exit(1);
  });
}
