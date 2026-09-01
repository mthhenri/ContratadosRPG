import { Injectable, signal } from '@angular/core';

import {
  type DocumentoRegrasId,
  type LeitorDocumentosEstado,
  type LeitorTamanho,
  type LeitorViewport,
} from './leitor-documentos.model';
import { limitarTamanho } from './leitor-documentos.util';

const TAMANHO_INICIAL: LeitorTamanho = {
  largura: 640,
  altura: 480,
};

@Injectable({ providedIn: 'root' })
export class LeitorDocumentosService {
  private readonly estadoInterno = signal<LeitorDocumentosEstado>(criarEstadoInicial());
  readonly estado = this.estadoInterno.asReadonly();

  abrir(): void {
    this.estadoInterno.update((estado) => ({ ...estado, aberto: true }));
  }

  fechar(): void {
    this.estadoInterno.set(criarEstadoInicial());
  }

  selecionarDocumento(documento: DocumentoRegrasId): void {
    this.estadoInterno.update((estado) => ({ ...estado, documentoAtivo: documento }));
  }

  alterarTamanho(tamanho: LeitorTamanho, viewport: LeitorViewport): void {
    this.estadoInterno.update((estado) => ({
      ...estado,
      tamanho: limitarTamanho(tamanho, viewport),
    }));
  }
}

function criarEstadoInicial(): LeitorDocumentosEstado {
  return {
    aberto: false,
    documentoAtivo: 'sistema',
    tamanho: TAMANHO_INICIAL,
  };
}
