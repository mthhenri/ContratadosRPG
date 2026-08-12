import { resolve } from 'node:path';
import type { FichaJogadorDadosDto } from '@contratados-rpg/shared/dtos/ficha';
import type { TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import * as bcrypt from 'bcrypt';
import { config as carregarVariaveisDeAmbiente } from 'dotenv';
import knex, { type Knex } from 'knex';
import {
  CENARIO_DEV,
  type ChaveCampanhaDev,
  type ChaveUsuarioDev,
  type DefinicaoCampanhaDev,
  type DefinicaoFichaDev,
  type DefinicaoUsuarioDev,
  montarDadosFichaDev,
  SENHA_CONTAS_DEV,
} from './cenario-dev';
import { validarConfiguracaoResetDev } from './reset-dev.guard';

export interface ResumoSeedDev {
  readonly usuarios: number;
  readonly campanhas: number;
  readonly membros: number;
  readonly fichas: number;
}

export interface OperacoesSeedDev {
  garantirUsuario(usuario: DefinicaoUsuarioDev, senhaHash: string | null): Promise<number>;
  garantirCampanha(campanha: DefinicaoCampanhaDev): Promise<number>;
  garantirMembro(
    campanhaId: number,
    usuarioId: number,
    papel: TipoCampanhaMembroPapelEnum,
  ): Promise<void>;
  garantirFicha(
    campanhaId: number,
    usuarioId: number,
    ficha: DefinicaoFichaDev,
    dados: FichaJogadorDadosDto,
  ): Promise<void>;
}

export interface PersistenciaSeedDev {
  executarEmTransacao<T>(operacao: (transacao: OperacoesSeedDev) => Promise<T>): Promise<T>;
}

export async function executarSeedDevComPersistencia(
  persistencia: PersistenciaSeedDev,
  senhaHash: string,
): Promise<ResumoSeedDev> {
  return persistencia.executarEmTransacao(async (transacao) => {
    const usuarios = new Map<ChaveUsuarioDev, number>();
    for (const usuario of CENARIO_DEV.usuarios) {
      const id = await transacao.garantirUsuario(
        usuario,
        usuario.alterarSenha ? senhaHash : null,
      );
      usuarios.set(usuario.chave, id);
    }

    const campanhas = new Map<ChaveCampanhaDev, number>();
    for (const campanha of CENARIO_DEV.campanhas) {
      const id = await transacao.garantirCampanha(campanha);
      campanhas.set(campanha.chave, id);
    }

    for (const membro of CENARIO_DEV.membros) {
      await transacao.garantirMembro(
        obterId(campanhas, membro.campanha),
        obterId(usuarios, membro.usuario),
        membro.papel,
      );
    }

    for (const ficha of CENARIO_DEV.fichas) {
      await transacao.garantirFicha(
        obterId(campanhas, ficha.campanha),
        obterId(usuarios, ficha.usuario),
        ficha,
        montarDadosFichaDev(ficha),
      );
    }

    return {
      usuarios: CENARIO_DEV.usuarios.length,
      campanhas: CENARIO_DEV.campanhas.length,
      membros: CENARIO_DEV.membros.length,
      fichas: CENARIO_DEV.fichas.length,
    };
  });
}

function obterId<Chave extends string>(mapa: Map<Chave, number>, chave: Chave): number {
  const id = mapa.get(chave);
  if (id === undefined) throw new Error(`Fixture inválida: chave não resolvida (${chave}).`);
  return id;
}

interface LinhaId {
  readonly id: number;
}

class OperacoesKnexSeedDev implements OperacoesSeedDev {
  constructor(private readonly transacao: Knex.Transaction) {}

  async garantirUsuario(usuario: DefinicaoUsuarioDev, senhaHash: string | null): Promise<number> {
    const existente = await this.selecionarId(
      `SELECT id FROM usuario WHERE login = :login AND is_deleted = false`,
      { login: usuario.login },
    );
    if (!existente && !usuario.alterarSenha) {
      throw new Error(`Seed recusado: conta obrigatória ${usuario.login} não foi criada pela migration.`);
    }

    if (!existente) {
      await this.transacao.raw(
        `INSERT INTO usuario (login, senha, nome, created_date, updated_date, is_deleted)
         SELECT :login, :senha, :nome, NOW(), NOW(), false
         WHERE NOT EXISTS (
           SELECT 1 FROM usuario WHERE login = :login AND is_deleted = false
         )`,
        { login: usuario.login, senha: senhaHash, nome: usuario.nome },
      );
    }

    if (senhaHash === null) {
      await this.transacao.raw(
        `UPDATE usuario SET nome = :nome, updated_date = NOW()
         WHERE login = :login AND is_deleted = false`,
        { login: usuario.login, nome: usuario.nome },
      );
    } else {
      await this.transacao.raw(
        `UPDATE usuario SET nome = :nome, senha = :senha, updated_date = NOW()
         WHERE login = :login AND is_deleted = false`,
        { login: usuario.login, nome: usuario.nome, senha: senhaHash },
      );
    }

    return this.exigirId(
      await this.selecionarId(
        `SELECT id FROM usuario WHERE login = :login AND is_deleted = false`,
        { login: usuario.login },
      ),
      `usuário ${usuario.login}`,
    );
  }

  async garantirCampanha(campanha: DefinicaoCampanhaDev): Promise<number> {
    await this.transacao.raw(
      `INSERT INTO campanha (nome, descricao, codigo_convite, created_date, updated_date, is_deleted)
       SELECT :nome, :descricao, :codigoConvite, NOW(), NOW(), false
       WHERE NOT EXISTS (
         SELECT 1 FROM campanha WHERE codigo_convite = :codigoConvite AND is_deleted = false
       )`,
      {
        nome: campanha.nome,
        descricao: campanha.descricao,
        codigoConvite: campanha.codigoConvite,
      },
    );
    await this.transacao.raw(
      `UPDATE campanha SET nome = :nome, descricao = :descricao, updated_date = NOW()
       WHERE codigo_convite = :codigoConvite AND is_deleted = false`,
      {
        nome: campanha.nome,
        descricao: campanha.descricao,
        codigoConvite: campanha.codigoConvite,
      },
    );
    return this.exigirId(
      await this.selecionarId(
        `SELECT id FROM campanha WHERE codigo_convite = :codigoConvite AND is_deleted = false`,
        { codigoConvite: campanha.codigoConvite },
      ),
      `campanha ${campanha.codigoConvite}`,
    );
  }

  async garantirMembro(
    campanhaId: number,
    usuarioId: number,
    papel: TipoCampanhaMembroPapelEnum,
  ): Promise<void> {
    const papelId = this.exigirId(
      await this.selecionarId(
        `SELECT id FROM tipo_campanha_membro_papel
         WHERE codigo = :papel AND is_deleted = false`,
        { papel },
      ),
      `papel ${papel}`,
    );
    await this.transacao.raw(
      `INSERT INTO campanha_membro
         (campanha_id, usuario_id, tipo_campanha_membro_papel_id,
          created_date, updated_date, is_deleted)
       SELECT :campanhaId, :usuarioId, :papelId, NOW(), NOW(), false
       WHERE NOT EXISTS (
         SELECT 1 FROM campanha_membro
         WHERE campanha_id = :campanhaId AND usuario_id = :usuarioId AND is_deleted = false
       )`,
      { campanhaId, usuarioId, papelId },
    );
    await this.transacao.raw(
      `UPDATE campanha_membro
       SET tipo_campanha_membro_papel_id = :papelId, updated_date = NOW()
       WHERE campanha_id = :campanhaId AND usuario_id = :usuarioId AND is_deleted = false`,
      { campanhaId, usuarioId, papelId },
    );
  }

  async garantirFicha(
    campanhaId: number,
    usuarioId: number,
    ficha: DefinicaoFichaDev,
    dados: FichaJogadorDadosDto,
  ): Promise<void> {
    const tipoFichaId = this.exigirId(
      await this.selecionarId(
        `SELECT id FROM tipo_ficha WHERE codigo = :tipo AND is_deleted = false`,
        { tipo: ficha.tipo },
      ),
      `tipo de ficha ${ficha.tipo}`,
    );
    const bindings = {
      campanhaId,
      usuarioId,
      tipoFichaId,
      nome: ficha.nome,
      cor: ficha.cor,
      dados: JSON.stringify(dados),
    };
    await this.transacao.raw(
      `INSERT INTO ficha
         (campanha_id, usuario_id, tipo_ficha_id, nome, cor, oculta, dados,
          created_date, updated_date, is_deleted)
       SELECT :campanhaId, :usuarioId, :tipoFichaId, :nome, :cor, false,
              CAST(:dados AS jsonb), NOW(), NOW(), false
       WHERE NOT EXISTS (
         SELECT 1 FROM ficha
         WHERE campanha_id = :campanhaId AND usuario_id = :usuarioId
           AND nome = :nome AND is_deleted = false
       )`,
      bindings,
    );
    await this.transacao.raw(
      `UPDATE ficha
       SET tipo_ficha_id = :tipoFichaId, cor = :cor, oculta = false,
           dados = CAST(:dados AS jsonb), updated_date = NOW()
       WHERE campanha_id = :campanhaId AND usuario_id = :usuarioId
         AND nome = :nome AND is_deleted = false`,
      bindings,
    );
  }

  private async selecionarId(sql: string, bindings: Knex.ValueDict): Promise<number | null> {
    const resultado = await this.transacao.raw<{ rows: LinhaId[] }>(sql, bindings);
    return resultado.rows[0]?.id ?? null;
  }

  private exigirId(id: number | null, descricao: string): number {
    if (id === null) throw new Error(`Seed inválido: não foi possível resolver ${descricao}.`);
    return id;
  }
}

class PersistenciaKnexSeedDev implements PersistenciaSeedDev {
  constructor(private readonly conexao: Knex) {}

  executarEmTransacao<T>(operacao: (transacao: OperacoesSeedDev) => Promise<T>): Promise<T> {
    return this.conexao.transaction((transacao) => operacao(new OperacoesKnexSeedDev(transacao)));
  }
}

export async function executarSeedDev(conexao: Knex): Promise<ResumoSeedDev> {
  const senhaHash = await bcrypt.hash(SENHA_CONTAS_DEV, 10);
  return executarSeedDevComPersistencia(new PersistenciaKnexSeedDev(conexao), senhaHash);
}

export async function main(): Promise<void> {
  carregarVariaveisDeAmbiente({ path: resolve(__dirname, '..', '..', '..', '.env') });
  const configuracao = validarConfiguracaoResetDev(process.env);
  const conexao = knex({
    client: 'pg',
    connection: {
      host: configuracao.host,
      port: configuracao.porta,
      database: configuracao.nome,
      user: configuracao.usuario,
      password: configuracao.senha,
    },
  });

  try {
    const resumo = await executarSeedDev(conexao);
    console.log(
      `[db:seed:dev] ${resumo.usuarios} usuários, ${resumo.campanhas} campanhas, ` +
        `${resumo.membros} membros, ${resumo.fichas} fichas.`,
    );
  } finally {
    await conexao.destroy();
  }
}

if (typeof require !== 'undefined' && require.main === module) {
  void main().catch((erro: unknown) => {
    console.error('[db:seed:dev] Falha ao aplicar fixtures.', erro);
    process.exitCode = 1;
  });
}
