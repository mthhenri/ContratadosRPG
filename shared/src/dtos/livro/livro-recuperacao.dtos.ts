import type { LivroPecaDto, LivroVersaoConteudoDto } from './livro-peca.dtos';

/** Registro local completo; nunca transportado pela API pública. */
export interface LivroRecuperacaoLinhaDto {
  readonly id: number;
  readonly created_date: string;
  readonly updated_date: string;
  readonly is_deleted: boolean;
  readonly deleted_date: string | null;
  readonly codigo: string;
  readonly titulo: string;
  readonly ordem: number;
}

export interface LivroPecaRecuperacaoLinhaDto {
  readonly id: number;
  readonly created_date: string;
  readonly updated_date: string;
  readonly is_deleted: boolean;
  readonly deleted_date: string | null;
  readonly livro_id: number;
  readonly peca_pai_id: number | null;
  readonly tipo_regra_peca_id: number;
  readonly identificador: string;
  readonly ancora: string | null;
  readonly ordem: number;
  readonly dados: LivroPecaDto['dados'];
  readonly revisao: number;
}

export interface LivroAncoraRecuperacaoLinhaDto {
  readonly id: number;
  readonly created_date: string;
  readonly updated_date: string;
  readonly is_deleted: boolean;
  readonly deleted_date: string | null;
  readonly livro_id: number;
  readonly regra_peca_id: number;
  readonly ancora: string;
}

export interface LivroVersaoRecuperacaoLinhaDto {
  readonly id: number;
  readonly created_date: string;
  readonly updated_date: string;
  readonly is_deleted: boolean;
  readonly deleted_date: string | null;
  readonly livro_id: number;
  readonly tipo_livro_versao_situacao_id: number;
  readonly numero: string;
  readonly formato: number;
  readonly conteudo: LivroVersaoConteudoDto;
  readonly publicacao_data: string;
  readonly usuario_id: number;
  readonly nota: string | null;
}

export interface LivroRecuperacaoEstadoDto {
  readonly codigo: string;
  readonly livro: LivroRecuperacaoLinhaDto | null;
  readonly pecas: readonly LivroPecaRecuperacaoLinhaDto[];
  readonly ancoras: readonly LivroAncoraRecuperacaoLinhaDto[];
  readonly versoes: readonly LivroVersaoRecuperacaoLinhaDto[];
}

export interface LivroRecuperacaoAlvoDto {
  readonly host: string;
  readonly porta: number;
  readonly nome: string;
  readonly sistemaIdentificador: string;
  readonly bancoOid: number;
}

export interface LivroRecuperacaoDto {
  readonly formato: number;
  readonly criacaoData: string;
  readonly alvo: LivroRecuperacaoAlvoDto;
  readonly estados: readonly LivroRecuperacaoEstadoDto[];
  readonly sha256: string;
}
