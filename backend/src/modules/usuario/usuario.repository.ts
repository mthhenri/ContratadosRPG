import { Inject, Injectable } from '@nestjs/common';
import type { Knex } from 'knex';
import type {
  UsuarioCriadoDto,
  UsuarioAdminAtivoContarDto,
  UsuarioExcluirDto,
  UsuarioInternoCriarDto,
  UsuarioInternoRecuperadoDto,
  UsuarioListarDto,
  UsuarioListadosDto,
  UsuarioLoginRecuperarDto,
  UsuarioPerfilAlteradoDto,
  UsuarioPerfilInternoAlterarDto,
  UsuarioRecuperarDto,
  UsuarioReativadoDto,
  UsuarioReativarDto,
  UsuarioSenhaInternoAlterarDto,
  UsuarioSessaoDto,
  UsuarioSessaoRecuperarDto,
  UsuarioTipoAlteradoDto,
  UsuarioTipoAlterarDto,
} from '@contratados-rpg/shared/dtos/usuario';
import { TipoUsuarioEnum, UsuarioSituacaoEnum } from '@contratados-rpg/shared/enums';
import { BaseRepository } from '../../core/base/base.repository';
import { KNEX_CONNECTION } from '../../database/database.provider';

/**
 * Repositório do módulo `usuario` — SQL bruto only, sem lógica de negócio (SYSTEM.SPEC
 * §7.1). Dono das queries da tabela `usuario`: o módulo `autenticacao` as consome pela
 * service, nunca reimplementa (proibição #23). Todo SELECT filtra `is_deleted = false`.
 */
@Injectable()
export class UsuarioRepository extends BaseRepository {
  constructor(@Inject(KNEX_CONNECTION) conexao: Knex) {
    super(conexao, 'usuario');
  }

  /** Lista contas ativas ou excluídas com filtros administrativos e paginação padrão. */
  async listar(dto: UsuarioListarDto): Promise<UsuarioListadosDto> {
    const colunasOrdenacao: Record<string, string> = {
      id: 'usuario.id',
      login: 'usuario.login',
      nome: 'usuario.nome',
      tipo: 'tipo_usuario.codigo',
    };
    const ordenarPor = colunasOrdenacao[dto.ordenarPor] ?? colunasOrdenacao.nome;
    const direcao = dto.direcao === 'DESC' ? 'DESC' : 'ASC';
    const filtros: string[] = [];
    const parametrosSql: Record<string, unknown> = {};
    const situacao = dto.situacao ??
      (dto.apenasExcluidos ? UsuarioSituacaoEnum.EXCLUIDOS : UsuarioSituacaoEnum.ATIVOS);
    if (situacao !== UsuarioSituacaoEnum.TODOS) {
      filtros.push('usuario.is_deleted = :isDeleted');
      parametrosSql.isDeleted = situacao === UsuarioSituacaoEnum.EXCLUIDOS;
    }

    if (dto.busca) {
      filtros.push('(usuario.login ILIKE :busca OR usuario.nome ILIKE :busca)');
      parametrosSql.busca = `%${dto.busca}%`;
    }

    if (dto.login) {
      filtros.push('usuario.login ILIKE :login');
      parametrosSql.login = `%${dto.login}%`;
    }
    if (dto.nome) {
      filtros.push('usuario.nome ILIKE :nome');
      parametrosSql.nome = `%${dto.nome}%`;
    }
    if (dto.tipo) {
      filtros.push('tipo_usuario.codigo = :tipo');
      parametrosSql.tipo = dto.tipo;
    }

    const juncoesEFiltros = `FROM usuario
      JOIN tipo_usuario ON tipo_usuario.id = usuario.tipo_usuario_id
        AND tipo_usuario.is_deleted = false
      ${filtros.length ? `WHERE ${filtros.join(' AND ')}` : ''}`;

    return this.executarConsultaPaginada({
      sqlSelect: `SELECT usuario.id, usuario.login, usuario.nome,
                         tipo_usuario.codigo AS tipo,
                         tipo_usuario.descricao AS "tipoDescricao",
                         usuario.is_deleted AS "isDeleted"
                  ${juncoesEFiltros}`,
      sqlContagem: `SELECT COUNT(*) AS total ${juncoesEFiltros}`,
      parametrosSql,
      pagina: dto.pagina,
      itensPorPagina: dto.itensPorPagina,
      ordenarPor,
      direcao,
      allRows: dto.allRows,
    });
  }

  /**
   * Insere um novo usuário e retorna seus dados públicos (sem a senha). A `senha` recebida
   * já é o **hash bcrypt** (encriptado na service). Segue o padrão `INSERT ... SELECT ...
   * RETURNING` com BaseEntity explícita, sem `VALUES` e sem `DEFAULT` (§10.2.6/§10.2.8).
   */
  async criarUsuario(dto: UsuarioInternoCriarDto): Promise<UsuarioCriadoDto> {
    const [usuarioCriado] = await this.executarConsulta<UsuarioCriadoDto>(
      `INSERT INTO usuario (login, senha, nome, tipo_usuario_id, token_versao, created_date, updated_date, is_deleted)
       SELECT :login, :senha, :nome, tipo_usuario.id, 1, NOW(), NOW(), false
       FROM tipo_usuario
       WHERE tipo_usuario.codigo = :tipo AND tipo_usuario.is_deleted = false
       RETURNING id, login, nome`,
      { login: dto.login, senha: dto.senha, nome: dto.nome, tipo: dto.tipo },
    );
    return usuarioCriado;
  }

  /**
   * Recupera o usuário ativo com o `login` informado (ou `null`). Retorna o **hash** da
   * senha para o `bcrypt.compare` da service; alimenta tanto o login quanto a validação de
   * duplicidade no registro.
   */
  async recuperarPorLogin(
    dto: UsuarioLoginRecuperarDto,
  ): Promise<UsuarioInternoRecuperadoDto | null> {
    const [usuarioEncontrado] = await this.executarConsulta<UsuarioInternoRecuperadoDto>(
      `SELECT usuario.id, usuario.login, usuario.senha, usuario.nome,
              tipo_usuario.codigo AS tipo,
              usuario.token_versao AS "tokenVersao"
       FROM usuario
       JOIN tipo_usuario ON tipo_usuario.id = usuario.tipo_usuario_id
         AND tipo_usuario.is_deleted = false
       WHERE usuario.login = :login AND usuario.is_deleted = false`,
      { login: dto.login },
    );
    return usuarioEncontrado ?? null;
  }

  /**
   * Recupera o usuário ativo pelo `id` (ou `null`). Carrega o **hash** da senha — a service
   * o usa para projetar o perfil (sem senha) e para o `bcrypt.compare` da troca de senha.
   */
  async recuperarPorId(
    dto: UsuarioRecuperarDto,
  ): Promise<UsuarioInternoRecuperadoDto | null> {
    const [usuarioEncontrado] = await this.executarConsulta<UsuarioInternoRecuperadoDto>(
      `SELECT usuario.id, usuario.login, usuario.senha, usuario.nome,
              tipo_usuario.codigo AS tipo,
              usuario.token_versao AS "tokenVersao"
       FROM usuario
       JOIN tipo_usuario ON tipo_usuario.id = usuario.tipo_usuario_id
         AND tipo_usuario.is_deleted = false
       WHERE usuario.id = :id AND usuario.is_deleted = false`,
      { id: dto.id },
    );
    return usuarioEncontrado ?? null;
  }

  /** Consulta leve e atual da sessão; inclui conta excluída para permitir sua revogação. */
  async recuperarSessao(dto: UsuarioSessaoRecuperarDto): Promise<UsuarioSessaoDto | null> {
    const [sessao] = await this.executarConsulta<UsuarioSessaoDto>(
      `SELECT tipo_usuario.codigo AS tipo,
              usuario.token_versao AS "tokenVersao",
              usuario.is_deleted AS "isDeleted"
       FROM usuario
       JOIN tipo_usuario ON tipo_usuario.id = usuario.tipo_usuario_id
         AND tipo_usuario.is_deleted = false
       WHERE usuario.id = :id`,
      { id: dto.id },
    );
    return sessao ?? null;
  }

  /**
   * Altera a coluna `senha` do usuário. A `senha` recebida já é o **hash bcrypt** (encriptado
   * na service). Só toca usuário ativo (`WHERE is_deleted = false`), sem `DEFAULT`.
   */
  async alterarSenha(dto: UsuarioSenhaInternoAlterarDto): Promise<void> {
    await this.executarComando(
      `UPDATE usuario
       SET senha = :senha, updated_date = NOW()
       WHERE id = :id AND is_deleted = false`,
      { id: dto.id, senha: dto.senha },
    );
  }

  /**
   * Altera os dados de perfil (`nome`, `login`) do usuário e retorna os dados públicos —
   * **sem** a senha. A unicidade do `login` é validada na service (via `recuperarPorLogin`)
   * antes de chamar. Só toca usuário ativo (`WHERE is_deleted = false`), sem `DEFAULT`.
   */
  async alterarPerfil(dto: UsuarioPerfilInternoAlterarDto): Promise<UsuarioPerfilAlteradoDto> {
    const [usuarioAlterado] = await this.executarConsulta<UsuarioPerfilAlteradoDto>(
      `UPDATE usuario
       SET nome = :nome, login = :login, updated_date = NOW()
       WHERE id = :id AND is_deleted = false
       RETURNING id, login, nome`,
      { id: dto.id, nome: dto.nome, login: dto.login },
    );
    return usuarioAlterado;
  }

  /** Exclui a própria conta via soft delete (nunca `DELETE` físico — proibição #14). */
  async excluirConta(dto: UsuarioExcluirDto): Promise<void> {
    await this.executarSoftDelete(dto.id);
  }

  /** Reverte o soft delete de uma conta e preserva seus dados públicos. */
  async reativar(dto: UsuarioReativarDto): Promise<UsuarioReativadoDto> {
    const [usuarioReativado] = await this.executarConsulta<UsuarioReativadoDto>(
      `UPDATE usuario
       SET is_deleted = false, deleted_date = NULL, updated_date = NOW()
       WHERE id = :id AND is_deleted = true
       RETURNING id, login, nome`,
      { id: dto.id },
    );
    return usuarioReativado;
  }

  /** Altera o tipo traduzindo o código público para a referência relacional. */
  async alterarTipo(dto: UsuarioTipoAlterarDto): Promise<UsuarioTipoAlteradoDto> {
    const [usuarioAlterado] = await this.executarConsulta<UsuarioTipoAlteradoDto>(
      `UPDATE usuario
       SET tipo_usuario_id = tipo_usuario.id, updated_date = NOW()
       FROM tipo_usuario
       WHERE usuario.id = :id
         AND usuario.is_deleted = false
         AND tipo_usuario.codigo = :tipo
         AND tipo_usuario.is_deleted = false
       RETURNING usuario.id, usuario.login, usuario.nome,
                 tipo_usuario.codigo AS tipo,
                 tipo_usuario.descricao AS "tipoDescricao"`,
      { id: dto.id, tipo: dto.tipo },
    );
    return usuarioAlterado;
  }

  /** Revoga tokens emitidos incrementando a versão persistida da conta. */
  async incrementarTokenVersao(dto: UsuarioRecuperarDto): Promise<void> {
    await this.executarComando(
      `UPDATE usuario
       SET token_versao = token_versao + 1, updated_date = NOW()
       WHERE id = :id AND is_deleted = false`,
      { id: dto.id },
    );
  }

  /** Conta administradores ativos, opcionalmente desconsiderando a conta alvo. */
  async contarAdminsAtivos(dto: UsuarioAdminAtivoContarDto): Promise<number> {
    const filtroAlvo = dto.idExcluido === undefined ? '' : ' AND usuario.id <> :idExcluido';
    const parametrosSql: Record<string, unknown> = { tipoAdmin: TipoUsuarioEnum.ADMIN };
    if (dto.idExcluido !== undefined) {
      parametrosSql.idExcluido = dto.idExcluido;
    }
    const [resultado] = await this.executarConsulta<{ total: string }>(
      `SELECT COUNT(*) AS total
       FROM usuario
       JOIN tipo_usuario ON tipo_usuario.id = usuario.tipo_usuario_id
         AND tipo_usuario.is_deleted = false
       WHERE usuario.is_deleted = false
         AND tipo_usuario.codigo = :tipoAdmin${filtroAlvo}`,
      parametrosSql,
    );
    return Number(resultado.total);
  }
}
