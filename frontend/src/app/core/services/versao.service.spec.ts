import { TestBed } from '@angular/core/testing';
import { VERSAO_SISTEMA } from '@contratados-rpg/shared';

import { VersaoService } from './versao.service';

const CHAVE = 'contratados-rpg.versao-vista';

describe('VersaoService', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  function criar(): VersaoService {
    TestBed.resetTestingModule();
    return TestBed.inject(VersaoService);
  }

  it('expõe a versão do sistema gerada em shared', () => {
    expect(criar().versao).toBe(VERSAO_SISTEMA);
  });

  it('acende o aviso quando nenhuma versão foi vista', () => {
    expect(criar().versaoNova()).toBe(true);
  });

  it('acende o aviso quando a última versão vista é outra', () => {
    localStorage.setItem(CHAVE, '0.0.1');
    expect(criar().versaoNova()).toBe(true);
  });

  it('não acende o aviso quando a versão atual já foi vista', () => {
    localStorage.setItem(CHAVE, VERSAO_SISTEMA);
    expect(criar().versaoNova()).toBe(false);
  });

  it('marcarVista apaga o aviso e persiste a versão', () => {
    const servico = criar();
    servico.marcarVista();
    expect(servico.versaoNova()).toBe(false);
    expect(localStorage.getItem(CHAVE)).toBe(VERSAO_SISTEMA);
  });

  it('funciona sem storage: aviso ligado e marcarVista não lança', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    const servico = criar();
    expect(servico.versaoNova()).toBe(true);
    expect(() => servico.marcarVista()).not.toThrow();
    expect(servico.versaoNova()).toBe(false);
  });
});

describe('VersaoService — vistaAnterior (pn-10)', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  function criar(): VersaoService {
    TestBed.resetTestingModule();
    return TestBed.inject(VersaoService);
  }

  it('guarda a versão vista antes de marcarVista sobrescrevê-la', () => {
    localStorage.setItem(CHAVE, '1.2.0');
    const servico = criar();

    expect(servico.vistaAnterior()).toBeNull();
    servico.marcarVista();

    expect(servico.vistaAnterior()).toBe('1.2.0');
    expect(localStorage.getItem(CHAVE)).toBe(VERSAO_SISTEMA);
  });

  it('marcar de novo na mesma sessão não apaga a anterior', () => {
    localStorage.setItem(CHAVE, '1.2.0');
    const servico = criar();

    servico.marcarVista();
    servico.marcarVista();

    expect(servico.vistaAnterior()).toBe('1.2.0');
  });

  it('primeira visita: sem anterior', () => {
    const servico = criar();
    servico.marcarVista();

    expect(servico.vistaAnterior()).toBeNull();
  });

  it('versão atual já vista: a anterior é a própria atual só se nada mudou — ou seja, nula', () => {
    localStorage.setItem(CHAVE, VERSAO_SISTEMA);
    const servico = criar();
    servico.marcarVista();

    expect(servico.vistaAnterior()).toBeNull();
  });

  it('storage que lança: sem anterior e sem erro', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    const servico = criar();

    expect(() => servico.marcarVista()).not.toThrow();
    expect(servico.vistaAnterior()).toBeNull();
  });
});
