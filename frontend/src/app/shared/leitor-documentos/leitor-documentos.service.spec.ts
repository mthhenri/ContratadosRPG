import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { LeitorDocumentosService } from './leitor-documentos.service';

describe('LeitorDocumentosService', () => {
  let servico: LeitorDocumentosService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    servico = TestBed.inject(LeitorDocumentosService);
  });

  it('abre, recolhe e reabre o leitor', () => {
    servico.abrir();
    servico.recolher();
    expect(servico.estado()).toMatchObject({ aberto: true, recolhido: true });
    servico.reabrir();
    expect(servico.estado()).toMatchObject({ aberto: true, recolhido: false });
  });

  it('seleciona o documento e preserva a geometria ao recolher', () => {
    servico.abrir();
    servico.selecionarDocumento('guia-mestre');
    servico.alterarGeometria(
      { x: 80, y: 0, largura: 800, altura: 600 },
      { largura: 1200, altura: 900 },
    );
    servico.recolher();
    expect(servico.estado()).toMatchObject({
      documentoAtivo: 'guia-mestre',
      geometria: { x: 80, y: 0, largura: 800, altura: 600 },
    });
  });

  it('fecha e restaura o estado inicial', () => {
    servico.abrir();
    servico.selecionarDocumento('guia-mestre');
    servico.fechar();
    expect(servico.estado()).toEqual({
      aberto: false,
      recolhido: false,
      documentoAtivo: 'sistema',
      geometria: { x: 0, y: 52, largura: 640, altura: 480 },
    });
  });
});
