import type { LivroMudancaSituacaoEnum } from "../../enums/livro-comparacao.enum";
import type { LivroCampoAlteradoDto, LivroPosicaoMudancaDto } from "./livro-comparacao.dtos";

/** Metadados públicos de uma publicação oficial, sem autoria interna. */
export interface LivroPublicacaoResumoDto {
  readonly id: number;
  readonly numero: string;
  readonly publicacaoData: string;
  readonly nota: string | null;
}

export interface LivroMudancasPublicadasRecuperarDto {
  readonly codigo: string;
  readonly origemId?: number;
}

/** Uma peça afetada; alteração e movimento compartilham a mesma entrada. */
export interface LivroMudancaPublicadaDto {
  readonly identificador: string;
  readonly situacao: LivroMudancaSituacaoEnum;
  readonly caminho: readonly string[];
  readonly caminhoAnterior: readonly string[] | null;
  readonly antesMarkdown: string | null;
  readonly depoisMarkdown: string | null;
  readonly ancoraAtual: string | null;
  readonly campos: readonly LivroCampoAlteradoDto[];
  /** Localização e ordem antes/depois, inclusive movimento entre irmãs. */
  readonly posicao?: LivroPosicaoMudancaDto | null;
}

export interface LivroMudancasPublicadasDto {
  readonly codigo: string;
  readonly titulo: string;
  /** Mais recente primeiro; número editorial pode se repetir. */
  readonly publicacoes: readonly LivroPublicacaoResumoDto[];
  readonly origem: LivroPublicacaoResumoDto | null;
  readonly atual: LivroPublicacaoResumoDto;
  /** Notas após a origem até a atual, em ordem cronológica. */
  readonly notas: readonly LivroPublicacaoResumoDto[];
  readonly mudancas: readonly LivroMudancaPublicadaDto[];
}
