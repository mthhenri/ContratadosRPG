export type DocumentoRegrasId = 'sistema' | 'guia-mestre';

export const DOCUMENTOS_REGRAS = {
  sistema: { titulo: 'Sistema', url: '/documentos/sistema-v4.1.0.pdf' },
  'guia-mestre': {
    titulo: 'Guia do Mestre',
    url: '/documentos/guia_de_mestre-v4.0.0.pdf',
  },
} as const;

export interface LeitorViewport {
  readonly largura: number;
  readonly altura: number;
}

/** Só o tamanho — a posição é de `app-painel-flutuante` (ui-17), fora do estado deste leitor. */
export interface LeitorTamanho {
  readonly largura: number;
  readonly altura: number;
}

export interface LeitorDocumentosEstado {
  readonly aberto: boolean;
  readonly documentoAtivo: DocumentoRegrasId;
  readonly tamanho: LeitorTamanho;
}
