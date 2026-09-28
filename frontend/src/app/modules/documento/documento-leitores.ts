/**
 * Presença de leitura da Biblioteca já pronta para a tela (m9-10) — o que o cartão, a lista, a busca
 * e o painel recebem da `BibliotecaLeitoresStore`. Fica fora da store para os componentes de
 * apresentação não dependerem dela.
 */

/** Um leitor de um documento já com o nome resolvido — só apresentação, nunca atravessa a rede. */
export interface DocumentoLeitorNomeado {
  readonly usuarioId: number;
  readonly nome: string;
  readonly espectador: boolean;
}

/** Leitores por `documentoId` — ausência é "ninguém lendo". */
export type DocumentoLeitoresPorDocumento = ReadonlyMap<number, readonly DocumentoLeitorNomeado[]>;

const LISTA_NOMES = new Intl.ListFormat('pt-BR', { style: 'long', type: 'conjunction' });

/** "Ana, Bruno e Carla (espectador)" — o texto do tooltip e do rótulo acessível do cartão. */
export function descreverLeitores(leitores: readonly DocumentoLeitorNomeado[]): string {
  return LISTA_NOMES.format(
    leitores.map((leitor) => (leitor.espectador ? `${leitor.nome} (espectador)` : leitor.nome)),
  );
}

/** Ninguém lendo — a mesma referência sempre, para o input do cartão não mudar a cada ciclo. */
const SEM_LEITORES: readonly DocumentoLeitorNomeado[] = [];

/** Os leitores de um documento no mapa, ou a lista vazia. */
export function leitoresDoDocumento(
  mapa: DocumentoLeitoresPorDocumento,
  documentoId: number | null,
): readonly DocumentoLeitorNomeado[] {
  return (documentoId !== null && mapa.get(documentoId)) || SEM_LEITORES;
}

/** O mapa vazio padrão — jogador e espectador nunca recebem outro. */
export const NENHUM_LEITOR: DocumentoLeitoresPorDocumento = new Map();
