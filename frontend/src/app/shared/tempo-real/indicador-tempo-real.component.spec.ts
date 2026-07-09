import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { IndicadorTempoReal } from './indicador-tempo-real.component';
import { TempoRealService } from '../../core/services/tempo-real.service';

/**
 * Prova o selo de tempo real (m3-08): silêncio quando conectado; aviso `role="status"` quando a
 * conexão cai. Consome o Signal `conectado` do `TempoRealService`.
 */
describe('IndicadorTempoReal', () => {
  function montar(conectado: boolean) {
    const tempoRealService = { conectado: signal(conectado) };
    TestBed.configureTestingModule({
      imports: [IndicadorTempoReal],
      providers: [{ provide: TempoRealService, useValue: tempoRealService }],
    });
    const fixture = TestBed.createComponent(IndicadorTempoReal);
    fixture.detectChanges();
    return { fixture, raiz: fixture.nativeElement as HTMLElement, sinal: tempoRealService.conectado };
  }

  it('fica em silêncio quando conectado (nada renderizado)', () => {
    const { raiz } = montar(true);
    expect(raiz.querySelector('.indicador-tempo-real')).toBeNull();
  });

  it('mostra o aviso offline com role="status" quando desconectado', () => {
    const { raiz } = montar(false);
    const selo = raiz.querySelector('.indicador-tempo-real');
    expect(selo).not.toBeNull();
    expect(selo?.getAttribute('role')).toBe('status');
    expect(selo?.textContent?.toLowerCase()).toContain('offline');
  });

  it('reage ao Signal: some quando a conexão volta', () => {
    const { fixture, raiz, sinal } = montar(false);
    expect(raiz.querySelector('.indicador-tempo-real')).not.toBeNull();
    sinal.set(true);
    fixture.detectChanges();
    expect(raiz.querySelector('.indicador-tempo-real')).toBeNull();
  });
});
