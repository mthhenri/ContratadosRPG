import { TipoLivroVersaoSituacaoEnum } from "../../enums/tipo-livro-versao-situacao.enum";
import { TipoRegraPecaEnum } from "../../enums/tipo-regra-peca.enum";
import { LivroPecaDadosPorTipo, LivroVersaoConteudoDto } from "./livro-peca.dtos";

/** Livro de regras (Sistema, Guia do Mestre, expansões). `codigo` vira a URL `/regras/<codigo>`. */
export interface LivroResumoDto {
  readonly id: number;
  readonly codigo: string;
  readonly titulo: string;
  readonly ordem: number;
}

export interface LivroCodigoRecuperarDto {
  readonly codigo: string;
}

export interface LivroInternoCriarDto {
  readonly codigo: string;
  readonly titulo: string;
  readonly ordem: number;
}

/** Peça da cópia de trabalho (`regra_peca`), com o `dados` completo. */
export interface RegraPecaRecuperadaDto {
  readonly id: number;
  readonly livroId: number;
  readonly pecaPaiId: number | null;
  readonly tipo: TipoRegraPecaEnum;
  readonly identificador: string;
  readonly ancora: string | null;
  readonly ordem: number;
  readonly dados: LivroPecaDadosPorTipo[TipoRegraPecaEnum];
  readonly revisao: number;
}

export interface RegraPecaRecuperarDto {
  readonly id: number;
}

export interface RegraPecaIdentificadorRecuperarDto {
  readonly identificador: string;
}

export interface RegraPecaArvoreListarDto {
  readonly livroId: number;
}

/** Linha da árvore do livro (plana, ordenada por pai e `ordem`); a service monta o aninhamento. */
export interface RegraPecaArvoreItemDto {
  readonly id: number;
  readonly livroId: number;
  readonly pecaPaiId: number | null;
  readonly tipo: TipoRegraPecaEnum;
  readonly identificador: string;
  readonly ancora: string | null;
  readonly ordem: number;
  readonly dados: LivroPecaDadosPorTipo[TipoRegraPecaEnum];
  readonly revisao: number;
}

export interface RegraPecaInternoCriarDto {
  readonly livroId: number;
  readonly pecaPaiId: number | null;
  readonly tipo: TipoRegraPecaEnum;
  readonly identificador: string;
  readonly ancora: string | null;
  readonly ordem: number;
  readonly dados: LivroPecaDadosPorTipo[TipoRegraPecaEnum];
}

/** Altera o `dados` se `revisao` for a do banco; incrementa a revisão. */
export interface RegraPecaDadosInternoAlterarDto {
  readonly id: number;
  readonly dados: LivroPecaDadosPorTipo[TipoRegraPecaEnum];
  readonly revisao: number;
}

/** Altera a âncora se `revisao` for a do banco; incrementa a revisão. */
export interface RegraPecaAncoraInternoAlterarDto {
  readonly id: number;
  readonly ancora: string | null;
  readonly revisao: number;
}

/** Move a peça (novo pai e nova `ordem`) se `revisao` for a do banco; incrementa a revisão. */
export interface RegraPecaPosicaoInternoAlterarDto {
  readonly id: number;
  readonly pecaPaiId: number | null;
  readonly ordem: number;
  readonly revisao: number;
}

/** Exclui (soft) a peça e todas as descendentes, se `revisao` for a do banco. */
export interface RegraPecaRemoverDto {
  readonly id: number;
  readonly revisao: number;
}

export interface RegraPecaAncoraAntigaInternoCriarDto {
  readonly regraPecaId: number;
  readonly ancora: string;
}

export interface RegraPecaAncorasAntigasListarDto {
  readonly livroId: number;
}

/** Âncora que a peça já teve, com o identificador da peça a que hoje ela leva. */
export interface RegraPecaAncoraAntigaResumoDto {
  readonly regraPecaId: number;
  readonly identificador: string;
  readonly ancora: string;
}

/** Fotografia completa de um livro (`livro_versao`), com o conteúdo. */
export interface LivroVersaoRecuperadaDto {
  readonly id: number;
  readonly livroId: number;
  readonly situacao: TipoLivroVersaoSituacaoEnum;
  readonly numero: string;
  readonly formato: number;
  readonly conteudo: LivroVersaoConteudoDto;
  /** Instante da publicação, texto ISO em UTC. */
  readonly publicacaoData: string;
  readonly usuarioId: number;
  readonly nota: string | null;
}

export interface LivroVersaoRecuperarDto {
  readonly id: number;
}

/** A fotografia mais recente de um livro numa situação. */
export interface LivroVersaoAtualRecuperarDto {
  readonly livroId: number;
  readonly situacao: TipoLivroVersaoSituacaoEnum;
}

export interface LivroVersoesListarDto {
  readonly livroId: number;
}

/** Fotografia sem o conteúdo, para listar o histórico. */
export interface LivroVersaoResumoDto {
  readonly id: number;
  readonly livroId: number;
  readonly situacao: TipoLivroVersaoSituacaoEnum;
  readonly numero: string;
  readonly formato: number;
  readonly publicacaoData: string;
  readonly usuarioId: number;
  readonly nota: string | null;
}

export interface LivroVersaoInternoCriarDto {
  readonly livroId: number;
  readonly situacao: TipoLivroVersaoSituacaoEnum;
  readonly numero: string;
  readonly formato: number;
  readonly conteudo: LivroVersaoConteudoDto;
  readonly usuarioId: number;
  readonly nota: string | null;
}
