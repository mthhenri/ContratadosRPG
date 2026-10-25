import { LivroVersaoConteudoDto } from "./livro-peca.dtos";

/** Formato portátil dos dois livros publicados; independente da versão editorial. */
export const LIVRO_PACOTE_FORMATO_ATUAL = 1;

/** Publicação portátil: não inclui ids relacionais, autoria ou cópia de trabalho. */
export interface LivroPacoteItemDto {
  readonly codigo: string;
  readonly titulo: string;
  readonly ordem: number;
  readonly numero: string;
  readonly formato: number;
  readonly publicacaoData: string;
  readonly nota: string | null;
  readonly conteudo: LivroVersaoConteudoDto;
}

/** SHA-256 do JSON canônico sem sha256: integridade, sem assinatura de procedência. */
export interface LivroPacoteDto {
  readonly formato: number;
  readonly exportacaoData: string;
  readonly livros: readonly LivroPacoteItemDto[];
  readonly sha256: string;
}
