import type {
  DocumentoOrganizacaoRecuperadaDto,
  DocumentoPastaDto,
  DocumentoResumoDto,
} from '@contratados-rpg/shared/dtos/documento';
import { TipoDocumentoOrganizacaoEnum } from '@contratados-rpg/shared/enums';
import { DOCUMENTO_PASTA_PROFUNDIDADE_MAXIMA } from '@contratados-rpg/shared/validators';

/**
 * A árvore da Biblioteca montada a partir da organização do cargo e da lista de documentos —
 * funções puras, sem Angular. O servidor guarda só pastas e vínculos; a ordem de apresentação e o
 * que cai na raiz são decididos aqui:
 *
 * - pastas: `ordem` entre as irmãs (id desempata);
 * - documento numa pasta: ordem do vínculo; **na raiz**, a ordem manual do mestre
 *   (`documento.ordem`) para a organização `MESTRE` e a **ordem de criação** (id) para a dos
 *   jogadores — a ordem do mestre não vaza para a mesa;
 * - documento sem vínculo, ou com vínculo para uma pasta que não existe mais, fica na raiz;
 * - pasta cuja mãe não existe (ou cujo encadeamento fecharia um ciclo) vai para a raiz.
 */

/** Um nó pasta da árvore, com os filhos já ordenados. */
export interface NoPasta {
  readonly pasta: DocumentoPastaDto;
  /** Profundidade: 0 na raiz. */
  readonly nivel: number;
  readonly pastas: NoPasta[];
  readonly documentos: DocumentoResumoDto[];
}

export interface ArvoreDocumentos {
  readonly pastas: readonly NoPasta[];
  readonly documentos: readonly DocumentoResumoDto[];
  /** Todos os nós por id da pasta. */
  readonly porId: ReadonlyMap<number, NoPasta>;
}

/** Linha visível da árvore (já recortada pelas pastas recolhidas), na ordem de desenho. */
export type LinhaArvore = LinhaPasta | LinhaDocumento;

interface LinhaBase {
  readonly nivel: number;
  /** Pasta onde o item mora (`null` = raiz). */
  readonly pastaMaeId: number | null;
  readonly primeiro: boolean;
  readonly ultimo: boolean;
}

export interface LinhaPasta extends LinhaBase {
  readonly tipo: 'pasta';
  readonly no: NoPasta;
}

export interface LinhaDocumento extends LinhaBase {
  readonly tipo: 'documento';
  readonly documento: DocumentoResumoDto;
}

/** Destino possível de um "mover para…": a raiz (`id` `null`) ou uma pasta. */
export interface DestinoPasta {
  readonly id: number | null;
  readonly rotulo: string;
  readonly nivel: number;
}

const porOrdemEId = (a: { ordem: number; id: number }, b: { ordem: number; id: number }): number =>
  a.ordem - b.ordem || a.id - b.id;

export function montarArvore(
  organizacao: DocumentoOrganizacaoRecuperadaDto | null,
  documentos: readonly DocumentoResumoDto[],
): ArvoreDocumentos {
  const pastasOrganizacao = organizacao?.pastas ?? [];
  const idsPastas = new Set(pastasOrganizacao.map((pasta) => pasta.id));
  const ehMestre = organizacao?.organizacao === TipoDocumentoOrganizacaoEnum.MESTRE;

  const maeEfetiva = new Map<number, number | null>();
  for (const pasta of pastasOrganizacao) {
    const mae = pasta.pastaMaeId !== null && idsPastas.has(pasta.pastaMaeId) ? pasta.pastaMaeId : null;
    maeEfetiva.set(pasta.id, mae);
  }
  // Quebra ciclos (não esperados): sobe a mãe de cada pasta; ao repetir, a pasta vai para a raiz.
  for (const pasta of pastasOrganizacao) {
    const visitadas = new Set<number>([pasta.id]);
    let atual = maeEfetiva.get(pasta.id) ?? null;
    while (atual !== null) {
      if (visitadas.has(atual)) {
        maeEfetiva.set(pasta.id, null);
        break;
      }
      visitadas.add(atual);
      atual = maeEfetiva.get(atual) ?? null;
    }
  }

  const porId = new Map<number, NoPasta>();
  const criarNo = (pasta: DocumentoPastaDto, nivel: number): NoPasta => ({
    pasta,
    nivel,
    pastas: [],
    documentos: [],
  });
  const irmas = new Map<number | null, DocumentoPastaDto[]>();
  for (const pasta of pastasOrganizacao) {
    const mae = maeEfetiva.get(pasta.id) ?? null;
    irmas.set(mae, [...(irmas.get(mae) ?? []), pasta]);
  }
  const raiz: NoPasta[] = [];
  const povoar = (mae: number | null, nivel: number, destino: NoPasta[]): void => {
    for (const pasta of [...(irmas.get(mae) ?? [])].sort(porOrdemEId)) {
      const no = criarNo(pasta, nivel);
      porId.set(pasta.id, no);
      destino.push(no);
      povoar(pasta.id, nivel + 1, no.pastas);
    }
  };
  povoar(null, 0, raiz);

  const vinculoPorDocumento = new Map(
    (organizacao?.vinculos ?? []).map((vinculo) => [vinculo.documentoId, vinculo]),
  );
  const naRaiz: DocumentoResumoDto[] = [];
  const emPasta = new Map<number, { documento: DocumentoResumoDto; ordem: number }[]>();
  for (const documento of documentos) {
    const vinculo = vinculoPorDocumento.get(documento.id);
    if (vinculo && porId.has(vinculo.pastaId)) {
      emPasta.set(vinculo.pastaId, [
        ...(emPasta.get(vinculo.pastaId) ?? []),
        { documento, ordem: vinculo.ordem },
      ]);
    } else {
      naRaiz.push(documento);
    }
  }
  for (const [pastaId, itens] of emPasta) {
    itens.sort((a, b) => a.ordem - b.ordem || a.documento.id - b.documento.id);
    porId.get(pastaId)?.documentos.push(...itens.map((item) => item.documento));
  }
  naRaiz.sort((a, b) => (ehMestre ? a.ordem - b.ordem || a.id - b.id : a.id - b.id));

  return { pastas: raiz, documentos: naRaiz, porId };
}

/**
 * Linhas na ordem de desenho: em cada nível, as pastas e depois os documentos. Pastas recolhidas
 * escondem tudo o que há dentro delas.
 */
export function linhasVisiveis(
  arvore: ArvoreDocumentos,
  expandidas: ReadonlySet<number>,
): LinhaArvore[] {
  const linhas: LinhaArvore[] = [];
  const percorrer = (
    pastas: readonly NoPasta[],
    documentos: readonly DocumentoResumoDto[],
    nivel: number,
    pastaMaeId: number | null,
  ): void => {
    pastas.forEach((no, indice) => {
      linhas.push({
        tipo: 'pasta',
        no,
        nivel,
        pastaMaeId,
        primeiro: indice === 0,
        ultimo: indice === pastas.length - 1,
      });
      if (expandidas.has(no.pasta.id)) {
        percorrer(no.pastas, no.documentos, nivel + 1, no.pasta.id);
      }
    });
    documentos.forEach((documento, indice) => {
      linhas.push({
        tipo: 'documento',
        documento,
        nivel,
        pastaMaeId,
        primeiro: indice === 0,
        ultimo: indice === documentos.length - 1,
      });
    });
  };
  percorrer(arvore.pastas, arvore.documentos, 0, null);
  return linhas;
}

/** Ids da pasta e de todas as descendentes. */
export function idsSubarvore(no: NoPasta): number[] {
  return [no.pasta.id, ...no.pastas.flatMap((filha) => idsSubarvore(filha))];
}

/** Altura da subárvore: 1 para uma pasta sem filhas. */
export function alturaSubarvore(no: NoPasta): number {
  return 1 + Math.max(0, ...no.pastas.map((filha) => alturaSubarvore(filha)));
}

/** Documentos e subpastas diretos — a contagem mostrada na linha da pasta. */
export function contarItens(no: NoPasta): number {
  return no.pastas.length + no.documentos.length;
}

/** Caminho legível ("Mapas / Cidade") de uma pasta, ou `null` na raiz/pasta desconhecida. */
export function caminhoDaPasta(arvore: ArvoreDocumentos, pastaId: number | null): string | null {
  if (pastaId === null) {
    return null;
  }
  const partes: string[] = [];
  const maeDe = new Map<number, number | null>();
  const registrar = (nos: readonly NoPasta[], mae: number | null): void => {
    for (const no of nos) {
      maeDe.set(no.pasta.id, mae);
      registrar(no.pastas, no.pasta.id);
    }
  };
  registrar(arvore.pastas, null);
  let atual: number | null = pastaId;
  while (atual !== null) {
    const no = arvore.porId.get(atual);
    if (!no) {
      return null;
    }
    partes.unshift(no.pasta.nome);
    atual = maeDe.get(atual) ?? null;
  }
  return partes.join(' / ');
}

/**
 * Destinos de um "mover para…" na ordem da árvore, a raiz primeiro. Para mover uma **pasta**,
 * exclui ela e as descendentes e os destinos que estourariam o teto de profundidade; para mover um
 * documento, qualquer pasta serve.
 */
export function destinosDeMovimento(
  arvore: ArvoreDocumentos,
  pastaMovida: NoPasta | null,
): DestinoPasta[] {
  const proibidas = new Set(pastaMovida ? idsSubarvore(pastaMovida) : []);
  const altura = pastaMovida ? alturaSubarvore(pastaMovida) : 0;
  const destinos: DestinoPasta[] = [{ id: null, rotulo: 'Raiz da Biblioteca', nivel: 0 }];
  const percorrer = (nos: readonly NoPasta[]): void => {
    for (const no of nos) {
      const cabe = no.nivel + 1 + altura <= DOCUMENTO_PASTA_PROFUNDIDADE_MAXIMA;
      if (!proibidas.has(no.pasta.id) && cabe) {
        destinos.push({ id: no.pasta.id, rotulo: no.pasta.nome, nivel: no.nivel + 1 });
      }
      if (!proibidas.has(no.pasta.id)) {
        percorrer(no.pastas);
      }
    }
  };
  percorrer(arvore.pastas);
  return destinos;
}

/** `true` se a pasta `destinoId` aceita receber a `pastaMovida` (sem ciclo e dentro do teto). */
export function podeMoverPasta(
  arvore: ArvoreDocumentos,
  pastaMovida: NoPasta,
  destinoId: number | null,
): boolean {
  if (destinoId === null) {
    return true;
  }
  const destino = arvore.porId.get(destinoId);
  if (!destino || idsSubarvore(pastaMovida).includes(destinoId)) {
    return false;
  }
  return destino.nivel + 1 + alturaSubarvore(pastaMovida) <= DOCUMENTO_PASTA_PROFUNDIDADE_MAXIMA;
}

/** `true` se uma nova subpasta cabe dentro de `pastaMaeId` (`null` = raiz) pelo teto de profundidade. */
export function podeCriarSubpasta(arvore: ArvoreDocumentos, pastaMaeId: number | null): boolean {
  if (pastaMaeId === null) {
    return true;
  }
  const mae = arvore.porId.get(pastaMaeId);
  return !!mae && mae.nivel + 2 <= DOCUMENTO_PASTA_PROFUNDIDADE_MAXIMA;
}

/**
 * Caminho da pasta de cada documento que mora numa pasta ("Mapas / Cidade"), por id do documento.
 * Documento na raiz não aparece. Serve a busca, que mostra onde cada resultado está.
 */
export function caminhosDosDocumentos(
  organizacao: DocumentoOrganizacaoRecuperadaDto | null,
): ReadonlyMap<number, string> {
  const caminhos = new Map<number, string>();
  if (!organizacao) {
    return caminhos;
  }
  const arvore = montarArvore(organizacao, []);
  for (const vinculo of organizacao.vinculos) {
    const caminho = caminhoDaPasta(arvore, vinculo.pastaId);
    if (caminho) {
      caminhos.set(vinculo.documentoId, caminho);
    }
  }
  return caminhos;
}
