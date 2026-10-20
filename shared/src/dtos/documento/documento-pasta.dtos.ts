import type { TipoDocumentoOrganizacaoEnum } from '../../enums';

/**
 * DTOs das pastas da Biblioteca. Cada cargo (mestre; jogadores+espectadores) tem a sua organização,
 * independente da outra: o cargo do usuário na campanha escolhe qual ele lê e escreve, e nenhum
 * DTO carrega a organização do outro. Documentos nunca ganham coluna de pasta — o vínculo vive em
 * tabela própria. Limites em `validators/documento.validators.ts`.
 */

/** Uma pasta da organização — value object de `DocumentoOrganizacaoRecuperadaDto`. */
export interface DocumentoPastaDto {
  readonly id: number;
  readonly nome: string;
  /** Pasta-mãe, ou `null` na raiz. */
  readonly pastaMaeId: number | null;
  /** Posição entre as pastas irmãs. */
  readonly ordem: number;
}

/** Em que pasta está um documento e em que posição — value object da organização. */
export interface DocumentoPastaVinculoDto {
  readonly documentoId: number;
  readonly pastaId: number;
  /** Posição entre os documentos da mesma pasta. */
  readonly ordem: number;
}

/** Entrada da organização do cargo do usuário na campanha — o `campanhaId` vem da rota. */
export interface DocumentoOrganizacaoRecuperarDto {
  readonly campanhaId: number;
}

/**
 * Organização em pastas que o usuário enxerga. Documento sem vínculo está na raiz. `editavel` é
 * `false` para o espectador, que só navega.
 */
export interface DocumentoOrganizacaoRecuperadaDto {
  readonly campanhaId: number;
  readonly organizacao: TipoDocumentoOrganizacaoEnum;
  readonly editavel: boolean;
  readonly pastas: readonly DocumentoPastaDto[];
  readonly vinculos: readonly DocumentoPastaVinculoDto[];
}

/** Entrada da criação de pasta — o `campanhaId` vem da rota. `pastaMaeId` `null` cria na raiz. */
export interface DocumentoPastaCriarDto {
  readonly campanhaId: number;
  readonly nome: string;
  readonly pastaMaeId: number | null;
}

/** Saída da criação de pasta. */
export interface DocumentoPastaCriadaDto {
  readonly id: number;
  readonly campanhaId: number;
  readonly nome: string;
  readonly pastaMaeId: number | null;
  readonly ordem: number;
}

/** Entrada de renomear a pasta — o `id` vem da rota. */
export interface DocumentoPastaAlterarDto {
  readonly id: number;
  readonly nome: string;
}

/** Saída de renomear a pasta. */
export interface DocumentoPastaAlteradaDto {
  readonly id: number;
  readonly campanhaId: number;
  readonly nome: string;
  readonly pastaMaeId: number | null;
  readonly ordem: number;
}

/**
 * Entrada de mover/reposicionar a pasta — o `id` vem da rota. `pastaMaeId` é o destino (`null` =
 * raiz); `posicao` é o índice (0-based) entre as irmãs de destino, e omitida manda para o fim.
 */
export interface DocumentoPastaMoverDto {
  readonly id: number;
  readonly pastaMaeId: number | null;
  readonly posicao?: number;
}

/** Saída de mover a pasta. */
export interface DocumentoPastaMovidaDto {
  readonly id: number;
  readonly campanhaId: number;
  readonly nome: string;
  readonly pastaMaeId: number | null;
  readonly ordem: number;
}

/**
 * Entrada de excluir a pasta — o `id` vem da rota. Subpastas e documentos voltam à raiz da mesma
 * organização; a exclusão nunca é bloqueada.
 */
export interface DocumentoPastaRemoverDto {
  readonly id: number;
}

/**
 * Entrada de colocar um documento numa pasta — o `id` do documento vem da rota. `pastaId` `null`
 * devolve o documento à raiz; `posicao` é o índice (0-based) na pasta de destino, omitida = fim.
 */
export interface DocumentoPastaVinculoAlterarDto {
  readonly id: number;
  readonly pastaId: number | null;
  readonly posicao?: number;
}

/** Saída de colocar um documento numa pasta. */
export interface DocumentoPastaVinculoAlteradoDto {
  readonly documentoId: number;
  readonly pastaId: number | null;
  readonly ordem: number | null;
}

/**
 * Payload de `documento:organizacao-alterada`. Dataless: só avisa **que** a organização do cargo
 * mudou — quem precisa dela a busca por REST. `organizacao` `MESTRE` só chega às sessões do mestre;
 * `JOGADOR`, só a jogadores e espectadores.
 */
export interface DocumentoOrganizacaoAlteradaDto {
  readonly campanhaId: number;
  readonly organizacao: TipoDocumentoOrganizacaoEnum;
}
