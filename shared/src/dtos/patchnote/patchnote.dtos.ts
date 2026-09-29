/**
 * DTOs do módulo `patchnote` (pn-03) — as notas de versão públicas do sistema. Não há tabela: o
 * conteúdo vive no R2 (fonte de verdade única) e é lido por `GET /patchnotes`. Formato e limites em
 * `validators/patchnote.validators.ts`.
 */

/** Item do índice de versões — só o que a lista precisa, sem o texto da nota. */
export interface PatchnoteResumoDto {
  readonly versao: string;
  /** Data de publicação da versão, `AAAA-MM-DD`. */
  readonly data: string;
  readonly titulo: string;
}

/**
 * Entrada da recuperação de uma nota. Exceção declarada à regra `{ id: number }`: o patchnote não
 * tem linha nem id, e a versão (`X.Y.Z`) é a chave natural — quem chega pela URL já a fornece.
 */
export interface PatchnoteRecuperarDto {
  readonly versao: string;
}

/** Saída da recuperação — a nota completa, com o Markdown para o leitor renderizar. */
export interface PatchnoteRecuperadoDto {
  readonly versao: string;
  readonly data: string;
  readonly titulo: string;
  readonly conteudoMarkdown: string;
}
