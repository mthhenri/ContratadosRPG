import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HistoricoRolagensJanelaService } from './historico-rolagens-janela.service';

describe('HistoricoRolagensJanelaService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  function janelaSimulada() {
    return {
      closed: false,
      opener: window as Window | null,
      focus: vi.fn(),
      close: vi.fn(),
      location: { replace: vi.fn() },
    };
  }

  it('oculta o histórico só após abrir a janela e restaura quando ela fecha', () => {
    vi.useFakeTimers();
    const janela = janelaSimulada();
    const abrir = vi.spyOn(window, 'open').mockReturnValue(janela as unknown as Window);
    const service = TestBed.inject(HistoricoRolagensJanelaService);

    expect(service.estaAbertaCampanha(8)).toBe(false);
    expect(service.abrirCampanha(8)).toBe(true);
    expect(abrir).toHaveBeenCalledWith('about:blank', '_blank', 'width=420,height=720');
    expect(janela.opener).toBeNull();
    expect(janela.location.replace).toHaveBeenCalledWith('/janela/campanha/8/historico-rolagens');
    expect(service.estaAbertaCampanha(8)).toBe(true);

    janela.closed = true;
    vi.advanceTimersByTime(500);
    expect(service.estaAbertaCampanha(8)).toBe(false);
  });

  it('não oculta quando o navegador bloqueia a abertura', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    const service = TestBed.inject(HistoricoRolagensJanelaService);

    expect(service.abrirFicha(42, 'criatura')).toBe(false);
    expect(service.estaAbertaFicha(42)).toBe(false);
  });

  it('foca a janela existente do contexto sem criar outra', () => {
    const janela = janelaSimulada();
    const abrir = vi.spyOn(window, 'open').mockReturnValue(janela as unknown as Window);
    const service = TestBed.inject(HistoricoRolagensJanelaService);

    expect(service.abrirFicha(42, 'criatura')).toBe(true);
    expect(janela.location.replace).toHaveBeenCalledWith('/janela/ficha/42/historico-rolagens?tipo=criatura');
    expect(service.abrirFicha(42, 'criatura')).toBe(true);
    expect(abrir).toHaveBeenCalledTimes(1);
    expect(janela.focus).toHaveBeenCalledTimes(1);
  });
});
