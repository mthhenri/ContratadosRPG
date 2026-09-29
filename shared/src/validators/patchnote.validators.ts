/**
 * Formato e limites público dos patchnotes (pn-03), compartilhados por quem publica (script), quem
 * serve (backend) e quem exibe (frontend). A versão segue SemVer simples `X.Y.Z`, sem pré-lançamento.
 */
export const PATCHNOTE_VERSAO_PADRAO = /^\d+\.\d+\.\d+$/;
export const PATCHNOTE_DATA_PADRAO = /^\d{4}-\d{2}-\d{2}$/;
export const PATCHNOTE_TITULO_MAXIMO = 120;
export const PATCHNOTE_CONTEUDO_MAXIMO = 50_000;

/** Se o texto é uma versão `X.Y.Z` — a única forma que pode virar nome de arquivo no armazenamento. */
export function ehVersaoPatchnoteValida(versao: string): boolean {
  return PATCHNOTE_VERSAO_PADRAO.test(versao);
}

/**
 * Compara duas versões `X.Y.Z` numericamente (`1.10.0` > `1.9.0`); negativo se `a < b`. Só aceita
 * versões válidas — quem chama valida antes.
 */
export function compararVersoesPatchnote(a: string, b: string): number {
  const partesA = a.split('.').map(Number);
  const partesB = b.split('.').map(Number);
  for (let indice = 0; indice < 3; indice += 1) {
    const diferenca = partesA[indice] - partesB[indice];
    if (diferenca !== 0) {
      return diferenca;
    }
  }
  return 0;
}
