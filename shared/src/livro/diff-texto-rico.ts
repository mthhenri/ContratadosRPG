import { LivroTextoOperacaoEnum as Operacao } from "../enums/livro-comparacao.enum";
import type { LivroTextoDiffDto } from "../dtos/livro/livro-comparacao.dtos";
import type { LivroTrechoDto } from "../dtos/livro/livro-trecho.dtos";

interface Token {
  readonly texto: string;
  readonly marcas: readonly string[];
}

/** Acima disto o LCS exato é caro demais; o miolo vira "tudo removido + tudo adicionado". */
const LIMITE_CELULAS_LCS = 4_000_000;

const TIPOS_DE_TRECHO = new Set([
  "texto",
  "negrito",
  "italico",
  "tarja",
  "link-interno",
  "nivel-ameaca",
  "link-externo",
]);

/** `true` quando o valor é uma lista não vazia de trechos de texto rico. */
export function ehTextoRico(valor: unknown): valor is readonly LivroTrechoDto[] {
  return (
    Array.isArray(valor) &&
    valor.length > 0 &&
    valor.every(
      (item) =>
        typeof item === "object" && item !== null && TIPOS_DE_TRECHO.has((item as { tipo?: string }).tipo ?? ""),
    )
  );
}

function marcaDoTrecho(trecho: LivroTrechoDto): string | null {
  switch (trecho.tipo) {
    case "negrito":
    case "italico":
      return trecho.tipo;
    case "link-interno":
      // O destino é o `identificador` (estável); sem ele, a âncora.
      return `link-interno:${trecho.identificador ?? trecho.ancora}`;
    case "link-externo":
      return `link-externo:${trecho.destino}`;
    case "nivel-ameaca":
      return `nivel-ameaca:${trecho.nivel}${trecho.compacto ? ":compacto" : ""}`;
    default:
      return null;
  }
}

const separarPalavras = (texto: string): string[] => texto.match(/\s+|\S+/g) ?? [];

/** Texto corrido em palavras e espaços, cada um com as marcações que o envolvem. */
function tokenizar(trechos: readonly LivroTrechoDto[], marcas: readonly string[] = []): Token[] {
  return trechos.flatMap((trecho): Token[] => {
    if (trecho.tipo === "texto") return separarPalavras(trecho.texto).map((texto) => ({ texto, marcas }));
    if (trecho.tipo === "tarja") return [{ texto: "█".repeat(trecho.comprimento), marcas }];
    const marca = marcaDoTrecho(trecho);
    const interior = [...marcas, ...(marca ? [marca] : [])].sort();
    if (trecho.tipo === "link-interno" || trecho.tipo === "nivel-ameaca") {
      return separarPalavras(trecho.texto).map((texto) => ({ texto, marcas: interior }));
    }
    return tokenizar(trecho.filhos, interior);
  });
}

const mesmasMarcas = (primeira: readonly string[], segunda: readonly string[]): boolean =>
  primeira.length === segunda.length && primeira.every((marca, indice) => marca === segunda[indice]);

interface OperacaoDeToken {
  readonly operacao: Operacao;
  readonly antes?: Token;
  readonly depois?: Token;
}

/** Maior subsequência comum das palavras (o miolo que sobra depois de tirar prefixo e sufixo). */
function alinhar(meioA: readonly Token[], meioB: readonly Token[]): OperacaoDeToken[] {
  if (meioA.length * meioB.length > LIMITE_CELULAS_LCS) {
    return [
      ...meioA.map((antes): OperacaoDeToken => ({ operacao: Operacao.REMOVIDO, antes })),
      ...meioB.map((depois): OperacaoDeToken => ({ operacao: Operacao.ADICIONADO, depois })),
    ];
  }
  const colunas = meioB.length + 1;
  const tabela = new Uint32Array((meioA.length + 1) * colunas);
  for (let i = meioA.length - 1; i >= 0; i--) {
    for (let j = meioB.length - 1; j >= 0; j--) {
      tabela[i * colunas + j] =
        meioA[i].texto === meioB[j].texto
          ? tabela[(i + 1) * colunas + j + 1] + 1
          : Math.max(tabela[(i + 1) * colunas + j], tabela[i * colunas + j + 1]);
    }
  }
  const operacoes: OperacaoDeToken[] = [];
  let i = 0;
  let j = 0;
  while (i < meioA.length && j < meioB.length) {
    if (meioA[i].texto === meioB[j].texto) {
      operacoes.push({ operacao: Operacao.IGUAL, antes: meioA[i++], depois: meioB[j++] });
    } else if (tabela[(i + 1) * colunas + j] >= tabela[i * colunas + j + 1]) {
      operacoes.push({ operacao: Operacao.REMOVIDO, antes: meioA[i++] });
    } else {
      operacoes.push({ operacao: Operacao.ADICIONADO, depois: meioB[j++] });
    }
  }
  while (i < meioA.length) operacoes.push({ operacao: Operacao.REMOVIDO, antes: meioA[i++] });
  while (j < meioB.length) operacoes.push({ operacao: Operacao.ADICIONADO, depois: meioB[j++] });
  return operacoes;
}

/**
 * Diff por palavras de dois textos ricos (`LivroTrechoDto[]`), puro e determinístico. Compara o texto
 * corrido; a mesma palavra com marcação diferente sai como `FORMATACAO`, separada de "mudou a
 * palavra" (`REMOVIDO` + `ADICIONADO`). Trechos vizinhos com a mesma operação são unidos.
 */
export function compararTextoRico(
  antes: readonly LivroTrechoDto[],
  depois: readonly LivroTrechoDto[],
): LivroTextoDiffDto[] {
  const a = tokenizar(antes);
  const b = tokenizar(depois);

  let inicio = 0;
  while (inicio < a.length && inicio < b.length && a[inicio].texto === b[inicio].texto) inicio++;
  let fimA = a.length;
  let fimB = b.length;
  while (fimA > inicio && fimB > inicio && a[fimA - 1].texto === b[fimB - 1].texto) {
    fimA--;
    fimB--;
  }

  const pares = (de: number, ate: number, deB: number): OperacaoDeToken[] =>
    Array.from({ length: ate - de }, (_, indice) => ({
      operacao: Operacao.IGUAL,
      antes: a[de + indice],
      depois: b[deB + indice],
    }));
  const operacoes = [
    ...pares(0, inicio, 0),
    ...alinhar(a.slice(inicio, fimA), b.slice(inicio, fimB)),
    ...pares(fimA, a.length, fimB),
  ].map((item) =>
    item.operacao === Operacao.IGUAL && item.antes && item.depois && !mesmasMarcas(item.antes.marcas, item.depois.marcas)
      ? { ...item, operacao: Operacao.FORMATACAO }
      : item,
  );

  const resultado: LivroTextoDiffDto[] = [];
  for (const { operacao, antes: tokenAntes, depois: tokenDepois } of operacoes) {
    const texto = (operacao === Operacao.REMOVIDO ? tokenAntes?.texto : tokenDepois?.texto) ?? "";
    const marcasAntes = operacao === Operacao.FORMATACAO ? tokenAntes?.marcas : undefined;
    const marcasDepois = operacao === Operacao.FORMATACAO ? tokenDepois?.marcas : undefined;
    const ultimo = resultado[resultado.length - 1];
    const unir =
      ultimo?.operacao === operacao &&
      (operacao !== Operacao.FORMATACAO ||
        (mesmasMarcas(ultimo.marcasAntes ?? [], marcasAntes ?? []) &&
          mesmasMarcas(ultimo.marcasDepois ?? [], marcasDepois ?? [])));
    if (unir) {
      resultado[resultado.length - 1] = { ...ultimo, texto: ultimo.texto + texto };
    } else {
      resultado.push({
        operacao,
        texto,
        ...(marcasAntes ? { marcasAntes } : {}),
        ...(marcasDepois ? { marcasDepois } : {}),
      });
    }
  }
  return resultado;
}
