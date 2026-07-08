import { Inject, Injectable } from '@nestjs/common';
import type { Knex } from 'knex';
import type {
  UsuarioCriadoDto,
  UsuarioExcluirDto,
  UsuarioInternoCriarDto,
  UsuarioInternoRecuperadoDto,
  UsuarioLoginRecuperarDto,
  UsuarioPerfilAlteradoDto,
  UsuarioPerfilInternoAlterarDto,
  UsuarioRecuperarDto,
  UsuarioSenhaInternoAlterarDto,
} from '@contratados-rpg/shared/dtos/usuario';
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

  /**
   * Insere um novo usuário e retorna seus dados públicos (sem a senha). A `senha` recebida
   * já é o **hash bcrypt** (encriptado na service). Segue o padrão `INSERT ... SELECT ...
   * RETURNING` com BaseEntity explícita, sem `VALUES` e sem `DEFAULT` (§10.2.6/§10.2.8).
   */
  async criarUsuario(dto: UsuarioInternoCriarDto): Promise<UsuarioCriadoDto> {
    const [usuarioCriado] = await this.executarConsulta<UsuarioCriadoDto>(
      `INSERT INTO usuario (login, senha, nome, created_date, updated_date, is_deleted)
       SELECT :login, :senha, :nome, NOW(), NOW(), false
       RETURNING id, login, nome`,
      { login: dto.login, senha: dto.senha, nome: dto.nome },
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
      `SELECT id, login, senha, nome
       FROM usuario
       WHERE login = :login AND is_deleted = false`,
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
      `SELECT id, login, senha, nome
       FROM usuario
       WHERE id = :id AND is_deleted = false`,
      { id: dto.id },
    );
    return usuarioEncontrado ?? null;
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
}
