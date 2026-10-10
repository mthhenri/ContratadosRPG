import { Inject, Injectable } from "@nestjs/common";
import type { Knex } from "knex";
import type {
  LivroCodigoRecuperarDto,
  LivroInternoCriarDto,
  LivroResumoDto,
} from "@contratados-rpg/shared/dtos/livro";
import { BaseRepository } from "../../core/base/base.repository";
import { KNEX_CONNECTION } from "../../database/database.provider";

/**
 * Repositório de `livro` (m11-02) — SQL bruto only. Dono das queries da tabela `livro`; as peças e
 * as fotografias de cada livro são dos repositórios `RegraPecaRepository` e
 * `LivroVersaoRepository`.
 */
@Injectable()
export class LivroRepository extends BaseRepository {
  constructor(@Inject(KNEX_CONNECTION) conexao: Knex) {
    super(conexao, "livro");
  }

  /** Todos os livros ativos, na ordem de exibição. */
  async listarLivros(): Promise<LivroResumoDto[]> {
    return this.executarConsulta<LivroResumoDto>(
      `SELECT livro.id, livro.codigo, livro.titulo, livro.ordem
       FROM livro
       WHERE livro.is_deleted = false
       ORDER BY livro.ordem ASC, livro.id ASC`,
    );
  }

  /** Livro pelo `codigo` da URL, ou `null` quando não existe/está excluído. */
  async recuperarLivro(dto: LivroCodigoRecuperarDto): Promise<LivroResumoDto | null> {
    const [livroEncontrado] = await this.executarConsulta<LivroResumoDto>(
      `SELECT livro.id, livro.codigo, livro.titulo, livro.ordem
       FROM livro
       WHERE livro.codigo = :codigo AND livro.is_deleted = false`,
      { codigo: dto.codigo },
    );
    return livroEncontrado ?? null;
  }

  /** Cria o livro; `codigo` repetido entre livros ativos é recusado por `uix_livro_codigo_ativo`. */
  async criarLivro(dto: LivroInternoCriarDto): Promise<LivroResumoDto> {
    const [livroCriado] = await this.executarConsulta<LivroResumoDto>(
      `INSERT INTO livro (codigo, titulo, ordem, created_date, updated_date, is_deleted)
       SELECT :codigo, :titulo, :ordem, NOW(), NOW(), false
       RETURNING id, codigo, titulo, ordem`,
      { codigo: dto.codigo, titulo: dto.titulo, ordem: dto.ordem },
    );
    return livroCriado;
  }
}
