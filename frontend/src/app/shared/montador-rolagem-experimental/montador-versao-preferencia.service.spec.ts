import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';

import { MontadorVersaoPreferenciaService } from './montador-versao-preferencia.service';

const CHAVE = 'contratados-rpg.montador-rolagem.versao';

/** Preferência por dispositivo (montador-exp-02, decisão 8): `localStorage`, padrão Atual, nunca quebra a tela. */
describe('MontadorVersaoPreferenciaService', () => {
  afterEach(() => localStorage.removeItem(CHAVE));

  function criar(): MontadorVersaoPreferenciaService {
    TestBed.configureTestingModule({});
    return TestBed.inject(MontadorVersaoPreferenciaService);
  }

  it('sem escolha guardada, começa no Atual', () => {
    expect(criar().versao()).toBe('ATUAL');
  });

  it('restaura a versão guardada e grava a nova escolha', () => {
    localStorage.setItem(CHAVE, 'BLOCOS');
    const servico = criar();
    expect(servico.versao()).toBe('BLOCOS');
    servico.escolherVersao('ESSENCIAL');
    expect(servico.versao()).toBe('ESSENCIAL');
    expect(localStorage.getItem(CHAVE)).toBe('ESSENCIAL');
  });

  it('valor desconhecido guardado volta ao Atual', () => {
    localStorage.setItem(CHAVE, 'QUALQUER');
    expect(criar().versao()).toBe('ATUAL');
  });

  it('armazenamento indisponível: começa no Atual e a escolha vale em memória', () => {
    const quebrado = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('bloqueado');
      },
    };
    TestBed.configureTestingModule({
      providers: [{ provide: DOCUMENT, useValue: { defaultView: { localStorage: quebrado } } }],
    });
    const servico = TestBed.inject(MontadorVersaoPreferenciaService);
    expect(servico.versao()).toBe('ATUAL');
    expect(() => servico.escolherVersao('COMPLETO')).not.toThrow();
    expect(servico.versao()).toBe('COMPLETO');
  });
});
