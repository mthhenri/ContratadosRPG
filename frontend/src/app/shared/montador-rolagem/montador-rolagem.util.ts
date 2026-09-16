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

/** Adiciona uma face nova, mantendo o incremento do último dado daquela face. */
export function adicionarDado(formulaAtual: string, faces: number): string {
  if (/[+\-(]$/.test(formulaAtual)) {
    return formulaAtual + `d${faces}`;
  }
  return (
    incrementarUltimoDado(formulaAtual, faces) ??
    formulaAtual + (formulaAtual && !/[+\-(]$/.test(formulaAtual) ? '+' : '') + `d${faces}`
  );
}

const OPERADOR_POOL = /(?:kh|kl|cm\d+)/gi;
const FONTE_ROLAGEM =
  '(?:DES|FOR|LUT|PON|VIG|INT|MED|SEN|SOC|VON|PROF|PROFICIENCIA|NIV|NIVEL|DESTREZA|FORCA|LUTA|PONTARIA|VIGOR|INTELECTO|MEDICINA|SENTIDOS|SOCIAL|VONTADE)';
const DADO_SIMPLES = new RegExp(
  `(?:^|[+\\-(])(?:${FONTE_ROLAGEM}|\\d*)d\\d+(?:(?:kh|kl)\\d*|cm\\d+)*`,
  'gi',
);
const DADO_COMPOSTO = new RegExp(
  `\\(${FONTE_ROLAGEM}(?:[+-]\\d+|\\*\\d+)\\)d\\d+(?:(?:kh|kl)\\d*|cm\\d+)*`,
  'gi',
);

function estaDentroDeGrupo(formula: string, indice: number): boolean {
  let profundidade = 0;
  for (let posicao = 0; posicao < indice; posicao++) {
    if (formula[posicao] === '(') profundidade++;
    if (formula[posicao] === ')') profundidade--;
  }
  return profundidade > 0;
}

function indiceDoDado(match: RegExpMatchArray): number {
  const indice = match.index ?? 0;
  return match[0].startsWith('(') ? indice + 1 : indice;
}

/** Reposiciona o operador de pool para o último dado (simples ou composto) da fórmula. */
export function reposicionarOperadorPool(formulaAtual: string, operador: string): string {
  if (!formulaAtual || !/^(?:kh|kl|cm\d+)$/i.test(operador)) {
    return formulaAtual;
  }

  const candidatos = [
    ...formulaAtual.matchAll(DADO_COMPOSTO),
    ...[...formulaAtual.matchAll(DADO_SIMPLES)].filter(
      (match) => !estaDentroDeGrupo(formulaAtual, indiceDoDado(match)),
    ),
  ]
    .map((match) => ({ inicio: match.index ?? 0, texto: match[0] }))
    .sort((a, b) => a.inicio - b.inicio);
  const ultimo = candidatos.at(-1);
  if (!ultimo) {
    return formulaAtual;
  }
  const deslocamento = /^[+\-(]/.test(ultimo.texto) ? 1 : 0;
  const inicioToken = ultimo.inicio + deslocamento;
  const token = ultimo.texto.slice(deslocamento);
  const tokenSemPool = token.replace(OPERADOR_POOL, '');
  return formulaAtual.slice(0, inicioToken) + tokenSemPool + operador + formulaAtual.slice(inicioToken + token.length);
}

/** Acrescenta uma tag de dano somente a um termo final elegível. */
export function adicionarTipoDano(formulaAtual: string, tipo: string): string {
  if (!formulaAtual || !tipo || /\[[^\]]*\]$/.test(formulaAtual)) {
    return formulaAtual;
  }
  const termoFinal = new RegExp(
    `^(?:\\d+|(?:${FONTE_ROLAGEM}|\\d*)d\\d+(?:(?:kh|kl)\\d*|cm\\d+)*|\\(${FONTE_ROLAGEM}(?:[+-]\\d+|\\*\\d+)\\)d\\d+(?:(?:kh|kl)\\d*|cm\\d+)*|\\(\\d*d\\d+(?:(?:(?:kh|kl)\\d*|cm\\d+))*(?:[+-]\\d*d\\d+(?:(?:(?:kh|kl)\\d*|cm\\d+))*)*\\))$`,
    'i',
  );
  if (termoFinal.test(formulaAtual)) {
    return `${formulaAtual}[${tipo}]`;
  }
  const candidatos = [
    ...formulaAtual.matchAll(DADO_COMPOSTO),
    ...[...formulaAtual.matchAll(DADO_SIMPLES)].filter(
      (match) => !estaDentroDeGrupo(formulaAtual, indiceDoDado(match)),
    ),
    ...[...formulaAtual.matchAll(/(?:^|[+(-])\d+(?=(?:\[|[+-]|$))/g)].filter(
      (match) => !estaDentroDeGrupo(formulaAtual, indiceDoDado(match)),
    ),
  ].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const ultimo = candidatos.at(-1);
  if (!ultimo) {
    return formulaAtual;
  }
  return formulaAtual.slice(0, (ultimo.index ?? 0) + ultimo[0].length) + `[${tipo}]` + formulaAtual.slice((ultimo.index ?? 0) + ultimo[0].length);
}
