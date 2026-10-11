import { LivroMudancaSituacaoEnum as Situacao } from "../enums/livro-comparacao.enum";
import type { TipoRegraPecaEnum } from "../enums/tipo-regra-peca.enum";
import type {
  LivroCampoAlteradoDto,
  LivroComparacaoDto,
  LivroMudancaDto,
} from "../dtos/livro/livro-comparacao.dtos";
import type { LivroPecaDto } from "../dtos/livro/livro-peca.dtos";
import { compararTextoRico, ehTextoRico } from "./diff-texto-rico";

interface Entrada {
  readonly peca: LivroPecaDto;
  readonly paiIdentificador: string | null;
  /** Posição entre as irmãs (0, 1, 2...), na ordem em que a árvore as lista. */
  readonly posicao: number;
  readonly caminho: readonly string[];
  /** `dados` sem o que não é conteúdo (âncora cacheada de link com destino por `identificador`). */
  readonly dados: ValorJson;
}

/** Valor JSON (recursivo) usado só na comparação. */
type ValorJson =
  | null
  | boolean
  | number
  | string
  | readonly ValorJson[]
  | { readonly [chave: string]: ValorJson };

type Registro = { readonly [chave: string]: ValorJson };

const ehRegistro = (valor: unknown): valor is Registro =>
  typeof valor === "object" && valor !== null && !Array.isArray(valor);

/**
 * Remove `undefined` e a `ancora` de link interno que já tem `identificador` (é só cache da âncora do
 * destino: renomear o destino não altera o texto de quem o cita).
 */
function normalizar(valor: unknown): ValorJson {
  if (Array.isArray(valor)) return valor.map(normalizar);
  if (!ehRegistro(valor)) return (valor ?? null) as ValorJson;
  const semAncora = valor["tipo"] === "link-interno" && typeof valor["identificador"] === "string";
  const resultado: { [chave: string]: ValorJson } = {};
  for (const chave of Object.keys(valor).sort()) {
    if (valor[chave] === undefined || (semAncora && chave === "ancora")) continue;
    resultado[chave] = normalizar(valor[chave]);
  }
  return resultado;
}

function iguais(primeiro: ValorJson, segundo: ValorJson): boolean {
  if (primeiro === segundo) return true;
  if (Array.isArray(primeiro) && Array.isArray(segundo)) {
    return primeiro.length === segundo.length && primeiro.every((item: ValorJson, indice) => iguais(item, (segundo as readonly ValorJson[])[indice]));
  }
  if (ehRegistro(primeiro) && ehRegistro(segundo)) {
    const chaves = Object.keys(primeiro);
    return chaves.length === Object.keys(segundo).length && chaves.every((chave) => chave in segundo && iguais(primeiro[chave], segundo[chave]));
  }
  return false;
}

function rotuloDaPeca(peca: LivroPecaDto): string {
  const dados = peca.dados as unknown as Record<string, unknown>;
  const nome = dados["titulo"] ?? dados["nome"];
  return typeof nome === "string" && nome.trim() ? nome : peca.tipo;
}

/** Percorre a árvore em profundidade, guardando pai, posição entre irmãs e caminho legível. */
function indexar(pecas: readonly LivroPecaDto[]): Map<string, Entrada> {
  const entradas = new Map<string, Entrada>();
  const percorrer = (irmas: readonly LivroPecaDto[], pai: string | null, caminhoPai: readonly string[]): void => {
    const ordenadas = irmas
      .map((peca, indice) => ({ peca, indice }))
      .sort((primeira, segunda) => primeira.peca.ordem - segunda.peca.ordem || primeira.indice - segunda.indice);
    ordenadas.forEach(({ peca }, posicao) => {
      const caminho = [...caminhoPai, rotuloDaPeca(peca)];
      entradas.set(peca.identificador, {
        peca,
        paiIdentificador: pai,
        posicao,
        caminho,
        dados: normalizar(peca.dados),
      });
      percorrer(peca.filhos, peca.identificador, caminho);
    });
  };
  percorrer(pecas, null, []);
  return entradas;
}

/** Campos de `dados` que mudaram; texto rico sai com o diff por palavras. */
function diferencas(
  antes: ValorJson | undefined,
  depois: ValorJson | undefined,
  campo: string,
  saida: LivroCampoAlteradoDto[],
): void {
  const valorAntes = antes ?? null;
  const valorDepois = depois ?? null;
  if (iguais(valorAntes, valorDepois)) return;
  const textoAntes = ehTextoRico(valorAntes);
  const textoDepois = ehTextoRico(valorDepois);
  const vazio = (valor: ValorJson) => valor === null || (Array.isArray(valor) && valor.length === 0);
  if ((textoAntes && (textoDepois || vazio(valorDepois))) || (textoDepois && vazio(valorAntes))) {
    saida.push({
      campo,
      antes: valorAntes,
      depois: valorDepois,
      texto: compararTextoRico(textoAntes ? valorAntes : [], textoDepois ? valorDepois : []),
    });
    return;
  }
  if (Array.isArray(valorAntes) && Array.isArray(valorDepois)) {
    for (let indice = 0; indice < Math.max(valorAntes.length, valorDepois.length); indice++) {
      diferencas(
        (valorAntes as readonly ValorJson[])[indice],
        (valorDepois as readonly ValorJson[])[indice],
        `${campo}.${indice}`,
        saida,
      );
    }
    return;
  }
  if (ehRegistro(valorAntes) && ehRegistro(valorDepois)) {
    const chaves = [...new Set([...Object.keys(valorAntes), ...Object.keys(valorDepois)])].sort();
    for (const chave of chaves) diferencas(valorAntes[chave], valorDepois[chave], campo ? `${campo}.${chave}` : chave, saida);
    return;
  }
  saida.push({ campo, antes: valorAntes, depois: valorDepois });
}

/** Índices (no vetor) de uma subsequência crescente mais longa; empate resolvido pelo menor índice. */
function maiorSubsequenciaCrescente(valores: readonly number[]): Set<number> {
  const caudas: number[] = [];
  const anterior: number[] = new Array<number>(valores.length).fill(-1);
  valores.forEach((valor, indice) => {
    let baixo = 0;
    let alto = caudas.length;
    while (baixo < alto) {
      const meio = (baixo + alto) >> 1;
      if (valores[caudas[meio]] < valor) baixo = meio + 1;
      else alto = meio;
    }
    anterior[indice] = baixo > 0 ? caudas[baixo - 1] : -1;
    caudas[baixo] = indice;
  });
  const escolhidos = new Set<number>();
  for (let indice = caudas.length ? caudas[caudas.length - 1] : -1; indice >= 0; indice = anterior[indice]) {
    escolhidos.add(indice);
  }
  return escolhidos;
}

/**
 * Compara duas árvores de livro (as `pecas` de duas fotografias, ou a cópia de trabalho contra uma
 * fotografia) casando as peças por `identificador`. Pura e determinística: mesma entrada, mesma
 * saída, na ordem da árvore atual (nova/alterada/movida) seguida das removidas na ordem da anterior.
 *
 * - `NOVA`/`REMOVIDA`: só existe de um lado (as filhas de uma peça nova também são novas).
 * - `ALTERADA`: mesmo `identificador`, `dados` ou `ancora` diferentes. Renomear (o título muda) é
 *   alteração, nunca removida + nova. Ignora o que não é conteúdo: ordem das chaves, `revisao`,
 *   metadados da fotografia e a âncora cacheada de links por `identificador`.
 * - `MOVIDA`: pai diferente, ou ordem relativa diferente entre irmãs que existem dos dois lados.
 *   Inserir um item não move os seguintes (compara-se a ordem relativa, não o índice bruto).
 * - Alterada e movida ao mesmo tempo gera duas mudanças com o mesmo `identificador`.
 */
export function compararLivros(
  anterior: readonly LivroPecaDto[],
  atual: readonly LivroPecaDto[],
): LivroComparacaoDto {
  const antes = indexar(anterior);
  const depois = indexar(atual);
  const mudancas: LivroMudancaDto[] = [];

  // Movidas dentro do mesmo pai: as irmãs fora da maior subsequência que se manteve em ordem.
  const movidasNoPai = new Set<string>();
  const filhasPorPai = (entradas: Map<string, Entrada>): Map<string | null, Entrada[]> => {
    const grupos = new Map<string | null, Entrada[]>();
    for (const entrada of entradas.values()) {
      grupos.set(entrada.paiIdentificador, [...(grupos.get(entrada.paiIdentificador) ?? []), entrada]);
    }
    for (const grupo of grupos.values()) grupo.sort((primeira, segunda) => primeira.posicao - segunda.posicao);
    return grupos;
  };
  const filhasAntes = filhasPorPai(antes);
  for (const [pai, irmasDepois] of filhasPorPai(depois)) {
    const comuns = irmasDepois.filter((irma) => antes.get(irma.peca.identificador)?.paiIdentificador === pai);
    if (comuns.length < 2) continue;
    const ids = new Set(comuns.map((irma) => irma.peca.identificador));
    const rankAntes = new Map(
      (filhasAntes.get(pai) ?? [])
        .filter((irma) => ids.has(irma.peca.identificador))
        .map((irma, rank) => [irma.peca.identificador, rank]),
    );
    const mantidas = maiorSubsequenciaCrescente(comuns.map((irma) => rankAntes.get(irma.peca.identificador) ?? 0));
    comuns.forEach((irma, indice) => {
      if (!mantidas.has(indice)) movidasNoPai.add(irma.peca.identificador);
    });
  }

  for (const [identificador, entrada] of depois) {
    const original = antes.get(identificador);
    const base = { identificador, tipo: entrada.peca.tipo, caminho: entrada.caminho };
    if (!original) {
      mudancas.push({ ...base, situacao: Situacao.NOVA });
      continue;
    }
    const campos: LivroCampoAlteradoDto[] = [];
    if (original.peca.tipo !== entrada.peca.tipo) {
      campos.push({ campo: "tipo", antes: original.peca.tipo, depois: entrada.peca.tipo });
    }
    if ((original.peca.ancora ?? null) !== (entrada.peca.ancora ?? null)) {
      campos.push({ campo: "ancora", antes: original.peca.ancora ?? null, depois: entrada.peca.ancora ?? null });
    }
    diferencas(original.dados, entrada.dados, "", campos);
    if (campos.length) mudancas.push({ ...base, situacao: Situacao.ALTERADA, campos });
    if (original.paiIdentificador !== entrada.paiIdentificador || movidasNoPai.has(identificador)) {
      mudancas.push({
        ...base,
        situacao: Situacao.MOVIDA,
        posicao: {
          paiAntes: original.paiIdentificador,
          paiDepois: entrada.paiIdentificador,
          ordemAntes: original.posicao,
          ordemDepois: entrada.posicao,
        },
      });
    }
  }
  for (const [identificador, entrada] of antes) {
    if (!depois.has(identificador)) {
      mudancas.push({
        identificador,
        tipo: entrada.peca.tipo,
        caminho: entrada.caminho,
        situacao: Situacao.REMOVIDA,
      });
    }
  }

  const porSituacao = {
    [Situacao.NOVA]: 0,
    [Situacao.REMOVIDA]: 0,
    [Situacao.ALTERADA]: 0,
    [Situacao.MOVIDA]: 0,
  };
  const porTipo: Partial<Record<TipoRegraPecaEnum, number>> = {};
  for (const mudanca of mudancas) {
    porSituacao[mudanca.situacao]++;
    porTipo[mudanca.tipo] = (porTipo[mudanca.tipo] ?? 0) + 1;
  }
  return { mudancas, resumo: { total: mudancas.length, porSituacao, porTipo } };
}
