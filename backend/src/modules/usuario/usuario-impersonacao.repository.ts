import { Inject, Injectable } from '@nestjs/common';
import type { Knex } from 'knex';
import type { UsuarioImpersonacaoInternoRegistrarDto } from '@contratados-rpg/shared/dtos/usuario';
import { BaseRepository } from '../../core/base/base.repository';
import { KNEX_CONNECTION } from '../../database/database.provider';

/** Persistência append-only da auditoria de impersonação administrativa. */
@Injectable()
export class UsuarioImpersonacaoRepository extends BaseRepository {
  constructor(@Inject(KNEX_CONNECTION) conexao: Knex) {
    super(conexao, 'usuario_impersonacao');
  }

  async registrar(dto: UsuarioImpersonacaoInternoRegistrarDto): Promise<void> {
    await this.executarComando(
      `INSERT INTO usuario_impersonacao
         (admin_origem_id, usuario_alvo_id, impersonacao_data,
          created_date, updated_date, is_deleted)
       SELECT :adminOrigemId, :usuarioAlvoId, NOW(), NOW(), NOW(), false`,
      { adminOrigemId: dto.adminOrigemId, usuarioAlvoId: dto.usuarioAlvoId },
    );
  }
}
