/** Menor e maior teto de empilhamentos que a Oficina deixa escolher (o livro vai até ■■■■■). */
export const EMPILHAMENTO_MINIMO = 1;
export const EMPILHAMENTO_MAXIMO = 10;

/**
 * O texto de empilhamento do livro (`■■□□□`): `iniciais` caixas cheias e o resto vazio até `maximo`.
 * Os dois valores são levados aos limites e `iniciais` nunca passa de `maximo`.
 */
export function montarEmpilhamento(iniciais: number, maximo: number): string {
    const teto = Math.min(EMPILHAMENTO_MAXIMO, Math.max(EMPILHAMENTO_MINIMO, Math.round(maximo)));
    const cheias = Math.min(teto, Math.max(EMPILHAMENTO_MINIMO, Math.round(iniciais)));
    return "■".repeat(cheias) + "□".repeat(teto - cheias);
}
