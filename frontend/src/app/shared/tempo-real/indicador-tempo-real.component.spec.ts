import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { IndicadorTempoReal } from './indicador-tempo-real.component';
import { TempoRealService } from '../../core/services/tempo-real.service';

/**
 * Prova o selo de tempo real (m3-08): silêncio quando conectado; aviso `role="status"` quando a
 * conexão cai — mas só depois de `ativo` (ui-21: montado globalmente na topbar, precisa do guarda
 * contra falso alarme em página que nunca chamou `conectar()`). Consome os Signals
 * `conectado`/`ativo` do `TempoRealService`.
 */
describe('IndicadorTempoReal', () => {
  function montar(conectado: boolean, ativo = true) {
    const tempoRealService = { conectado: signal(conectado), ativo: signal(ativo) };
    TestBed.configureTestingModule({
      imports: [IndicadorTempoReal],
      providers: [{ provide: TempoRealService, useValue: tempoRealService }],
    });
    const fixture = TestBed.createComponent(IndicadorTempoReal);
    fixture.detectChanges();
    return {
      fixture,
      raiz: fixture.nativeElement as HTMLElement,
      sinal: tempoRealService.conectado,
      ativoSinal: tempoRealService.ativo,
    };
  }

  it('fica em silêncio quando conectado (nada renderizado)', () => {
    const { raiz } = montar(true);
    expect(raiz.querySelector('.indicador-tempo-real')).toBeNull();
  });

  it('mostra o aviso offline com role="status" quando desconectado e ativo', () => {
    const { raiz } = montar(false);
    const selo = raiz.querySelector('.indicador-tempo-real');
    expect(selo).not.toBeNull();
    expect(selo?.getAttribute('role')).toBe('status');
    expect(selo?.textContent?.toLowerCase()).toContain('offline');
  });

  it('fica em silêncio quando desconectado mas nunca ativo (nenhuma página chamou conectar())', () => {
    const { raiz } = montar(false, false);
    expect(raiz.querySelector('.indicador-tempo-real')).toBeNull();
  });

  it('reage ao Signal: some quando a conexão volta', () => {
    const { fixture, raiz, sinal } = montar(false);
    expect(raiz.querySelector('.indicador-tempo-real')).not.toBeNull();
    sinal.set(true);
    fixture.detectChanges();
    expect(raiz.querySelector('.indicador-tempo-real')).toBeNull();
  });

  it('reage ao Signal ativo: surge quando a primeira conectar() da sessão acontece', () => {
    const { fixture, raiz, ativoSinal } = montar(false, false);
    expect(raiz.querySelector('.indicador-tempo-real')).toBeNull();
    ativoSinal.set(true);
    fixture.detectChanges();
    expect(raiz.querySelector('.indicador-tempo-real')).not.toBeNull();
  });
});
