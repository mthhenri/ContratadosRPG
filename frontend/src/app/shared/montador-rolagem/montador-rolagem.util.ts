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

const FONTE_ROLAGEM =
  '(?:DES|FOR|LUT|PON|VIG|INT|MED|SEN|SOC|VON|PROF|PROFICIENCIA|NIV|NIVEL|DESTREZA|FORCA|LUTA|PONTARIA|VIGOR|INTELECTO|MEDICINA|SENTIDOS|SOCIAL|VONTADE)';

/** A fórmula termina num atributo/fonte extra "bare" (sem dado nenhum ainda) — clicar num dado
 *  agora fecha `ATRdM` (atributo como fonte de dados) em vez de somar `+dM` ao lado. */
const ATRIBUTO_NO_FINAL = new RegExp(`(?:^|[+\\-(])${FONTE_ROLAGEM}$`, 'i');

/** Adiciona uma face nova, mantendo o incremento do último dado daquela face. */
export function adicionarDado(formulaAtual: string, faces: number): string {
  if (/[+\-(]$/.test(formulaAtual) || ATRIBUTO_NO_FINAL.test(formulaAtual)) {
    return formulaAtual + `d${faces}`;
  }
  return (
    incrementarUltimoDado(formulaAtual, faces) ??
    formulaAtual + (formulaAtual && !/[+\-(]$/.test(formulaAtual) ? '+' : '') + `d${faces}`
  );
}

/**
 * `kh`/`kl` formam uma família (mantém maior x mantém menor, mutuamente exclusivos); `cm`
 * é independente e convive com qualquer um dos dois — clicar em um só substitui a ocorrência
 * existente do mesmo tipo, nunca remove o operador da outra família (`d20khcm1` é válido).
 */
function familiaDoOperador(operador: string): RegExp {
  return /^(?:kh|kl)$/i.test(operador) ? /kh|kl/gi : /cm\d+/gi;
}

/** O termo já tem exatamente esse operador (`kh` já tem `kh`, `cm1` já tem `cm1`) — clicar de
 *  novo ali não muda nada, então esse termo não é alvo (passa pro próximo). Note que isso é mais
 *  estrito que "família": um termo com `kh` **não** já tem `kl` — clicar `kl` nele é uma troca
 *  válida no próprio termo (substitui, não pula pro próximo), preservando o toggle kh↔kl. */
function jaTemOperadorExato(texto: string, operador: string): boolean {
  return new RegExp(operador, 'i').test(texto);
}
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

/**
 * Reposiciona o operador de pool (`kh`/`kl`/`cmN`) num dado (simples ou composto) da fórmula —
 * sempre o **primeiro** da esquerda para a direita que ainda não tem **exatamente esse operador**,
 * a não ser que `cursor` caia dentro do intervalo de um dado específico — nesse caso a busca
 * começa **nele** (e segue pra frente se ele já tiver esse operador exato). `cursor` é a posição
 * do cursor no visor (`selectionStart`); `null`/fora de qualquer dado usa o padrão (esquerda pra
 * direita). Pedido do autor: antes ia sempre no **último** dado, o que surpreendia ao compor mais
 * de um dado na mesma fórmula — repetir o clique num botão agora distribui pelos dados da
 * esquerda pra direita em vez de sempre reescrever o mesmo.
 *
 * "Exatamente esse operador" (não só a família) é o que preserva o toggle `kh`↔`kl`: um termo com
 * `kh` não conta como "já tendo" `kl` — clicar `kl` nele substitui `kh` no próprio termo (ver
 * `familiaDoOperador`), em vez de pular pro próximo dado. Só pula quando o clique é redundante
 * (o termo já tem exatamente aquele operador/valor).
 */
export function reposicionarOperadorPool(
  formulaAtual: string,
  operador: string,
  cursor: number | null = null,
): string {
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
  if (candidatos.length === 0) {
    return formulaAtual;
  }

  const indiceDoCursor =
    cursor === null
      ? -1
      : candidatos.findIndex((c) => cursor >= c.inicio && cursor <= c.inicio + c.texto.length);
  const indiceInicial = indiceDoCursor === -1 ? 0 : indiceDoCursor;

  let alvo: (typeof candidatos)[number] | null = null;
  for (let indice = indiceInicial; indice < candidatos.length; indice++) {
    if (!jaTemOperadorExato(candidatos[indice].texto, operador)) {
      alvo = candidatos[indice];
      break;
    }
  }
  if (!alvo) {
    return formulaAtual;
  }

  const deslocamento = /^[+\-(]/.test(alvo.texto) ? 1 : 0;
  const inicioToken = alvo.inicio + deslocamento;
  const token = alvo.texto.slice(deslocamento);
  const tokenSemPool = token.replace(familiaDoOperador(operador), '');
  return formulaAtual.slice(0, inicioToken) + tokenSemPool + operador + formulaAtual.slice(inicioToken + token.length);
}

/** Índice do `(` que fecha o balanceamento do `)` final da fórmula, ou `-1` sem par. */
function indiceAberturaBalanceada(formula: string): number {
  let profundidade = 0;
  for (let indice = formula.length - 1; indice >= 0; indice--) {
    if (formula[indice] === ')') profundidade++;
    else if (formula[indice] === '(') {
      profundidade--;
      if (profundidade === 0) return indice;
    }
  }
  return -1;
}

const FONTE_OU_ATALHO_NO_FINAL = new RegExp(`(?:${FONTE_ROLAGEM}|CORPO|FURTIVO)$`, 'i');

/**
 * Remove o **menor bloco** do final da fórmula por clique, na ordem inversa de como um clique de
 * composição o construiu — não o último caractere, nem o último termo aditivo inteiro. Pedido do
 * autor: em `VIGd20khcm1`, `⌫` desfaz primeiro `cm1`, depois `kh`, depois `d20`, depois `VIG` — um
 * clique de cada vez, do modificador mais específico pro mais geral. Ordem de prioridade no final
 * da fórmula: tag de dano `[...]` inteira → `cmN` → `kh`/`kl` → repetição `#N` → dado cru
 * `NdM`/`dM` (quantidade e face juntos — não foram digitados em separado) → grupo `(...)`
 * balanceado inteiro (nunca corta dentro dele, seja `(ATR±n)`/`(ATR*Y)` de uma ação composta ou um
 * grupo digitado à mão) → atributo/fonte extra/atalho (`FOR`, `PROF`, `CORPO`...) → número cru →
 * operador/parêntese solto no final. Formula vazia devolve vazia.
 */
export function apagarUltimoBloco(formulaAtual: string): string {
  if (!formulaAtual) {
    return '';
  }
  if (/\[[^\]]*\]$/.test(formulaAtual)) {
    return formulaAtual.replace(/\[[^\]]*\]$/, '');
  }
  if (/cm\d+$/i.test(formulaAtual)) {
    return formulaAtual.replace(/cm\d+$/i, '');
  }
  if (/(?:kh|kl)\d*$/i.test(formulaAtual)) {
    return formulaAtual.replace(/(?:kh|kl)\d*$/i, '');
  }
  if (/#\d+$/.test(formulaAtual)) {
    return formulaAtual.replace(/#\d+$/, '');
  }
  if (/\d*d\d+$/i.test(formulaAtual)) {
    return formulaAtual.replace(/\d*d\d+$/i, '');
  }
  if (formulaAtual.endsWith(')')) {
    const abertura = indiceAberturaBalanceada(formulaAtual);
    if (abertura !== -1) {
      return formulaAtual.slice(0, abertura);
    }
  }
  if (FONTE_OU_ATALHO_NO_FINAL.test(formulaAtual)) {
    return formulaAtual.replace(FONTE_OU_ATALHO_NO_FINAL, '');
  }
  if (/\d+$/.test(formulaAtual)) {
    return formulaAtual.replace(/\d+$/, '');
  }
  return formulaAtual.slice(0, -1);
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
