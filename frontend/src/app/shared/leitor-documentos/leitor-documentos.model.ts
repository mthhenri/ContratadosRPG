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

export interface LeitorGeometria {
  readonly x: number;
  readonly y: number;
  readonly largura: number;
  readonly altura: number;
}

export interface LeitorDocumentosEstado {
  readonly aberto: boolean;
  readonly recolhido: boolean;
  readonly documentoAtivo: DocumentoRegrasId;
  readonly geometria: LeitorGeometria;
}
