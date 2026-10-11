/** Lê o custo de Energia digitado: inteiro de 0 a 99 ou `X`; qualquer outra coisa é `null`. */
export function lerCustoDigitado(digitado: string): number | "X" | null {
    const texto = digitado.trim();
    if (/^x$/i.test(texto)) return "X";
    if (!/^\d{1,2}$/.test(texto)) return null;
    return Number(texto);
}
