import type { GlossarioEfetivoTranscricaoDto, PacoteTrabalhoTranscricaoDto } from "../dtos/transcricao/importacao.dtos";
import { TRANSCRICAO_ID_MAXIMO, TRANSCRICAO_NOME_MAXIMO, TRANSCRICAO_TEMPO_MAXIMO } from "./transcricao.validators";

/**
 * Regras puras da importação e do glossário (task 02, decisões D-06/D-10 em
 * `docs/specs/active/transcricoes-02-importacao-e-glossario/design.md`). Sem persistência nem autorização.
 * Duas chaves distintas de propósito: a de TERMO preserva o acento; a de PARECIDO o ignora.
 */

/** Limite técnico por termo do glossário (não é cota comercial). */
export const TRANSCRICAO_TERMO_MAXIMO = 80;

export type MotivoTextoTranscricaoInvalido = "TIPO" | "VAZIO" | "CONTROLE" | "LONGO";
export type ResultadoTextoTranscricao =
  | { readonly valido: true; readonly valor: string }
  | { readonly valido: false; readonly motivo: MotivoTextoTranscricaoInvalido };

/** Controle e formato invisível (zero-width etc.), exceto ZWNJ/ZWJ, que fazem parte de nomes legítimos. */
const CARACTERE_INVISIVEL = /(?![‌‍])[\p{Cc}\p{Cf}]/u;

function compararPontosDeCodigo(primeiro: string, segundo: string): number {
  const a = Array.from(primeiro, (c) => c.codePointAt(0) as number);
  const b = Array.from(segundo, (c) => c.codePointAt(0) as number);
  const limite = Math.min(a.length, b.length);
  for (let i = 0; i < limite; i++) {
    if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  }
  return a.length - b.length;
}

/** Como digitado: NFC, aparado e com espaços colapsados. Não mexe em caixa nem em acento. */
export function normalizarRotuloTranscricao(texto: string): string {
  return texto.normalize("NFC").trim().replace(/\p{Zs}+/gu, " ");
}

/** Chave de unicidade do termo: ignora caixa e a forma Unicode; o acento DISTINGUE. */
export function chaveTermoGlossario(termo: string): string {
  return normalizarRotuloTranscricao(termo).toLowerCase();
}

/** Chave de "parecido" (sugestão/conflito): ignora caixa e acento. Nunca funde registros sozinha. */
export function chaveParecidaTranscricao(texto: string): string {
  return normalizarRotuloTranscricao(texto).normalize("NFD").replace(/\p{M}+/gu, "").toLowerCase();
}

function validarTexto(entrada: unknown, maximo: number): ResultadoTextoTranscricao {
  if (typeof entrada !== "string") return { valido: false, motivo: "TIPO" };
  const aparado = entrada.normalize("NFC").trim();
  if (aparado === "") return { valido: false, motivo: "VAZIO" };
  if (CARACTERE_INVISIVEL.test(aparado)) return { valido: false, motivo: "CONTROLE" };
  const valor = normalizarRotuloTranscricao(aparado);
  if (Array.from(valor).length > maximo) return { valido: false, motivo: "LONGO" };
  return { valido: true, valor };
}

export function validarTermoGlossario(termo: unknown): ResultadoTextoTranscricao {
  return validarTexto(termo, TRANSCRICAO_TERMO_MAXIMO);
}

export function validarRotuloParticipante(rotulo: unknown): ResultadoTextoTranscricao {
  return validarTexto(rotulo, TRANSCRICAO_NOME_MAXIMO);
}

export type ConflitoTermoTranscricao =
  | { readonly tipo: "DUPLICADO"; readonly existente: string }
  | { readonly tipo: "PARECIDO"; readonly existente: string };

/** DUPLICADO = mesma chave de termo (409 na API); PARECIDO = só difere no acento (dica, não bloqueia). */
export function localizarConflitoTermo(termo: string, existentes: readonly string[]): ConflitoTermoTranscricao | null {
  const chave = chaveTermoGlossario(termo);
  const duplicado = existentes.find((existente) => chaveTermoGlossario(existente) === chave);
  if (duplicado !== undefined) return { tipo: "DUPLICADO", existente: duplicado };
  const parecida = chaveParecidaTranscricao(termo);
  const parecido = existentes.find((existente) => chaveParecidaTranscricao(existente) === parecida);
  return parecido !== undefined ? { tipo: "PARECIDO", existente: parecido } : null;
}

/**
 * D-06b: devolve o participante já conhecido que é PARECIDO (só difere em caixa ou acento) com o informado,
 * ou `null`. Um rótulo idêntico ao conhecido é a mesma pessoa e não conta como parecido.
 */
export function localizarParticipanteParecido(participante: string, conhecidos: readonly string[]): string | null {
  const rotulo = normalizarRotuloTranscricao(participante);
  const chave = chaveParecidaTranscricao(rotulo);
  const iguais = conhecidos.some((conhecido) => normalizarRotuloTranscricao(conhecido) === rotulo);
  if (iguais) return null;
  const parecido = conhecidos.find((conhecido) => chaveParecidaTranscricao(conhecido) === chave);
  return parecido !== undefined ? normalizarRotuloTranscricao(parecido) : null;
}

export interface AssociacaoIdentidadeTranscricao {
  readonly nomeOrigem: string;
  readonly participante: string;
}

export type OrigemSugestaoIdentidade = "ASSOCIACAO" | "AMBIGUA" | "DESCONHECIDA";
export interface SugestaoIdentidadeTranscricao {
  readonly origem: OrigemSugestaoIdentidade;
  readonly participante: string | null;
  readonly candidatos: readonly string[];
}

/** Nomes de origem possíveis de um arquivo: sem pasta e extensão, e sem prefixo numérico de ordem. Não presume o formato do Craig. */
export function candidatosNomeOrigem(nomeArquivo: string): string[] {
  const base = nomeArquivo.split(/[\\/]/).pop() ?? "";
  const completo = normalizarRotuloTranscricao(base.replace(/\.[A-Za-z0-9]{1,5}$/, ""));
  const semPrefixo = normalizarRotuloTranscricao(completo.replace(/^\d+[\s_.-]+/, ""));
  return [...new Set([completo, semPrefixo])].filter((nome) => nome !== "");
}

/** Sugere, nunca confirma. O nome completo vale antes do nome sem prefixo; empate entre pessoas diferentes é AMBIGUA. */
export function sugerirIdentidadeFaixa(
  nomeArquivo: string,
  associacoes: readonly AssociacaoIdentidadeTranscricao[],
): SugestaoIdentidadeTranscricao {
  for (const candidato of candidatosNomeOrigem(nomeArquivo)) {
    const chave = chaveParecidaTranscricao(candidato);
    const participantes = [
      ...new Set(
        associacoes
          .filter((associacao) => chaveParecidaTranscricao(associacao.nomeOrigem) === chave)
          .map((associacao) => normalizarRotuloTranscricao(associacao.participante)),
      ),
    ].sort(compararPontosDeCodigo);
    if (participantes.length === 1) return { origem: "ASSOCIACAO", participante: participantes[0], candidatos: participantes };
    if (participantes.length > 1) return { origem: "AMBIGUA", participante: null, candidatos: participantes };
  }
  return { origem: "DESCONHECIDA", participante: null, candidatos: [] };
}

export interface ArquivoImportacaoTranscricao {
  readonly nomeArquivo: string;
  readonly tamanhoBytes: number;
  readonly duracaoMilissegundos: number;
}

export type TipoAchadoDuplicidadeTranscricao = "DUPLICADO" | "MESMO_NOME_DIFERENTE" | "POSSIVEL_COPIA_RENOMEADA";
export interface AchadoDuplicidadeTranscricao {
  readonly tipo: TipoAchadoDuplicidadeTranscricao;
  readonly indices: readonly number[];
}

const ORDEM_ACHADO: Record<TipoAchadoDuplicidadeTranscricao, number> = {
  DUPLICADO: 0,
  MESMO_NOME_DIFERENTE: 1,
  POSSIVEL_COPIA_RENOMEADA: 2,
};

function agrupar<T>(itens: readonly T[], chave: (item: T) => string): Map<string, number[]> {
  const grupos = new Map<string, number[]>();
  itens.forEach((item, indice) => {
    const chaveItem = chave(item);
    grupos.set(chaveItem, [...(grupos.get(chaveItem) ?? []), indice]);
  });
  return grupos;
}

/** Só avisa (D-06a): quem decide manter ou ignorar é o Mestre. O hash do conteúdo fica no app e não entra aqui. */
export function detectarDuplicidadeArquivos(arquivos: readonly ArquivoImportacaoTranscricao[]): AchadoDuplicidadeTranscricao[] {
  const assinatura = (arquivo: ArquivoImportacaoTranscricao) => `${arquivo.tamanhoBytes}|${arquivo.duracaoMilissegundos}`;
  const achados: AchadoDuplicidadeTranscricao[] = [];

  for (const indicesDoNome of agrupar(arquivos, (arquivo) => chaveTermoGlossario(arquivo.nomeArquivo)).values()) {
    if (indicesDoNome.length < 2) continue;
    const porAssinatura = agrupar(indicesDoNome, (indice) => assinatura(arquivos[indice]));
    for (const iguais of porAssinatura.values()) {
      if (iguais.length > 1) achados.push({ tipo: "DUPLICADO", indices: iguais.map((i) => indicesDoNome[i]) });
    }
    if (porAssinatura.size > 1) achados.push({ tipo: "MESMO_NOME_DIFERENTE", indices: indicesDoNome });
  }

  for (const indicesDaAssinatura of agrupar(arquivos, assinatura).values()) {
    const nomes = new Set(indicesDaAssinatura.map((indice) => chaveTermoGlossario(arquivos[indice].nomeArquivo)));
    if (nomes.size > 1) achados.push({ tipo: "POSSIVEL_COPIA_RENOMEADA", indices: indicesDaAssinatura });
  }

  return achados.sort(
    (a, b) => ORDEM_ACHADO[a.tipo] - ORDEM_ACHADO[b.tipo] || a.indices[0] - b.indices[0],
  );
}

/** Esperados sem nenhuma faixa no lote, comparando sem caixa e sem acento. */
export function participantesSemFaixa(esperados: readonly string[], participantesDasFaixas: readonly string[]): string[] {
  const presentes = new Set(participantesDasFaixas.map(chaveParecidaTranscricao));
  return esperados.filter((esperado) => !presentes.has(chaveParecidaTranscricao(esperado)));
}

/** Lista determinística entregue ao motor: ordem por ponto de código, sem duplicata de chave; acento distinto permanece. */
export function montarGlossarioEfetivoTranscricao(termos: readonly string[]): GlossarioEfetivoTranscricaoDto {
  const ordenados = termos.map(normalizarRotuloTranscricao).filter((termo) => termo !== "").sort(compararPontosDeCodigo);
  const vistos = new Set<string>();
  const unicos: string[] = [];
  for (const termo of ordenados) {
    const chave = chaveTermoGlossario(termo);
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    unicos.push(termo);
  }
  return { versao: 1, termos: unicos };
}

export interface FaixaEntradaPacoteTranscricao {
  readonly identificador: string;
  readonly nomeArquivo: string;
  readonly participante: string;
  readonly identidadeConfirmada: boolean;
  readonly deslocamentoMilissegundos: number;
  readonly silencioInicialMilissegundos: number | null;
}

export interface EntradaPacoteTrabalhoTranscricao {
  readonly campanhaId: number;
  readonly sessaoId: number;
  readonly idioma: string;
  readonly glossario: readonly { readonly campanhaId: number; readonly termo: string }[];
  readonly faixas: readonly FaixaEntradaPacoteTranscricao[];
}

export type ResultadoPacoteTrabalhoTranscricao =
  | { readonly ok: true; readonly pacote: PacoteTrabalhoTranscricaoDto }
  | { readonly ok: false; readonly erros: readonly string[] };

const IDIOMA = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8}){0,3}$/;
const idValido = (valor: number) => Number.isSafeInteger(valor) && valor >= 1 && valor <= TRANSCRICAO_ID_MAXIMO;

/**
 * Monta o contrato do motor. Recusa: termo de outra campanha (sem repetir o termo), faixa sem identidade confirmada,
 * pacote sem faixas e valores fora do contrato. Nunca aplica silêncio ao offset (D-05+).
 */
export function montarPacoteTrabalhoTranscricao(entrada: EntradaPacoteTrabalhoTranscricao): ResultadoPacoteTrabalhoTranscricao {
  const erros: string[] = [];
  if (!idValido(entrada.campanhaId)) erros.push("Campanha inválida.");
  if (!idValido(entrada.sessaoId)) erros.push("Sessão inválida.");
  if (typeof entrada.idioma !== "string" || entrada.idioma.length > 35 || !IDIOMA.test(entrada.idioma)) erros.push("Idioma inválido.");
  if (entrada.glossario.some((item) => item.campanhaId !== entrada.campanhaId)) {
    erros.push("Glossário de outra campanha não pode entrar neste pacote.");
  }
  const termos: string[] = [];
  for (const item of entrada.glossario) {
    const termo = validarTermoGlossario(item.termo);
    if (termo.valido) termos.push(termo.valor);
    else erros.push("Há termo de glossário inválido.");
  }
  if (entrada.faixas.length === 0) erros.push("O pacote precisa de ao menos uma faixa.");
  const identificadores = new Set<string>();
  entrada.faixas.forEach((faixa, indice) => {
    const rotulo = `Faixa ${indice + 1}`;
    if (typeof faixa.identificador !== "string" || faixa.identificador === "") erros.push(`${rotulo}: identificador ausente.`);
    else if (identificadores.has(faixa.identificador)) erros.push(`${rotulo}: identificador repetido.`);
    else identificadores.add(faixa.identificador);
    if (faixa.identidadeConfirmada !== true) erros.push(`${rotulo}: a identidade ainda não foi confirmada.`);
    if (!validarRotuloParticipante(faixa.participante).valido) erros.push(`${rotulo}: participante inválido.`);
    if (!Number.isSafeInteger(faixa.deslocamentoMilissegundos) || Math.abs(faixa.deslocamentoMilissegundos) > TRANSCRICAO_TEMPO_MAXIMO) {
      erros.push(`${rotulo}: deslocamento inválido.`);
    }
    const silencio = faixa.silencioInicialMilissegundos;
    if (silencio !== null && (!Number.isSafeInteger(silencio) || silencio < 0)) erros.push(`${rotulo}: silêncio inicial inválido.`);
  });
  if (erros.length > 0) return { ok: false, erros };
  return {
    ok: true,
    pacote: {
      campanhaId: entrada.campanhaId,
      sessaoId: entrada.sessaoId,
      idioma: entrada.idioma,
      glossario: montarGlossarioEfetivoTranscricao(termos).termos,
      faixas: entrada.faixas.map((faixa) => ({
        identificador: faixa.identificador,
        nomeArquivo: faixa.nomeArquivo,
        participante: normalizarRotuloTranscricao(faixa.participante),
        deslocamentoMilissegundos: faixa.deslocamentoMilissegundos,
        silencioInicialMilissegundos: faixa.silencioInicialMilissegundos,
      })),
    },
  };
}
