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
