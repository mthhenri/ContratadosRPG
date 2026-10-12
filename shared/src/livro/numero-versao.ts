import { TipoLivroVersaoSituacaoEnum as Situacao } from "../enums/tipo-livro-versao-situacao.enum";

/** O que o sugeridor precisa de cada versão já publicada ou em rascunho. */
export interface LivroVersaoNumeroEntrada {
  readonly numero: string;
  readonly situacao: Situacao;
  /** Instante da publicação (texto ISO); decide qual é a mais recente. */
  readonly publicacaoData: string;
}

const NUMERO_PADRAO = /^(\d+)\.(\d+)\.(\d+)$/;

/** Número da primeira versão publicada de um livro. */
export const PRIMEIRO_NUMERO_VERSAO = "1.0.0";

/**
 * Número sugerido para a próxima **versão publicada**: o patch da última publicada mais um (`4.1.4` → `4.1.5`).
 * Rascunhos não contam. Sem versão publicada, é a primeira (`1.0.0`). Se o número da última publicada não segue
 * `X.Y.Z`, não há como somar: devolve texto vazio e o autor digita o número.
 */
export function sugerirNumeroVersao(versoes: readonly LivroVersaoNumeroEntrada[]): string {
  const publicadas = versoes
    .filter((versao) => versao.situacao === Situacao.PUBLICADA)
    .sort((a, b) => b.publicacaoData.localeCompare(a.publicacaoData));
  const ultima = publicadas[0];
  if (!ultima) return PRIMEIRO_NUMERO_VERSAO;
  const partes = NUMERO_PADRAO.exec(ultima.numero.trim());
  if (!partes) return "";
  return `${partes[1]}.${partes[2]}.${Number(partes[3]) + 1}`;
}
