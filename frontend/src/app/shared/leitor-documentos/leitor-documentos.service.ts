import { Injectable, signal } from '@angular/core';

import {
  type DocumentoRegrasId,
  type LeitorDocumentosEstado,
  type LeitorGeometria,
  type LeitorViewport,
} from './leitor-documentos.model';
import { limitarGeometria } from './leitor-documentos.util';

const GEOMETRIA_INICIAL: LeitorGeometria = {
  x: 0,
  y: 52,
  largura: 640,
  altura: 480,
};

@Injectable({ providedIn: 'root' })
export class LeitorDocumentosService {
  private readonly estadoInterno = signal<LeitorDocumentosEstado>(criarEstadoInicial());
  readonly estado = this.estadoInterno.asReadonly();

  abrir(): void {
    this.estadoInterno.update((estado) => ({ ...estado, aberto: true, recolhido: false }));
  }

  recolher(): void {
    this.estadoInterno.update((estado) =>
      estado.aberto ? { ...estado, recolhido: true } : estado,
    );
  }

  reabrir(): void {
    this.estadoInterno.update((estado) =>
      estado.recolhido ? { ...estado, recolhido: false } : estado,
    );
  }

  fechar(): void {
    this.estadoInterno.set(criarEstadoInicial());
  }

  selecionarDocumento(documento: DocumentoRegrasId): void {
    this.estadoInterno.update((estado) => ({ ...estado, documentoAtivo: documento }));
  }

  alterarGeometria(geometria: LeitorGeometria, viewport: LeitorViewport): void {
    this.estadoInterno.update((estado) => ({
      ...estado,
      geometria: limitarGeometria(geometria, viewport),
    }));
  }
}

function criarEstadoInicial(): LeitorDocumentosEstado {
  return {
    aberto: false,
    recolhido: false,
    documentoAtivo: 'sistema',
    geometria: GEOMETRIA_INICIAL,
  };
}
