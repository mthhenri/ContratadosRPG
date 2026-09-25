import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HistoricoRolagensJanelaService } from '../../shared/historico-rolagens-sidebar/historico-rolagens-janela.service';
import { AnotacoesJanelaService } from './anotacoes-janela.service';

describe('AnotacoesJanelaService', () => {
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

  it('abre a rota das anotações no tamanho próprio e libera o painel quando a janela fecha', () => {
    vi.useFakeTimers();
    const janela = janelaSimulada();
    const abrir = vi.spyOn(window, 'open').mockReturnValue(janela as unknown as Window);
    const service = TestBed.inject(AnotacoesJanelaService);

    expect(service.abrir(42)).toBe(true);
    expect(abrir).toHaveBeenCalledWith('about:blank', '_blank', 'width=640,height=720');
    expect(janela.location.replace).toHaveBeenCalledWith('/janela/ficha/42/anotacoes');
    expect(service.estaAberta(42)).toBe(true);

    janela.closed = true;
    vi.advanceTimersByTime(500);
    expect(service.estaAberta(42)).toBe(false);
  });

  it('marca a criatura na URL e foca a janela existente em vez de abrir outra', () => {
    const janela = janelaSimulada();
    const abrir = vi.spyOn(window, 'open').mockReturnValue(janela as unknown as Window);
    const service = TestBed.inject(AnotacoesJanelaService);

    service.abrir(7, 'criatura');
    service.abrir(7, 'criatura');

    expect(janela.location.replace).toHaveBeenCalledWith('/janela/ficha/7/anotacoes?tipo=criatura');
    expect(abrir).toHaveBeenCalledTimes(1);
    expect(janela.focus).toHaveBeenCalledTimes(1);
  });

  it('é independente do histórico de rolagens da mesma ficha', () => {
    vi.spyOn(window, 'open').mockImplementation(
      () => janelaSimulada() as unknown as Window,
    );
    const anotacoes = TestBed.inject(AnotacoesJanelaService);
    const historico = TestBed.inject(HistoricoRolagensJanelaService);

    anotacoes.abrir(42);

    expect(anotacoes.estaAberta(42)).toBe(true);
    expect(historico.estaAbertaFicha(42)).toBe(false);
  });

  it('mantém o painel quando o navegador bloqueia a abertura', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    const service = TestBed.inject(AnotacoesJanelaService);

    expect(service.abrir(42)).toBe(false);
    expect(service.estaAberta(42)).toBe(false);
  });
});
