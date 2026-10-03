/**
 * Versões do montador de rolagem em experimento (`montador-rolagem-experimento`, I-041): o **Atual**
 * (`MontadorRolagem`, intocado, linha de base) e as três novas desta pasta. Tipo de UI, sem regra de jogo —
 * some com o experimento, quando o autor escolher o montador final.
 */
export type MontadorVersao = 'ATUAL' | 'ESSENCIAL' | 'COMPLETO' | 'BLOCOS';

/** Opções do seletor, na ordem da spec. */
export const MONTADOR_VERSOES: readonly { readonly valor: MontadorVersao; readonly rotulo: string }[] = [
  { valor: 'ATUAL', rotulo: 'Atual' },
  { valor: 'ESSENCIAL', rotulo: 'Essencial' },
  { valor: 'COMPLETO', rotulo: 'Completo' },
  { valor: 'BLOCOS', rotulo: 'Blocos' },
];

/** Quem nunca escolheu (ou não tem armazenamento) começa no Atual. */
export const MONTADOR_VERSAO_PADRAO: MontadorVersao = 'ATUAL';

/** Lê um valor guardado; qualquer coisa fora das quatro opções volta ao padrão. */
export function resolverMontadorVersao(bruto: string | null | undefined): MontadorVersao {
  return MONTADOR_VERSOES.find((opcao) => opcao.valor === bruto)?.valor ?? MONTADOR_VERSAO_PADRAO;
}

/** Rótulo de uma versão, para o seletor e o subtítulo da janela. */
export function rotuloMontadorVersao(versao: MontadorVersao): string {
  return MONTADOR_VERSOES.find((opcao) => opcao.valor === versao)?.rotulo ?? versao;
}
