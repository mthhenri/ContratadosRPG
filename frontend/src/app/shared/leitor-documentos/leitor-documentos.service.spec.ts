import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { LeitorDocumentosService } from './leitor-documentos.service';

describe('LeitorDocumentosService', () => {
  let servico: LeitorDocumentosService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    servico = TestBed.inject(LeitorDocumentosService);
  });

  it('abre o leitor', () => {
    servico.abrir();
    expect(servico.estado()).toMatchObject({ aberto: true });
  });

  it('seleciona o documento e preserva o tamanho', () => {
    servico.abrir();
    servico.selecionarDocumento('guia-mestre');
    servico.alterarTamanho({ largura: 800, altura: 600 }, { largura: 1200, altura: 900 });
    expect(servico.estado()).toMatchObject({
      documentoAtivo: 'guia-mestre',
      tamanho: { largura: 800, altura: 600 },
    });
  });

  it('fecha e restaura o estado inicial', () => {
    servico.abrir();
    servico.selecionarDocumento('guia-mestre');
    servico.fechar();
    expect(servico.estado()).toEqual({
      aberto: false,
      documentoAtivo: 'sistema',
      tamanho: { largura: 640, altura: 480 },
    });
  });
});
