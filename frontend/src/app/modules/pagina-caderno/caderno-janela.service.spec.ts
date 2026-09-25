import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HistoricoRolagensJanelaService } from '../../shared/historico-rolagens-sidebar/historico-rolagens-janela.service';
import { CadernoJanelaService } from './caderno-janela.service';

describe('CadernoJanelaService', () => {
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

  it('abre a rota do caderno no tamanho próprio e libera o painel quando a janela fecha', () => {
    vi.useFakeTimers();
    const janela = janelaSimulada();
    const abrir = vi.spyOn(window, 'open').mockReturnValue(janela as unknown as Window);
    const service = TestBed.inject(CadernoJanelaService);

    expect(service.abrir(3)).toBe(true);
    expect(abrir).toHaveBeenCalledWith('about:blank', '_blank', 'width=960,height=720');
    expect(janela.location.replace).toHaveBeenCalledWith('/janela/campanha/3/caderno');
    expect(service.estaAberta(3)).toBe(true);

    janela.closed = true;
    vi.advanceTimersByTime(500);
    expect(service.estaAberta(3)).toBe(false);
  });

  it('foca a janela existente da campanha em vez de abrir outra', () => {
    const janela = janelaSimulada();
    const abrir = vi.spyOn(window, 'open').mockReturnValue(janela as unknown as Window);
    const service = TestBed.inject(CadernoJanelaService);

    service.abrir(3);
    service.abrir(3);

    expect(abrir).toHaveBeenCalledTimes(1);
    expect(janela.focus).toHaveBeenCalledTimes(1);
  });

  it('é independente do histórico de rolagens da mesma campanha', () => {
    vi.spyOn(window, 'open').mockImplementation(
      () => janelaSimulada() as unknown as Window,
    );
    const caderno = TestBed.inject(CadernoJanelaService);
    const historico = TestBed.inject(HistoricoRolagensJanelaService);

    caderno.abrir(3);

    expect(caderno.estaAberta(3)).toBe(true);
    expect(historico.estaAbertaCampanha(3)).toBe(false);
  });

  it('mantém o painel quando o navegador bloqueia a abertura', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    const service = TestBed.inject(CadernoJanelaService);

    expect(service.abrir(3)).toBe(false);
    expect(service.estaAberta(3)).toBe(false);
  });
});
