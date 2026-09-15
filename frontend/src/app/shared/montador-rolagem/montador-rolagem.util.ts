/**
 * Soma 1 na quantidade do último termo `NdM`/`dM` "cru" (sem atributo como fonte, fora de um
 * bloco composto `(ATR±n)dM`) daquela face já presente na fórmula — ou `null` se não existir
 * nenhum ainda, e quem chama decide inserir um termo novo. Clicar várias vezes no mesmo dado
 * "soma quantidade" em vez de duplicar token (pedido do autor, revisão de usabilidade da ui-35).
 *
 * `(^|[+\-(])` ancora o termo num começo de segmento válido — o "d20" de `(LUT+2)d20` nunca casa
 * (precedido por `)`, não um desses três). `(?!\d)` evita que `d1` case como substring dentro de
 * `d12`/`d10`. Varre a fórmula inteira e usa sempre o **último** match (não o último token
 * digitado — o último termo daquela face específica, onde quer que esteja).
 */
export function incrementarUltimoDado(formulaAtual: string, faces: number): string | null {
  const regex = new RegExp(`(^|[+\\-(])(\\d*)d${faces}(?!\\d)`, 'gi');
  let ultimo: RegExpExecArray | null = null;
  let atual: RegExpExecArray | null;
  while ((atual = regex.exec(formulaAtual))) {
    ultimo = atual;
  }
  if (!ultimo) {
    return null;
  }
  const boundary = ultimo[1];
  const quantidadeTexto = ultimo[2];
  const quantidadeAtual = quantidadeTexto === '' ? 1 : parseInt(quantidadeTexto, 10);
  const inicio = ultimo.index + boundary.length;
  return (
    formulaAtual.slice(0, inicio) +
    (quantidadeAtual + 1) +
    formulaAtual.slice(inicio + quantidadeTexto.length)
  );
}
